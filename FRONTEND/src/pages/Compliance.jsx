import { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SourceCard from "../components/SourceCard";

const API_URL = "";
const DIRECT_API_URL = "https://bisense-5ozn.onrender.com";
const REPORTS_KEY = "bisense_compliance_reports";
const CHECKLIST_KEY = "bisense_compliance_checklists";
const STANDARDS_CACHE_KEY = "bisense_compliance_standards_cache";
const CACHE_TTL = 10 * 60 * 1000;

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse(raw, []);
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

    const updated = [...current];

    if (existingIndex >= 0) {
      updated[existingIndex] = report;
    } else {
      updated.unshift(report);
    }

    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch (error) {
    console.error("Unable to save compliance report:", error);
    return false;
  }
}

function readChecklistStore() {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return {};
    const parsed = safeJsonParse(raw, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.error("Unable to read compliance checklist state:", error);
    return {};
  }
}

function writeChecklistStore(store) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    console.error("Unable to save compliance checklist state:", error);
    return false;
  }
}

function readStandardsCache() {
  try {
    const raw = localStorage.getItem(STANDARDS_CACHE_KEY);
    const parsed = raw ? safeJsonParse(raw, null) : null;

    if (!parsed || !Array.isArray(parsed.results)) return null;
    if (Date.now() - Number(parsed.timestamp || 0) > CACHE_TTL) return null;

    return parsed.results;
  } catch {
    return null;
  }
}

function writeStandardsCache(results) {
  try {
    localStorage.setItem(
      STANDARDS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        results,
      })
    );
  } catch (error) {
    console.warn("Unable to cache standards:", error);
  }
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function firstNonEmpty(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function getText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizeStandard(item, index = 0) {
  if (!isObject(item)) return null;

  const number = getText(
    firstNonEmpty(item.number, item.standard_number, item.is_number, item.code)
  );
  const title = getText(
    firstNonEmpty(item.title, item.name, item.standard_title)
  );

  if (!number && !title) return null;

  return {
    ...item,
    number,
    title: title || "Untitled Standard",
    id: item.id ?? index,
  };
}

function normalizeStandardsResponse(payload) {
  const candidates = [
    payload?.results,
    payload?.standards,
    payload?.data?.results,
    payload?.data?.standards,
    Array.isArray(payload?.data) ? payload.data : null,
    Array.isArray(payload) ? payload : null,
  ];

  const rawResults = candidates.find(Array.isArray) || [];

  return rawResults
    .map((item, index) => normalizeStandard(item, index))
    .filter(Boolean);
}

function normalizeDetailResponse(payload) {
  if (!isObject(payload)) return null;

  const candidates = [
    payload?.standard,
    payload?.data,
    payload,
  ];

  const candidate = candidates.find(isObject);
  return candidate ? normalizeStandard(candidate) : null;
}

function responseMessage(payload, fallback) {
  return getText(
    firstNonEmpty(
      payload?.detail,
      payload?.error,
      payload?.message
    )
  ) || fallback;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text, null) : {};

    if (!response.ok) {
      const error = new Error(
        responseMessage(
          data,
          `Request failed (${response.status}).`
        )
      );
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    if (text && data === null) {
      throw new Error(
        `The service returned an invalid response (${response.status}).`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithFallback(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const targets = [
    `${DIRECT_API_URL}${normalizedPath}`,
    `${API_URL}${normalizedPath}`,
  ].filter((url, index, all) => all.indexOf(url) === index);

  let lastError = null;

  for (const target of targets) {
    try {
      return await fetchJson(target, options);
    } catch (error) {
      lastError = error;
      console.warn(`Compliance API failed: ${target}`, error);
    }
  }

  throw lastError || new Error("Unable to reach the standards service.");
}

function warmBackend() {
  fetch(`${DIRECT_API_URL}/`, { cache: "no-store" }).catch(() => {});
}

function buildRequirements(standard) {
  const certificationValue = getText(
    firstNonEmpty(
      standard?.certification_status,
      standard?.certification_scheme,
      standard?.certification
    )
  );

  const qcoValue = getText(
    firstNonEmpty(
      standard?.qco_information,
      standard?.qco,
      standard?.quality_control_order
    )
  );

  const testingValue = getText(
    firstNonEmpty(
      standard?.testing_provisions,
      standard?.testing,
      standard?.test_method,
      standard?.testing_information
    )
  );

  const sourceUrl = getText(
    firstNonEmpty(standard?.source_url, standard?.url)
  );

  const items = [
    {
      id: "standard",
      category: "Standard",
      title: "Confirm the applicable Indian Standard",
      description:
        "Confirm that this is the correct Indian Standard for the product, process or activity being reviewed.",
      evidence: "Verification check",
    },
    {
      id: "scope",
      category: "Scope",
      title: "Review the standard scope",
      description:
        getText(standard?.scope) ||
        "Review the official BIS scope and applicability information for the selected standard.",
      evidence: getText(standard?.scope)
        ? "From BISense standard record"
        : "Official-source verification needed",
    },
    {
      id: "status",
      category: "Verification",
      title: "Verify the current standard status",
      description:
        `BISense record status: ${getText(standard?.status) || "Not available"}. Verify the latest status, amendments and applicability through BIS before making a decision.`,
      evidence: getText(standard?.status)
        ? "From BISense standard record"
        : "Official-source verification needed",
    },
    {
      id: "edition",
      category: "Documentation",
      title: "Verify the current edition and amendments",
      description:
        getText(standard?.edition_year)
          ? `BISense records edition year ${standard.edition_year}. Confirm the latest edition and all applicable amendments from BIS.`
          : "Confirm the current edition and amendments from the official BIS source.",
      evidence: getText(standard?.edition_year)
        ? "Edition year available"
        : "Official-source verification needed",
    },
    {
      id: "certification",
      category: "Certification",
      title: "Check the applicable conformity or certification route",
      description:
        certificationValue
          ? `Available BISense certification information: ${certificationValue}. Verify the currently applicable conformity assessment route, scheme and conditions with BIS.`
          : "No certification detail is recorded for this standard in the current BISense dataset. Check whether the product is subject to a compulsory certification route or another conformity assessment process.",
      evidence: certificationValue
        ? "Certification data available"
        : "Official-source verification needed",
    },
    {
      id: "qco",
      category: "Regulatory",
      title: "Check whether a Quality Control Order applies",
      description:
        qcoValue
          ? `Available BISense QCO information: ${qcoValue}. Verify the latest government notification and applicability before relying on it.`
          : "No QCO information is currently recorded in BISense. Check current government notifications and BIS information for applicable Quality Control Orders.",
      evidence: qcoValue
        ? "QCO information available"
        : "Official-source verification needed",
    },
    {
      id: "testing",
      category: "Testing",
      title: "Review applicable testing provisions",
      description:
        testingValue ||
        "Review the official standard and applicable BIS information for testing, sampling, evaluation and laboratory requirements.",
      evidence: testingValue
        ? "Testing data available"
        : "Official-source verification needed",
    },
    {
      id: "documentation",
      category: "Documentation",
      title: "Prepare supporting records",
      description:
        "Keep relevant product specifications, manufacturing records, test reports, applications and other supporting evidence organized for the applicable BIS process.",
      evidence: "Process readiness check",
    },
    {
      id: "source",
      category: "Verification",
      title: "Verify the final requirements with BIS",
      description:
        sourceUrl
          ? "Use the linked BIS source together with the standard record to verify the current requirements before taking a certification or legal compliance decision."
          : "Use the official BIS standard source before taking a certification, regulatory or legal compliance decision.",
      evidence: sourceUrl
        ? "Source link available"
        : "Official-source verification needed",
    },
  ];

  return items.map((item) => ({
    ...item,
    completed: false,
  }));
}

function getStatusMeta(status) {
  const value = getText(status).toLowerCase();

  if (!value) {
    return {
      label: "Status not recorded",
      tone: "neutral",
    };
  }

  if (value.includes("withdraw") || value.includes("cancel")) {
    return {
      label: `Record status: ${status}`,
      tone: "critical",
    };
  }

  if (value.includes("draft") || value.includes("proposed")) {
    return {
      label: `Record status: ${status}`,
      tone: "warning",
    };
  }

  return {
    label: `Record status: ${status}`,
    tone: "positive",
  };
}

function getCoverageMeta(standard) {
  const fields = [
    getText(standard?.scope),
    getText(standard?.status),
    getText(standard?.edition_year),
    getText(
      firstNonEmpty(
        standard?.certification_status,
        standard?.certification_scheme,
        standard?.certification
      )
    ),
    getText(
      firstNonEmpty(
        standard?.qco_information,
        standard?.qco,
        standard?.quality_control_order
      )
    ),
  ];

  const available = fields.filter(Boolean).length;
  const total = fields.length;

  return {
    available,
    total,
    percentage: total ? Math.round((available / total) * 100) : 0,
  };
}

function readSavedState(standardNumber) {
  const store = readChecklistStore();
  const entry = store?.[standardNumber];

  if (!entry || typeof entry !== "object") return null;

  return {
    completedIds: Array.isArray(entry.completedIds)
      ? entry.completedIds
      : [],
    notes: getText(entry.notes),
  };
}

function persistChecklistState(standardNumber, requirements, notes) {
  if (!standardNumber) return;

  const store = readChecklistStore();
  store[standardNumber] = {
    completedIds: requirements
      .filter((item) => item.completed)
      .map((item) => item.id),
    notes,
    updatedAt: new Date().toISOString(),
  };

  writeChecklistStore(store);
}

function Compliance() {
  const [standards, setStandards] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState("");
  const [standardData, setStandardData] = useState(null);

  const [requirements, setRequirements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [notes, setNotes] = useState("");
  const [standardQuery, setStandardQuery] = useState("");

  const [loadingStandards, setLoadingStandards] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const [error, setError] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    warmBackend();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadStandards = async () => {
      try {
        setLoadingStandards(true);
        setError("");

        const cached = readStandardsCache();
        if (cached?.length) {
          if (!mounted) return;
          setStandards(cached);
          setUsingCache(true);
          setLastLoadedAt(Date.now());

          if (!selectedStandard) {
            setSelectedStandard(cached[0]?.number || "");
          }
        }

        const data = await fetchWithFallback(
          "/api/standards/search?q=",
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const results = normalizeStandardsResponse(data);

        if (!results.length) {
          throw new Error("The standards service returned no standards.");
        }

        if (!mounted) return;

        setStandards(results);
        setUsingCache(false);
        setLastLoadedAt(Date.now());
        writeStandardsCache(results);

        setSelectedStandard((current) =>
          current && results.some((item) => item.number === current)
            ? current
            : results[0]?.number || ""
        );
      } catch (err) {
        console.error("Loading standards error:", err);

        if (!mounted) return;

        const cached = readStandardsCache();
        if (cached?.length) {
          setStandards(cached);
          setUsingCache(true);
          setLastLoadedAt(Date.now());
          setError(
            "Live standards service is unavailable. Showing the latest cached BISense standard list."
          );
          setSelectedStandard((current) => current || cached[0]?.number || "");
        } else {
          setError(
            err?.message || "Unable to load BIS standards."
          );
        }
      } finally {
        if (mounted) setLoadingStandards(false);
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
      setNotes("");
      setShowSources(false);
      setActiveSourceId(null);
      return undefined;
    }

    let mounted = true;

    const loadStandardDetails = async () => {
      try {
        setLoadingDetails(true);
        setError("");
        setShowSources(false);
        setActiveSourceId(null);
        setReportSaved(false);

        let detail = null;

        try {
          const data = await fetchWithFallback(
            `/api/standards/${encodeURIComponent(selectedStandard)}`,
            {
              method: "GET",
              headers: { Accept: "application/json" },
              cache: "no-store",
            }
          );
          detail = normalizeDetailResponse(data);
        } catch (detailError) {
          console.warn("Direct standard detail lookup failed:", detailError);
        }

        if (!detail) {
          const localMatch = standards.find(
            (item) => item.number === selectedStandard
          );

          if (localMatch) {
            detail = normalizeStandard(localMatch);
          }
        }

        if (!detail) {
          const fallbackData = await fetchWithFallback(
            `/api/standards/search?q=${encodeURIComponent(selectedStandard)}`,
            {
              method: "GET",
              headers: { Accept: "application/json" },
              cache: "no-store",
            }
          );

          const fallbackResults = normalizeStandardsResponse(fallbackData);
          detail =
            fallbackResults.find(
              (item) => item.number === selectedStandard
            ) || fallbackResults[0] || null;
        }

        if (!detail) {
          throw new Error("Unable to resolve the selected standard.");
        }

        if (!mounted) return;

        const built = buildRequirements(detail);
        const savedState = readSavedState(selectedStandard);
        const savedIds = new Set(savedState?.completedIds || []);

        setStandardData(detail);
        setRequirements(
          built.map((item) => ({
            ...item,
            completed: savedIds.has(item.id),
          }))
        );
        setNotes(savedState?.notes || "");
        setSelectedCategory("All");
      } catch (err) {
        console.error("Loading standard details error:", err);

        if (!mounted) return;

        setError(
          err?.message || "Unable to load the selected standard."
        );
        setStandardData(null);
        setRequirements([]);
        setNotes("");
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };

    loadStandardDetails();

    return () => {
      mounted = false;
    };
  }, [selectedStandard, standards]);

  useEffect(() => {
    if (!selectedStandard || requirements.length === 0) return;
    persistChecklistState(selectedStandard, requirements, notes);
  }, [requirements, notes, selectedStandard]);

  const categories = useMemo(
    () => [
      "All",
      ...new Set(requirements.map((item) => item.category)),
    ],
    [requirements]
  );

  const filteredStandards = useMemo(() => {
    const query = standardQuery.trim().toLowerCase();
    if (!query) return standards;

    return standards.filter((standard) =>
      `${standard.number} ${standard.title}`
        .toLowerCase()
        .includes(query)
    );
  }, [standards, standardQuery]);

  const filteredRequirements = useMemo(
    () =>
      requirements.filter(
        (item) =>
          selectedCategory === "All" ||
          item.category === selectedCategory
      ),
    [requirements, selectedCategory]
  );

  const completedCount = requirements.filter(
    (item) => item.completed
  ).length;

  const progress = requirements.length
    ? Math.round((completedCount / requirements.length) * 100)
    : 0;

  const coverage = useMemo(
    () => getCoverageMeta(standardData),
    [standardData]
  );

  const statusMeta = useMemo(
    () => getStatusMeta(standardData?.status),
    [standardData?.status]
  );

  const latestSavedReport = useMemo(() => {
    if (!selectedStandard) return null;

    return readReports()
      .filter((item) => item?.standard === selectedStandard)
      .sort(
        (a, b) =>
          new Date(b?.timestamp || 0).getTime() -
          new Date(a?.timestamp || 0).getTime()
      )[0] || null;
  }, [selectedStandard, reportSaved]);

  const toggleRequirement = (id) => {
    setRequirements((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
    setReportSaved(false);
  };

  const resetChecklist = () => {
    if (standardData) {
      setRequirements(buildRequirements(standardData));
    }

    setNotes("");
    setSelectedCategory("All");
    setShowSources(false);
    setActiveSourceId(null);
    setReportSaved(false);
  };

  const toggleSource = (id) => {
    setActiveSourceId((current) =>
      current === id ? null : id
    );
  };

  const saveCurrentReport = () => {
    if (!standardData || requirements.length === 0) return false;

    const report = {
      title: `Compliance Review — ${
        standardData.number || "Standard"
      }`,
      standard:
        standardData.number || selectedStandard || "",
      standardTitle: standardData.title || "Untitled Standard",
      progress,
      completedCount,
      totalRequirements: requirements.length,
      pendingCount: requirements.length - completedCount,
      notes: notes.trim(),
      coveragePercentage: coverage.percentage,
      coverageAvailable: coverage.available,
      coverageTotal: coverage.total,
      recordStatus: getText(standardData.status) || "Not available",
      editionYear: getText(standardData.edition_year) || "Not available",
      sourceUrl:
        getText(firstNonEmpty(standardData.source_url, standardData.url)) ||
        "",
      timestamp: new Date().toISOString(),
    };

    const success = saveReport(report);

    if (success) {
      setReportSaved(true);
    }

    return success;
  };

  const printReport = () => {
    saveCurrentReport();
    window.print();
  };

  const clearError = () => setError("");

  return (
    <div className="app-page compliance-page">
      <Navbar />

      <main className="page-container compliance-container">
        <div className="page-intro compliance-intro">
          <p className="eyebrow">COMPLIANCE ASSISTANT</p>
          <h1>Turn standards into action.</h1>
          <p>
            Select a BIS standard and convert its available BISense data into
            a trackable review workflow with saved progress, evidence cues and
            source verification.
          </p>
        </div>

        {error && (
          <div
            className="warning-box large-warning compliance-error"
            role="alert"
          >
            <div>
              <strong>Compliance data notice</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="source-toggle"
              onClick={clearError}
              aria-label="Dismiss notice"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="advisor-card compliance-selector-card">
          <div className="selector-heading-row">
            <div>
              <p className="eyebrow">SELECT STANDARD</p>
              <h2>Which BIS standard are you reviewing?</h2>
              <p className="step-description">
                Search the BISense knowledge base, then load the selected
                standard record.
              </p>
            </div>

            <div className="selector-meta">
              <span className="data-chip">
                {standards.length || 0} standards available
              </span>
              {usingCache && (
                <span className="data-chip subtle-chip">Cached list</span>
              )}
            </div>
          </div>

          <div className="compliance-selector-grid">
            <div>
              <label
                className="compliance-field-label"
                htmlFor="standard-search"
              >
                Search standards
              </label>
              <input
                id="standard-search"
                className="full-input"
                value={standardQuery}
                onChange={(event) => setStandardQuery(event.target.value)}
                placeholder="Search by IS number or title..."
                autoComplete="off"
              />
            </div>

            <div>
              <label
                className="compliance-field-label"
                htmlFor="standard-select"
              >
                Selected standard
              </label>
              <select
                id="standard-select"
                className="full-input compliance-standard-select"
                value={selectedStandard}
                onChange={(event) => {
                  setSelectedStandard(event.target.value);
                  setReportSaved(false);
                }}
                disabled={loadingStandards || loadingDetails}
              >
                {loadingStandards && !standards.length ? (
                  <option value="">Loading standards...</option>
                ) : (
                  <>
                    <option value="">Select a standard</option>
                    {filteredStandards.map((standard, index) => (
                      <option
                        key={
                          standard?.number || `standard-${index}`
                        }
                        value={standard?.number || ""}
                      >
                        {standard?.number} — {standard?.title}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {!loadingStandards && standardQuery.trim() && (
            <p className="selector-result-count">
              Showing {filteredStandards.length} matching standard
              {filteredStandards.length === 1 ? "" : "s"}.
            </p>
          )}

          {standardData && (
            <div className="result-highlight">
              <span>SELECTED STANDARD</span>
              <strong>{standardData.number}</strong>
              <p>{standardData.title || "Untitled Standard"}</p>
            </div>
          )}
        </section>

        <section className="compliance-summary smart-summary">
          <div>
            <span>SELECTED STANDARD</span>
            <strong>{standardData?.number || "Not selected"}</strong>
          </div>

          <div>
            <span>CHECKLIST</span>
            <strong>
              {completedCount}/{requirements.length}
            </strong>
          </div>

          <div>
            <span>REVIEW PROGRESS</span>
            <strong>{progress}%</strong>
          </div>

          <div>
            <span>RECORD COVERAGE</span>
            <strong>{coverage.percentage}%</strong>
          </div>

          <div className="progress-track smart-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </section>

        {standardData && (
          <section className="compliance-context-card">
            <div className="context-primary">
              <p className="eyebrow">STANDARD CONTEXT</p>
              <h2>{standardData.title || "Untitled Standard"}</h2>
              <p>
                Use this context panel as a quick review before working through
                the checklist. The labels below reflect the BISense record and
                are not an official BIS determination.
              </p>
            </div>

            <div className="context-metrics">
              <div className="context-metric">
                <span>STATUS</span>
                <strong className={`status-${statusMeta.tone}`}>
                  {statusMeta.label}
                </strong>
              </div>

              <div className="context-metric">
                <span>EDITION</span>
                <strong>
                  {getText(standardData.edition_year) || "Not recorded"}
                </strong>
              </div>

              <div className="context-metric">
                <span>DATA COVERAGE</span>
                <strong>
                  {coverage.available}/{coverage.total} key fields
                </strong>
              </div>
            </div>

            <div className="context-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowSources((current) => !current)}
              >
                {showSources ? "Hide Source Info" : "View Source Info"}
              </button>
            </div>
          </section>
        )}

        {requirements.length > 0 && (
          <div className="compliance-toolbar">
            <div className="compliance-filters">
              <span>FILTER:</span>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    selectedCategory === category ? "filter-active" : ""
                  }
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
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

        <section className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="eyebrow">CHECKLIST</p>
              <h2>Compliance review</h2>
              <p className="checklist-subtitle">
                Complete an item after you have reviewed the relevant evidence
                or official source.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={printReport}
              disabled={requirements.length === 0}
            >
              🖨 Print
            </button>
          </div>

          {loadingDetails ? (
            <div className="loading-container compliance-loading">
              <div className="loading-spinner" />
              <span>Loading standard information...</span>
            </div>
          ) : requirements.length > 0 ? (
            <div className="checklist-items">
              {filteredRequirements.map((item) => (
                <div
                  key={item.id}
                  className={`check-item ${item.completed ? "checked" : ""}`}
                >
                  <label className="check-item-main">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completed)}
                      onChange={() => toggleRequirement(item.id)}
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
                      <small className="check-evidence">
                        {item.evidence}
                      </small>
                    </span>
                  </label>

                  <button
                    type="button"
                    className="source-toggle"
                    onClick={() => toggleSource(item.id)}
                    aria-expanded={activeSourceId === item.id}
                  >
                    {activeSourceId === item.id ? "Hide Source" : "Source"}
                  </button>

                  {activeSourceId === item.id && (
                    <div className="inline-source-panel">
                      <p className="eyebrow">SOURCE</p>
                      <p>
                        {standardData?.source_url
                          ? "Use the linked source to verify this checklist item against the official BIS information for the selected standard."
                          : "Verify this checklist item against the official BIS source for the selected standard."}
                      </p>

                      {standardData?.source_url && (
                        <a
                          href={standardData.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open Official BIS Source →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Select a BIS standard</h3>
              <p>
                Choose a standard above to generate its review checklist.
              </p>
            </div>
          )}
        </section>

        {showSources && standardData && (
          <section className="source-panel compliance-source-panel">
            <div>
              <p className="eyebrow">SOURCE INFORMATION</p>
              <h2>Verify the requirements.</h2>
              <p>
                The checklist uses the selected standard&apos;s available
                BISense record. Missing fields are intentionally shown as
                verification tasks instead of being filled with guessed data.
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
              Record observations, pending tasks or internal review notes.
              Notes are saved locally for the selected standard.
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

        <section className="compliance-report">
          <div>
            <p className="eyebrow">REPORT</p>
            <h2>Your compliance summary is ready.</h2>
            <p>
              Save the current review or print a summary containing checklist
              progress, standard context, data coverage and your notes.
            </p>
          </div>

          <div className="report-actions">
            <button
              type="button"
              className="secondary-btn large"
              onClick={saveCurrentReport}
              disabled={requirements.length === 0}
            >
              Save Report
            </button>

            <button
              type="button"
              className="primary-btn large"
              onClick={printReport}
              disabled={requirements.length === 0}
            >
              🖨 Print Report
            </button>
          </div>

          {(reportSaved || latestSavedReport) && (
            <div className="compliance-save-message" role="status">
              ✓ {reportSaved ? "Report saved to your dashboard." : "Saved review found for this standard."}
              {latestSavedReport?.timestamp && (
                <span className="saved-time">
                  {" "}
                  {new Date(latestSavedReport.timestamp).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </section>

        <div className="compliance-note">
          <strong>Important:</strong>{" "}
          BISense provides AI-assisted information discovery and organization
          tools. Checklist progress represents review activity, not an official
          certification or legal compliance determination. Always verify the
          current requirements through official BIS sources.
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
        .compliance-page span,
        .compliance-page small {
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
        .empty-state p,
        .compliance-context-card h2,
        .compliance-context-card p {
          color: #111827 !important;
        }

        .compliance-standard-select,
        .compliance-selector-card input {
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

        .compliance-standard-select:focus,
        .compliance-selector-card input:focus {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .compliance-error {
          color: #991b1b !important;
          overflow-wrap: anywhere;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .compliance-error p {
          margin: 6px 0 0;
          color: #991b1b !important;
        }

        .selector-heading-row,
        .compliance-context-card {
          min-width: 0;
        }

        .selector-heading-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .selector-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .data-chip {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 7px 10px;
          border: 1px solid #dbe2ea;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569 !important;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .subtle-chip {
          color: #64748b !important;
        }

        .compliance-selector-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 14px;
          margin-top: 22px;
        }

        .compliance-field-label {
          display: block;
          margin-bottom: 7px;
          color: #475569 !important;
          font-size: 13px;
          font-weight: 750;
        }

        .selector-result-count {
          margin: 10px 0 0;
          color: #64748b !important;
          font-size: 13px;
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

        .smart-summary {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .smart-summary .smart-progress-track {
          grid-column: 1 / -1;
        }

        .compliance-context-card {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
          margin: 18px 0 20px;
          padding: 22px;
          border: 1px solid #e4e9f0;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .context-primary {
          min-width: 0;
        }

        .context-primary h2 {
          margin: 4px 0 8px;
          font-size: clamp(20px, 2vw, 28px);
          line-height: 1.18;
        }

        .context-primary p:last-child {
          margin: 0;
          color: #64748b !important;
          line-height: 1.55;
        }

        .context-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          min-width: 0;
        }

        .context-metric {
          min-width: 0;
          padding: 12px;
          border: 1px solid #e7ebf0;
          border-radius: 12px;
          background: #f8fafc;
        }

        .context-metric span {
          display: block;
          margin-bottom: 5px;
          color: #64748b !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
        }

        .context-metric strong {
          display: block;
          color: #111827 !important;
          font-size: 13px;
          line-height: 1.35;
        }

        .status-positive {
          color: #166534 !important;
        }

        .status-warning {
          color: #92400e !important;
        }

        .status-critical {
          color: #991b1b !important;
        }

        .status-neutral {
          color: #475569 !important;
        }

        .context-actions {
          display: flex;
          justify-content: flex-end;
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

        .check-evidence {
          display: inline-block;
          margin-top: 8px;
          color: #64748b !important;
          font-size: 11px;
          font-weight: 700;
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

        .compliance-source-panel {
          width: 100%;
          box-sizing: border-box;
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

        .saved-time {
          color: #64748b !important;
          font-size: 12px;
          font-weight: 600;
        }

        .compliance-note {
          overflow-wrap: anywhere;
          color: #5f6b7c;
        }

        @media (max-width: 1100px) {
          .compliance-context-card {
            grid-template-columns: minmax(0, 1fr) auto;
          }

          .context-metrics {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 900px) {
          .compliance-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .compliance-summary .progress-track {
            grid-column: 1 / -1;
          }

          .compliance-selector-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .compliance-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .compliance-intro h1 {
            font-size: clamp(30px, 8vw, 42px) !important;
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
          .compliance-report,
          .compliance-context-card {
            width: 100% !important;
            box-sizing: border-box;
          }

          .selector-heading-row {
            flex-direction: column;
          }

          .selector-meta {
            justify-content: flex-start;
          }

          .compliance-summary {
            grid-template-columns: 1fr !important;
          }

          .compliance-summary .progress-track {
            grid-column: auto;
          }

          .compliance-context-card {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .context-metrics {
            grid-column: auto;
            grid-template-columns: 1fr;
          }

          .context-actions {
            justify-content: stretch;
          }

          .context-actions button {
            width: 100%;
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

          .compliance-error {
            flex-direction: column;
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
          .compliance-report,
          .compliance-context-card {
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
          .inline-source-panel,
          .selector-meta,
          .compliance-selector-grid,
          .context-actions {
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
          .compliance-report,
          .compliance-context-card {
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
