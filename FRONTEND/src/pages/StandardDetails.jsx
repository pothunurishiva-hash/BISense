import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "";
const BACKEND_URL = "https://bisense-5ozn.onrender.com";
const REQUEST_TIMEOUT_MS = 25000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const STANDARD_CACHE_PREFIX = "bisense_standard_detail_";
const BIS_PORTAL_URL = "https://standards.bis.gov.in/";

function normalizeStandardNumber(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getStandardsArray(payload) {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.results,
    payload?.standards,
    payload?.items,
    payload?.data,
    payload?.data?.results,
    payload?.data?.standards,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function cleanValue(value) {
  if (value === 0) return "0";
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  return text;
}

function displayValue(value, fallback = "Not available in BISense") {
  return cleanValue(value) || fallback;
}

function readCachedStandard(key) {
  try {
    const raw = localStorage.getItem(`${STANDARD_CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.data) return null;

    if (Date.now() - Number(parsed.savedAt) > CACHE_TTL_MS) {
      localStorage.removeItem(`${STANDARD_CACHE_PREFIX}${key}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedStandard(key, data) {
  try {
    localStorage.setItem(
      `${STANDARD_CACHE_PREFIX}${key}`,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // Cache is optional. Ignore quota/storage errors.
  }
}

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function readResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const raw = await response.text();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  } catch {
    return null;
  }
}

async function tryRequest(url) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      REQUEST_TIMEOUT_MS
    );

    const payload = await readResponsePayload(response);

    return { response, payload };
  } catch (error) {
    return { response: null, payload: null, error };
  }
}

async function warmBackend() {
  try {
    await fetchWithTimeout(
      `${BACKEND_URL}/`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      12000
    );
  } catch {
    // Warm-up is intentionally non-blocking.
  }
}

async function fetchStandardDetails(decodedNumber) {
  const encodedNumber = encodeURIComponent(decodedNumber);
  const normalized = normalizeStandardNumber(decodedNumber);
  const cached = readCachedStandard(normalized);

  // Use cached data immediately on repeat visits while refreshing in the background.
  if (cached) {
    return { data: cached, fromCache: true };
  }

  warmBackend();

  const local = await tryRequest(`${API_BASE}/api/standards/${encodedNumber}`);
  if (local.response?.ok && local.payload) {
    writeCachedStandard(normalized, local.payload);
    return { data: local.payload, fromCache: false };
  }

  const shouldTryDirect =
    !local.response ||
    local.response.status === 404 ||
    local.response.status >= 500;

  if (shouldTryDirect) {
    const direct = await tryRequest(`${BACKEND_URL}/api/standards/${encodedNumber}`);

    if (direct.response?.ok && direct.payload) {
      writeCachedStandard(normalized, direct.payload);
      return { data: direct.payload, fromCache: false };
    }
  }

  // Compatibility fallback: this endpoint is known to return the seeded standards set.
  const searchLocal = await tryRequest(`${API_BASE}/api/standards/search`);
  let searchPayload = searchLocal.response?.ok ? searchLocal.payload : null;

  if (
    !searchPayload &&
    (!searchLocal.response ||
      searchLocal.response.status === 404 ||
      searchLocal.response.status >= 500)
  ) {
    const searchDirect = await tryRequest(`${BACKEND_URL}/api/standards/search`);
    if (searchDirect.response?.ok) searchPayload = searchDirect.payload;
  }

  const standards = getStandardsArray(searchPayload);
  const match = standards.find(
    (item) => normalizeStandardNumber(item?.number) === normalized
  );

  if (match) {
    writeCachedStandard(normalized, match);
    return { data: match, fromCache: false };
  }

  const status = local.response?.status || searchLocal.response?.status || 0;

  if (status === 404) {
    throw new Error("The requested BIS standard could not be found.");
  }

  throw new Error(
    `Unable to load this standard${status ? ` (HTTP ${status})` : "."}`
  );
}

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("withdraw") || value.includes("cancel")) return "negative";
  if (value.includes("draft") || value.includes("pending")) return "caution";
  if (value.includes("active") || value.includes("published") || value.includes("listed")) return "positive";
  return "neutral";
}

function getStatusLabel(status) {
  return displayValue(status, "Status unavailable");
}

function FieldCard({ label, value, compact = false }) {
  const available = Boolean(cleanValue(value));

  return (
    <div className={`sd-field-card ${compact ? "sd-field-card-compact" : ""}`}>
      <span className="sd-field-label">{label}</span>
      <strong className={available ? "sd-field-value" : "sd-field-value sd-field-value-muted"}>
        {available ? value : "Not available"}
      </strong>
    </div>
  );
}

function ActionCard({ eyebrow, title, description, to, icon }) {
  return (
    <Link to={to} className="sd-action-card">
      <div className="sd-action-icon" aria-hidden="true">{icon}</div>
      <div className="sd-action-copy">
        <span className="sd-action-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <span className="sd-action-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

function StandardDetails() {
  const { standardNumber } = useParams();

  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchStandard = async () => {
      setLoading(true);
      setError("");
      setStandard(null);
      setFromCache(false);

      try {
        const decodedNumber = decodeURIComponent(standardNumber || "").trim();
        if (!decodedNumber) throw new Error("No standard number was provided.");

        const result = await fetchStandardDetails(decodedNumber);

        if (!mounted) return;
        setStandard(result.data);
        setFromCache(result.fromCache);
      } catch (err) {
        console.error("Standard details request failed:", err);

        if (!mounted) return;

        setError(
          err?.name === "AbortError"
            ? "The BIS standards service is taking longer than expected. Please try again."
            : err?.message || "Failed to load standard details."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStandard();

    return () => {
      mounted = false;
    };
  }, [standardNumber]);

  const dataMetrics = useMemo(() => {
    if (!standard) return { available: 0, total: 8, percent: 0 };

    const fields = [
      standard.number,
      standard.title,
      standard.category,
      standard.edition_year,
      standard.status,
      standard.scope,
      standard.certification_scheme || standard.certification_status,
      standard.qco_information,
    ];

    const available = fields.filter((field) => cleanValue(field)).length;
    return {
      available,
      total: fields.length,
      percent: Math.round((available / fields.length) * 100),
    };
  }, [standard]);

  const statusTone = getStatusTone(standard?.status);
  const sourceUrl = cleanValue(standard?.source_url) || BIS_PORTAL_URL;
  const sourceName = cleanValue(standard?.source_name) || "BIS Standards Portal";

  if (loading) {
    return (
      <div className="app-page standard-details-page">
        <Navbar />
        <style>{PAGE_STYLES}</style>
        <main className="sd-shell">
          <div className="sd-skeleton-hero">
            <div className="sd-skeleton sd-skeleton-sm" />
            <div className="sd-skeleton sd-skeleton-xl" />
            <div className="sd-skeleton sd-skeleton-lg" />
          </div>

          <div className="sd-skeleton-grid">
            {[1, 2, 3, 4].map((item) => (
              <div className="sd-skeleton-card" key={item}>
                <div className="sd-skeleton sd-skeleton-md" />
                <div className="sd-skeleton sd-skeleton-lg" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !standard) {
    return (
      <div className="app-page standard-details-page">
        <Navbar />
        <style>{PAGE_STYLES}</style>
        <main className="sd-shell">
          <Link to="/standards" className="sd-back-link">← Back to Standards Search</Link>
          <section className="sd-error-panel">
            <span className="sd-eyebrow">BIS STANDARD</span>
            <div className="sd-error-icon" aria-hidden="true">!</div>
            <h1>Standard could not be loaded</h1>
            <p>{error || "The requested standard could not be loaded."}</p>
            <Link to="/standards" className="sd-primary-btn">Return to Standards Search</Link>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-page standard-details-page">
      <Navbar />
      <style>{PAGE_STYLES}</style>

      <main className="sd-shell">
        <div className="sd-breadcrumb-row">
          <Link to="/standards" className="sd-back-link">← Back to Standards Search</Link>
          <span className="sd-record-label">
            {fromCache ? "Cached record · refreshing available data on revisit" : "BISense knowledge record"}
          </span>
        </div>

        <section className="sd-hero">
          <div className="sd-hero-main">
            <div className="sd-hero-topline">
              <span className="sd-eyebrow sd-eyebrow-light">BIS STANDARD</span>
              <span className={`sd-status-pill ${statusTone}`}>
                <span className="sd-status-dot" />
                {getStatusLabel(standard.status)}
              </span>
            </div>

            <h1>{displayValue(standard.number, "Unknown Standard")}</h1>
            <p className="sd-hero-title">{displayValue(standard.title, "BIS standard information")}</p>

            <div className="sd-hero-meta">
              <span>{displayValue(standard.category, "Category unavailable")}</span>
              <span className="sd-meta-divider">•</span>
              <span>
                Edition {cleanValue(standard.edition_year) ? standard.edition_year : "not available"}
              </span>
            </div>
          </div>

          <div className="sd-hero-side">
            <div className="sd-trust-card">
              <span className="sd-trust-label">DATA COVERAGE</span>
              <strong>{dataMetrics.percent}%</strong>
              <p>{dataMetrics.available} of {dataMetrics.total} key fields currently populated.</p>
              <div className="sd-meter" aria-label={`Data coverage ${dataMetrics.percent}%`}>
                <div style={{ width: `${dataMetrics.percent}%` }} />
              </div>
            </div>
          </div>
        </section>

        <div className="sd-grid sd-main-grid">
          <div className="sd-main-column">
            <section className="sd-panel">
              <div className="sd-panel-heading">
                <div>
                  <span className="sd-eyebrow">STANDARD PROFILE</span>
                  <h2>Core information</h2>
                </div>
                <span className="sd-panel-index">01</span>
              </div>

              <div className="sd-fields-grid">
                <FieldCard label="Standard number" value={standard.number} />
                <FieldCard label="Category" value={standard.category} />
                <FieldCard label="Edition year" value={standard.edition_year} />
                <FieldCard label="Status" value={standard.status} />
              </div>
            </section>

            <section className="sd-panel">
              <div className="sd-panel-heading">
                <div>
                  <span className="sd-eyebrow">APPLICABILITY</span>
                  <h2>Scope of the standard</h2>
                </div>
                <span className="sd-panel-index">02</span>
              </div>

              <div className={`sd-rich-copy ${cleanValue(standard.scope) ? "" : "sd-rich-copy-empty"}`}>
                <div className="sd-copy-mark" aria-hidden="true">S</div>
                <p>
                  {displayValue(
                    standard.scope,
                    "Scope information is not available for this standard in the current BISense knowledge base."
                  )}
                </p>
              </div>
            </section>

            <section className="sd-panel">
              <div className="sd-panel-heading">
                <div>
                  <span className="sd-eyebrow">CONFORMITY & REGULATION</span>
                  <h2>Certification and QCO context</h2>
                </div>
                <span className="sd-panel-index">03</span>
              </div>

              <div className="sd-fields-grid sd-fields-grid-3">
                <FieldCard label="Certification scheme" value={standard.certification_scheme} />
                <FieldCard label="Certification status" value={standard.certification_status} />
                <FieldCard label="QCO information" value={standard.qco_information} />
              </div>

              <div className="sd-verification-note">
                <span className="sd-note-icon" aria-hidden="true">✓</span>
                <div>
                  <strong>Verify before making a decision</strong>
                  <p>
                    BISense organizes available record data; it does not replace the latest official BIS standard, amendment, notification, or certification determination.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="sd-side-column">
            <section className="sd-source-panel">
              <span className="sd-eyebrow sd-eyebrow-light">OFFICIAL SOURCE</span>
              <h2>Verify with BIS</h2>
              <p>
                Cross-check the latest official record before using this information for certification, procurement, manufacturing, or compliance decisions.
              </p>

              <div className="sd-source-origin">
                <span className="sd-source-badge" aria-hidden="true">BIS</span>
                <div>
                  <strong>{sourceName}</strong>
                  <span>Official BIS source</span>
                </div>
              </div>

              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sd-source-btn"
              >
                Open Official BIS Source ↗
              </a>
            </section>

            <section className="sd-side-note">
              <span className="sd-eyebrow">RECORD QUALITY</span>
              <h3>Use missing fields as a signal to verify.</h3>
              <p>
                A field marked “Not available” means the current BISense knowledge record does not contain that value. It is not an assertion that the information does not exist officially.
              </p>
            </section>
          </aside>
        </div>

        <section className="sd-next-section">
          <div className="sd-section-heading-row">
            <div>
              <span className="sd-eyebrow">NEXT ACTIONS</span>
              <h2>Move from discovery to action.</h2>
              <p>Use this standard as the starting point for comparison, certification discovery, compliance review, laboratory lookup, or AI-assisted guidance.</p>
            </div>
          </div>

          <div className="sd-actions-grid">
            <ActionCard
              eyebrow="COMPARE"
              title="Compare standards"
              description="See how this standard differs from another BIS standard."
              to={`/compare?standard=${encodeURIComponent(standard.number || "")}`}
              icon="⇄"
            />
            <ActionCard
              eyebrow="CERTIFICATION"
              title="Find certification path"
              description="Explore likely certification-related information for this standard."
              to={`/certification-advisor?standard=${encodeURIComponent(standard.number || "")}`}
              icon="✓"
            />
            <ActionCard
              eyebrow="COMPLIANCE"
              title="Start compliance review"
              description="Turn the selected standard into a trackable review checklist."
              to={`/compliance?standard=${encodeURIComponent(standard.number || "")}`}
              icon="☑"
            />
            <ActionCard
              eyebrow="LABORATORIES"
              title="Find testing laboratories"
              description="Look for BIS LIMS laboratory information connected to the standard."
              to={`/laboratories?is_number=${encodeURIComponent(standard.number || "")}`}
              icon="⌁"
            />
            <ActionCard
              eyebrow="AI COPILOT"
              title="Ask BISense Copilot"
              description="Use the standard number as context for a guided question."
              to={`/bis-copilot?standard=${encodeURIComponent(standard.number || "")}`}
              icon="✦"
            />
          </div>
        </section>

        <section className="sd-footer-disclaimer">
          <strong>Important:</strong> This page is a BISense information and workflow interface. Current record data may be incomplete. Always verify the latest official BIS source before relying on requirements, certification status, legal obligations, or regulatory applicability.
        </section>
      </main>

      <Footer />
    </div>
  );
}

const PAGE_STYLES = `
  .standard-details-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 8% 0%, rgba(92, 102, 214, .09), transparent 28%),
      linear-gradient(180deg, #f8fafc 0%, #ffffff 58%, #f8fafc 100%);
    color: #111827;
  }

  .standard-details-page * {
    box-sizing: border-box;
  }

  .sd-shell {
    width: min(1180px, calc(100% - 36px));
    margin: 0 auto;
    padding: 26px 0 70px;
  }

  .sd-breadcrumb-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
  }

  .sd-back-link {
    color: #4f5fda;
    text-decoration: none;
    font-weight: 700;
    font-size: 14px;
  }

  .sd-back-link:hover {
    text-decoration: underline;
  }

  .sd-record-label {
    color: #8a94a6;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    text-align: right;
  }

  .sd-eyebrow {
    display: inline-block;
    margin: 0;
    color: #6672e8;
    font-size: 11px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .sd-eyebrow-light {
    color: #cbd4ff;
  }

  .sd-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 20px;
    padding: 34px;
    border-radius: 26px;
    color: #fff;
    background:
      radial-gradient(circle at 86% 8%, rgba(130, 140, 245, .30), transparent 27%),
      linear-gradient(135deg, #17213c 0%, #2a3564 55%, #4658c9 100%);
    box-shadow: 0 20px 50px rgba(38, 51, 95, .18);
    overflow: hidden;
    position: relative;
  }

  .sd-hero::after {
    content: "";
    position: absolute;
    width: 240px;
    height: 240px;
    right: -90px;
    bottom: -110px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,.13);
    box-shadow: 0 0 0 26px rgba(255,255,255,.035), 0 0 0 52px rgba(255,255,255,.025);
    pointer-events: none;
  }

  .sd-hero-main,
  .sd-hero-side {
    position: relative;
    z-index: 1;
  }

  .sd-hero-topline {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .sd-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.10);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  .sd-status-pill.positive { background: rgba(48, 167, 116, .16); }
  .sd-status-pill.caution { background: rgba(232, 164, 72, .16); }
  .sd-status-pill.negative { background: rgba(213, 84, 84, .16); }

  .sd-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d2d8ff;
  }

  .positive .sd-status-dot { background: #5fd39f; }
  .caution .sd-status-dot { background: #f3b663; }
  .negative .sd-status-dot { background: #f48b8b; }

  .sd-hero h1 {
    margin: 0;
    font-size: clamp(48px, 7vw, 76px);
    line-height: .95;
    letter-spacing: -.05em;
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
  }

  .sd-hero-title {
    max-width: 850px;
    margin: 14px 0 0;
    color: #f2f5ff !important;
    -webkit-text-fill-color: #f2f5ff !important;
    font-size: clamp(18px, 2.2vw, 25px);
    line-height: 1.45;
    font-weight: 600;
  }

  .sd-hero-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
    color: #dbe1f7;
    font-size: 13px;
    font-weight: 700;
  }

  .sd-meta-divider { opacity: .55; }

  .sd-trust-card {
    min-height: 100%;
    padding: 22px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(8, 15, 35, .23);
    backdrop-filter: blur(10px);
  }

  .sd-trust-label {
    color: #cbd4ff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
  }

  .sd-trust-card strong {
    display: block;
    margin-top: 8px;
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
    font-size: 42px;
    line-height: 1;
    letter-spacing: -.04em;
  }

  .sd-trust-card p {
    margin: 10px 0 16px;
    color: #dbe1f7 !important;
    -webkit-text-fill-color: #dbe1f7 !important;
    font-size: 13px;
    line-height: 1.55;
  }

  .sd-meter {
    height: 7px;
    border-radius: 99px;
    background: rgba(255,255,255,.13);
    overflow: hidden;
  }

  .sd-meter > div {
    height: 100%;
    border-radius: inherit;
    background: #aeb8ff;
  }

  .sd-grid {
    display: grid;
    gap: 20px;
  }

  .sd-main-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
    margin-top: 20px;
    align-items: start;
  }

  .sd-main-column,
  .sd-side-column {
    display: grid;
    gap: 20px;
    min-width: 0;
  }

  .sd-panel {
    padding: 28px;
    border: 1px solid #e7eaf0;
    border-radius: 22px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
  }

  .sd-panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .sd-panel h2,
  .sd-next-section h2,
  .sd-source-panel h2,
  .sd-error-panel h1,
  .sd-side-note h3 {
    margin: 7px 0 0;
    color: #111827 !important;
    -webkit-text-fill-color: #111827 !important;
    letter-spacing: -.025em;
  }

  .sd-panel h2 { font-size: 25px; }

  .sd-panel-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border-radius: 10px;
    background: #f2f4ff;
    color: #6672e8;
    font-size: 11px;
    font-weight: 900;
  }

  .sd-fields-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sd-fields-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .sd-field-card {
    min-width: 0;
    padding: 18px;
    border: 1px solid #edf0f5;
    border-radius: 16px;
    background: #fafbfc;
  }

  .sd-field-label {
    display: block;
    margin-bottom: 8px;
    color: #7a8495 !important;
    -webkit-text-fill-color: #7a8495 !important;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .sd-field-value {
    display: block;
    color: #171d29 !important;
    -webkit-text-fill-color: #171d29 !important;
    font-size: 16px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .sd-field-value-muted {
    color: #9ba3af !important;
    -webkit-text-fill-color: #9ba3af !important;
    font-weight: 600;
  }

  .sd-rich-copy {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 15px;
    align-items: start;
    padding: 20px;
    border-radius: 17px;
    border: 1px solid #edf0f5;
    background: #fbfcfe;
  }

  .sd-rich-copy-empty { background: #fcfcfd; }

  .sd-copy-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: #eef0ff;
    color: #5d68d8;
    font-weight: 900;
  }

  .sd-rich-copy p {
    margin: 0;
    color: #3d4756 !important;
    -webkit-text-fill-color: #3d4756 !important;
    font-size: 15px;
    line-height: 1.72;
    overflow-wrap: anywhere;
  }

  .sd-verification-note {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 16px;
    padding: 16px 18px;
    border-radius: 16px;
    background: #f7f8ff;
    border: 1px solid #e5e7ff;
  }

  .sd-note-icon {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: #e9ecff;
    color: #5663d7;
    font-weight: 900;
  }

  .sd-verification-note strong {
    color: #252d3c !important;
    -webkit-text-fill-color: #252d3c !important;
    font-size: 13px;
  }

  .sd-verification-note p {
    margin: 5px 0 0;
    color: #596577 !important;
    -webkit-text-fill-color: #596577 !important;
    font-size: 13px;
    line-height: 1.55;
  }

  .sd-source-panel {
    padding: 26px;
    border-radius: 22px;
    color: #fff;
    background: linear-gradient(150deg, #202b4e 0%, #36447a 62%, #5969db 100%);
    box-shadow: 0 16px 36px rgba(38, 51, 95, .15);
    position: sticky;
    top: 18px;
  }

  .sd-source-panel h2 {
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
    font-size: 26px;
  }

  .sd-source-panel > p {
    margin: 13px 0 20px;
    color: #e4e9ff !important;
    -webkit-text-fill-color: #e4e9ff !important;
    font-size: 14px;
    line-height: 1.65;
  }

  .sd-source-origin {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 14px;
    border-radius: 16px;
    background: rgba(255,255,255,.09);
    border: 1px solid rgba(255,255,255,.11);
  }

  .sd-source-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(255,255,255,.14);
    color: #fff;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: .05em;
  }

  .sd-source-origin strong,
  .sd-source-origin span {
    display: block;
  }

  .sd-source-origin strong {
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
    font-size: 13px;
  }

  .sd-source-origin span {
    margin-top: 3px;
    color: #cad3ef !important;
    -webkit-text-fill-color: #cad3ef !important;
    font-size: 11px;
  }

  .sd-source-btn {
    display: block;
    margin-top: 14px;
    padding: 13px 15px;
    border-radius: 13px;
    background: #fff;
    color: #2d3969 !important;
    -webkit-text-fill-color: #2d3969 !important;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    text-decoration: none;
    transition: transform .18s ease, box-shadow .18s ease;
  }

  .sd-source-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0,0,0,.12);
  }

  .sd-side-note {
    padding: 22px;
    border: 1px solid #e7eaf0;
    border-radius: 22px;
    background: #fff;
  }

  .sd-side-note h3 { font-size: 18px; line-height: 1.3; }

  .sd-side-note p {
    margin: 10px 0 0;
    color: #667085 !important;
    -webkit-text-fill-color: #667085 !important;
    font-size: 13px;
    line-height: 1.65;
  }

  .sd-next-section {
    margin-top: 22px;
    padding: 28px;
    border: 1px solid #e7eaf0;
    border-radius: 22px;
    background: rgba(255,255,255,.94);
    box-shadow: 0 10px 30px rgba(15, 23, 42, .04);
  }

  .sd-next-section h2 { font-size: 27px; }

  .sd-next-section > .sd-section-heading-row p {
    max-width: 780px;
    margin: 10px 0 0;
    color: #667085 !important;
    -webkit-text-fill-color: #667085 !important;
    line-height: 1.65;
  }

  .sd-actions-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    margin-top: 20px;
  }

  .sd-action-card {
    min-width: 0;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 11px;
    align-items: start;
    padding: 16px;
    border: 1px solid #e9edf3;
    border-radius: 16px;
    background: #fbfcfe;
    text-decoration: none;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }

  .sd-action-card:hover {
    transform: translateY(-2px);
    border-color: #d7dcff;
    box-shadow: 0 10px 24px rgba(38, 51, 95, .08);
  }

  .sd-action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #eef0ff;
    color: #5a66d6;
    font-weight: 900;
  }

  .sd-action-copy { min-width: 0; }

  .sd-action-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #8a94a6 !important;
    -webkit-text-fill-color: #8a94a6 !important;
    font-size: 9px;
    line-height: 1.2;
    letter-spacing: .11em;
    font-weight: 900;
  }

  .sd-action-copy strong {
    display: block;
    color: #1a2230 !important;
    -webkit-text-fill-color: #1a2230 !important;
    font-size: 14px;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .sd-action-copy p {
    margin: 6px 0 0;
    color: #6b7280 !important;
    -webkit-text-fill-color: #6b7280 !important;
    font-size: 11px;
    line-height: 1.45;
  }

  .sd-action-arrow {
    color: #97a0b2;
    font-size: 18px;
    line-height: 1;
    margin-top: 2px;
  }

  .sd-footer-disclaimer {
    margin-top: 18px;
    padding: 15px 17px;
    border: 1px solid #eceff4;
    border-radius: 14px;
    background: #fff;
    color: #677286 !important;
    -webkit-text-fill-color: #677286 !important;
    font-size: 12px;
    line-height: 1.6;
  }

  .sd-primary-btn {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin-top: 18px;
    padding: 12px 16px;
    border-radius: 12px;
    background: #5663d7;
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
    text-decoration: none;
    font-size: 13px;
    font-weight: 800;
  }

  .sd-error-panel {
    max-width: 720px;
    margin: 60px auto;
    padding: 38px;
    text-align: center;
    border: 1px solid #e7eaf0;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 18px 50px rgba(15, 23, 42, .07);
  }

  .sd-error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    margin: 20px auto 10px;
    border-radius: 14px;
    background: #fff2f1;
    color: #c34f4b;
    font-size: 21px;
    font-weight: 900;
  }

  .sd-error-panel p {
    max-width: 540px;
    margin: 10px auto 0;
    color: #6b7280 !important;
    -webkit-text-fill-color: #6b7280 !important;
    line-height: 1.65;
  }

  .sd-skeleton-hero {
    min-height: 300px;
    padding: 34px;
    border-radius: 26px;
    background: linear-gradient(135deg, #e9ecf6, #dfe4f7);
    margin-bottom: 20px;
  }

  .sd-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .sd-skeleton-card {
    min-height: 120px;
    padding: 18px;
    border: 1px solid #e8ebf1;
    border-radius: 18px;
    background: #fff;
  }

  .sd-skeleton {
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(255,255,255,.45), rgba(255,255,255,.8), rgba(255,255,255,.45));
    animation: sd-shimmer 1.3s infinite linear;
    background-size: 200% 100%;
  }

  .sd-skeleton-sm { width: 100px; height: 12px; }
  .sd-skeleton-xl { width: 280px; height: 70px; margin-top: 22px; }
  .sd-skeleton-lg { width: 55%; height: 20px; margin-top: 14px; }
  .sd-skeleton-md { width: 80px; height: 11px; }

  @keyframes sd-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (max-width: 1080px) {
    .sd-main-grid { grid-template-columns: minmax(0, 1fr) 290px; }
    .sd-actions-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-width: 850px) {
    .sd-shell { width: min(100% - 26px, 720px); }
    .sd-hero,
    .sd-main-grid { grid-template-columns: 1fr; }
    .sd-source-panel { position: static; }
    .sd-fields-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sd-actions-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sd-breadcrumb-row { align-items: flex-start; flex-direction: column; }
    .sd-record-label { text-align: left; }
  }

  @media (max-width: 620px) {
    .sd-shell { width: min(100% - 18px, 520px); padding-top: 18px; }
    .sd-hero { padding: 24px 20px; border-radius: 20px; }
    .sd-hero h1 { font-size: 50px; }
    .sd-panel,
    .sd-source-panel,
    .sd-side-note,
    .sd-next-section { padding: 20px; border-radius: 18px; }
    .sd-fields-grid,
    .sd-fields-grid-3,
    .sd-actions-grid { grid-template-columns: 1fr; }
    .sd-rich-copy { grid-template-columns: 1fr; }
    .sd-copy-mark { width: 36px; height: 36px; }
    .sd-action-card { grid-template-columns: 38px minmax(0, 1fr) auto; }
    .sd-skeleton-grid { grid-template-columns: 1fr; }
  }

  @media print {
    .standard-details-page { background: #fff !important; }
    .sd-shell { width: 100%; padding: 0; }
    .sd-breadcrumb-row,
    .sd-actions-grid,
    .sd-source-btn,
    nav,
    footer { display: none !important; }
    .sd-hero,
    .sd-panel,
    .sd-source-panel,
    .sd-side-note,
    .sd-next-section,
    .sd-footer-disclaimer { box-shadow: none !important; break-inside: avoid; }
    .sd-main-grid { grid-template-columns: 1fr; }
    .sd-source-panel { position: static; }
  }
`;

export default StandardDetails;
