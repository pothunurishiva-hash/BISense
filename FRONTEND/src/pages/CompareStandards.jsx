import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "";
const BACKEND_URL = "https://bisense-5ozn.onrender.com";

const STANDARDS_CACHE_KEY = "bisense_standards_compare_cache_v1";
const STANDARDS_CACHE_TTL = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 25000;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStandardNumber(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getStandardsArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.results,
    payload?.standards,
    payload?.items,
    payload?.data,
    payload?.data?.results,
    payload?.data?.standards,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

async function fetchWithTimeout(
  url,
  options = {},
  timeout = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function readPayload(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const raw = await response.text();

    if (!raw.trim()) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  } catch {
    return null;
  }
}

async function requestJson(url) {
  const response = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
    REQUEST_TIMEOUT_MS
  );

  const payload = await readPayload(response);

  return {
    response,
    payload,
  };
}

function readCachedStandards() {
  try {
    const raw = sessionStorage.getItem(STANDARDS_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw);

    if (
      !cached?.timestamp ||
      Date.now() - Number(cached.timestamp) >
        STANDARDS_CACHE_TTL
    ) {
      sessionStorage.removeItem(
        STANDARDS_CACHE_KEY
      );
      return null;
    }

    const standards = getStandardsArray(
      cached.data
    );

    return standards.length ? standards : null;
  } catch {
    return null;
  }
}

function saveCachedStandards(standards) {
  try {
    sessionStorage.setItem(
      STANDARDS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: standards,
      })
    );
  } catch {
    // Ignore storage quota/privacy errors.
  }
}

async function warmBackend() {
  try {
    await fetchWithTimeout(
      `${BACKEND_URL}/`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
      12000
    );
  } catch {
    // Warm-up is intentionally non-blocking.
  }
}

async function fetchAllStandards() {
  const cached = readCachedStandards();

  if (cached?.length) {
    return cached;
  }

  // Warm Render in the background; do not make the UI wait for it.
  warmBackend();

  const urls = [
    `${BACKEND_URL}/api/standards/search?q=`,
    `${API_BASE}/api/standards/search?q=`,
    `${BACKEND_URL}/api/standards/search?q=IS`,
    `${API_BASE}/api/standards/search?q=IS`,
  ];

  let lastStatus = 0;

  for (const url of urls) {
    try {
      const { response, payload } =
        await requestJson(url);

      lastStatus = response?.status || 0;

      if (!response?.ok) {
        continue;
      }

      const standards = getStandardsArray(
        payload
      );

      if (standards.length) {
        saveCachedStandards(standards);
        return standards;
      }
    } catch (error) {
      console.warn(
        "Compare standards request failed:",
        error
      );
    }
  }

  throw new Error(
    lastStatus
      ? `The BIS standards service returned HTTP ${lastStatus}.`
      : "The BIS standards service could not be reached."
  );
}

function getFallbackStandardFromList(
  standards,
  number
) {
  const wanted = normalizeStandardNumber(number);

  return (
    standards.find(
      (item) =>
        normalizeStandardNumber(item?.number) ===
        wanted
    ) || null
  );
}

async function fetchStandardDetails(
  number,
  standards
) {
  const encoded = encodeURIComponent(number);

  const urls = [
    `${BACKEND_URL}/api/standards/${encoded}`,
    `${API_BASE}/api/standards/${encoded}`,
  ];

  for (const url of urls) {
    try {
      const { response, payload } =
        await requestJson(url);

      if (response?.ok && payload) {
        return payload;
      }
    } catch (error) {
      console.warn(
        `Unable to load ${number} from ${url}:`,
        error
      );
    }
  }

  // Compatibility fallback for deployments where the
  // individual detail route is unavailable.
  const fallback =
    getFallbackStandardFromList(
      standards,
      number
    );

  if (fallback) {
    return fallback;
  }

  throw new Error(
    `Unable to load ${number}.`
  );
}

function valueOrUnavailable(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "Not available";
  }

  return String(value);
}

function getFieldValue(data, field) {
  const value = data?.[field];

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "";
  }

  return String(value).trim();
}

function getComparisonSignals(dataA, dataB) {
  const signals = [];

  const yearA = Number(dataA?.edition_year);
  const yearB = Number(dataB?.edition_year);

  if (
    Number.isFinite(yearA) &&
    Number.isFinite(yearB)
  ) {
    if (yearA === yearB) {
      signals.push({
        label: "Same edition year",
        tone: "neutral",
      });
    } else {
      signals.push({
        label:
          yearA > yearB
            ? `${dataA.number} has the later edition year`
            : `${dataB.number} has the later edition year`,
        tone: "highlight",
      });
    }
  }

  const categoryA = getFieldValue(
    dataA,
    "category"
  );
  const categoryB = getFieldValue(
    dataB,
    "category"
  );

  if (
    categoryA &&
    categoryB &&
    normalize(categoryA) === normalize(categoryB)
  ) {
    signals.push({
      label: "Same category",
      tone: "neutral",
    });
  } else if (categoryA || categoryB) {
    signals.push({
      label: "Different category labels",
      tone: "highlight",
    });
  }

  const statusA = getFieldValue(
    dataA,
    "status"
  );
  const statusB = getFieldValue(
    dataB,
    "status"
  );

  if (
    statusA &&
    statusB &&
    normalize(statusA) !== normalize(statusB)
  ) {
    signals.push({
      label: "Different status",
      tone: "highlight",
    });
  }

  const certificationA = getFieldValue(
    dataA,
    "certification_scheme"
  );
  const certificationB = getFieldValue(
    dataB,
    "certification_scheme"
  );

  if (
    certificationA ||
    certificationB
  ) {
    if (
      normalize(certificationA) !==
      normalize(certificationB)
    ) {
      signals.push({
        label: "Certification fields differ",
        tone: "highlight",
      });
    } else {
      signals.push({
        label: "Certification fields match",
        tone: "neutral",
      });
    }
  }

  const qcoA = getFieldValue(
    dataA,
    "qco_information"
  );
  const qcoB = getFieldValue(
    dataB,
    "qco_information"
  );

  if (qcoA || qcoB) {
    if (
      normalize(qcoA) !==
      normalize(qcoB)
    ) {
      signals.push({
        label: "QCO information differs",
        tone: "highlight",
      });
    }
  }

  return signals.slice(0, 5);
}

function buildDifferenceRows(
  dataA,
  dataB
) {
  const fields = [
    {
      category: "Standard Number",
      field: "number",
    },
    {
      category: "Title",
      field: "title",
    },
    {
      category: "Category",
      field: "category",
    },
    {
      category: "Scope",
      field: "scope",
    },
    {
      category: "Status",
      field: "status",
    },
    {
      category: "Edition Year",
      field: "edition_year",
    },
    {
      category: "Certification Scheme",
      field: "certification_scheme",
    },
    {
      category: "Certification Status",
      field: "certification_status",
    },
    {
      category: "QCO Information",
      field: "qco_information",
    },
    {
      category: "Official Source",
      field: "source_name",
    },
  ];

  return fields.map((item) => {
    const rawA = dataA?.[item.field];
    const rawB = dataB?.[item.field];

    const a =
      rawA === null ||
      rawA === undefined ||
      String(rawA).trim() === ""
        ? "Not available"
        : String(rawA);

    const b =
      rawB === null ||
      rawB === undefined ||
      String(rawB).trim() === ""
        ? "Not available"
        : String(rawB);

    return {
      category: item.category,
      a,
      b,
      different:
        normalize(a) !== normalize(b),
    };
  });
}

function buildSmartSummary(
  dataA,
  dataB,
  signals
) {
  const points = [];

  const titleA = getFieldValue(
    dataA,
    "title"
  );
  const titleB = getFieldValue(
    dataB,
    "title"
  );

  const categoryA = getFieldValue(
    dataA,
    "category"
  );
  const categoryB = getFieldValue(
    dataB,
    "category"
  );

  const yearA = Number(dataA?.edition_year);
  const yearB = Number(dataB?.edition_year);

  if (
    titleA &&
    titleB
  ) {
    points.push(
      `${dataA.number} covers “${titleA}”, while ${dataB.number} covers “${titleB}”.`
    );
  }

  if (
    categoryA &&
    categoryB
  ) {
    points.push(
      normalize(categoryA) === normalize(categoryB)
        ? `Both records are classified under ${categoryA}, so the detailed scope and requirement fields are especially useful for the comparison.`
        : `The records are classified differently: ${dataA.number} is under ${categoryA}, while ${dataB.number} is under ${categoryB}.`
    );
  }

  if (
    Number.isFinite(yearA) &&
    Number.isFinite(yearB) &&
    yearA !== yearB
  ) {
    const later =
      yearA > yearB
        ? dataA.number
        : dataB.number;

    points.push(
      `The edition years differ (${yearA} vs ${yearB}); ${later} has the later edition year in the available BISense data.`
    );
  }

  const changedFields =
    signals.filter(
      (signal) =>
        signal.tone === "highlight"
    );

  if (changedFields.length) {
    points.push(
      `BISense detected ${changedFields.length} notable comparison signal${changedFields.length === 1 ? "" : "s"} in the available structured fields.`
    );
  }

  points.push(
    "This is a structured comparison of the information available to BISense. It is not an official BIS determination of applicability, equivalence, certification, or compliance."
  );

  return points;
}

function CompareStandards() {
  const [standards, setStandards] = useState([]);

  const [standardA, setStandardA] = useState("");
  const [standardB, setStandardB] = useState("");

  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);

  const [loadingStandards, setLoadingStandards] =
    useState(true);
  const [loadingComparison, setLoadingComparison] =
    useState(false);

  const [showComparison, setShowComparison] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadStandards = async () => {
      setLoadingStandards(true);
      setError("");

      try {
        const results =
          await fetchAllStandards();

        if (!mounted) {
          return;
        }

        setStandards(results);

        if (results.length >= 2) {
          setStandardA(
            results[0]?.number || ""
          );
          setStandardB(
            results[1]?.number || ""
          );
        } else if (
          results.length === 1
        ) {
          setStandardA(
            results[0]?.number || ""
          );
        }
      } catch (err) {
        console.error(
          "Could not load comparison standards:",
          err
        );

        if (!mounted) {
          return;
        }

        setStandards([]);
        setError(
          "Unable to load BIS standards from the backend. The service may still be waking up."
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

  const selectedA = useMemo(() => {
    return standards.find(
      (item) =>
        normalizeStandardNumber(
          item?.number
        ) ===
        normalizeStandardNumber(
          standardA
        )
    );
  }, [standards, standardA]);

  const selectedB = useMemo(() => {
    return standards.find(
      (item) =>
        normalizeStandardNumber(
          item?.number
        ) ===
        normalizeStandardNumber(
          standardB
        )
    );
  }, [standards, standardB]);

  const handleCompare = async () => {
    if (!standardA || !standardB) {
      setError(
        "Please select two standards."
      );
      setShowComparison(false);
      return;
    }

    if (
      normalizeStandardNumber(
        standardA
      ) ===
      normalizeStandardNumber(
        standardB
      )
    ) {
      setError(
        "Please select two different standards."
      );
      setShowComparison(false);
      return;
    }

    setLoadingComparison(true);
    setError("");
    setShowComparison(false);

    try {
      const [resultA, resultB] =
        await Promise.all([
          fetchStandardDetails(
            standardA,
            standards
          ),
          fetchStandardDetails(
            standardB,
            standards
          ),
        ]);

      setDataA(resultA);
      setDataB(resultB);
      setShowComparison(true);
    } catch (err) {
      console.error(
        "Standard comparison failed:",
        err
      );

      setDataA(null);
      setDataB(null);

      setError(
        err?.name === "AbortError"
          ? "The BIS standards service took too long to respond. Please try again."
          : err?.message ||
              "Unable to load the selected standards."
      );
    } finally {
      setLoadingComparison(false);
    }
  };

  const comparisonRows = useMemo(() => {
    if (!dataA || !dataB) {
      return [];
    }

    return buildDifferenceRows(
      dataA,
      dataB
    );
  }, [dataA, dataB]);

  const comparisonSignals = useMemo(() => {
    if (!dataA || !dataB) {
      return [];
    }

    return getComparisonSignals(
      dataA,
      dataB
    );
  }, [dataA, dataB]);

  const changedRows = useMemo(() => {
    return comparisonRows.filter(
      (row) => row.different
    );
  }, [comparisonRows]);

  const smartSummary = useMemo(() => {
    if (!dataA || !dataB) {
      return [];
    }

    return buildSmartSummary(
      dataA,
      dataB,
      comparisonSignals
    );
  }, [
    dataA,
    dataB,
    comparisonSignals,
  ]);

  const selectStyle = {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #D7DFEA",
    borderRadius: "12px",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    WebkitTextFillColor: "#111827",
    fontSize: "15px",
    lineHeight: "1.4",
    outline: "none",
    boxSizing: "border-box",
    appearance: "auto",
  };

  const openSource = (url) => {
    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container compare-page">
        <style>
          {`
            .compare-page,
            .compare-page * {
              color-scheme: light;
            }

            .compare-page .page-intro,
            .compare-page .page-intro * {
              -webkit-text-fill-color: initial;
            }

            .compare-page .page-intro h1,
            .compare-page .page-intro h2,
            .compare-page .page-intro p,
            .compare-page label,
            .compare-page .vs,
            .compare-page .overview-card strong,
            .compare-page .overview-card p,
            .compare-page .results-header h2,
            .compare-page .results-header p,
            .compare-page .comparison-table td,
            .compare-page .comparison-table th,
            .compare-page .ai-summary-box h2,
            .compare-page .ai-summary-box p {
              -webkit-text-fill-color: initial;
            }

            .compare-page select,
            .compare-page select option {
              background-color: #FFFFFF !important;
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .compare-page .comparison-table {
              color: #111827;
            }

            .compare-page .comparison-table th {
              color: #111827 !important;
            }

            .compare-page .comparison-table td {
              color: #374151 !important;
            }

            .compare-page .comparison-table td strong {
              color: #111827 !important;
            }

            .compare-page .ai-summary-box {
              color: #111827;
            }

            .compare-page .ai-summary-box * {
              -webkit-text-fill-color: initial;
            }

            .compare-page .source-card {
              color: #FFFFFF;
            }

            .compare-page .source-card * {
              color: #FFFFFF;
            }

            .compare-smart-signals {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin: 18px 0 22px;
            }

            .compare-smart-signal {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              padding: 8px 11px;
              border-radius: 999px;
              background: #F2F5F7;
              border: 1px solid #E0E6EA;
              color: #334155 !important;
              font-size: 12px;
              font-weight: 650;
            }

            .compare-smart-signal.highlight {
              background: #EDF5F6;
              border-color: #C8DCDD;
            }

            .compare-smart-signal-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #247A82;
              flex: 0 0 auto;
            }

            .compare-difference-card {
              margin-top: 22px;
              padding: 24px;
              border: 1px solid #DDE5EA;
              border-radius: 22px;
              background: #FFFFFF;
            }

            .compare-difference-card .eyebrow {
              margin-bottom: 7px;
            }

            .compare-difference-card h3 {
              margin: 0;
              color: #111827 !important;
              font-size: 22px;
              letter-spacing: -0.5px;
            }

            .compare-difference-card > p {
              margin-top: 8px;
              color: #607083 !important;
              font-size: 13px;
              line-height: 1.55;
            }

            .compare-difference-list {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }

            .compare-difference-item {
              padding: 14px;
              border-radius: 15px;
              background: #F8FAFB;
              border: 1px solid #E6ECEF;
            }

            .compare-difference-item span {
              display: block;
              margin-bottom: 8px;
              color: #7A8795 !important;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.7px;
              text-transform: uppercase;
            }

            .compare-difference-item strong {
              color: #111827 !important;
              font-size: 13px;
              line-height: 1.45;
            }

            .compare-smart-summary {
              margin-top: 22px;
              display: grid;
              grid-template-columns: 1.15fr 0.85fr;
              gap: 18px;
            }

            .compare-smart-summary-card {
              padding: 22px;
              border-radius: 20px;
              border: 1px solid #DEE6EA;
              background: #FFFFFF;
            }

            .compare-smart-summary-card.dark {
              background: #111827;
              border-color: #111827;
              color: #FFFFFF;
            }

            .compare-smart-summary-card.dark * {
              color: #FFFFFF !important;
            }

            .compare-smart-summary-card h3 {
              margin-top: 5px;
              color: #111827 !important;
              font-size: 22px;
              letter-spacing: -0.6px;
            }

            .compare-smart-summary-card.dark h3 {
              color: #FFFFFF !important;
            }

            .compare-smart-summary-card .eyebrow {
              margin: 0;
            }

            .compare-smart-summary-points {
              margin: 16px 0 0;
              padding-left: 18px;
            }

            .compare-smart-summary-points li {
              margin-bottom: 9px;
              color: #526274 !important;
              font-size: 13px;
              line-height: 1.55;
            }

            .compare-smart-summary-card.dark .compare-smart-summary-points li {
              color: #D8DEE7 !important;
            }

            .compare-next-actions {
              display: grid;
              gap: 10px;
              margin-top: 16px;
            }

            .compare-next-action {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
              padding: 13px 14px;
              border-radius: 14px;
              background: rgba(255,255,255,0.08);
              border: 1px solid rgba(255,255,255,0.12);
              color: #FFFFFF !important;
            }

            .compare-next-action-copy strong {
              display: block;
              color: #FFFFFF !important;
              font-size: 13px;
            }

            .compare-next-action-copy span {
              display: block;
              margin-top: 3px;
              color: #BFC7D2 !important;
              font-size: 11px;
              line-height: 1.45;
            }

            .compare-next-action-arrow {
              color: #FFFFFF !important;
              font-size: 18px;
              flex: 0 0 auto;
            }

            .compare-source-links {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              margin-top: 16px;
            }

            .compare-source-link {
              padding: 12px 13px;
              border-radius: 13px;
              border: 1px solid rgba(255,255,255,0.15);
              background: rgba(255,255,255,0.06);
              color: #FFFFFF !important;
              font-size: 12px;
              font-weight: 650;
              cursor: pointer;
              text-align: left;
            }

            .compare-source-link:hover {
              background: rgba(255,255,255,0.10);
            }

            .compare-loading-card {
              margin-top: 22px;
              padding: 20px;
              border-radius: 18px;
              background: #FFFFFF;
              border: 1px solid #E3E8EC;
              color: #536273 !important;
              font-size: 13px;
            }

            @media (max-width: 700px) {
              .compare-page {
                width: 100%;
                min-width: 0;
                overflow-x: hidden;
              }

              .compare-page .page-intro h1 {
                color: #111827 !important;
                font-size: 35px !important;
                line-height: 1.05 !important;
              }

              .compare-page .page-intro p {
                color: #4F607A !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
              }

              .compare-page .compare-selectors {
                grid-template-columns: 1fr !important;
                gap: 14px !important;
              }

              .compare-page .compare-selectors .vs {
                margin: 0 auto;
              }

              .compare-page .compare-selectors > div,
              .compare-page .compare-selectors > button {
                width: 100%;
              }

              .compare-page .comparison-overview {
                grid-template-columns: 1fr !important;
              }

              .compare-page .comparison-results-header {
                align-items: stretch !important;
              }

              .compare-page
                .comparison-results-header
                .secondary-btn {
                width: 100%;
              }

              .compare-page
                .comparison-table-wrapper {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }

              .compare-page .comparison-table {
                min-width: 650px;
              }

              .compare-page .ai-summary-box {
                padding: 20px !important;
              }

              .compare-page .comparison-summary-grid {
                grid-template-columns: 1fr !important;
              }

              .compare-difference-list,
              .compare-smart-summary,
              .compare-source-links {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>

        <div className="page-intro">
          <p className="eyebrow">
            STANDARD COMPARISON
          </p>

          <h1>
            See the difference clearly.
          </h1>

          <p>
            Compare two Indian Standards side by side
            and let BISense surface the important
            differences in the available data.
          </p>
        </div>

        {error && (
          <div
            className="error-state"
            role="alert"
          >
            <h3>
              Standards service needs attention
            </h3>
            <p>{error}</p>

            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                window.location.reload();
              }}
            >
              Try Again
            </button>
          </div>
        )}

        <section className="compare-selectors">
          <div>
            <label
              htmlFor="standard-a"
              style={{
                color: "#111827",
                WebkitTextFillColor:
                  "#111827",
              }}
            >
              STANDARD A
            </label>

            <select
              id="standard-a"
              value={standardA}
              onChange={(event) => {
                setStandardA(
                  event.target.value
                );
                setShowComparison(false);
                setError("");
              }}
              disabled={
                loadingStandards ||
                loadingComparison
              }
              style={selectStyle}
            >
              <option
                value=""
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                }}
              >
                {loadingStandards
                  ? "Connecting to BIS..."
                  : "Select a standard"}
              </option>

              {standards.map(
                (standard) => (
                  <option
                    key={`a-${standard.number}`}
                    value={
                      standard.number
                    }
                    style={{
                      backgroundColor:
                        "#FFFFFF",
                      color: "#111827",
                    }}
                  >
                    {standard.number}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="vs">
            VS
          </div>

          <div>
            <label
              htmlFor="standard-b"
              style={{
                color: "#111827",
                WebkitTextFillColor:
                  "#111827",
              }}
            >
              STANDARD B
            </label>

            <select
              id="standard-b"
              value={standardB}
              onChange={(event) => {
                setStandardB(
                  event.target.value
                );
                setShowComparison(false);
                setError("");
              }}
              disabled={
                loadingStandards ||
                loadingComparison
              }
              style={selectStyle}
            >
              <option
                value=""
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                }}
              >
                {loadingStandards
                  ? "Connecting to BIS..."
                  : "Select a standard"}
              </option>

              {standards.map(
                (standard) => (
                  <option
                    key={`b-${standard.number}`}
                    value={
                      standard.number
                    }
                    style={{
                      backgroundColor:
                        "#FFFFFF",
                      color: "#111827",
                    }}
                  >
                    {standard.number}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={handleCompare}
            disabled={
              loadingStandards ||
              loadingComparison
            }
          >
            {loadingComparison
              ? "Analyzing..."
              : "Compare →"}
          </button>
        </section>

        <div className="comparison-overview">
          <div className="overview-card">
            <span>STANDARD A</span>

            <strong>
              {selectedA?.number ||
                "Not selected"}
            </strong>

            <p>
              {selectedA?.title ||
                "Choose a standard above."}
            </p>
          </div>

          <div className="overview-card">
            <span>STANDARD B</span>

            <strong>
              {selectedB?.number ||
                "Not selected"}
            </strong>

            <p>
              {selectedB?.title ||
                "Choose a standard above."}
            </p>
          </div>
        </div>

        {loadingComparison && (
          <div className="compare-loading-card">
            BISense is retrieving both standard
            records and preparing the structured
            comparison...
          </div>
        )}

        {showComparison &&
          dataA &&
          dataB && (
            <>
              <div className="results-header comparison-results-header">
                <div>
                  <h2>
                    Detailed comparison
                  </h2>

                  <p>
                    Structured comparison plus
                    BISense analysis of the
                    differences visible in the
                    available records.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    window.print()
                  }
                >
                  🖨 Print
                </button>
              </div>

              {comparisonSignals.length >
                0 && (
                <div
                  className="compare-smart-signals"
                  aria-label="Comparison signals"
                >
                  {comparisonSignals.map(
                    (signal) => (
                      <span
                        key={
                          signal.label
                        }
                        className={`compare-smart-signal ${signal.tone}`}
                      >
                        <span className="compare-smart-signal-dot" />
                        {signal.label}
                      </span>
                    )
                  )}
                </div>
              )}

              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>
                        Category
                      </th>

                      <th>
                        {dataA.number}
                      </th>

                      <th>
                        {dataB.number}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonRows.map(
                      (row) => (
                        <tr
                          key={
                            row.category
                          }
                          className={
                            row.different
                              ? "comparison-row-different"
                              : ""
                          }
                        >
                          <td>
                            <strong>
                              {row.category}
                            </strong>
                          </td>

                          <td>
                            {row.a}
                          </td>

                          <td>
                            {row.b}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <section className="compare-difference-card">
                <p className="eyebrow">
                  DIFFERENCE SPOTLIGHT
                </p>

                <h3>
                  {changedRows.length ===
                  0
                    ? "No differences detected in the available comparison fields."
                    : `${changedRows.length} comparison field${changedRows.length === 1 ? "" : "s"} differ`}
                </h3>

                <p>
                  BISense highlights structured
                  differences only. A difference
                  does not automatically mean one
                  standard replaces, overrides or is
                  more applicable than the other.
                </p>

                {changedRows.length >
                  0 && (
                  <div className="compare-difference-list">
                    {changedRows
                      .slice(0, 6)
                      .map(
                        (row) => (
                          <div
                            className="compare-difference-item"
                            key={
                              row.category
                            }
                          >
                            <span>
                              {row.category}
                            </span>

                            <strong>
                              {row.a} ↔ {row.b}
                            </strong>
                          </div>
                        )
                      )}
                  </div>
                )}
              </section>

              <div className="compare-smart-summary">
                <section className="compare-smart-summary-card">
                  <p className="eyebrow">
                    BISENSE ANALYSIS
                  </p>

                  <h3>
                    What changed?
                  </h3>

                  <ul className="compare-smart-summary-points">
                    {smartSummary.map(
                      (point, index) => (
                        <li
                          key={`${point}-${index}`}
                        >
                          {point}
                        </li>
                      )
                    )}
                  </ul>
                </section>

                <section className="compare-smart-summary-card dark">
                  <p className="eyebrow">
                    CONTINUE THE WORKFLOW
                  </p>

                  <h3>
                    What do you want to do next?
                  </h3>

                  <div className="compare-next-actions">
                    <Link
                      to="/copilot"
                      className="compare-next-action"
                    >
                      <span className="compare-next-action-copy">
                        <strong>
                          Ask BIS AI
                        </strong>
                        <span>
                          Explain the comparison
                          in plain language.
                        </span>
                      </span>

                      <span className="compare-next-action-arrow">
                        →
                      </span>
                    </Link>

                    <Link
                      to="/certification"
                      className="compare-next-action"
                    >
                      <span className="compare-next-action-copy">
                        <strong>
                          Certification
                        </strong>
                        <span>
                          Explore certification-oriented
                          guidance.
                        </span>
                      </span>

                      <span className="compare-next-action-arrow">
                        →
                      </span>
                    </Link>

                    <Link
                      to="/laboratories"
                      className="compare-next-action"
                    >
                      <span className="compare-next-action-copy">
                        <strong>
                          Find Laboratory
                        </strong>
                        <span>
                          Continue to testing
                          discovery.
                        </span>
                      </span>

                      <span className="compare-next-action-arrow">
                        →
                      </span>
                    </Link>

                    <Link
                      to="/compliance"
                      className="compare-next-action"
                    >
                      <span className="compare-next-action-copy">
                        <strong>
                          Check Compliance
                        </strong>
                        <span>
                          Turn relevant information
                          into a trackable workflow.
                        </span>
                      </span>

                      <span className="compare-next-action-arrow">
                        →
                      </span>
                    </Link>
                  </div>
                </section>
              </div>

              <section className="ai-summary-box">
                <p className="eyebrow">
                  SOURCE VISIBILITY
                </p>

                <h2>
                  Verify the records before taking
                  a formal decision.
                </h2>

                <p>
                  BISense shows the source information
                  available in the records so users can
                  continue verification against the
                  latest official BIS information.
                </p>

                <div className="comparison-summary-grid">
                  <div>
                    <span>
                      STANDARD A SOURCE
                    </span>

                    <strong>
                      {dataA.source_name ||
                        "BIS Standards Portal"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      STANDARD B SOURCE
                    </span>

                    <strong>
                      {dataB.source_name ||
                        "BIS Standards Portal"}
                    </strong>
                  </div>
                </div>

                <div className="comparison-summary-grid">
                  <div>
                    <span>
                      STANDARD A STATUS
                    </span>

                    <strong>
                      {valueOrUnavailable(
                        dataA.status
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      STANDARD B STATUS
                    </span>

                    <strong>
                      {valueOrUnavailable(
                        dataB.status
                      )}
                    </strong>
                  </div>
                </div>

                <div className="source-card comparison-source">
                  <div>
                    <span className="source-label">
                      SOURCE
                    </span>

                    <strong>
                      BISense BIS knowledge base
                    </strong>
                  </div>

                  <div className="source-details">
                    <span>
                      Verify current edition on
                      official BIS information.
                    </span>
                  </div>
                </div>

                <div className="compare-source-links">
                  <button
                    type="button"
                    className="compare-source-link"
                    onClick={() =>
                      openSource(
                        dataA.source_url ||
                          "https://standards.bis.gov.in/"
                      )
                    }
                  >
                    Open source for{" "}
                    {dataA.number}
                  </button>

                  <button
                    type="button"
                    className="compare-source-link"
                    onClick={() =>
                      openSource(
                        dataB.source_url ||
                          "https://standards.bis.gov.in/"
                      )
                    }
                  >
                    Open source for{" "}
                    {dataB.number}
                  </button>
                </div>
              </section>
            </>
          )}

        {!showComparison &&
          !loadingComparison && (
            <div className="compare-placeholder">
              <div className="compare-placeholder-icon">
                ⚖
              </div>

              <h2>
                Choose two standards to begin.
              </h2>

              <p>
                BISense will retrieve their available
                records, compare the structured fields,
                highlight meaningful differences and
                connect you to the next BIS workflow.
              </p>
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}

export default CompareStandards;
