import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Laboratories.css";

const API_BASE_URL = "";

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

  const searchLaboratories = async (event) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);
    setCount(0);

    try {
      const params = new URLSearchParams();

      const cleanISNumber = isNumber
        .replace(/^IS\s*/i, "")
        .trim();

      if (cleanISNumber) {
        params.append("is_number", cleanISNumber);
      }

      if (labName.trim()) {
        params.append("lab_name", labName.trim());
      }

      if (state.trim()) {
        params.append("state", state.trim());
      }

      if (district.trim()) {
        params.append("district", district.trim());
      }

      if (labType.trim()) {
        params.append("lab_type", labType.trim());
      }

      const query = params.toString();

      const response = await fetch(
        `${API_BASE_URL}/api/laboratories/search${
          query ? `?${query}` : ""
        }`,
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
          `The laboratory service returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Laboratory search failed."
        );
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const laboratoryResults = Array.isArray(data?.results)
        ? data.results
        : [];

      setResults(laboratoryResults);
      setCount(
        Number.isFinite(Number(data?.count))
          ? Number(data.count)
          : laboratoryResults.length
      );
    } catch (err) {
      console.error("Laboratory search error:", err);

      setResults([]);
      setCount(0);

      setError(
        err?.message ||
          "Unable to connect to the BIS laboratory service."
      );
    } finally {
      setLoading(false);
    }
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
  };

  const displayedISNumber = isNumber
    .replace(/^IS\s*/i, "")
    .trim();

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
              LIVE BIS LIMS DATA
            </div>

            <h1>
              Find the right
              <span> BIS laboratory.</span>
            </h1>

            <p>
              Search laboratories associated with Indian Standards and
              review testing scope, charges, validity and official BIS
              information in one place.
            </p>

            <div className="laboratory-trust-row">
              <div className="laboratory-trust-item">
                <strong>BIS LIMS</strong>
                <span>Official source</span>
              </div>

              <div className="laboratory-trust-divider" />

              <div className="laboratory-trust-item">
                <strong>IS Number</strong>
                <span>Standards-based search</span>
              </div>

              <div className="laboratory-trust-divider" />

              <div className="laboratory-trust-item">
                <strong>Testing</strong>
                <span>Charges & validity</span>
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

                  <h2>What are you looking for?</h2>

                  <p>
                    Start with an IS number for the most precise search.
                  </p>
                </div>

                <div
                  className="laboratory-search-icon"
                  aria-hidden="true"
                >
                  <span>⌕</span>
                </div>
              </div>

              <div className="laboratory-primary-search">
                <label htmlFor="is-number">
                  Indian Standard Number
                </label>

                <div className="laboratory-main-input">
                  <span className="laboratory-input-prefix">
                    IS
                  </span>

                  <input
                    id="is-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="209"
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
              </div>

              <div className="laboratory-divider">
                <span>Optional filters</span>
              </div>

              <div className="laboratory-filter-grid">
                <div className="laboratory-field">
                  <label htmlFor="lab-name">
                    Laboratory Name
                  </label>

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
                  <label htmlFor="state">
                    State
                  </label>

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
                  <label htmlFor="district">
                    District
                  </label>

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
                  <label htmlFor="lab-type">
                    Laboratory Type
                  </label>

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
                  Data is retrieved from BIS Laboratory Information
                  Management System.
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
                      {loading
                        ? "Searching..."
                        : "Search Laboratories"}
                    </span>

                    {!loading && <span>→</span>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        {error && (
          <section className="laboratory-container laboratory-feedback-wrap">
            <div
              className="laboratory-feedback laboratory-feedback-error"
              role="alert"
            >
              <strong>Search failed</strong>
              <span>{error}</span>
            </div>
          </section>
        )}

        {searched && !loading && !error && (
          <section className="laboratory-results-wrap">
            <div className="laboratory-container">
              <div className="laboratory-results-heading">
                <div>
                  <span className="laboratory-section-label">
                    SEARCH RESULTS
                  </span>

                  <h2>
                    {count === 0
                      ? "No laboratories found"
                      : `${count} ${
                          count === 1
                            ? "laboratory"
                            : "laboratories"
                        } found`}
                  </h2>

                  <p>
                    Results retrieved from the official BIS LIMS source.
                  </p>
                </div>

                {displayedISNumber && (
                  <div className="laboratory-active-filter">
                    <span>IS</span>
                    {displayedISNumber}
                  </div>
                )}
              </div>

              {results.length === 0 ? (
                <div className="laboratory-empty-state">
                  <div
                    className="laboratory-empty-icon"
                    aria-hidden="true"
                  >
                    ⌕
                  </div>

                  <h3>No matching laboratories</h3>

                  <p>
                    Try another Indian Standard number or remove some
                    filters and search again.
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
                  {results.map((lab, index) => {
                    const labNameValue =
                      lab?.lab_name || "Laboratory name unavailable";

                    const standardValue =
                      lab?.indian_standard || "—";

                    const labCode =
                      lab?.lab_code || "Not available";

                    const product =
                      lab?.product || "Not specified";

                    const gradeTypeSize =
                      lab?.grade_type_size_designation || "—";

                    const testingCharges =
                      lab?.testing_charges;

                    const validity =
                      lab?.validity_date || "Not listed";

                    const sourceUrl =
                      lab?.source_url ||
                      "https://lims.bis.gov.in/";

                    return (
                      <article
                        className="laboratory-result-card"
                        key={`${labNameValue}-${labCode}-${standardValue}-${index}`}
                      >
                        <div className="laboratory-card-header">
                          <div className="laboratory-card-index">
                            {String(
                              lab?.serial_number ||
                                index + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="laboratory-card-title">
                            <span>BIS LIMS LABORATORY</span>

                            <h3>{labNameValue}</h3>
                          </div>
                        </div>

                        <div className="laboratory-card-standard">
                          <span>INDIAN STANDARD</span>

                          <strong>{standardValue}</strong>
                        </div>

                        <div className="laboratory-card-details">
                          <div className="laboratory-detail">
                            <span>OSL Code</span>

                            <strong>{labCode}</strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Product</span>

                            <strong>{product}</strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Grade / Type / Size</span>

                            <strong>
                              {gradeTypeSize}
                            </strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Testing Charges</span>

                            <strong className="laboratory-price">
                              {testingCharges !== undefined &&
                              testingCharges !== null &&
                              String(testingCharges).trim() !== ""
                                ? `₹${testingCharges}`
                                : "Not listed"}
                            </strong>
                          </div>

                          <div className="laboratory-detail">
                            <span>Validity</span>

                            <strong>{validity}</strong>
                          </div>
                        </div>

                        {lab?.remark && (
                          <div className="laboratory-remark">
                            <span>REMARK</span>

                            <p>{lab.remark}</p>
                          </div>
                        )}

                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="laboratory-source-link"
                        >
                          <span>
                            View official BIS source
                          </span>

                          <span aria-hidden="true">↗</span>
                        </a>
                      </article>
                    );
                  })}
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
                  <span className="laboratory-section-label">
                    HOW IT WORKS
                  </span>

                  <h2>Search by standard in three steps.</h2>
                </div>

                <div className="laboratory-guide-steps">
                  <div className="laboratory-guide-step">
                    <span>01</span>

                    <div>
                      <strong>Enter an IS number</strong>

                      <p>Example: IS 209</p>
                    </div>
                  </div>

                  <div className="laboratory-guide-line" />

                  <div className="laboratory-guide-step">
                    <span>02</span>

                    <div>
                      <strong>Search BIS LIMS</strong>

                      <p>
                        We retrieve matching laboratories.
                      </p>
                    </div>
                  </div>

                  <div className="laboratory-guide-line" />

                  <div className="laboratory-guide-step">
                    <span>03</span>

                    <div>
                      <strong>
                        Compare testing details
                      </strong>

                      <p>
                        Charges, validity and product scope.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      <style>{`
        .laboratory-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .laboratory-page,
        .laboratory-page main {
          color: #111827;
        }

        .laboratory-page h1,
        .laboratory-page h2,
        .laboratory-page h3,
        .laboratory-page p,
        .laboratory-page strong,
        .laboratory-page label,
        .laboratory-page span {
          overflow-wrap: anywhere;
        }

        .laboratory-search-card,
        .laboratory-feedback,
        .laboratory-empty-state,
        .laboratory-result-card,
        .laboratory-guide {
          box-sizing: border-box;
        }

        .laboratory-field input,
        .laboratory-primary-search input {
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .laboratory-field input::placeholder,
        .laboratory-primary-search input::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .laboratory-field input:focus,
        .laboratory-primary-search input:focus {
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .laboratory-input-prefix,
        .laboratory-input-hint,
        .laboratory-section-label,
        .laboratory-form-note {
          flex-shrink: 0;
        }

        .laboratory-card-title h3,
        .laboratory-detail strong,
        .laboratory-card-standard strong,
        .laboratory-remark p {
          word-break: break-word;
        }

        .laboratory-source-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-decoration: none;
        }

        .laboratory-source-link span:first-child {
          min-width: 0;
        }

        .laboratory-form-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .laboratory-reset-btn,
        .laboratory-search-btn {
          min-height: 44px;
        }

        .laboratory-search-btn:disabled,
        .laboratory-reset-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .laboratory-feedback-error {
          color: #991b1b;
        }

        .laboratory-feedback-error strong,
        .laboratory-feedback-error span {
          color: inherit !important;
        }

        .laboratory-empty-state button {
          margin-top: 16px;
        }

        @media (max-width: 900px) {
          .laboratory-trust-row {
            flex-wrap: wrap;
            justify-content: center;
          }

          .laboratory-filter-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .laboratory-results-grid {
            grid-template-columns: 1fr !important;
          }
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
          .laboratory-feedback-wrap {
            padding-left: 16px;
            padding-right: 16px;
            box-sizing: border-box;
          }

          .laboratory-hero h1 {
            font-size: clamp(
              32px,
              10vw,
              48px
            ) !important;
            line-height: 1.1 !important;
          }

          .laboratory-hero p {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .laboratory-trust-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            align-items: stretch;
          }

          .laboratory-trust-divider {
            display: none !important;
          }

          .laboratory-trust-item {
            text-align: center;
          }

          .laboratory-search-card {
            width: 100% !important;
          }

          .laboratory-search-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px;
          }

          .laboratory-search-icon {
            display: none;
          }

          .laboratory-main-input {
            width: 100%;
            box-sizing: border-box;
          }

          .laboratory-input-hint {
            display: none;
          }

          .laboratory-filter-grid {
            grid-template-columns: 1fr !important;
            width: 100%;
          }

          .laboratory-field {
            width: 100%;
            min-width: 0;
          }

          .laboratory-form-footer {
            flex-direction: column;
            align-items: stretch !important;
            gap: 16px;
          }

          .laboratory-form-note {
            line-height: 1.5;
          }

          .laboratory-form-buttons {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .laboratory-form-buttons button {
            width: 100%;
            min-width: 0;
          }

          .laboratory-results-heading {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 14px;
          }

          .laboratory-active-filter {
            align-self: flex-start;
          }

          .laboratory-card-header {
            align-items: flex-start !important;
          }

          .laboratory-card-index {
            flex-shrink: 0;
          }

          .laboratory-card-title {
            min-width: 0;
          }

          .laboratory-card-details {
            grid-template-columns: 1fr !important;
          }

          .laboratory-detail {
            min-width: 0;
          }

          .laboratory-source-link {
            width: 100%;
            box-sizing: border-box;
          }

          .laboratory-guide-steps {
            grid-template-columns: 1fr !important;
          }

          .laboratory-guide-line {
            display: none !important;
          }
        }

        @media (max-width: 420px) {
          .laboratory-form-buttons {
            grid-template-columns: 1fr;
          }

          .laboratory-card-header {
            gap: 10px !important;
          }

          .laboratory-card-index {
            font-size: 13px;
          }

          .laboratory-results-heading h2 {
            font-size: 25px !important;
          }
        }
      `}</style>
    </div>
  );
}