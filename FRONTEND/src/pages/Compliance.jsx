import { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SourceCard from "../components/SourceCard";

const API_URL = "";

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

  useEffect(() => {
    const loadStandards = async () => {
      try {
        setLoadingStandards(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/standards/search`
        );

        if (!response.ok) {
          throw new Error("Failed to load standards.");
        }

        const data = await response.json();
        const results = data.results || [];

        setStandards(results);

        if (results.length > 0) {
          setSelectedStandard(results[0].number);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load BIS standards. Make sure the FastAPI backend is running."
        );
      } finally {
        setLoadingStandards(false);
      }
    };

    loadStandards();
  }, []);

  useEffect(() => {
    if (!selectedStandard) return;

    const loadStandardDetails = async () => {
      try {
        setLoadingDetails(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/standards/${encodeURIComponent(
            selectedStandard
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to load standard details.");
        }

        const data = await response.json();

        setStandardData(data);
        setRequirements(buildRequirements(data));
        setSelectedCategory("All");
        setShowSources(false);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load the selected standard."
        );

        setStandardData(null);
        setRequirements([]);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadStandardDetails();
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
          standard.scope ||
          "Review the official BIS scope and applicability information.",
      },
      {
        id: "status",
        category: "Verification",
        title: "Verify the current standard status",
        description:
          `Current BISense record status: ${
            standard.status || "Not available"
          }. Verify the latest status through the official BIS source.`,
      },
      {
        id: "edition",
        category: "Documentation",
        title: "Verify the current edition",
        description:
          standard.edition_year
            ? `BISense currently records the edition year as ${standard.edition_year}. Confirm the latest edition and amendments from BIS.`
            : "Confirm the current edition and any amendments from the official BIS source.",
      },
      {
        id: "certification",
        category: "Certification",
        title: "Check certification requirements",
        description:
          standard.certification_status ||
          standard.certification_scheme
            ? `Available certification information: ${
                standard.certification_status ||
                standard.certification_scheme
              }. Verify the current applicable requirements with BIS.`
            : "Certification information is not currently recorded for this standard. Verify whether the product is subject to compulsory certification or another conformity route.",
      },
      {
        id: "qco",
        category: "Regulatory",
        title: "Check applicable QCO information",
        description:
          standard.qco_information ||
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
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const resetChecklist = () => {
    if (standardData) {
      setRequirements(buildRequirements(standardData));
    }

    setNotes("");
  };

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(
        requirements.map((item) => item.category)
      ),
    ];
  }, [requirements]);

  const filteredRequirements = requirements.filter(
    (item) =>
      selectedCategory === "All" ||
      item.category === selectedCategory
  );

  const completedCount = requirements.filter(
    (item) => item.completed
  ).length;

  const progress =
    requirements.length === 0
      ? 0
      : Math.round(
          (completedCount / requirements.length) * 100
        );

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container">
        <div className="page-intro">
          <p className="eyebrow">COMPLIANCE ASSISTANT</p>

          <h1>Turn standards into action.</h1>

          <p>
            Select a BIS standard and build a trackable review
            checklist using the information available in BISense.
          </p>
        </div>

        {error && (
          <div className="warning-box large-warning">
            {error}
          </div>
        )}

        <section className="advisor-card">
          <p className="eyebrow">SELECT STANDARD</p>

          <h2>
            Which BIS standard are you reviewing?
          </h2>

          <p className="step-description">
            Choose a standard from the BISense knowledge base to
            create its checklist.
          </p>

          <select
            className="full-input"
            value={selectedStandard}
            onChange={(event) =>
              setSelectedStandard(event.target.value)
            }
            disabled={
              loadingStandards || loadingDetails
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

                {standards.map((standard) => (
                  <option
                    key={standard.number}
                    value={standard.number}
                  >
                    {standard.number} — {standard.title}
                  </option>
                ))}
              </>
            )}
          </select>

          {standardData && (
            <div className="result-highlight">
              <span>SELECTED STANDARD</span>

              <strong>{standardData.number}</strong>

              <p>{standardData.title}</p>
            </div>
          )}
        </section>

        <section className="compliance-summary">
          <div>
            <span>SELECTED STANDARD</span>

            <strong>
              {standardData?.number || "Not selected"}
            </strong>
          </div>

          <div>
            <span>COMPLETED</span>

            <strong>
              {completedCount}/{requirements.length}
            </strong>
          </div>

          <div>
            <span>PROGRESS</span>

            <strong>{progress}%</strong>
          </div>

          <div className="progress-track">
            <div
              style={{
                width: `${progress}%`,
              }}
            ></div>
          </div>
        </section>

        {requirements.length > 0 && (
          <div className="compliance-toolbar">
            <div className="compliance-filters">
              <span>FILTER:</span>

              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    selectedCategory === category
                      ? "filter-active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                >
                  {category}
                </button>
              ))}
            </div>

            <button
              className="secondary-btn"
              onClick={resetChecklist}
            >
              Reset
            </button>
          </div>
        )}

        <section className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="eyebrow">CHECKLIST</p>

              <h2>Compliance review</h2>

              <p className="checklist-subtitle">
                Complete each item after reviewing the relevant
                information.
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => window.print()}
              disabled={requirements.length === 0}
            >
              🖨 Print
            </button>
          </div>

          {loadingDetails ? (
            <div className="loading-container">
              Loading standard information...
            </div>
          ) : requirements.length > 0 ? (
            <div className="checklist-items">
              {filteredRequirements.map((item) => (
                <div
                  key={item.id}
                  className={`check-item ${
                    item.completed ? "checked" : ""
                  }`}
                >
                  <label className="check-item-main">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completed)}
                      onChange={() =>
                        toggleRequirement(item.id)
                      }
                    />

                    <span className="fake-check">
                      {item.completed ? "✓" : ""}
                    </span>

                    <span className="check-item-content">
                      <span className="check-item-category">
                        {item.category}
                      </span>

                      <strong>{item.title}</strong>

                      <p>{item.description}</p>
                    </span>
                  </label>

                  <button
                    className="source-toggle"
                    onClick={() =>
                      setShowSources((current) => !current)
                    }
                  >
                    Source
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Select a BIS standard</h3>

              <p>
                Choose a standard above to generate a compliance
                review checklist.
              </p>
            </div>
          )}
        </section>

        {showSources && standardData && (
          <section className="source-panel">
            <div>
              <p className="eyebrow">
                SOURCE INFORMATION
              </p>

              <h2>Verify the requirements.</h2>

              <p>
                BISense uses the selected standard's available
                database information for this checklist.
              </p>
            </div>

            <SourceCard
              standard={standardData.number}
              section="Official BIS Standard Information"
              page="—"
            />

            {standardData.source_url && (
              <a
                href={standardData.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn large"
              >
                Open Official BIS Source →
              </a>
            )}
          </section>
        )}

        <section className="notes-card">
          <div>
            <p className="eyebrow">WORK NOTES</p>

            <h2>Add notes to your checklist.</h2>

            <p>
              Record observations, pending tasks or internal
              review notes.
            </p>
          </div>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Write your notes here..."
            rows="6"
          />
        </section>

        <section className="compliance-report">
          <div>
            <p className="eyebrow">REPORT</p>

            <h2>Your compliance summary is ready.</h2>

            <p>
              Generate a print-ready summary of the selected
              standard, completed checks and notes.
            </p>
          </div>

          <div className="report-actions">
            <button
              className="primary-btn large"
              onClick={() => window.print()}
              disabled={requirements.length === 0}
            >
              🖨 Print Report
            </button>
          </div>
        </section>

        <div className="compliance-note">
          <strong>Important:</strong> BISense provides
          AI-assisted information discovery and organization
          tools. This checklist is not an official certification
          or legal compliance determination. Always verify the
          current requirements through official BIS sources.
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Compliance;