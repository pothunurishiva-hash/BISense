import { useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = "";

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

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const continueStep = () => {
    if (step === 1 && !form.product.trim()) return;

    if (step === 2 && (!form.category || !form.location)) return;

    setStep((current) => current + 1);
  };

  const normalizeText = (text = "") => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  };

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

  const findRelevantStandards = (standards) => {
    const productWords = normalizeText(form.product)
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    const categoryWords = getCategoryKeywords(form.category);

    const scored = standards.map((standard) => {
      const searchableText = normalizeText(
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
        if (searchableText.includes(word)) {
          score += 5;
        }
      }

      for (const word of categoryWords) {
        if (searchableText.includes(word)) {
          score += 2;
        }
      }

      if (
        standard.category &&
        normalizeText(standard.category).includes(
          normalizeText(form.category)
        )
      ) {
        score += 4;
      }

      return {
        ...standard,
        matchScore: score,
      };
    });

    return scored
      .filter((standard) => standard.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  };

  const analyzeProduct = async () => {
    if (!form.intendedUse) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/standards/search`
      );

      if (!response.ok) {
        throw new Error("Unable to load BISense standards.");
      }

      const data = await response.json();

      const allStandards = data.results || [];

      const matches = findRelevantStandards(allStandards);

      setResult({
        product: form.product,
        category: form.category,
        location: form.location,
        intendedUse: form.intendedUse,
        matches,
      });

      setStep(4);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to analyze the product. Make sure the FastAPI backend is running."
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

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container advisor-page">
        <div className="page-intro">
          <p className="eyebrow">MANUFACTURER MODE</p>

          <h1>Find your BIS pathway.</h1>

          <p>
            Describe your product and BISense will search its BIS
            knowledge base for potentially relevant Indian Standards.
          </p>
        </div>

        <div className="progress-bar">
          <span className={step >= 1 ? "active" : ""}>1</span>
          <i></i>

          <span className={step >= 2 ? "active" : ""}>2</span>
          <i></i>

          <span className={step >= 3 ? "active" : ""}>3</span>
        </div>

        <section className="advisor-card">
          {error && (
            <div className="warning-box advisor-warning">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="advisor-step">
              <p className="eyebrow">STEP 1 OF 3</p>

              <h2>What product do you manufacture?</h2>

              <p className="step-description">
                Enter the product name as clearly as possible.
              </p>

              <label className="field-label" htmlFor="product">
                Product name
              </label>

              <input
                id="product"
                className="full-input"
                type="text"
                placeholder="Example: PVC cable"
                value={form.product}
                onChange={(event) =>
                  updateField("product", event.target.value)
                }
              />

              <button
                className="primary-btn large"
                onClick={continueStep}
                disabled={!form.product.trim()}
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="advisor-step">
              <p className="eyebrow">STEP 2 OF 3</p>

              <h2>Tell us more about the product.</h2>

              <p className="step-description">
                This helps BISense narrow down potentially relevant
                standards.
              </p>

              <label className="field-label" htmlFor="category">
                Product category
              </label>

              <select
                id="category"
                className="full-input"
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
              >
                <option value="">Select a category</option>
                <option value="Electrical">Electrical</option>
                <option value="Electronics">Electronics</option>
                <option value="Construction">Construction</option>
                <option value="Consumer Products">
                  Consumer Products
                </option>
                <option value="Food">Food</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Chemical">Chemical</option>
                <option value="Other">Other</option>
              </select>

              <label className="field-label" htmlFor="location">
                Manufacturing location
              </label>

              <select
                id="location"
                className="full-input"
                value={form.location}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
              >
                <option value="">Select a location</option>
                <option value="India">India</option>
                <option value="Outside India">
                  Outside India
                </option>
              </select>

              <div className="advisor-button-row">
                <button
                  className="secondary-btn large"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>

                <button
                  className="primary-btn large"
                  onClick={continueStep}
                  disabled={!form.category || !form.location}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="advisor-step">
              <p className="eyebrow">STEP 3 OF 3</p>

              <h2>What is the product intended for?</h2>

              <p className="step-description">
                Select the option that best describes its intended use.
              </p>

              <div className="use-options">
                <button
                  className={
                    form.intendedUse === "Domestic"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField("intendedUse", "Domestic")
                  }
                >
                  <span>🏠</span>

                  <div>
                    <strong>Domestic / Consumer Use</strong>

                    <p>
                      Products intended for household or consumer
                      use.
                    </p>
                  </div>
                </button>

                <button
                  className={
                    form.intendedUse === "Commercial"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField("intendedUse", "Commercial")
                  }
                >
                  <span>🏢</span>

                  <div>
                    <strong>Commercial Use</strong>

                    <p>
                      Products primarily intended for commercial
                      use.
                    </p>
                  </div>
                </button>

                <button
                  className={
                    form.intendedUse === "Industrial"
                      ? "use-option selected"
                      : "use-option"
                  }
                  onClick={() =>
                    updateField("intendedUse", "Industrial")
                  }
                >
                  <span>🏭</span>

                  <div>
                    <strong>Industrial Use</strong>

                    <p>
                      Products intended for industrial
                      applications.
                    </p>
                  </div>
                </button>
              </div>

              <div className="advisor-button-row">
                <button
                  className="secondary-btn large"
                  onClick={() => setStep(2)}
                >
                  ← Back
                </button>

                <button
                  className="primary-btn large"
                  onClick={analyzeProduct}
                  disabled={!form.intendedUse || loading}
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
              <p className="eyebrow">PRELIMINARY RESULT</p>

              <h2>
                BIS information for {result.product}
              </h2>

              <p className="result-intro">
                BISense searched its current BISense knowledge base
                and identified potentially relevant standards.
              </p>

              <div className="advisor-result-grid">
                <div className="result-card">
                  <span>PRODUCT</span>
                  <strong>{result.product}</strong>
                </div>

                <div className="result-card">
                  <span>CATEGORY</span>
                  <strong>{result.category}</strong>
                </div>

                <div className="result-card">
                  <span>MANUFACTURING</span>
                  <strong>{result.location}</strong>
                </div>

                <div className="result-card">
                  <span>INTENDED USE</span>
                  <strong>{result.intendedUse}</strong>
                </div>
              </div>

              {result.matches.length > 0 ? (
                <>
                  <div className="result-highlight">
                    <span>
                      POTENTIALLY RELEVANT STANDARDS
                    </span>

                    <strong>
                      {result.matches.length} match
                      {result.matches.length === 1 ? "" : "es"}
                    </strong>

                    <p>
                      These are database matches based on the
                      product description and category. They are
                      not a final certification determination.
                    </p>
                  </div>

                  <div className="next-steps-card">
                    <p className="eyebrow">
                      POTENTIALLY RELEVANT BIS STANDARDS
                    </p>

                    {result.matches.map((standard, index) => (
                      <div
                        className="next-step"
                        key={standard.number}
                      >
                        <span>
                          {String(index + 1).padStart(2, "0")}
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

                          <a
                            href={`/standard/${encodeURIComponent(
                              standard.number
                            )}`}
                            className="text-btn"
                          >
                            View Standard Details →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="result-highlight">
                  <span>NO STRONG DATABASE MATCH</span>

                  <strong>
                    No directly matching standard found
                  </strong>

                  <p>
                    BISense could not identify a strong match in
                    the current knowledge base. Try a more specific
                    product name or search the full Standards
                    database.
                  </p>
                </div>
              )}

              <div className="next-steps-card">
                <p className="eyebrow">
                  RECOMMENDED NEXT STEPS
                </p>

                <div className="next-step">
                  <span>01</span>
                  <p>
                    Review the potentially relevant Indian
                    Standards identified by BISense.
                  </p>
                </div>

                <div className="next-step">
                  <span>02</span>
                  <p>
                    Check whether the product is covered by a
                    current compulsory certification requirement
                    or Quality Control Order.
                  </p>
                </div>

                <div className="next-step">
                  <span>03</span>
                  <p>
                    Review the applicable conformity assessment,
                    testing and quality-control requirements.
                  </p>
                </div>

                <div className="next-step">
                  <span>04</span>
                  <p>
                    Verify the latest requirements directly with
                    official BIS information before taking action.
                  </p>
                </div>
              </div>

              <div className="result-actions">
                <a
                  href="/search"
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
                  className="secondary-btn large"
                  onClick={() => window.print()}
                >
                  🖨 Print
                </button>

                <button
                  className="secondary-btn large"
                  onClick={restart}
                >
                  Start Again
                </button>
              </div>

              <div className="warning-box advisor-warning">
                ⚠ BISense provides preliminary AI-assisted
                information discovery. It does not make an official
                BIS certification decision. Certification
                requirements can depend on applicable government
                notifications and QCOs, so always verify the latest
                official BIS information.
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