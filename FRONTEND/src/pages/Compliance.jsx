import { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SourceCard from "../components/SourceCard";

const API_URL = "";
const REPORTS_KEY = "bisense_compliance_reports";

function readReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read compliance reports:", error);
    return [];
  }
}

function saveReport(report) {
  try {
    const current = readReports();

    const existingIndex = current.findIndex(
      (item) =>
        item?.standard === report.standard &&
        item?.title === report.title
    );

    let updated;

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = report;
    } else {
      updated = [report, ...current];
    }

    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updated)
    );

    window.dispatchEvent(new Event("storage"));

    return true;
  } catch (error) {
    console.error("Unable to save compliance report:", error);
    return false;
  }
}

function Compliance() {
  const [standards, setStandards] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState("");
  const [standardData, setStandardData] = useState(null);

  const [requirements, setRequirements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [notes, setNotes] = useState("");

  const [loadingStandards, setLoadingStandards] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [error, setError] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadStandards = async () => {
      try {
        setLoadingStandards(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/standards/search`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          throw new Error(
            `The standards service returned an invalid response (${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.error ||
              "Failed to load standards."
          );
        }

        const results = Array.isArray(data?.results)
          ? data.results
          : [];

        if (!mounted) return;

        setStandards(results);

        if (
          results.length > 0 &&
          !selectedStandard
        ) {
          setSelectedStandard(
            results[0]?.number || ""
          );
        }
      } catch (err) {
        console.error("Loading standards error:", err);

        if (!mounted) return;

        setError(
          err?.message ||
            "Unable to load BIS standards."
        );
      } finally {
        if (mounted) {
          setLoadingStandards(false);
        }
      }
    };

    loadStandards();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStandard) {
      setStandardData(null);
      setRequirements([]);
      setSelectedCategory("All");
      setShowSources(false);
      setActiveSourceId(null);
      return;
    }

    let mounted = true;

    const loadStandardDetails = async () => {
      try {
        setLoadingDetails(true);
        setError("");
        setShowSources(false);
        setActiveSourceId(null);
        setReportSaved(false);

        const response = await fetch(
          `${API_URL}/api/standards/${encodeURIComponent(
            selectedStandard
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          throw new Error(
            `The standard service returned an invalid response (${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.error ||
              "Failed to load standard details."
          );
        }

        if (!mounted) return;

        setStandardData(data);
        setRequirements(buildRequirements(data));
        setSelectedCategory("All");
      } catch (err) {
        console.error(
          "Loading standard details error:",
          err
        );

        if (!mounted) return;

        setError(
          err?.message ||
            "Unable to load the selected standard."
        );

        setStandardData(null);
        setRequirements([]);
      } finally {
        if (mounted) {
          setLoadingDetails(false);
        }
      }
    };

    loadStandardDetails();

    return () => {
      mounted = false;
    };
  }, [selectedStandard]);

  const buildRequirements = (standard) => {
    const items = [
      {
        id: "standard",
        category: "Standard",
        title: "Confirm the applicable Indian Standard",
        description:
          "Confirm that this standard is the correct standard for the product or activity being reviewed.",
      },
      {
        id: "scope",
        category: "Scope",
        title: "Review the standard scope",
        description:
          standard?.scope ||
          "Review the official BIS scope and applicability information.",
      },
      {
        id: "status",
        category: "Verification",
        title: "Verify the current standard status",
        description:
          `Current BISense record status: ${
            standard?.status || "Not available"
          }. Verify the latest status through the official BIS source.`,
      },
      {
        id: "edition",
        category: "Documentation",
        title: "Verify the current edition",
        description:
          standard?.edition_year
            ? `BISense currently records the edition year as ${standard.edition_year}. Confirm the latest edition and amendments from BIS.`
            : "Confirm the current edition and any amendments from the official BIS source.",
      },
      {
        id: "certification",
        category: "Certification",
        title: "Check certification requirements",
        description:
          standard?.certification_status ||
          standard?.certification_scheme
            ? `Available certification information: ${
                standard?.certification_status ||
                standard?.certification_scheme
              }. Verify the current applicable requirements with BIS.`
            : "Certification information is not currently recorded for this standard. Verify whether the product is subject to compulsory certification or another conformity route.",
      },
      {
        id: "qco",
        category: "Regulatory",
        title: "Check applicable QCO information",
        description:
          standard?.qco_information ||
          "No QCO information is currently recorded in BISense. Check official government and BIS notifications for applicable Quality Control Orders.",
      },
      {
        id: "testing",
        category: "Testing",
        title: "Review applicable testing provisions",
        description:
          "Review the official standard and associated BIS information for applicable testing and evaluation provisions.",
      },
      {
        id: "documentation",
        category: "Documentation",
        title: "Prepare supporting records",
        description:
          "Keep relevant product, manufacturing, testing and application records organized for the applicable BIS process.",
      },
      {
        id: "source",
        category: "Verification",
        title: "Verify the final requirements with BIS",
        description:
          "Use the official BIS source before making certification, legal or compliance decisions.",
      },
    ];

    return items.map((item) => ({
      ...item,
      completed: false,
    }));
  };

  const toggleRequirement = (id) => {
    setRequirements((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );

    setReportSaved(false);
  };

  const resetChecklist = () => {
    if (standardData) {
      setRequirements(
        buildRequirements(standardData)
      );
    }

    setNotes("");
    setSelectedCategory("All");
    setShowSources(false);
    setActiveSourceId(null);
    setReportSaved(false);
  };

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        requirements.map(
          (item) => item.category
        )
      ),
    ],
    [requirements]
  );

  const filteredRequirements =
    requirements.filter(
      (item) =>
        selectedCategory === "All" ||
        item.category === selectedCategory
    );

  const completedCount =
    requirements.filter(
      (item) => item.completed
    ).length;

  const progress =
    requirements.length === 0
      ? 0
      : Math.round(
          (completedCount /
            requirements.length) *
            100
        );

  const toggleSource = (id) => {
    setActiveSourceId((current) =>
      current === id ? null : id
    );
  };

  const saveCurrentReport = () => {
    if (!standardData || requirements.length === 0) {
      return;
    }

    const report = {
      title: `Compliance Review — ${
        standardData.number || "Standard"
      }`,
      standard:
        standardData.number ||
        selectedStandard ||
        "",
      progress,
      completedCount,
      totalRequirements: requirements.length,
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    };

    const success = saveReport(report);

    if (success) {
      setReportSaved(true);
    }
  };

  const printReport = () => {
    saveCurrentReport();
    window.print();
  };

  return (
    <div className="app-page compliance-page">
      <Navbar />

      <main className="page-container compliance-container">
        <div className="page-intro compliance-intro">
          <p className="eyebrow">
            COMPLIANCE ASSISTANT
          </p>

          <h1>
            Turn standards into action.
          </h1>

          <p>
            Select a BIS standard and build a trackable
            review checklist using the information
            available in BISense.
          </p>
        </div>

        {error && (
          <div
            className="warning-box large-warning compliance-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* =====================================================
            STANDARD SELECTOR
        ====================================================== */}

        <section className="advisor-card compliance-selector-card">
          <p className="eyebrow">
            SELECT STANDARD
          </p>

          <h2>
            Which BIS standard are you reviewing?
          </h2>

          <p className="step-description">
            Choose a standard from the BISense knowledge
            base to create its checklist.
          </p>

          <select
            className="full-input compliance-standard-select"
            value={selectedStandard}
            onChange={(event) => {
              setSelectedStandard(
                event.target.value
              );
              setReportSaved(false);
            }}
            disabled={
              loadingStandards ||
              loadingDetails
            }
          >
            {loadingStandards ? (
              <option value="">
                Loading standards...
              </option>
            ) : (
              <>
                <option value="">
                  Select a standard
                </option>

                {standards.map(
                  (standard, index) => (
                    <option
                      key={
                        standard?.number ||
                        `standard-${index}`
                      }
                      value={
                        standard?.number || ""
                      }
                    >
                      {standard?.number} —{" "}
                      {standard?.title ||
                        "Untitled Standard"}
                    </option>
                  )
                )}
              </>
            )}
          </select>

          {standardData && (
            <div className="result-highlight">
              <span>
                SELECTED STANDARD
              </span>

              <strong>
                {standardData.number}
              </strong>

              <p>
                {standardData.title ||
                  "Untitled Standard"}
              </p>
            </div>
          )}
        </section>

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        <section className="compliance-summary">
          <div>
            <span>
              SELECTED STANDARD
            </span>

            <strong>
              {standardData?.number ||
                "Not selected"}
            </strong>
          </div>

          <div>
            <span>COMPLETED</span>

            <strong>
              {completedCount}/
              {requirements.length}
            </strong>
          </div>

          <div>
            <span>PROGRESS</span>

            <strong>
              {progress}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </section>

        {/* =====================================================
            TOOLBAR
        ====================================================== */}

        {requirements.length > 0 && (
          <div className="compliance-toolbar">
            <div className="compliance-filters">
              <span>FILTER:</span>

              {categories.map(
                (category) => (
                  <button
                    type="button"
                    key={category}
                    className={
                      selectedCategory ===
                      category
                        ? "filter-active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={resetChecklist}
            >
              Reset
            </button>
          </div>
        )}

        {/* =====================================================
            CHECKLIST
        ====================================================== */}

        <section className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="eyebrow">
                CHECKLIST
              </p>

              <h2>
                Compliance review
              </h2>

              <p className="checklist-subtitle">
                Complete each item after reviewing the
                relevant information.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={printReport}
              disabled={
                requirements.length === 0
              }
            >
              🖨 Print
            </button>
          </div>

          {loadingDetails ? (
            <div className="loading-container compliance-loading">
              <div className="loading-spinner" />

              <span>
                Loading standard information...
              </span>
            </div>
          ) : requirements.length > 0 ? (
            <div className="checklist-items">
              {filteredRequirements.map(
                (item) => (
                  <div
                    key={item.id}
                    className={`check-item ${
                      item.completed
                        ? "checked"
                        : ""
                    }`}
                  >
                    <label className="check-item-main">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          item.completed
                        )}
                        onChange={() =>
                          toggleRequirement(
                            item.id
                          )
                        }
                      />

                      <span className="fake-check">
                        {item.completed
                          ? "✓"
                          : ""}
                      </span>

                      <span className="check-item-content">
                        <span className="check-item-category">
                          {item.category}
                        </span>

                        <strong>
                          {item.title}
                        </strong>

                        <p>
                          {item.description}
                        </p>
                      </span>
                    </label>

                    <button
                      type="button"
                      className="source-toggle"
                      onClick={() =>
                        toggleSource(item.id)
                      }
                      aria-expanded={
                        activeSourceId ===
                        item.id
                      }
                    >
                      {activeSourceId ===
                      item.id
                        ? "Hide Source"
                        : "Source"}
                    </button>

                    {activeSourceId ===
                      item.id && (
                      <div className="inline-source-panel">
                        <p className="eyebrow">
                          SOURCE
                        </p>

                        <p>
                          Verify this checklist item
                          against the official BIS
                          source for the selected
                          standard.
                        </p>

                        {standardData?.source_url && (
                          <a
                            href={
                              standardData.source_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Official BIS Source →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h3>
                Select a BIS standard
              </h3>

              <p>
                Choose a standard above to generate
                a compliance review checklist.
              </p>
            </div>
          )}
        </section>

        {/* =====================================================
            SOURCE INFORMATION
        ====================================================== */}

        {showSources && standardData && (
          <section className="source-panel">
            <div>
              <p className="eyebrow">
                SOURCE INFORMATION
              </p>

              <h2>
                Verify the requirements.
              </h2>

              <p>
                BISense uses the selected standard's
                available database information for this
                checklist.
              </p>
            </div>

            <SourceCard
              standard={standardData.number}
              section="Official BIS Standard Information"
              page="—"
            />

            {standardData.source_url && (
              <a
                href={
                  standardData.source_url
                }
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn large"
              >
                Open Official BIS Source →
              </a>
            )}
          </section>
        )}

        {/* =====================================================
            NOTES
        ====================================================== */}

        <section className="notes-card">
          <div>
            <p className="eyebrow">
              WORK NOTES
            </p>

            <h2>
              Add notes to your checklist.
            </h2>

            <p>
              Record observations, pending tasks or
              internal review notes.
            </p>
          </div>

          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setReportSaved(false);
            }}
            placeholder="Write your notes here..."
            rows={6}
          />
        </section>

        {/* =====================================================
            REPORT
        ====================================================== */}

        <section className="compliance-report">
          <div>
            <p className="eyebrow">
              REPORT
            </p>

            <h2>
              Your compliance summary is ready.
            </h2>

            <p>
              Save the current review and generate a
              print-ready summary of the selected
              standard, completed checks and notes.
            </p>
          </div>

          <div className="report-actions">
            <button
              type="button"
              className="secondary-btn large"
              onClick={saveCurrentReport}
              disabled={
                requirements.length === 0
              }
            >
              Save Report
            </button>

            <button
              type="button"
              className="primary-btn large"
              onClick={printReport}
              disabled={
                requirements.length === 0
              }
            >
              🖨 Print Report
            </button>
          </div>

          {reportSaved && (
            <div
              className="compliance-save-message"
              role="status"
            >
              ✓ Report saved to your dashboard.
            </div>
          )}
        </section>

        <div className="compliance-note">
          <strong>Important:</strong>{" "}
          BISense provides AI-assisted information
          discovery and organization tools. This
          checklist is not an official certification
          or legal compliance determination. Always
          verify the current requirements through
          official BIS sources.
        </div>
      </main>

      <Footer />

      <style>{`
        .compliance-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          color: #111827;
        }

        .compliance-container {
          width: 100%;
          box-sizing: border-box;
        }

        .compliance-page h1,
        .compliance-page h2,
        .compliance-page h3,
        .compliance-page p,
        .compliance-page strong,
        .compliance-page label,
        .compliance-page span {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .compliance-intro h1,
        .compliance-intro p,
        .advisor-card h2,
        .advisor-card p,
        .checklist-card h2,
        .checklist-card p,
        .notes-card h2,
        .notes-card p,
        .compliance-report h2,
        .compliance-report p,
        .empty-state h3,
        .empty-state p {
          color: #111827 !important;
        }

        .compliance-standard-select {
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .compliance-standard-select option {
          color: #111827 !important;
          background: #fff !important;
        }

        .compliance-standard-select:focus {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .compliance-error {
          color: #991b1b !important;
          overflow-wrap: anywhere;
        }

        .compliance-summary > div {
          min-width: 0;
        }

        .compliance-summary span {
          color: #6b7280 !important;
        }

        .compliance-summary strong {
          color: #111827 !important;
        }

        .compliance-toolbar {
          min-width: 0;
        }

        .compliance-filters {
          min-width: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .compliance-filters > span {
          color: #6b7280 !important;
          flex-shrink: 0;
        }

        .compliance-filters button {
          color: #4b5563 !important;
        }

        .compliance-filters button.filter-active {
          color: #fff !important;
        }

        .checklist-header {
          min-width: 0;
        }

        .checklist-header > div {
          min-width: 0;
        }

        .checklist-header button {
          flex-shrink: 0;
        }

        .check-item {
          position: relative;
          min-width: 0;
        }

        .check-item-main {
          min-width: 0;
          flex: 1;
        }

        .check-item-content {
          min-width: 0;
        }

        .check-item-content strong,
        .check-item-content p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .source-toggle {
          flex-shrink: 0;
          cursor: pointer;
        }

        .inline-source-panel {
          width: 100%;
          box-sizing: border-box;
          margin-top: 12px;
          padding: 14px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .inline-source-panel p {
          margin: 0;
          color: #4b5563 !important;
          line-height: 1.55;
        }

        .inline-source-panel .eyebrow {
          margin-bottom: 7px;
          color: #6672e8 !important;
        }

        .inline-source-panel a {
          display: inline-block;
          margin-top: 9px;
          color: #4f5fda !important;
          font-weight: 700;
          text-decoration: none;
        }

        .inline-source-panel a:hover {
          text-decoration: underline;
        }

        .compliance-loading {
          color: #111827 !important;
        }

        .compliance-loading span {
          color: #111827 !important;
        }

        .notes-card textarea {
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
          resize: vertical;
        }

        .notes-card textarea::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .notes-card textarea:focus {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .report-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .compliance-save-message {
          margin-top: 14px;
          color: #166534 !important;
          font-weight: 700;
        }

        .compliance-note {
          overflow-wrap: anywhere;
          color: #5f6b7c;
        }

        @media (max-width: 900px) {
          .compliance-summary {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .compliance-summary .progress-track {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 700px) {
          .compliance-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .compliance-intro h1 {
            font-size: clamp(
              30px,
              8vw,
              42px
            ) !important;
            line-height: 1.1 !important;
          }

          .compliance-intro > p:last-child {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .compliance-selector-card,
          .checklist-card,
          .source-panel,
          .notes-card,
          .compliance-report {
            width: 100% !important;
            box-sizing: border-box;
          }

          .compliance-summary {
            grid-template-columns: 1fr !important;
          }

          .compliance-summary .progress-track {
            grid-column: auto;
          }

          .compliance-toolbar {
            align-items: stretch !important;
            flex-direction: column;
            gap: 14px;
          }

          .compliance-filters {
            width: 100%;
          }

          .compliance-toolbar > button {
            width: 100%;
          }

          .checklist-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 15px;
          }

          .checklist-header button {
            width: 100%;
          }

          .check-item {
            display: flex !important;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 10px;
          }

          .check-item-main {
            width: 100%;
          }

          .source-toggle {
            margin-left: auto;
          }

          .report-actions {
            width: 100%;
            flex-direction: column;
          }

          .report-actions > button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .compliance-container {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .advisor-card,
          .checklist-card,
          .source-panel,
          .notes-card,
          .compliance-report {
            border-radius: 16px !important;
          }

          .compliance-filters {
            align-items: stretch;
          }

          .compliance-filters button {
            flex: 1 1 auto;
          }

          .check-item-main {
            align-items: flex-start !important;
          }

          .check-item-content {
            min-width: 0;
            width: 100%;
          }

          .source-toggle {
            width: 100%;
            margin-left: 0;
          }

          .inline-source-panel {
            width: 100%;
          }
        }

        @media print {
          .compliance-page nav,
          .compliance-page footer,
          .compliance-toolbar,
          .source-toggle,
          .report-actions,
          .dashboard-page,
          .inline-source-panel {
            display: none !important;
          }

          .compliance-page {
            background: #fff !important;
          }

          .compliance-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .advisor-card,
          .checklist-card,
          .source-panel,
          .notes-card,
          .compliance-report {
            box-shadow: none !important;
            break-inside: avoid;
          }

          .check-item {
            break-inside: avoid;
          }

          .notes-card textarea {
            border: 1px solid #ddd !important;
            color: #111827 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Compliance;