import React, { useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "";

function CertificationAdvisor() {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    product: "",
    category: "",
    location: "",
    intendedUse: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     FORM HELPERS
     ========================================================= */

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
      (!form.category || !form.location)
    ) {
      return;
    }

    setError("");
    setStep((current) =>
      Math.min(current + 1, 3)
    );
  };

  /* =========================================================
     TEXT NORMALIZATION
     ========================================================= */

  const normalizeText = (text = "") => {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ");
  };

  /* =========================================================
     CATEGORY KEYWORDS
     ========================================================= */

  const getCategoryKeywords = (category) => {
    const categoryMap = {
      Electrical: [
        "electrical",
        "electric",
        "cable",
        "appliance",
        "motor",
        "switch",
        "wire",
      ],

      Electronics: [
        "electronic",
        "electronics",
        "computer",
        "device",
        "equipment",
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
      ],

      "Consumer Products": [
        "consumer",
        "household",
        "appliance",
        "product",
      ],

      Food: [
        "food",
        "water",
        "drinking",
        "edible",
      ],

      Mechanical: [
        "mechanical",
        "machine",
        "machinery",
        "engineering",
      ],

      Chemical: [
        "chemical",
        "cement",
        "material",
        "compound",
      ],

      Other: [],
    };

    return categoryMap[category] || [];
  };

  /* =========================================================
     FIND RELEVANT STANDARDS
     ========================================================= */

  const findRelevantStandards = (standards) => {
    const productWords = normalizeText(
      form.product
    )
      .split(/\s+/)
      .filter(
        (word) => word.length >= 3
      );

    const categoryWords =
      getCategoryKeywords(
        form.category
      );

    const scored = standards.map(
      (standard) => {
        const searchableText =
          normalizeText(
            [
              standard.number,
              standard.title,
              standard.category,
              standard.scope,
            ]
              .filter(Boolean)
              .join(" ")
          );

        let score = 0;

        for (const word of productWords) {
          if (
            searchableText.includes(word)
          ) {
            score += 5;
          }
        }

        for (const word of categoryWords) {
          if (
            searchableText.includes(word)
          ) {
            score += 2;
          }
        }

        if (
          standard.category &&
          normalizeText(
            standard.category
          ).includes(
            normalizeText(
              form.category
            )
          )
        ) {
          score += 4;
        }

        return {
          ...standard,
          matchScore: score,
        };
      }
    );

    return scored
      .filter(
        (standard) =>
          standard.matchScore > 0
      )
      .sort(
        (a, b) =>
          b.matchScore -
          a.matchScore
      )
      .slice(0, 5);
  };

  /* =========================================================
     ANALYZE PRODUCT
     ========================================================= */

  const analyzeProduct = async () => {
    if (!form.intendedUse) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/standards/search?q=`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load BIS standards (HTTP ${response.status}).`
        );
      }

      const data =
        await response.json();

      const allStandards =
        Array.isArray(data?.results)
          ? data.results
          : [];

      const matches =
        findRelevantStandards(
          allStandards
        );

      setResult({
        product: form.product.trim(),
        category: form.category,
        location: form.location,
        intendedUse: form.intendedUse,
        matches,
      });

      setStep(4);
    } catch (err) {
      console.error(
        "Certification Advisor error:",
        err
      );

      setResult(null);

      setError(
        err?.message ||
          "Unable to analyze the product."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESTART
     ========================================================= */

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

  /* =========================================================
     SELECT STYLE
     ========================================================= */

  const selectStyle = {
    color: "#111827",
    WebkitTextFillColor: "#111827",
    backgroundColor: "#FFFFFF",
    borderColor: "#D7DFEA",
  };

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container advisor-page">
        {/* ===================================================
            MOBILE STYLE PROTECTION
            =================================================== */}

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
            }
          `}
        </style>

        {/* ===================================================
            INTRO
            =================================================== */}

        <div className="page-intro">
          <p className="eyebrow">
            MANUFACTURER MODE
          </p>

          <h1>
            Find your BIS pathway.
          </h1>

          <p>
            Describe your product and BISense
            will search its BIS knowledge base
            for potentially relevant Indian
            Standards.
          </p>
        </div>

        {/* ===================================================
            PROGRESS
            =================================================== */}

        <div className="progress-bar">
          <span
            className={
              step >= 1
                ? "active"
                : ""
            }
          >
            1
          </span>

          <i></i>

          <span
            className={
              step >= 2
                ? "active"
                : ""
            }
          >
            2
          </span>

          <i></i>

          <span
            className={
              step >= 3
                ? "active"
                : ""
            }
          >
            3
          </span>
        </div>

        {/* ===================================================
            MAIN CARD
            =================================================== */}

        <section className="advisor-card">
          {error && (
            <div
              className="warning-box advisor-warning"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* =================================================
              STEP 1
              ================================================= */}

          {step === 1 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 1 OF 3
              </p>

              <h2>
                What product do you manufacture?
              </h2>

              <p className="step-description">
                Enter the product name as clearly
                as possible.
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
                placeholder="Example: PVC cable"
                value={form.product}
                onChange={(event) =>
                  updateField(
                    "product",
                    event.target.value
                  )
                }
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
            </div>
          )}

          {/* =================================================
              STEP 2
              ================================================= */}

          {step === 2 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 2 OF 3
              </p>

              <h2>
                Tell us more about the product.
              </h2>

              <p className="step-description">
                This helps BISense narrow down
                potentially relevant standards.
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

          {/* =================================================
              STEP 3
              ================================================= */}

          {step === 3 && (
            <div className="advisor-step">
              <p className="eyebrow">
                STEP 3 OF 3
              </p>

              <h2>
                What is the product intended for?
              </h2>

              <p className="step-description">
                Select the option that best
                describes its intended use.
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
                      Products intended for
                      household or consumer
                      use.
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
                      Products primarily
                      intended for commercial
                      use.
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
                      Products intended for
                      industrial applications.
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

          {/* =================================================
              RESULT
              ================================================= */}

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
                BISense searched its current
                knowledge base and identified
                potentially relevant standards.
              </p>

              {/* =============================================
                  USER INPUT SUMMARY
                  ============================================= */}

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

              {/* =============================================
                  MATCHES
                  ============================================= */}

              {result.matches.length >
              0 ? (
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
                      These are database
                      matches based on the
                      product description and
                      category. They are not a
                      final certification
                      determination.
                    </p>
                  </div>

                  <div className="next-steps-card">
                    <p className="eyebrow">
                      POTENTIALLY RELEVANT BIS
                      STANDARDS
                    </p>

                    {result.matches.map(
                      (
                        standard,
                        index
                      ) => (
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
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                standard.number
                              }
                            </strong>

                            <p>
                              {
                                standard.title
                              }
                            </p>

                            <p>
                              {
                                standard.category
                              }
                              {standard.edition_year
                                ? ` · ${standard.edition_year}`
                                : ""}
                            </p>

                            <a
                              href={`/standard/${encodeURIComponent(
                                standard.number
                              )}`}
                              className="text-btn"
                            >
                              View Standard
                              Details →
                            </a>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="result-highlight">
                  <span>
                    NO STRONG DATABASE MATCH
                  </span>

                  <strong>
                    No directly matching
                    standard found
                  </strong>

                  <p>
                    BISense could not identify
                    a strong match in the
                    current knowledge base.
                    Try a more specific
                    product name or search
                    the full Standards database.
                  </p>
                </div>
              )}

              {/* =============================================
                  NEXT STEPS
                  ============================================= */}

              <div className="next-steps-card">
                <p className="eyebrow">
                  RECOMMENDED NEXT STEPS
                </p>

                <div className="next-step">
                  <span>01</span>

                  <p>
                    Review the potentially
                    relevant Indian Standards
                    identified by BISense.
                  </p>
                </div>

                <div className="next-step">
                  <span>02</span>

                  <p>
                    Check whether the product
                    is covered by a current
                    compulsory certification
                    requirement or Quality
                    Control Order.
                  </p>
                </div>

                <div className="next-step">
                  <span>03</span>

                  <p>
                    Review the applicable
                    conformity assessment,
                    testing and quality-control
                    requirements.
                  </p>
                </div>

                <div className="next-step">
                  <span>04</span>

                  <p>
                    Verify the latest
                    requirements directly with
                    official BIS information
                    before taking action.
                  </p>
                </div>
              </div>

              {/* =============================================
                  ACTIONS
                  ============================================= */}

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

              {/* =============================================
                  WARNING
                  ============================================= */}

              <div className="warning-box advisor-warning">
                ⚠ BISense provides preliminary
                AI-assisted information discovery.
                It does not make an official BIS
                certification decision. Certification
                requirements can depend on applicable
                government notifications and QCOs,
                so always verify the latest official
                BIS information.
              </div>

              {/* =============================================
                  SOURCE
                  ============================================= */}

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