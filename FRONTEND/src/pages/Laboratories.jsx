import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Laboratories.css";

const RENDER_API = "https://bisense-5ozn.onrender.com";
const API_BASE_URL = "";

const SEARCH_CACHE_PREFIX = "bisense_lab_search_v4_";
const SEARCH_CACHE_TTL = 10 * 60 * 1000;
const INDEX_CACHE_KEY = "bisense_lab_index_stats_v2";
const INDEX_RESULTS_CACHE_KEY = "bisense_lab_index_results_v1";
const INDEX_CACHE_TTL = 30 * 60 * 1000;

function cleanISNumber(value = "") {
  return String(value).replace(/^IS\s*/i, "").trim();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function getResultsFromPayload(data) {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.laboratories)) return data.laboratories;
  if (Array.isArray(data)) return data;
  return [];
}

function getExplicitCount(data) {
  const candidates = [
    data?.count,
    data?.total,
    data?.total_count,
    data?.pagination?.total,
    data?.meta?.total,
  ];

  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }

  return null;
}

function getSearchCount(data, results) {
  const explicit = getExplicitCount(data);
  return explicit !== null ? explicit : results.length;
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

function buildParams({ isNumber, labName, state, district, labType }) {
  const params = new URLSearchParams();
  const clean = cleanISNumber(isNumber);

  if (clean) params.append("is_number", clean);
  if (normalizeText(labName)) params.append("lab_name", normalizeText(labName));
  if (normalizeText(state)) params.append("state", normalizeText(state));
  if (normalizeText(district)) params.append("district", normalizeText(district));
  if (normalizeText(labType)) params.append("lab_type", normalizeText(labType));

  return params;
}

function makeSearchCacheKey(query) {
  return `${SEARCH_CACHE_PREFIX}${query || "all"}`;
}

function readSearchCache(query) {
  try {
    const raw = sessionStorage.getItem(makeSearchCacheKey(query));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp);

    if (!Number.isFinite(timestamp)) return null;
    if (Date.now() - timestamp > SEARCH_CACHE_TTL) return null;
    if (!Array.isArray(parsed?.results)) return null;

    // Empty search caches are deliberately ignored so a transient backend
    // failure cannot turn into a false "no laboratories" state for 10 minutes.
    if (parsed.results.length === 0) return null;

    return {
      results: parsed.results,
      count: Number(parsed?.count) || parsed.results.length,
    };
  } catch (error) {
    console.warn("Unable to read laboratory search cache:", error);
    return null;
  }
}

function writeSearchCache(query, results, count) {
  try {
    sessionStorage.setItem(
      makeSearchCacheKey(query),
      JSON.stringify({
        timestamp: Date.now(),
        results,
        count,
      })
    );
  } catch (error) {
    console.warn("Unable to write laboratory search cache:", error);
  }
}

function readIndexCache() {
  try {
    const raw = sessionStorage.getItem(INDEX_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp);
    const count = Number(parsed?.count);

    if (!Number.isFinite(timestamp)) return null;
    if (Date.now() - timestamp > INDEX_CACHE_TTL) return null;
    if (!Number.isFinite(count) || count < 0) return null;

    return { count, timestamp };
  } catch (error) {
    console.warn("Unable to read laboratory index cache:", error);
    return null;
  }
}

function writeIndexCache(count) {
  try {
    sessionStorage.setItem(
      INDEX_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        count,
      })
    );
  } catch (error) {
    console.warn("Unable to write laboratory index cache:", error);
  }
}

function readIndexResultsCache() {
  try {
    const raw = sessionStorage.getItem(INDEX_RESULTS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp);
    const results = Array.isArray(parsed?.results) ? parsed.results : null;

    if (!Number.isFinite(timestamp) || !results) return null;
    if (Date.now() - timestamp > INDEX_CACHE_TTL) return null;

    return results;
  } catch (error) {
    console.warn("Unable to read laboratory index records cache:", error);
    return null;
  }
}

function writeIndexResultsCache(results) {
  try {
    sessionStorage.setItem(
      INDEX_RESULTS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        results,
      })
    );
  } catch (error) {
    console.warn("Unable to write laboratory index records cache:", error);
  }
}

function getAvailableStandards(results) {
  const values = new Map();

  results.forEach((lab) => {
    const raw = normalizeText(lab?.indian_standard);
    if (!raw || raw === "—") return;

    const clean = raw.replace(/^IS\s*/i, "").trim();
    if (!clean) return;

    const key = clean.toLowerCase();
    if (!values.has(key)) values.set(key, clean);
  });

  return [...values.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The laboratory service returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const text = await response.text();
    throw new Error(
      `The laboratory service returned a non-JSON response (${response.status})${
        text ? "." : ""
      }`
    );
  }

  if (!response.ok || data?.error) {
    throw new Error(getErrorMessage(data, "Laboratory search failed."));
  }

  return data;
}

async function searchWithFallback(query, signal) {
  const path = `/api/laboratories/search${query ? `?${query}` : ""}`;

  const endpoints = [
    `${RENDER_API}${path}`,
    `${API_BASE_URL}${path}`,
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await fetchJson(endpoint, signal);
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to connect to the BIS laboratory service.");
}

function warmBackend() {
  fetch(`${RENDER_API}/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  }).catch(() => {});
}

function getLabFields(lab) {
  const sourceUrl = normalizeText(lab?.source_url) || "https://lims.bis.gov.in/";

  return {
    labName: normalizeText(lab?.lab_name) || "Laboratory name unavailable",
    standard: normalizeText(lab?.indian_standard) || "—",
    labCode: normalizeText(lab?.lab_code) || "Not available",
    product: normalizeText(lab?.product) || "Not specified",
    grade: normalizeText(lab?.grade_type_size_designation) || "—",
    charges: normalizeText(lab?.testing_charges),
    validity: normalizeText(lab?.validity_date) || "Not listed",
    remark: normalizeText(lab?.remark),
    state: normalizeText(lab?.state),
    district: normalizeText(lab?.district),
    labType: normalizeText(lab?.lab_type),
    address: normalizeText(lab?.address || lab?.location || lab?.address_line),
    city: normalizeText(lab?.city),
    pincode: normalizeText(lab?.pincode || lab?.pin_code || lab?.postal_code),
    sourceUrl,
  };
}

function getLocationText(lab) {
  const fields = getLabFields(lab);
  return [fields.address, fields.city, fields.district, fields.state, fields.pincode]
    .filter(Boolean)
    .join(", ");
}

function getMapQuery(lab) {
  const fields = getLabFields(lab);
  const location = getLocationText(lab);
  return [fields.labName, location || null, "India"].filter(Boolean).join(", ");
}

function getGoogleMapsUrl(lab) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    getMapQuery(lab)
  )}`;
}

function getGoogleMapsEmbedUrl(lab) {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    getMapQuery(lab)
  )}&output=embed`;
}

function scoreLaboratory(lab, filters) {
  const fields = getLabFields(lab);
  const queryStandard = cleanISNumber(filters.isNumber).toLowerCase();
  const queryLabName = normalizeText(filters.labName).toLowerCase();
  const queryState = normalizeText(filters.state).toLowerCase();
  const queryDistrict = normalizeText(filters.district).toLowerCase();
  const queryType = normalizeText(filters.labType).toLowerCase();

  let score = 0;
  const standard = fields.standard.replace(/^IS\s*/i, "").toLowerCase();
  const labName = fields.labName.toLowerCase();
  const locationText = getLocationText(lab).toLowerCase();
  const labType = fields.labType.toLowerCase();

  if (queryStandard) {
    if (standard === queryStandard) score += 100;
    else if (standard.includes(queryStandard)) score += 45;
  }

  if (queryLabName && labName.includes(queryLabName)) score += 35;
  if (queryState && locationText.includes(queryState)) score += 20;
  if (queryDistrict && locationText.includes(queryDistrict)) score += 20;
  if (queryType && labType.includes(queryType)) score += 20;

  if (fields.validity !== "Not listed") score += 3;
  if (fields.charges) score += 2;
  if (fields.sourceUrl) score += 1;

  return score;
}

function getFieldCoverage(results) {
  if (!results.length) {
    return {
      location: 0,
      charges: 0,
      validity: 0,
      source: 0,
    };
  }

  let location = 0;
  let charges = 0;
  let validity = 0;
  let source = 0;

  results.forEach((lab) => {
    const fields = getLabFields(lab);
    if (getLocationText(lab)) location += 1;
    if (fields.charges) charges += 1;
    if (fields.validity !== "Not listed") validity += 1;
    if (fields.sourceUrl) source += 1;
  });

  const percentage = (value) => Math.round((value / results.length) * 100);

  return {
    location: percentage(location),
    charges: percentage(charges),
    validity: percentage(validity),
    source: percentage(source),
  };
}

function makeStableKey(lab, index) {
  const fields = getLabFields(lab);
  return `${fields.labName}-${fields.labCode}-${fields.standard}-${index}`;
}

export default function Laboratories() {
  const [isNumber, setIsNumber] = useState("");
  const [labName, setLabName] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [labType, setLabType] = useState("");

  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [usedCache, setUsedCache] = useState(false);

  const [totalLaboratories, setTotalLaboratories] = useState(null);
  const [totalLoading, setTotalLoading] = useState(true);
  const [totalError, setTotalError] = useState("");

  const [indexResults, setIndexResults] = useState([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [standardListSearch, setStandardListSearch] = useState("");

  const availableStandards = useMemo(
    () => getAvailableStandards(indexResults),
    [indexResults]
  );

  const filteredAvailableStandards = useMemo(() => {
    const q = standardListSearch.trim().toLowerCase();
    if (!q) return availableStandards;
    return availableStandards.filter((item) =>
      item.toLowerCase().includes(q)
    );
  }, [availableStandards, standardListSearch]);

  const standardCounts = useMemo(() => {
    const counts = new Map();

    indexResults.forEach((lab) => {
      const raw = normalizeText(lab?.indian_standard);
      if (!raw || raw === "—") return;

      const clean = raw.replace(/^IS\s*/i, "").trim();
      if (!clean) return;

      const key = clean.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [indexResults]);

  const [mapLab, setMapLab] = useState(null);
  const [detailsLab, setDetailsLab] = useState(null);

  const activeFilters = useMemo(
    () => ({ isNumber, labName, state, district, labType }),
    [isNumber, labName, state, district, labType]
  );

  const rankedResults = useMemo(() => {
    return results
      .map((lab, index) => ({
        ...lab,
        __originalIndex: index,
        __score: scoreLaboratory(lab, activeFilters),
      }))
      .sort((a, b) => b.__score - a.__score);
  }, [results, activeFilters]);

  const insightStats = useMemo(() => {
    const states = new Set();
    const products = new Set();

    results.forEach((lab) => {
      const fields = getLabFields(lab);
      if (fields.state) states.add(fields.state.toLowerCase());
      if (fields.product && fields.product !== "Not specified") {
        products.add(fields.product.toLowerCase());
      }
    });

    return {
      states: states.size,
      products: products.size,
      coverage: getFieldCoverage(results),
    };
  }, [results]);

  const loadTotalLaboratories = async ({ force = false } = {}) => {
    const cachedResults = !force ? readIndexResultsCache() : null;

    if (cachedResults) {
      setIndexResults(cachedResults);
      setIndexLoading(false);
    } else {
      setIndexLoading(true);
    }

    if (!force) {
      const cached = readIndexCache();
      if (cached) {
        setTotalLaboratories(cached.count);
        setTotalError("");
        setTotalLoading(false);

        // Still hydrate the browseable laboratory index when its records are
        // not cached. This keeps the total metric and actual records separate.
        if (cachedResults) {
          warmBackend();
          return;
        }
      }
    }

    setTotalLoading(true);
    setTotalError("");
    setIndexError("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      warmBackend();
      const data = await searchWithFallback("", controller.signal);
      const records = getResultsFromPayload(data);
      const explicitCount = getExplicitCount(data);

      setIndexResults(records);
      writeIndexResultsCache(records);
      setIndexLoading(false);

      if (explicitCount !== null && !(explicitCount === 0 && records.length > 0)) {
        setTotalLaboratories(explicitCount);
        writeIndexCache(explicitCount);
      } else if (records.length > 0) {
        setTotalLaboratories(null);
        setTotalError(
          explicitCount === 0
            ? `The service reported 0 but returned ${records.length} laboratory records; total index size is unavailable.`
            : "The service returned records but no full index count."
        );
      } else {
        setTotalLaboratories(0);
        setTotalError("The unfiltered service returned no laboratory records.");
      }
    } catch (err) {
      console.warn("Unable to load laboratory index:", err);
      setIndexLoading(false);
      setIndexError(
        err?.name === "AbortError"
          ? "The unfiltered laboratory index request timed out."
          : err?.message || "Unable to load the laboratory index."
      );

      // Keep cached records if we had any, but do not claim a live total.
      if (!cachedResults) {
        setIndexResults([]);
      }

      setTotalLaboratories(null);
      setTotalError("Live index unavailable.");
    } finally {
      window.clearTimeout(timeoutId);
      setTotalLoading(false);
    }
  };

  useEffect(() => {
    loadTotalLaboratories();
  }, []);

  const browseAllLaboratories = async ({ force = false } = {}) => {
    if (loading || indexLoading) return;

    setError("");
    setBrowseAll(true);
    setSearched(true);
    setUsedCache(false);
    setMapLab(null);
    setDetailsLab(null);

    let records = force ? null : indexResults;

    if (!records?.length) {
      setIndexLoading(true);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);

      try {
        warmBackend();
        const data = await searchWithFallback("", controller.signal);
        records = getResultsFromPayload(data);
        setIndexResults(records);
        writeIndexResultsCache(records);

        const explicitCount = getExplicitCount(data);
        if (explicitCount !== null) {
          setTotalLaboratories(explicitCount);
          writeIndexCache(explicitCount);
        }
        setIndexError("");
      } catch (err) {
        setError(
          err?.name === "AbortError"
            ? "The laboratory index took too long to load. Please try again."
            : err?.message || "Unable to load the BISense laboratory index."
        );
        setIndexError(err?.message || "Unable to load laboratory index.");
        records = [];
      } finally {
        window.clearTimeout(timeoutId);
        setIndexLoading(false);
      }
    }

    setResults(records || []);
    setCount(records?.length || 0);
    setMapLab(records?.[0] || null);
  };

  const searchAvailableStandard = async (standardValue) => {
    const clean = cleanISNumber(standardValue);
    if (!clean) return;

    setIsNumber(clean);
    setBrowseAll(false);
    setStandardListSearch("");

    // Let the controlled input update before triggering the same search flow.
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const params = new URLSearchParams();
    params.append("is_number", clean);
    const query = params.toString();

    setLoading(true);
    setError("");
    setSearched(true);
    setUsedCache(false);
    setMapLab(null);
    setDetailsLab(null);

    const cached = readSearchCache(query);
    if (cached) {
      setResults(cached.results);
      setCount(Math.max(cached.count, cached.results.length));
      setMapLab(cached.results[0] || null);
      setUsedCache(true);
      setLoading(false);
      warmBackend();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);

    try {
      warmBackend();
      const data = await searchWithFallback(query, controller.signal);
      const laboratoryResults = getResultsFromPayload(data);
      const laboratoryCount = getSearchCount(data, laboratoryResults);

      setResults(laboratoryResults);
      setCount(Math.max(laboratoryCount, laboratoryResults.length));
      setMapLab(laboratoryResults[0] || null);

      if (laboratoryResults.length > 0) {
        writeSearchCache(query, laboratoryResults, laboratoryCount);
      }
    } catch (err) {
      setResults([]);
      setCount(0);
      setError(
        err?.name === "AbortError"
          ? "The laboratory service took too long to respond. Please try again."
          : err?.message || "Unable to connect to the BIS laboratory service."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const searchLaboratories = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSearched(true);
    setUsedCache(false);
    setMapLab(null);
    setDetailsLab(null);

    const query = buildParams(activeFilters).toString();
    const cached = readSearchCache(query);

    if (cached) {
      setResults(cached.results);
      setCount(Math.max(cached.count, cached.results.length));
      setMapLab(cached.results[0] || null);
      setUsedCache(true);
      setLoading(false);
      warmBackend();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);

    try {
      warmBackend();
      const data = await searchWithFallback(query, controller.signal);
      const laboratoryResults = getResultsFromPayload(data);
      const laboratoryCount = getSearchCount(data, laboratoryResults);

      setResults(laboratoryResults);
      setCount(Math.max(laboratoryCount, laboratoryResults.length));
      setMapLab(laboratoryResults[0] || null);

      if (laboratoryResults.length > 0) {
        writeSearchCache(query, laboratoryResults, laboratoryCount);
      }
    } catch (err) {
      console.error("Laboratory search error:", err);
      setResults([]);
      setCount(0);

      if (err?.name === "AbortError") {
        setError("The laboratory service took too long to respond. Please try again.");
      } else {
        setError(
          err?.message ||
            "Unable to connect to the BIS laboratory service."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const refreshSearch = async () => {
    if (loading) return;

    try {
      const query = buildParams(activeFilters).toString();
      sessionStorage.removeItem(makeSearchCacheKey(query));
    } catch (error) {
      console.warn("Unable to clear laboratory search cache:", error);
    }

    await searchLaboratories({ preventDefault() {} });
  };

  const resetSearch = () => {
    setIsNumber("");
    setLabName("");
    setState("");
    setDistrict("");
    setLabType("");
    setResults([]);
    setCount(0);
    setError("");
    setSearched(false);
    setBrowseAll(false);
    setUsedCache(false);
    setMapLab(null);
    setDetailsLab(null);
  };

  const displayedISNumber = cleanISNumber(isNumber);
  const mapFields = mapLab ? getLabFields(mapLab) : null;

  return (
    <div className="laboratory-page">
      <Navbar />

      <main>
        <section className="laboratory-hero">
          <div className="laboratory-hero-glow laboratory-hero-glow-one" />
          <div className="laboratory-hero-glow laboratory-hero-glow-two" />

          <div className="laboratory-container laboratory-hero-content">
            <div className="laboratory-breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Laboratories</span>
            </div>

            <div className="laboratory-hero-badge">
              <span className="laboratory-status-dot" />
              BIS LIMS LABORATORY DISCOVERY
            </div>

            <h1>
              Find the right
              <span> BIS laboratory.</span>
            </h1>

            <p>
              Discover laboratories associated with Indian Standards and review
              available testing scope, charges, validity and source information
              before contacting a laboratory.
            </p>

            <div className="laboratory-hero-metrics">
              <div className="laboratory-hero-metric laboratory-hero-metric-primary">
                <span>LABORATORIES INDEXED</span>
                <strong>
                  {totalLoading
                    ? "…"
                    : totalLaboratories !== null
                    ? formatCount(totalLaboratories)
                    : "—"}
                </strong>
                <p>
                  Exact count reported by the unfiltered BISense laboratory
                  search service.
                </p>
              </div>

              <div className="laboratory-hero-metric">
                <span>SOURCE</span>
                <strong>BIS LIMS</strong>
                <p>Source-linked laboratory records.</p>
              </div>

              <div className="laboratory-hero-metric">
                <span>DISCOVERY</span>
                <strong>IS + FILTERS</strong>
                <p>Search by standard, name or location.</p>
              </div>

              <div className="laboratory-hero-metric">
                <span>LOCATION</span>
                <strong>MAP VIEW</strong>
                <p>Open a selected record on a map.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="laboratory-search-wrap">
          <div className="laboratory-container">
            <form
              className="laboratory-search-card"
              onSubmit={searchLaboratories}
            >
              <div className="laboratory-search-header">
                <div>
                  <span className="laboratory-section-label">
                    LABORATORY SEARCH
                  </span>
                  <h2>Find a testing laboratory.</h2>
                  <p>
                    Start with an IS number, then narrow the results using
                    optional filters.
                  </p>
                </div>

                <div className="laboratory-search-icon" aria-hidden="true">
                  ⌕
                </div>
              </div>

              <div className="laboratory-primary-search">
                <label htmlFor="is-number">Indian Standard Number</label>

                <div className="laboratory-main-input">
                  <span className="laboratory-input-prefix">IS</span>
                  <input
                    id="is-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="209"
                    list="bisense-available-is-options"
                    value={isNumber.replace(/^IS\s*/i, "")}
                    onChange={(event) => {
                      setIsNumber(event.target.value);
                      setError("");
                    }}
                    autoComplete="off"
                  />
                  <span className="laboratory-input-hint">
                    Example: IS 209
                  </span>
                </div>

                <datalist id="bisense-available-is-options">
                  {availableStandards.map((standard) => (
                    <option key={`is-option-${standard}`} value={standard}>
                      IS {standard}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="laboratory-divider">
                <span>Optional filters</span>
              </div>

              <div className="laboratory-filter-grid">
                <div className="laboratory-field">
                  <label htmlFor="lab-name">Laboratory Name</label>
                  <input
                    id="lab-name"
                    type="text"
                    placeholder="Search by laboratory"
                    value={labName}
                    onChange={(event) => {
                      setLabName(event.target.value);
                      setError("");
                    }}
                    autoComplete="organization"
                  />
                </div>

                <div className="laboratory-field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    type="text"
                    placeholder="e.g. Telangana"
                    value={state}
                    onChange={(event) => {
                      setState(event.target.value);
                      setError("");
                    }}
                    autoComplete="address-level1"
                  />
                </div>

                <div className="laboratory-field">
                  <label htmlFor="district">District</label>
                  <input
                    id="district"
                    type="text"
                    placeholder="e.g. Hyderabad"
                    value={district}
                    onChange={(event) => {
                      setDistrict(event.target.value);
                      setError("");
                    }}
                  />
                </div>

                <div className="laboratory-field">
                  <label htmlFor="lab-type">Laboratory Type</label>
                  <input
                    id="lab-type"
                    type="text"
                    placeholder="e.g. Chemical"
                    value={labType}
                    onChange={(event) => {
                      setLabType(event.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div className="laboratory-form-footer">
                <span className="laboratory-form-note">
                  Data is retrieved through the BISense laboratory search service
                  with source links where available.
                </span>

                <div className="laboratory-form-buttons">
                  <button
                    type="button"
                    className="laboratory-reset-btn"
                    onClick={resetSearch}
                    disabled={loading}
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    className="laboratory-search-btn"
                    disabled={loading}
                  >
                    <span>
                      {loading ? "Searching..." : "Search Laboratories"}
                    </span>
                    {!loading && <span>→</span>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="laboratory-container laboratory-data-status-wrap">
          <div className="laboratory-data-status-card">
            <div>
              <span className="laboratory-section-label">DATA COVERAGE</span>
              <strong>Make the dataset visible to the evaluator.</strong>
              <p>
                The index figure is separate from search matches. It is shown
                only when the backend provides an explicit total, so the UI does
                not mistake a paginated result length for the full dataset size.
              </p>
            </div>

            <div className="laboratory-data-status-side">
              <div>
                <span>Indexed laboratories</span>
                <strong>
                  {totalLoading
                    ? "Loading"
                    : totalLaboratories !== null
                    ? formatCount(totalLaboratories)
                    : "Unavailable"}
                </strong>
                {totalError && <small>{totalError}</small>}
              </div>

              <button
                type="button"
                className="laboratory-refresh-btn"
                onClick={() => loadTotalLaboratories({ force: true })}
                disabled={totalLoading}
              >
                ↻ Refresh index count
              </button>
            </div>
          </div>
        </section>

        <section className="laboratory-container laboratory-index-browser-wrap">
          <div className="laboratory-index-browser-card">
            <div className="laboratory-index-browser-copy">
              <span className="laboratory-section-label">BISENSE LABORATORY INDEX</span>
              <h2>See what laboratories and Indian Standards are actually listed.</h2>
              <p>
                Browse the records returned by the unfiltered BISense laboratory service.
                The Indian Standard list below is derived only from those returned records.
              </p>
            </div>

            <div className="laboratory-index-browser-actions">
              <button
                type="button"
                className="laboratory-search-btn laboratory-browse-all-btn"
                onClick={() => browseAllLaboratories()}
                disabled={indexLoading || loading}
              >
                {indexLoading ? "Loading index..." : `Browse ${formatCount(indexResults.length)} listed records`}
                {!indexLoading && <span>→</span>}
              </button>

              <button
                type="button"
                className="laboratory-reset-btn"
                onClick={() => loadTotalLaboratories({ force: true })}
                disabled={indexLoading}
              >
                ↻ Refresh index
              </button>
            </div>
          </div>

          <div className="laboratory-available-standards-card">
            <div className="laboratory-available-standards-header">
              <div>
                <span className="laboratory-section-label">AVAILABLE INDIAN STANDARDS</span>
                <h3>Standards represented in the laboratory index</h3>
                <p className="laboratory-available-standards-subtitle">Click any standard to search its listed laboratories.</p>
              </div>

              <strong>{formatCount(availableStandards.length)}</strong>
            </div>

            <div className="laboratory-standard-list-search">
              <input
                type="search"
                value={standardListSearch}
                onChange={(event) => setStandardListSearch(event.target.value)}
                placeholder="Find an available IS number..."
                aria-label="Find an available Indian Standard"
              />
            </div>

            {indexLoading ? (
              <div className="laboratory-index-inline-state">Loading available standards from BISense...</div>
            ) : availableStandards.length === 0 ? (
              <div className="laboratory-index-inline-state">
                {indexError || "No Indian Standard values were returned by the current laboratory index service. Use Refresh index to check the live source again."}
              </div>
            ) : filteredAvailableStandards.length === 0 ? (
              <div className="laboratory-index-inline-state">No available IS number matches your filter.</div>
            ) : (
              <div className="laboratory-standard-chip-grid">
                {filteredAvailableStandards.map((standard) => (
                  <button
                    type="button"
                    key={standard}
                    className="laboratory-standard-chip"
                    onClick={() => searchAvailableStandard(standard)}
                    disabled={loading}
                    title={`Search laboratories for IS ${standard}`}
                  >
                    <span>IS</span> {standard}
                    <em>
                      {standardCounts.get(standard.toLowerCase()) || 0} labs
                    </em>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {error && (
          <section className="laboratory-container laboratory-feedback-wrap">
            <div
              className="laboratory-feedback laboratory-feedback-error"
              role="alert"
            >
              <div>
                <strong>Search could not be completed</strong>
                <span>{error}</span>
              </div>

              <button
                type="button"
                className="laboratory-inline-retry"
                onClick={() => document.querySelector(".laboratory-search-card")?.requestSubmit()}
              >
                Try again
              </button>
            </div>
          </section>
        )}

        {searched && !loading && !error && (
          <section className="laboratory-results-wrap">
            <div className="laboratory-container">
              <div className="laboratory-results-heading">
                <div>
                  <span className="laboratory-section-label">SEARCH RESULTS</span>
                  <h2>
                    {browseAll
                      ? `${formatCount(count)} listed ${count === 1 ? "laboratory" : "laboratories"}`
                      : count === 0
                      ? "No laboratories found"
                      : `${formatCount(count)} ${
                          count === 1 ? "laboratory" : "laboratories"
                        } found`}
                  </h2>
                  <p>
                    {browseAll
                      ? "Showing the records returned by the unfiltered BISense laboratory service."
                      : "Current query matches are shown here. The overall indexed laboratory count is reported separately above."}
                  </p>
                </div>

                <div className="laboratory-result-meta">
                  {browseAll && (
                    <span className="laboratory-cache-badge laboratory-browse-badge">
                      ALL LISTED RECORDS
                    </span>
                  )}

                  {displayedISNumber && (
                    <div className="laboratory-active-filter">
                      <span>IS</span>
                      {displayedISNumber}
                    </div>
                  )}

                  {usedCache && (
                    <span className="laboratory-cache-badge">
                      Session cache
                    </span>
                  )}

                  <button
                    type="button"
                    className="laboratory-refresh-btn"
                    onClick={refreshSearch}
                    disabled={loading}
                  >
                    ↻ Refresh live data
                  </button>
                </div>
              </div>

              {results.length > 0 && (
                <div className="laboratory-insight-grid">
                  <div className="laboratory-insight-card">
                    <span>SEARCH MATCHES</span>
                    <strong>{formatCount(count || results.length)}</strong>
                    <p>Laboratory records returned for this query.</p>
                  </div>

                  <div className="laboratory-insight-card">
                    <span>STATES REPRESENTED</span>
                    <strong>{insightStats.states || "—"}</strong>
                    <p>Distinct states visible in the returned records.</p>
                  </div>

                  <div className="laboratory-insight-card">
                    <span>PRODUCTS REPRESENTED</span>
                    <strong>{insightStats.products || "—"}</strong>
                    <p>Distinct product descriptions represented.</p>
                  </div>

                  <div className="laboratory-insight-card">
                    <span>SOURCE COVERAGE</span>
                    <strong>{insightStats.coverage.source}%</strong>
                    <p>Returned records retaining a source link.</p>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="laboratory-verification-strip">
                  <div>
                    <span className="laboratory-verification-icon">✓</span>
                    <div>
                      <strong>Source-linked laboratory discovery</strong>
                      <p>
                        “Best Match” is a BISense relevance signal based on the
                        search context. It is not an official BIS ranking or
                        accreditation decision.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://lims.bis.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Verify in BIS LIMS ↗
                  </a>
                </div>
              )}

              {mapLab && results.length > 0 && (
                <section
                  id="laboratory-map-section"
                  className="laboratory-map-section"
                  aria-label="Laboratory location map"
                >
                  <div className="laboratory-map-header">
                    <div>
                      <span className="laboratory-section-label">
                        LOCATION INTELLIGENCE
                      </span>
                      <h3>Locate the selected laboratory.</h3>
                      <p>
                        The map query uses the laboratory and location fields
                        available in the returned record. Verify the exact
                        facility details with the official source before a visit.
                      </p>
                    </div>

                    <a
                      href={getGoogleMapsUrl(mapLab)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="laboratory-map-open-link"
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>

                  <div className="laboratory-map-layout">
                    <div className="laboratory-map-frame-wrap">
                      <iframe
                        key={getMapQuery(mapLab)}
                        title={`Map for ${mapFields.labName}`}
                        src={getGoogleMapsEmbedUrl(mapLab)}
                        className="laboratory-map-frame"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>

                    <div className="laboratory-map-sidepanel">
                      <span className="laboratory-section-label">
                        SELECTED LABORATORY
                      </span>

                      <h4>{mapFields.labName}</h4>

                      <p>
                        {getLocationText(mapLab) ||
                          "Location not listed in the returned record."}
                      </p>

                      <div className="laboratory-map-selected-standard">
                        <span>Indian Standard</span>
                        <strong>{mapFields.standard}</strong>
                      </div>

                      <div className="laboratory-map-selected-standard">
                        <span>Testing Charges</span>
                        <strong>
                          {mapFields.charges
                            ? `₹${mapFields.charges}`
                            : "Not listed"}
                        </strong>
                      </div>

                      <div className="laboratory-map-lab-switcher">
                        <span>Change laboratory</span>
                        <select
                          value={rankedResults.findIndex(
                            (lab) => lab.__originalIndex === results.indexOf(mapLab)
                          )}
                          onChange={(event) => {
                            const next = rankedResults[Number(event.target.value)];
                            if (next) setMapLab(next);
                          }}
                        >
                          {rankedResults.map((lab, index) => (
                            <option key={`map-lab-${index}`} value={index}>
                              {getLabFields(lab).labName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {results.length === 0 ? (
                <div className="laboratory-empty-state">
                  <div className="laboratory-empty-icon" aria-hidden="true">
                    ⌕
                  </div>
                  <span className="laboratory-section-label">NO MATCH</span>
                  <h3>No matching laboratories</h3>
                  <p>
                    {browseAll
                      ? "The unfiltered laboratory service returned no records. Refresh the index or check the backend data source."
                      : "Try another Indian Standard number or remove one or more optional filters. You can also refresh the live BIS LIMS search."}
                  </p>
                  <button
                    type="button"
                    className="laboratory-reset-btn"
                    onClick={resetSearch}
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="laboratory-results-grid">
                  {rankedResults.map((lab, index) => {
                    const fields = getLabFields(lab);
                    const isTopMatch =
                      index === 0 &&
                      rankedResults.length > 1 &&
                      Boolean(displayedISNumber || labName || state || district || labType);
                    const location = getLocationText(lab);

                    return (
                      <article
                        className={`laboratory-result-card ${
                          isTopMatch ? "laboratory-result-card-featured" : ""
                        }`}
                        key={makeStableKey(lab, lab.__originalIndex)}
                      >
                        {isTopMatch && (
                          <div className="laboratory-match-badge">
                            <span>BEST MATCH</span>
                            <span>Based on your search</span>
                          </div>
                        )}

                        <div className="laboratory-card-header">
                          <div className="laboratory-card-index">
                            {String(
                              lab?.serial_number || index + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="laboratory-card-title">
                            <span>BIS LIMS LABORATORY</span>
                            <h3>{fields.labName}</h3>
                            {(location || fields.labType) && (
                              <p className="laboratory-card-location">
                                {[location, fields.labType]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="laboratory-card-standard">
                          <span>INDIAN STANDARD</span>
                          <strong>{fields.standard}</strong>
                        </div>

                        <div className="laboratory-card-details">
                          <div className="laboratory-detail">
                            <span>OSL Code</span>
                            <strong>{fields.labCode}</strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Product</span>
                            <strong>{fields.product}</strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Grade / Type / Size</span>
                            <strong>{fields.grade}</strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Testing Charges</span>
                            <strong className="laboratory-price">
                              {fields.charges
                                ? `₹${fields.charges}`
                                : "Not listed"}
                            </strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Validity</span>
                            <strong>{fields.validity}</strong>
                          </div>
                        </div>

                        {fields.remark && (
                          <div className="laboratory-remark">
                            <span>REMARK</span>
                            <p>{fields.remark}</p>
                          </div>
                        )}

                        <div className="laboratory-card-actions">
                          <div className="laboratory-card-action-buttons">
                            <button
                              type="button"
                              className="laboratory-details-btn"
                              onClick={() => setDetailsLab(lab)}
                            >
                              View details
                            </button>

                            <button
                              type="button"
                              className="laboratory-map-btn"
                              onClick={() => {
                                setMapLab(lab);
                                window.requestAnimationFrame(() => {
                                  document
                                    .getElementById("laboratory-map-section")
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                });
                              }}
                            >
                              Map ↗
                            </button>
                          </div>

                          <a
                            href={fields.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="laboratory-source-link"
                          >
                            <span>Official BIS source</span>
                            <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {results.length > 0 && (
                <div className="laboratory-data-quality-card">
                  <div>
                    <span className="laboratory-section-label">DATA QUALITY</span>
                    <h3>What is available in these returned records?</h3>
                    <p>
                      Coverage percentages describe the current search results,
                      not the entire BIS LIMS universe.
                    </p>
                  </div>

                  <div className="laboratory-quality-grid">
                    <div><span>Location</span><strong>{insightStats.coverage.location}%</strong></div>
                    <div><span>Testing charges</span><strong>{insightStats.coverage.charges}%</strong></div>
                    <div><span>Validity</span><strong>{insightStats.coverage.validity}%</strong></div>
                    <div><span>Source link</span><strong>{insightStats.coverage.source}%</strong></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {!searched && (
          <section className="laboratory-guide-wrap">
            <div className="laboratory-container">
              <div className="laboratory-guide">
                <div>
                  <span className="laboratory-section-label">HOW IT WORKS</span>
                  <h2>From an Indian Standard to a laboratory shortlist.</h2>
                  <p>
                    Identify the relevant standard, find matching laboratories,
                    inspect testing details, then verify the official source.
                  </p>
                </div>

                <div className="laboratory-guide-steps">
                  <div className="laboratory-guide-step">
                    <span>01</span>
                    <div>
                      <strong>Identify the standard</strong>
                      <p>Start with an IS number such as IS 209.</p>
                    </div>
                  </div>

                  <div className="laboratory-guide-line" />

                  <div className="laboratory-guide-step">
                    <span>02</span>
                    <div>
                      <strong>Search the laboratory data</strong>
                      <p>Narrow results by laboratory, location or type.</p>
                    </div>
                  </div>

                  <div className="laboratory-guide-line" />

                  <div className="laboratory-guide-step">
                    <span>03</span>
                    <div>
                      <strong>Verify before relying on it</strong>
                      <p>Review details and open the official source.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {searched && !loading && !error && results.length > 0 && (
          <section className="laboratory-next-wrap">
            <div className="laboratory-container">
              <div className="laboratory-next-card">
                <div>
                  <span className="laboratory-section-label">NEXT STEP</span>
                  <h2>Continue from laboratory discovery into compliance.</h2>
                  <p>
                    Move from a laboratory shortlist to the relevant standard,
                    compliance checklist or BIS Copilot explanation.
                  </p>
                </div>

                <div className="laboratory-next-actions">
                  {displayedISNumber ? (
                    <Link
                      to={`/standards?search=${encodeURIComponent(
                        `IS ${displayedISNumber}`
                      )}`}
                      className="laboratory-next-link"
                    >
                      Review Standard <span>→</span>
                    </Link>
                  ) : (
                    <Link to="/standards" className="laboratory-next-link">
                      Explore Standards <span>→</span>
                    </Link>
                  )}

                  <Link to="/compliance" className="laboratory-next-link secondary">
                    Open Compliance <span>→</span>
                  </Link>

                  <Link to="/bis-copilot" className="laboratory-next-link secondary">
                    Ask BIS Copilot <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {detailsLab && (
        <div
          className="laboratory-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsLab(null);
          }}
        >
          <section
            className="laboratory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="laboratory-modal-title"
          >
            {(() => {
              const fields = getLabFields(detailsLab);

              return (
                <>
                  <div className="laboratory-modal-header">
                    <div>
                      <span className="laboratory-section-label">
                        LABORATORY RECORD
                      </span>
                      <h2 id="laboratory-modal-title">{fields.labName}</h2>
                    </div>

                    <button
                      type="button"
                      className="laboratory-modal-close"
                      onClick={() => setDetailsLab(null)}
                      aria-label="Close laboratory details"
                    >
                      ×
                    </button>
                  </div>

                  <div className="laboratory-modal-standard">
                    <span>Indian Standard</span>
                    <strong>{fields.standard}</strong>
                  </div>

                  <div className="laboratory-modal-grid">
                    <div><span>OSL Code</span><strong>{fields.labCode}</strong></div>
                    <div><span>Product</span><strong>{fields.product}</strong></div>
                    <div><span>Grade / Type / Size</span><strong>{fields.grade}</strong></div>
                    <div><span>Testing Charges</span><strong>{fields.charges ? `₹${fields.charges}` : "Not listed"}</strong></div>
                    <div><span>Validity</span><strong>{fields.validity}</strong></div>
                    <div><span>Location</span><strong>{getLocationText(detailsLab) || "Not listed"}</strong></div>
                    {fields.labType && <div><span>Laboratory Type</span><strong>{fields.labType}</strong></div>}
                  </div>

                  {fields.remark && (
                    <div className="laboratory-modal-remark">
                      <span>REMARK</span>
                      <p>{fields.remark}</p>
                    </div>
                  )}

                  <div className="laboratory-modal-footer">
                    <span>
                      Verify current availability, scope and commercial terms
                      with the laboratory before relying on this record.
                    </span>

                    <div className="laboratory-modal-actions">
                      <button
                        type="button"
                        className="laboratory-modal-map-link"
                        onClick={() => {
                          setDetailsLab(null);
                          setMapLab(detailsLab);
                          window.requestAnimationFrame(() => {
                            document
                              .getElementById("laboratory-map-section")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                        }}
                      >
                        Show on map
                      </button>

                      <a
                        href={fields.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="laboratory-search-btn"
                      >
                        Open BIS Source ↗
                      </a>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      )}

      <style>{`
        .laboratory-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          background: #f7f9fc;
          color: #111827;
        }

        .laboratory-page main { color: #111827; }

        .laboratory-page h1,
        .laboratory-page h2,
        .laboratory-page h3,
        .laboratory-page p,
        .laboratory-page strong,
        .laboratory-page label,
        .laboratory-page span { overflow-wrap: anywhere; }

        .laboratory-search-card,
        .laboratory-feedback,
        .laboratory-empty-state,
        .laboratory-result-card,
        .laboratory-guide,
        .laboratory-next-card,
        .laboratory-modal,
        .laboratory-data-status-card,
        .laboratory-data-quality-card { box-sizing: border-box; }

        .laboratory-field input,
        .laboratory-primary-search input,
        .laboratory-map-lab-switcher select { 
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .laboratory-field input::placeholder,
        .laboratory-primary-search input::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .laboratory-form-buttons,
        .laboratory-result-meta,
        .laboratory-card-action-buttons,
        .laboratory-modal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .laboratory-reset-btn,
        .laboratory-search-btn,
        .laboratory-details-btn,
        .laboratory-map-btn,
        .laboratory-modal-map-link {
          min-height: 42px;
        }

        .laboratory-search-btn,
        .laboratory-modal-map-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-decoration: none;
        }

        .laboratory-search-btn:disabled,
        .laboratory-reset-btn:disabled,
        .laboratory-refresh-btn:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .laboratory-refresh-btn {
          border: 1px solid #d7ddea;
          background: #fff;
          color: #344054;
          min-height: 40px;
          padding: 9px 12px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .laboratory-refresh-btn:hover {
          border-color: #aab5d6;
          background: #f8faff;
        }

        .laboratory-feedback-error {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          color: #991b1b;
        }

        .laboratory-feedback-error > div {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .laboratory-feedback-error strong,
        .laboratory-feedback-error span { color: inherit !important; }

        .laboratory-inline-retry,
        .laboratory-details-btn,
        .laboratory-map-btn,
        .laboratory-modal-close,
        .laboratory-modal-map-link {
          border: 0;
          cursor: pointer;
        }

        .laboratory-inline-retry,
        .laboratory-details-btn,
        .laboratory-map-btn {
          padding: 0 15px;
          border-radius: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .laboratory-inline-retry,
        .laboratory-details-btn {
          background: #eef2ff;
          color: #4452c9;
        }

        .laboratory-map-btn {
          background: #111827;
          color: #fff;
        }

        .laboratory-hero-metrics {
          display: grid;
          grid-template-columns: 1.35fr repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
        }

        /* Explicit high-contrast metric cards so text remains readable
           regardless of the global/theme styles in Laboratories.css. */
        .laboratory-hero-metric {
          min-width: 0;
          padding: 16px 17px;
          border: 1px solid #dfe4ec !important;
          border-radius: 16px;
          background: #ffffff !important;
          box-shadow: 0 8px 24px rgba(17,24,39,.06);
          backdrop-filter: none;
        }

        .laboratory-hero-metric > span {
          display: block;
          color: #667085 !important;
          -webkit-text-fill-color: #667085 !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .13em;
        }

        .laboratory-hero-metric > strong {
          display: block;
          margin-top: 6px;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          font-size: 24px;
          line-height: 1.15;
        }

        .laboratory-hero-metric-primary > strong {
          font-size: 34px;
        }

        .laboratory-hero-metric p {
          margin: 6px 0 0;
          color: #475467 !important;
          -webkit-text-fill-color: #475467 !important;
          font-size: 12px;
          line-height: 1.45;
        }

        .laboratory-data-status-card,
        .laboratory-data-status-card strong,
        .laboratory-data-status-card p,
        .laboratory-data-status-side span,
        .laboratory-data-status-side small {
          -webkit-text-fill-color: inherit;
        }

        .laboratory-data-status-card {
          color: #111827 !important;
        }

        .laboratory-data-status-card .laboratory-section-label {
          color: #667085 !important;
          -webkit-text-fill-color: #667085 !important;
        }

        .laboratory-data-status-side span {
          color: #667085 !important;
          -webkit-text-fill-color: #667085 !important;
        }

        .laboratory-data-status-side strong {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .laboratory-data-status-side small {
          color: #667085 !important;
          -webkit-text-fill-color: #667085 !important;
        }

        .laboratory-data-status-wrap { padding-top: 18px; }

        .laboratory-data-status-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          padding: 18px 20px;
          border: 1px solid #e3e8ef;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 32px rgba(17,24,39,.04);
        }

        .laboratory-data-status-card > div:first-child { min-width: 0; }

        .laboratory-data-status-card strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
          color: #111827 !important;
        }

        .laboratory-data-status-card p {
          margin: 5px 0 0;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.55;
          max-width: 820px;
        }

        .laboratory-data-status-side {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .laboratory-data-status-side > div {
          min-width: 145px;
          padding-right: 12px;
          border-right: 1px solid #e6eaf0;
        }

        .laboratory-data-status-side > div span,
        .laboratory-data-status-side > div small {
          display: block;
          color: #6b7280 !important;
          font-size: 11px;
        }

        .laboratory-data-status-side > div strong {
          margin-top: 3px;
          color: #111827 !important;
          font-size: 14px;
        }

        .laboratory-data-status-side > div small {
          margin-top: 4px;
          color: #8b95a7 !important;
        }

        .laboratory-result-meta { align-items: center; justify-content: flex-end; }

        .laboratory-cache-badge {
          padding: 8px 11px;
          border-radius: 999px;
          background: #eef2f7;
          color: #5f6b7c !important;
          font-size: 12px;
          font-weight: 700;
        }

        .laboratory-insight-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 22px 0;
        }

        .laboratory-insight-card {
          padding: 18px;
          background: #fff;
          border: 1px solid #e7ebf1;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(17,24,39,.04);
        }

        .laboratory-insight-card > span {
          display: block;
          color: #6b7280 !important;
          font-size: 11px;
          letter-spacing: .12em;
          font-weight: 800;
        }

        .laboratory-insight-card strong {
          display: block;
          margin-top: 6px;
          color: #111827 !important;
          font-size: 26px;
          line-height: 1.1;
        }

        .laboratory-insight-card p {
          margin: 6px 0 0;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.45;
        }

        .laboratory-verification-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 0 0 22px;
          padding: 13px 15px;
          border: 1px solid #dfe6f2;
          border-radius: 14px;
          background: #f7f9fc;
        }

        .laboratory-verification-strip > div {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
        }

        .laboratory-verification-icon {
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e9f7ef;
          color: #166534 !important;
          font-weight: 900;
        }

        .laboratory-verification-strip strong {
          color: #243044 !important;
          font-size: 13px;
        }

        .laboratory-verification-strip p {
          margin: 2px 0 0;
          color: #667085 !important;
          font-size: 11px;
          line-height: 1.5;
        }

        .laboratory-verification-strip > a {
          flex: 0 0 auto;
          color: #4452c9 !important;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .laboratory-verification-strip > a:hover { text-decoration: underline; }

        .laboratory-result-card { position: relative; overflow: hidden; }

        .laboratory-result-card-featured {
          border-color: rgba(79,95,218,.35);
          box-shadow: 0 18px 46px rgba(79,95,218,.10);
        }

        .laboratory-match-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 13px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4452c9;
        }

        .laboratory-match-badge span:first-child {
          font-size: 10px;
          letter-spacing: .11em;
          font-weight: 900;
        }

        .laboratory-match-badge span:last-child {
          font-size: 11px;
          color: #667085 !important;
        }

        .laboratory-card-location {
          margin: 7px 0 0;
          color: #667085 !important;
          font-size: 13px;
          line-height: 1.45;
        }

        .laboratory-card-actions {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: stretch;
          margin-top: 18px;
        }

        .laboratory-source-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-decoration: none;
          min-width: 0;
        }

        .laboratory-source-link span:first-child { min-width: 0; }

        .laboratory-map-section {
          margin: 26px 0 28px;
          padding: 20px;
          border: 1px solid #e4e8ef;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 14px 40px rgba(17,24,39,.05);
          scroll-margin-top: 90px;
        }

        .laboratory-map-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 16px;
        }

        .laboratory-map-header > div { min-width: 0; }

        .laboratory-map-header h3 {
          margin: 5px 0 6px;
          color: #111827 !important;
          font-size: 22px;
        }

        .laboratory-map-header p {
          margin: 0;
          max-width: 780px;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .laboratory-map-open-link {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 14px;
          border-radius: 10px;
          background: #111827;
          color: #fff !important;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .laboratory-map-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(270px, .8fr);
          gap: 14px;
        }

        .laboratory-map-frame-wrap {
          min-width: 0;
          min-height: 420px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e7ee;
          background: #eef2f6;
        }

        .laboratory-map-frame {
          display: block;
          width: 100%;
          min-height: 420px;
          border: 0;
        }

        .laboratory-map-sidepanel {
          padding: 18px;
          border: 1px solid #e7ebf1;
          border-radius: 16px;
          background: #f8fafc;
        }

        .laboratory-map-sidepanel h4 {
          margin: 6px 0 5px;
          color: #111827 !important;
          font-size: 20px;
          line-height: 1.25;
        }

        .laboratory-map-sidepanel > p {
          margin: 0;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .laboratory-map-selected-standard {
          display: grid;
          gap: 4px;
          margin-top: 15px;
          padding: 12px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #e7ebf1;
        }

        .laboratory-map-selected-standard span {
          color: #6b7280 !important;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 800;
        }

        .laboratory-map-selected-standard strong {
          color: #111827 !important;
          font-size: 14px;
        }

        .laboratory-map-lab-switcher {
          display: grid;
          gap: 7px;
          margin-top: 15px;
        }

        .laboratory-map-lab-switcher > span {
          color: #6b7280 !important;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 800;
        }

        .laboratory-map-lab-switcher select {
          min-height: 42px;
          padding: 0 10px;
          border: 1px solid #d8dee8;
          border-radius: 10px;
        }

        .laboratory-data-quality-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, .9fr);
          gap: 24px;
          align-items: center;
          margin-top: 24px;
          padding: 20px;
          border: 1px solid #e3e8ef;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 32px rgba(17,24,39,.04);
        }

        .laboratory-data-quality-card h3 {
          margin: 5px 0 5px;
          color: #111827 !important;
          font-size: 18px;
        }

        .laboratory-data-quality-card p {
          margin: 0;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .laboratory-quality-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .laboratory-quality-grid > div {
          padding: 12px;
          border: 1px solid #e7ebf1;
          border-radius: 12px;
          background: #f8fafc;
        }

        .laboratory-quality-grid span {
          display: block;
          color: #6b7280 !important;
          font-size: 10px;
        }

        .laboratory-quality-grid strong {
          display: block;
          margin-top: 4px;
          color: #111827 !important;
          font-size: 18px;
        }

        .laboratory-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15,23,42,.48);
        }

        .laboratory-modal {
          width: min(760px, 100%);
          max-height: min(820px, calc(100vh - 40px));
          overflow: auto;
          padding: 22px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(15,23,42,.25);
        }

        .laboratory-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .laboratory-modal-header h2 {
          margin: 5px 0 0;
          color: #111827 !important;
          font-size: 26px;
        }

        .laboratory-modal-close {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f1f4f8;
          color: #344054;
          font-size: 24px;
          line-height: 1;
        }

        .laboratory-modal-standard {
          display: grid;
          gap: 4px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid #e7ebf1;
          border-radius: 13px;
          background: #f8fafc;
        }

        .laboratory-modal-standard span,
        .laboratory-modal-grid span,
        .laboratory-modal-remark span {
          color: #6b7280 !important;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-weight: 800;
        }

        .laboratory-modal-standard strong { color: #111827 !important; }

        .laboratory-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .laboratory-modal-grid > div {
          display: grid;
          gap: 4px;
          padding: 12px;
          border: 1px solid #e7ebf1;
          border-radius: 12px;
        }

        .laboratory-modal-grid strong {
          color: #111827 !important;
          font-size: 13px;
          line-height: 1.45;
        }

        .laboratory-modal-remark {
          margin-top: 12px;
          padding: 14px;
          border-radius: 13px;
          background: #fffbeb;
          border: 1px solid #f3e8b3;
        }

        .laboratory-modal-remark p {
          margin: 6px 0 0;
          color: #5f5a43 !important;
          line-height: 1.55;
          font-size: 12px;
        }

        .laboratory-modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #e8ecf2;
        }

        .laboratory-modal-footer > span {
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .laboratory-modal-actions { justify-content: flex-end; flex-shrink: 0; }

        .laboratory-modal-map-link {
          padding: 0 14px;
          border-radius: 10px;
          background: #eef2ff;
          color: #4452c9;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .laboratory-hero-metrics { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .laboratory-hero-metric-primary { grid-column: 1 / -1; }
          .laboratory-insight-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .laboratory-data-quality-card { grid-template-columns: 1fr; }
        }

        @media (max-width: 900px) {
          .laboratory-map-layout { grid-template-columns: 1fr; }
          .laboratory-map-frame-wrap,
          .laboratory-map-frame { min-height: 340px; }
        }

        @media (max-width: 650px) {
          .laboratory-container {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box;
          }

          .laboratory-hero-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .laboratory-search-wrap,
          .laboratory-results-wrap,
          .laboratory-guide-wrap,
          .laboratory-feedback-wrap,
          .laboratory-next-wrap,
          .laboratory-data-status-wrap {
            padding-left: 16px;
            padding-right: 16px;
            box-sizing: border-box;
          }

          .laboratory-hero h1 {
            font-size: clamp(32px,10vw,48px) !important;
            line-height: 1.1 !important;
          }

          .laboratory-hero p {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .laboratory-hero-metrics { grid-template-columns: 1fr; }
          .laboratory-hero-metric-primary { grid-column: auto; }

          .laboratory-data-status-card {
            grid-template-columns: 1fr;
          }

          .laboratory-data-status-side {
            justify-content: flex-start;
          }

          .laboratory-data-status-side > div {
            border-right: 0;
            padding-right: 0;
            min-width: 0;
          }

          .laboratory-search-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px;
          }

          .laboratory-search-icon { display: none; }
          .laboratory-main-input { width: 100%; box-sizing: border-box; }
          .laboratory-input-hint { display: none; }
          .laboratory-filter-grid { grid-template-columns: 1fr !important; width: 100%; }
          .laboratory-field { width: 100%; min-width: 0; }

          .laboratory-form-footer {
            flex-direction: column;
            align-items: stretch !important;
            gap: 16px;
          }

          .laboratory-form-buttons {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .laboratory-form-buttons button { width: 100%; min-width: 0; }

          .laboratory-feedback-error {
            align-items: stretch;
            flex-direction: column;
          }

          .laboratory-inline-retry { width: 100%; }

          .laboratory-results-heading {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 14px;
          }

          .laboratory-result-meta { align-self: stretch; }
          .laboratory-insight-grid { grid-template-columns: 1fr 1fr; }

          .laboratory-card-header { align-items: flex-start !important; }
          .laboratory-card-index { flex-shrink: 0; }
          .laboratory-card-title { min-width: 0; }
          .laboratory-card-details { grid-template-columns: 1fr !important; }
          .laboratory-card-actions { grid-template-columns: 1fr; }
          .laboratory-card-action-buttons { display: grid; grid-template-columns: 1fr 1fr; }
          .laboratory-card-action-buttons button { width: 100%; }
          .laboratory-source-link { width: 100%; box-sizing: border-box; }

          .laboratory-map-section { padding: 16px; }
          .laboratory-map-header { flex-direction: column; }
          .laboratory-map-open-link { width: 100%; }
          .laboratory-map-frame-wrap,
          .laboratory-map-frame { min-height: 300px; }

          .laboratory-quality-grid { grid-template-columns: 1fr 1fr; }
          .laboratory-verification-strip { flex-direction: column; align-items: stretch; }
          .laboratory-verification-strip > a { width: 100%; text-align: center; }

          .laboratory-guide-steps { grid-template-columns: 1fr !important; }
          .laboratory-guide-line { display: none !important; }

          .laboratory-next-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }

          .laboratory-next-link { justify-content: center; }

          .laboratory-modal-backdrop { padding: 10px; }
          .laboratory-modal { padding: 18px; border-radius: 18px; }
          .laboratory-modal-grid { grid-template-columns: 1fr; }
          .laboratory-modal-footer { flex-direction: column; align-items: stretch; }
          .laboratory-modal-actions { width: 100%; display: grid; grid-template-columns: 1fr; }
          .laboratory-modal-actions > * { width: 100%; box-sizing: border-box; }
        }

        @media (max-width: 420px) {
          .laboratory-form-buttons { grid-template-columns: 1fr; }
          .laboratory-insight-grid { grid-template-columns: 1fr; }
          .laboratory-quality-grid { grid-template-columns: 1fr; }
          .laboratory-results-heading h2 { font-size: 25px !important; }
        }

        .laboratory-index-browser-wrap {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        .laboratory-index-browser-card,
        .laboratory-available-standards-card {
          background: #fff;
          border: 1px solid #e2e7ef;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 28px rgba(15,23,42,.05);
        }

        .laboratory-index-browser-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .laboratory-index-browser-copy {
          min-width: 0;
        }

        .laboratory-index-browser-copy h2,
        .laboratory-available-standards-header h3 {
          margin: 6px 0;
          color: #111827 !important;
        }

        .laboratory-index-browser-copy p {
          margin: 0;
          max-width: 780px;
          color: #667085 !important;
          line-height: 1.6;
        }

        .laboratory-index-browser-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .laboratory-browse-all-btn {
          min-height: 44px;
        }

        .laboratory-available-standards-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 14px;
        }

        .laboratory-available-standards-header > strong {
          min-width: 46px;
          min-height: 46px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eef2ff;
          color: #3f4fb8 !important;
          font-size: 16px;
        }

        .laboratory-standard-list-search {
          margin-bottom: 14px;
        }

        .laboratory-standard-list-search input {
          width: 100%;
          min-height: 44px;
          box-sizing: border-box;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          padding: 0 14px;
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .laboratory-standard-list-search input::placeholder {
          color: #7b8494 !important;
          -webkit-text-fill-color: #7b8494 !important;
        }

        .laboratory-standard-chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-height: 230px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .laboratory-standard-chip {
          border: 1px solid #dce2ec;
          background: #f8fafc;
          color: #202938 !important;
          border-radius: 999px;
          padding: 9px 12px;
          cursor: pointer;
          font-weight: 800;
          font-size: 12px;
        }

        .laboratory-standard-chip:hover {
          border-color: #aab5d6;
          background: #eef2ff;
          color: #3f4fb8 !important;
        }

        .laboratory-standard-chip:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .laboratory-standard-chip span {
          color: #667085 !important;
          font-size: 10px;
          letter-spacing: .08em;
        }

        .laboratory-standard-chip em {
          margin-left: 6px;
          padding-left: 6px;
          border-left: 1px solid #d9deea;
          color: #667085 !important;
          font-size: 10px;
          font-style: normal;
          font-weight: 700;
        }

        .laboratory-available-standards-subtitle {
          margin: 3px 0 0;
          color: #667085 !important;
          font-size: 12px;
          line-height: 1.5;
        }

        .laboratory-index-inline-state {
          padding: 14px;
          border: 1px dashed #d6dce6;
          border-radius: 12px;
          color: #667085 !important;
          background: #f8fafc;
          line-height: 1.55;
        }

        .laboratory-browse-badge {
          background: #eef6ff !important;
          color: #24578f !important;
          border-color: #d9e9fb !important;
        }

        @media (max-width: 800px) {
          .laboratory-index-browser-card {
            flex-direction: column;
            align-items: stretch;
          }

          .laboratory-index-browser-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .laboratory-index-browser-actions button {
            width: 100%;
          }
        }

        @media print {
          .laboratory-page nav,
          .laboratory-page footer,
          .laboratory-search-wrap,
          .laboratory-hero,
          .laboratory-guide-wrap,
          .laboratory-index-browser-wrap,
          .laboratory-next-wrap,
          .laboratory-feedback-wrap,
          .laboratory-result-meta,
          .laboratory-card-actions,
          .laboratory-match-badge,
          .laboratory-modal-backdrop,
          .laboratory-map-section { display: none !important; }

          .laboratory-page { background: #fff !important; }
          .laboratory-results-wrap { padding: 0 !important; }
          .laboratory-container { max-width: 100% !important; padding: 0 !important; }
          .laboratory-insight-grid,
          .laboratory-data-quality-card { break-inside: avoid; }
          .laboratory-result-card { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
