import React, { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "";
const BACKEND_URL = "https://bisense-5ozn.onrender.com";

const CACHE_KEY = "bisense_standards_certification_cache_v1";
const CACHE_TTL = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 25000;

const CATEGORY_KEYWORDS = {
  Electrical: [
    "electrical",
    "electric",
    "cable",
    "appliance",
    "motor",
    "switch",
    "wire",
    "socket",
    "plug",
    "transformer",
  ],
  Electronics: [
    "electronic",
    "electronics",
    "computer",
    "device",
    "equipment",
    "display",
    "charger",
    "controller",
    "sensor",
  ],
  Construction: [
    "civil",
    "construction",
    "building",
    "concrete",
    "steel",
    "masonry",
    "cement",
    "foundation",
    "structural",
    "brick",
    "plaster",
  ],
  "Consumer Products": [
    "consumer",
    "household",
    "appliance",
    "product",
    "utensil",
    "bottle",
    "container",
  ],
  Food: [
    "food",
    "water",
    "drinking",
    "edible",
    "packaging",
    "milk",
  ],
  Mechanical: [
    "mechanical",
    "machine",
    "machinery",
    "engineering",
    "bearing",
    "pump",
    "valve",
    "equipment",
  ],
  Chemical: [
    "chemical",
    "cement",
    "material",
    "compound",
    "polymer",
    "paint",
    "adhesive",
  ],
  Other: [],
};

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3);
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

function readCachedStandards() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw);

    if (
      !cached?.timestamp ||
      Date.now() - Number(cached.timestamp) > CACHE_TTL
    ) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    const standards = getStandardsArray(cached.data);

    return standards.length ? standards : null;
  } catch {
    return null;
  }
}

function saveCachedStandards(standards) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: standards,
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function warmBackend() {
  fetchWithTimeout(
    `${BACKEND_URL}/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
    12000
  ).catch(() => {});
}

async function requestStandards(url) {
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

async function loadStandards() {
  const cached = readCachedStandards();

  if (cached?.length) {
    return cached;
  }

  // Wake Render without making the user wait for the warm-up itself.
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
        await requestStandards(url);

      lastStatus = response?.status || 0;

      if (!response?.ok) {
        continue;
      }

      const standards = getStandardsArray(payload);

      if (standards.length) {
        saveCachedStandards(standards);
        return standards;
      }
    } catch (error) {
      console.warn(
        "Certification Advisor standards request failed:",
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

function fieldText(standard) {
  return normalizeText(
    [
      standard?.number,
      standard?.title,
      standard?.category,
      standard?.scope,
      standard?.status,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function scoreStandard(standard, form) {
  const product = normalizeText(form.product);
  const productTokens = tokenize(form.product);
  const category = normalizeText(form.category);
  const searchable = fieldText(standard);

  let score = 0;
  const reasons = [];

  if (product) {
    const exactPhrase =
      searchable.includes(product);

    if (exactPhrase) {
      score += 14;
      reasons.push("product phrase match");
    }

    let tokenHits = 0;

    productTokens.forEach((word) => {
      if (searchable.includes(word)) {
        tokenHits += 1;
        score += word.length >= 6 ? 5 : 3;
      }
    });

    if (tokenHits > 0) {
      reasons.push(
        `${tokenHits} product keyword${
          tokenHits === 1 ? "" : "s"
        } matched`
      );
    }
  }

  if (category) {
    const standardCategory = normalizeText(
      standard?.category
    );

    if (
      standardCategory &&
      standardCategory === category
    ) {
      score += 12;
      reasons.push("category match");
    } else if (
      standardCategory.includes(category) ||
      category.includes(standardCategory)
    ) {
      score += 6;
      reasons.push("related category");
    }

    const categoryKeywords =
      CATEGORY_KEYWORDS[
        form.category
      ] || [];

    categoryKeywords.forEach((keyword) => {
      if (searchable.includes(normalizeText(keyword))) {
        score += 1.5;
      }
    });
  }

  const title = normalizeText(
    standard?.title
  );

  if (
    product &&
    title &&
    productTokens.some(
      (word) => title.includes(word)
    )
  ) {
    score += 4;
  }

  if (
    form.intendedUse &&
    normalizeText(form.intendedUse) ===
      "industrial" &&
    searchable.includes("industrial")
  ) {
    score += 2;
    reasons.push("industrial-use context");
  }

  if (
    form.intendedUse &&
    normalizeText(form.intendedUse) ===
      "domestic" &&
    (searchable.includes("household") ||
      searchable.includes("domestic") ||
      searchable.includes("consumer"))
  ) {
    score += 2;
    reasons.push("consumer-use context");
  }

  return {
    ...standard,
    matchScore: score,
    matchReasons: reasons.slice(0, 4),
  };
}

function getMatchLevel(score) {
  if (score >= 20) {
    return {
      label: "Strong match",
      className: "strong",
    };
  }

  if (score >= 10) {
    return {
      label: "Relevant match",
      className: "relevant",
    };
  }

  return {
    label: "Exploratory match",
    className: "exploratory",
  };
}

function findRelevantStandards(standards, form) {
  return standards
    .map((standard) =>
      scoreStandard(standard, form)
    )
    .filter(
      (standard) =>
        standard.matchScore >= 5
    )
    .sort((a, b) => {
      if (
        b.matchScore !==
        a.matchScore
      ) {
        return b.matchScore - a.matchScore;
      }

      return (
        Number(b.edition_year || 0) -
        Number(a.edition_year || 0)
      );
    })
    .slice(0, 6);
}

function getConfidence(matches) {
  if (!matches.length) {
    return {
      label: "No strong match",
      description:
        "The current BISense dataset did not produce a sufficiently strong match for the supplied product context.",
      className: "low",
    };
  }

  const topScore =
    matches[0]?.matchScore || 0;

  if (topScore >= 20) {
    return {
      label: "Higher relevance",
      description:
        "The top result has multiple matching product/category signals in the available BISense data.",
      className: "high",
    };
  }

  if (topScore >= 10) {
    return {
      label: "Moderate relevance",
      description:
        "The results contain useful matching signals, but the product context should be reviewed before relying on them.",
      className: "medium",
    };
  }

  return {
    label: "Exploratory",
    description:
      "The results are useful starting points, but the supplied product description is not specific enough for a strong match.",
    className: "low",
  };
}

function buildDecisionPath(result) {
  const hasMatches =
    result?.matches?.length > 0;

  return [
    {
      number: "01",
      title: "Review potential standards",
      description: hasMatches
        ? "Open the strongest matches and inspect their available scope, status, edition and source information."
        : "Refine the product description or search the Standards database for a better starting point.",
      to: hasMatches
        ? `/standard/${encodeURIComponent(
            result.matches[0]?.number || ""
          )}`
        : "/standards",
    },
    {
      number: "02",
      title: "Check certification requirements",
      description:
        "Confirm whether the product falls under a current compulsory certification requirement or Quality Control Order.",
      to: "/certification",
    },
    {
      number: "03",
      title: "Identify testing needs",
      description:
        "Use the relevant standard to determine what testing context and laboratory information should be reviewed.",
      to: "/laboratories",
    },
    {
      number: "04",
      title: "Track compliance work",
      description:
        "Turn the identified requirements into a checklist and record what is complete or pending.",
      to: "/compliance",
    },
  ];
}

function CertificationAdvisor() {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    product: "",
    category: "",
    location: "",
    intendedUse: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const continueStep = () => {
    if (
      step === 1 &&
      !form.product.trim()
    ) {
      return;
    }

    if (
      step === 2 &&
      (!form.category ||
        !form.location)
    ) {
      return;
    }

    setError("");

    setStep((current) =>
      Math.min(current + 1, 3)
    );
  };

  const analyzeProduct = async () => {
    if (!form.intendedUse) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const allStandards =
        await loadStandards();

      const matches =
        findRelevantStandards(
          allStandards,
          form
        );

      const confidence =
        getConfidence(matches);

      const analysis = {
        product: form.product.trim(),
        category: form.category,
        location: form.location,
        intendedUse: form.intendedUse,
        matches,
        confidence,
        totalStandards:
          allStandards.length,
        createdAt:
          new Date().toISOString(),
      };

      setResult(analysis);
      setStep(4);
    } catch (err) {
      console.error(
        "Certification Advisor error:",
        err
      );

      setResult(null);

      setError(
        err?.name === "AbortError"
          ? "The BIS standards service took too long to respond. Please try again."
          : err?.message ||
              "Unable to analyze the product."
      );
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(1);

    setForm({
      product: "",
      category: "",
      location: "",
      intendedUse: "",
    });

    setResult(null);
    setError("");
  };

  const decisionPath = useMemo(() => {
    if (!result) {
      return [];
    }

    return buildDecisionPath(
      result
    );
  }, [result]);

  const topMatch = result?.matches?.[0];

  const selectStyle = {
    color: "#111827",
    WebkitTextFillColor:
      "#111827",
    backgroundColor: "#FFFFFF",
    borderColor: "#D7DFEA",
  };

  const openSource = (standard) => {
    const url =
      standard?.source_url ||
      "https://standards.bis.gov.in/";

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container advisor-page">
        <style>
          {`
            .advisor-page,
            .advisor-page * {
              color-scheme: light;
            }

            .advisor-page .page-intro h1,
            .advisor-page .page-intro p,
            .advisor-page .advisor-step h2,
            .advisor-page .step-description,
            .advisor-page .field-label,
            .advisor-page .advisor-result h2,
            .advisor-page .result-intro,
            .advisor-page .result-card strong,
            .advisor-page .next-step strong,
            .advisor-page .next-step p,
            .advisor-page .compare-placeholder h2,
            .advisor-page .compare-placeholder p {
              -webkit-text-fill-color: initial;
            }

            .advisor-page .page-intro h1,
            .advisor-page .advisor-step h2,
            .advisor-page .advisor-result h2 {
              color: #111827 !important;
            }

            .advisor-page .page-intro > p:last-child,
            .advisor-page .step-description,
            .advisor-page .result-intro {
              color: #4F607A !important;
            }

            .advisor-page .field-label {
              color: #111827 !important;
            }

            .advisor-page input,
            .advisor-page select {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
              background-color: #FFFFFF !important;
            }

            .advisor-page input::placeholder {
              color: #7B8798 !important;
              -webkit-text-fill-color: #7B8798 !important;
              opacity: 1 !important;
            }

            .advisor-page select option {
              color: #111827 !important;
              background-color: #FFFFFF !important;
            }

            .advisor-page .result-card span,
            .advisor-page .result-highlight span,
            .advisor-page .next-steps-card .eyebrow {
              color: #52627A !important;
            }

            .advisor-page .result-card strong,
            .advisor-page .next-step strong {
              color: #111827 !important;
            }

            .advisor-page .next-step p {
              color: #4F607A !important;
            }

            .advisor-smart-status {
              margin-top: 18px;
              padding: 17px 18px;
              border-radius: 17px;
              border: 1px solid #DEE6EA;
              background: #F7FAFB;
            }

            .advisor-smart-status-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
            }

            .advisor-smart-status-top strong {
              color: #111827 !important;
              font-size: 14px;
            }

            .advisor-confidence {
              display: inline-flex;
              align-items: center;
              padding: 7px 10px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 750;
              letter-spacing: 0.2px;
            }

            .advisor-confidence.high {
              background: #E7F2EE;
              color: #2F6B59 !important;
            }

            .advisor-confidence.medium {
              background: #F3EEDB;
              color: #766029 !important;
            }

            .advisor-confidence.low {
              background: #F1ECE8;
              color: #795D4D !important;
            }

            .advisor-smart-status p {
              margin-top: 7px;
              color: #607083 !important;
              font-size: 12px;
              line-height: 1.5;
            }

            .advisor-match-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 7px;
              margin-top: 8px;
            }

            .advisor-match-meta span {
              display: inline-flex;
              padding: 5px 8px;
              border-radius: 999px;
              background: #F0F4F6;
              color: #536273 !important;
              font-size: 10px;
              font-weight: 650;
            }

            .advisor-match-score {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              margin-top: 8px;
              color: #247A82 !important;
              font-size: 10px;
              font-weight: 700;
            }

            .advisor-match-score i {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #247A82;
            }

            .advisor-match-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 10px;
            }

            .advisor-match-actions a,
            .advisor-match-actions button {
              width: auto !important;
              padding: 7px 10px;
              border-radius: 9px;
              border: 1px solid #DCE3E8;
              background: #FFFFFF;
              color: #263646 !important;
              font-size: 11px;
              font-weight: 650;
              text-decoration: none;
            }

            .advisor-match-actions button {
              cursor: pointer;
            }

            .advisor-match-actions a:hover,
            .advisor-match-actions button:hover {
              background: #F4F7F8;
            }

            .advisor-decision-card {
              margin-top: 22px;
              padding: 22px;
              border-radius: 20px;
              border: 1px solid #DCE4E8;
              background: #FFFFFF;
            }

            .advisor-decision-card h3 {
              margin: 4px 0 0;
              color: #111827 !important;
              font-size: 23px;
              letter-spacing: -0.6px;
            }

            .advisor-decision-path {
              margin-top: 17px;
              display: grid;
              gap: 10px;
            }

            .advisor-decision-step {
              display: grid;
              grid-template-columns: 34px 1fr auto;
              align-items: start;
              gap: 12px;
              padding: 13px 0;
              border-top: 1px solid #E8ECEF;
              text-decoration: none;
            }

            .advisor-decision-step:first-child {
              border-top: none;
            }

            .advisor-decision-number {
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 9px;
              background: #F0F4F6;
              color: #334155 !important;
              font-size: 10px;
              font-weight: 800;
            }

            .advisor-decision-copy strong {
              display: block;
              color: #111827 !important;
              font-size: 13px;
            }

            .advisor-decision-copy p {
              margin-top: 4px;
              color: #607083 !important;
              font-size: 11px;
              line-height: 1.45;
            }

            .advisor-decision-arrow {
              color: #247A82 !important;
              font-size: 17px;
              padding-top: 3px;
            }

            .advisor-result-note {
              margin-top: 17px;
              padding: 12px 14px;
              border-radius: 13px;
              background: #F8F6EF;
              border: 1px solid #ECE5CD;
              color: #6B6046 !important;
              font-size: 11px;
              line-height: 1.5;
            }

            .advisor-result-note strong {
              color: #574D36 !important;
            }

            @media (max-width: 700px) {
              .advisor-page {
                width: 100%;
                min-width: 0;
                overflow-x: hidden;
              }

              .advisor-page .page-intro h1 {
                font-size: 35px !important;
                line-height: 1.05 !important;
              }

              .advisor-page .page-intro > p:last-child {
                font-size: 14px !important;
                line-height: 1.5 !important;
              }

              .advisor-page .advisor-card {
                padding: 20px 16px !important;
                border-radius: 18px !important;
              }

              .advisor-page .use-option {
                width: 100%;
                text-align: left;
              }

              .advisor-page .advisor-button-row {
                flex-direction: column;
                width: 100%;
                gap: 10px;
              }

              .advisor-page .advisor-button-row > * {
                width: 100%;
                box-sizing: border-box;
              }

              .advisor-page .advisor-result-grid {
                grid-template-columns: 1fr !important;
              }

              .advisor-page .result-actions {
                display: grid !important;
                grid-template-columns: 1fr;
                gap: 10px;
              }

              .advisor-page .result-actions > * {
                width: 100%;
                box-sizing: border-box;
                text-align: center;
              }

              .advisor-page .next-step {
                align-items: flex-start;
              }

              .advisor-page .next-step > span {
                flex: 0 0 32px;
              }

              .advisor-smart-status-top {
                align-items: flex-start;
                flex-direction: column;
              }

              .advisor-decision-step {
                grid-template-columns: 32px 1fr;
              }

              .advisor-decision-arrow {
                display: none;
              }
            }
          `}
        </style>

        <div className="page-intro">
          <p className="eyebrow">
            MANUFACTURER MODE
          </p>

          <h1>
            Find your BIS pathway.
          </h1>

          <p>
            Describe your product and BISense
            will match the available BIS knowledge
            to help you identify a starting point
            for standards, certification, testing
            and compliance.
          </p>
        </div>

        <div className="progress-bar">
          <span
            className={
              step >= 1 ? "active" : ""
            }
          >
            1
          </span>

          <i></i>

          <span
            className={
              step >= 2 ? "active" : ""
            }
          >
            2
          </span>

          <i></i>

          <span
            className={
              step >= 3 ? "active" : ""
            }
          >
            3
          </span>
        </div>

        <section className="advisor-card">
          {error && (
            <div
              className="warning-box advisor-warning"
              role="alert"
            >
              <strong>
                BISense could not complete the
                request.
              </strong>
              <div>{error}</div>
            </div>
          )}

          {step === 1 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 1 OF 3
              </p>

              <h2>
                What product do you manufacture?
              </h2>

              <p className="step-description">
                Use the product's common name and
                add useful detail such as material,
                type or application when possible.
              </p>

              <label
                className="field-label"
                htmlFor="product"
              >
                Product name
              </label>

              <input
                id="product"
                className="full-input"
                type="text"
                placeholder="Example: PVC insulated power cable"
                value={form.product}
                onChange={(event) =>
                  updateField(
                    "product",
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    form.product.trim()
                  ) {
                    continueStep();
                  }
                }}
                autoComplete="off"
              />

              <button
                type="button"
                className="primary-btn large"
                onClick={continueStep}
                disabled={
                  !form.product.trim()
                }
              >
                Continue →
              </button>

              <div className="advisor-smart-status">
                <strong>
                  Better input = better matching
                </strong>
                <p>
                  BISense compares product wording,
                  category signals and available
                  standard metadata. It is a
                  discovery aid, not a final
                  certification decision.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 2 OF 3
              </p>

              <h2>
                Tell us more about the product.
              </h2>

              <p className="step-description">
                Category and manufacturing location
                add context to the standards discovery
                process.
              </p>

              <label
                className="field-label"
                htmlFor="category"
              >
                Product category
              </label>

              <select
                id="category"
                className="full-input"
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="">
                  Select a category
                </option>
                <option value="Electrical">
                  Electrical
                </option>
                <option value="Electronics">
                  Electronics
                </option>
                <option value="Construction">
                  Construction
                </option>
                <option value="Consumer Products">
                  Consumer Products
                </option>
                <option value="Food">
                  Food
                </option>
                <option value="Mechanical">
                  Mechanical
                </option>
                <option value="Chemical">
                  Chemical
                </option>
                <option value="Other">
                  Other
                </option>
              </select>

              <label
                className="field-label"
                htmlFor="location"
              >
                Manufacturing location
              </label>

              <select
                id="location"
                className="full-input"
                value={form.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="">
                  Select a location
                </option>
                <option value="India">
                  India
                </option>
                <option value="Outside India">
                  Outside India
                </option>
              </select>

              <div className="advisor-button-row">
                <button
                  type="button"
                  className="secondary-btn large"
                  onClick={() =>
                    setStep(1)
                  }
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="primary-btn large"
                  onClick={continueStep}
                  disabled={
                    !form.category ||
                    !form.location
                  }
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 3 OF 3
              </p>

              <h2>
                What is the product intended for?
              </h2>

              <p className="step-description">
                This context helps BISense rank
                potentially relevant records. It
                does not determine certification
                eligibility by itself.
              </p>

              <div className="use-options">
                <button
                  type="button"
                  className={
                    form.intendedUse ===
                    "Domestic"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField(
                      "intendedUse",
                      "Domestic"
                    )
                  }
                >
                  <span>🏠</span>

                  <div>
                    <strong>
                      Domestic / Consumer Use
                    </strong>

                    <p>
                      Products intended for household
                      or consumer use.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    form.intendedUse ===
                    "Commercial"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField(
                      "intendedUse",
                      "Commercial"
                    )
                  }
                >
                  <span>🏢</span>

                  <div>
                    <strong>
                      Commercial Use
                    </strong>

                    <p>
                      Products primarily intended
                      for commercial use.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    form.intendedUse ===
                    "Industrial"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField(
                      "intendedUse",
                      "Industrial"
                    )
                  }
                >
                  <span>🏭</span>

                  <div>
                    <strong>
                      Industrial Use
                    </strong>

                    <p>
                      Products intended for industrial
                      applications.
                    </p>
                  </div>
                </button>
              </div>

              <div className="advisor-button-row">
                <button
                  type="button"
                  className="secondary-btn large"
                  onClick={() =>
                    setStep(2)
                  }
                  disabled={loading}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="primary-btn large"
                  onClick={analyzeProduct}
                  disabled={
                    !form.intendedUse ||
                    loading
                  }
                >
                  {loading
                    ? "Analyzing..."
                    : "Analyze Product →"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="advisor-result">
              <p className="eyebrow">
                PRELIMINARY RESULT
              </p>

              <h2>
                BIS information for{" "}
                {result.product}
              </h2>

              <p className="result-intro">
                BISense matched the product context
                against {result.totalStandards}{" "}
                available standard records and ranked
                potentially relevant starting points.
              </p>

              <div className="advisor-result-grid">
                <div className="result-card">
                  <span>PRODUCT</span>
                  <strong>
                    {result.product}
                  </strong>
                </div>

                <div className="result-card">
                  <span>CATEGORY</span>
                  <strong>
                    {result.category}
                  </strong>
                </div>

                <div className="result-card">
                  <span>MANUFACTURING</span>
                  <strong>
                    {result.location}
                  </strong>
                </div>

                <div className="result-card">
                  <span>INTENDED USE</span>
                  <strong>
                    {result.intendedUse}
                  </strong>
                </div>
              </div>

              <div className="advisor-smart-status">
                <div className="advisor-smart-status-top">
                  <strong>
                    BISense relevance assessment
                  </strong>

                  <span
                    className={`advisor-confidence ${result.confidence.className}`}
                  >
                    {result.confidence.label}
                  </span>
                </div>

                <p>
                  {result.confidence.description}
                </p>
              </div>

              {result.matches.length > 0 ? (
                <>
                  <div className="result-highlight">
                    <span>
                      POTENTIALLY RELEVANT STANDARDS
                    </span>

                    <strong>
                      {result.matches.length}{" "}
                      match
                      {result.matches.length ===
                      1
                        ? ""
                        : "es"}
                    </strong>

                    <p>
                      Ranked from the available
                      BISense records using product
                      wording, category signals and
                      contextual matches.
                    </p>
                  </div>

                  <div className="next-steps-card">
                    <p className="eyebrow">
                      RANKED STANDARD STARTING POINTS
                    </p>

                    {result.matches.map(
                      (standard, index) => {
                        const level =
                          getMatchLevel(
                            standard.matchScore
                          );

                        return (
                          <div
                            className="next-step"
                            key={
                              standard.number ||
                              index
                            }
                          >
                            <span>
                              {String(
                                index + 1
                              ).padStart(2, "0")}
                            </span>

                            <div>
                              <strong>
                                {standard.number}
                              </strong>

                              <p>
                                {standard.title}
                              </p>

                              <p>
                                {standard.category}
                                {standard.edition_year
                                  ? ` · ${standard.edition_year}`
                                  : ""}
                              </p>

                              <div className="advisor-match-meta">
                                <span>
                                  {level.label}
                                </span>

                                {(
                                  standard.matchReasons ||
                                  []
                                ).slice(0, 3).map(
                                  (reason) => (
                                    <span
                                      key={reason}
                                    >
                                      {reason}
                                    </span>
                                  )
                                )}
                              </div>

                              <div className="advisor-match-score">
                                <i />
                                Relevance score{" "}
                                {Math.round(
                                  standard.matchScore
                                )}
                              </div>

                              <div className="advisor-match-actions">
                                <a
                                  href={`/standard/${encodeURIComponent(
                                    standard.number
                                  )}`}
                                  className="text-btn"
                                >
                                  View Details →
                                </a>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openSource(
                                      standard
                                    )
                                  }
                                >
                                  Verify Source ↗
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              ) : (
                <div className="result-highlight">
                  <span>
                    NO STRONG DATABASE MATCH
                  </span>

                  <strong>
                    Refine the product description
                  </strong>

                  <p>
                    BISense could not identify a
                    strong starting point from the
                    current records. Use a more
                    specific product name, material,
                    model type or application, or
                    search the full Standards database.
                  </p>
                </div>
              )}

              {topMatch && (
                <div className="advisor-result-note">
                  <strong>
                    Important:
                  </strong>{" "}
                  A relevance score is a search signal,
                  not a BIS applicability, certification
                  or compliance decision. Confirm the
                  latest official requirements before
                  taking regulatory action.
                </div>
              )}

              <div className="advisor-decision-card">
                <p className="eyebrow">
                  CONNECTED BISENSE WORKFLOW
                </p>

                <h3>
                  From product discovery to action.
                </h3>

                <div className="advisor-decision-path">
                  {decisionPath.map(
                    (item) => (
                      <a
                        href={item.to}
                        className="advisor-decision-step"
                        key={item.number}
                      >
                        <span className="advisor-decision-number">
                          {item.number}
                        </span>

                        <div className="advisor-decision-copy">
                          <strong>
                            {item.title}
                          </strong>

                          <p>
                            {item.description}
                          </p>
                        </div>

                        <span className="advisor-decision-arrow">
                          →
                        </span>
                      </a>
                    )
                  )}
                </div>
              </div>

              <div className="next-steps-card">
                <p className="eyebrow">
                  RECOMMENDED NEXT STEPS
                </p>

                <div className="next-step">
                  <span>01</span>
                  <p>
                    Review the potentially relevant
                    standards and inspect their
                    available scope, status and
                    edition information.
                  </p>
                </div>

                <div className="next-step">
                  <span>02</span>
                  <p>
                    Check whether the product is
                    covered by a current compulsory
                    certification requirement or
                    Quality Control Order.
                  </p>
                </div>

                <div className="next-step">
                  <span>03</span>
                  <p>
                    Review the applicable conformity
                    assessment, testing and
                    quality-control requirements.
                  </p>
                </div>

                <div className="next-step">
                  <span>04</span>
                  <p>
                    Verify the latest requirements
                    directly with official BIS
                    information before taking action.
                  </p>
                </div>
              </div>

              <div className="result-actions">
                <a
                  href="/standards"
                  className="primary-btn large"
                >
                  Search Standards →
                </a>

                <a
                  href="/compliance"
                  className="secondary-btn large"
                >
                  Open Compliance
                </a>

                <a
                  href="/laboratories"
                  className="secondary-btn large"
                >
                  Find Laboratory
                </a>

                <button
                  type="button"
                  className="secondary-btn large"
                  onClick={() =>
                    window.print()
                  }
                >
                  🖨 Print
                </button>

                <button
                  type="button"
                  className="secondary-btn large"
                  onClick={restart}
                >
                  Start Again
                </button>
              </div>

              <div className="warning-box advisor-warning">
                ⚠ BISense provides preliminary
                AI-assisted information discovery.
                It does not make an official BIS
                certification decision. Certification
                requirements can depend on applicable
                government notifications, QCOs and
                current BIS requirements, so verify
                important details using official sources.
              </div>

              <div className="source-card comparison-source">
                <div>
                  <span className="source-label">
                    KNOWLEDGE SOURCE
                  </span>

                  <strong>
                    BIS Standards Portal
                  </strong>
                </div>

                <div className="source-details">
                  <a
                    href="https://standards.bis.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Official BIS Portal ↗
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CertificationAdvisor;
