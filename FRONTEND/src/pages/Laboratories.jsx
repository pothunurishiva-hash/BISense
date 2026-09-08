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

    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);
    setCount(0);

    try {
      const params = new URLSearchParams();

      if (isNumber.trim()) {
        params.append("is_number", isNumber.trim());
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

      const response = await fetch(
        `${API_BASE_URL}/api/laboratories/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Laboratory search failed.");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(Array.isArray(data.results) ? data.results : []);
      setCount(Number(data.count || 0));
    } catch (err) {
      setError(
        err.message ||
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

                <div className="laboratory-search-icon">
                  <span>⌕</span>
                </div>
              </div>

              <div className="laboratory-primary-search">
                <label htmlFor="is-number">
                  Indian Standard Number
                </label>

                <div className="laboratory-main-input">
                  <span className="laboratory-input-prefix">IS</span>

                  <input
                    id="is-number"
                    type="text"
                    placeholder="209"
                    value={isNumber.replace(/^IS\s*/i, "")}
                    onChange={(event) =>
                      setIsNumber(event.target.value)
                    }
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
                    onChange={(event) =>
                      setLabName(event.target.value)
                    }
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
                    onChange={(event) =>
                      setState(event.target.value)
                    }
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
                    onChange={(event) =>
                      setDistrict(event.target.value)
                    }
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
                    onChange={(event) =>
                      setLabType(event.target.value)
                    }
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
            <div className="laboratory-feedback laboratory-feedback-error">
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

                {isNumber.trim() && (
                  <div className="laboratory-active-filter">
                    <span>IS</span>
                    {isNumber
                      .replace(/^IS\s*/i, "")
                      .trim()}
                  </div>
                )}
              </div>

              {results.length === 0 ? (
                <div className="laboratory-empty-state">
                  <div className="laboratory-empty-icon">⌕</div>

                  <h3>No matching laboratories</h3>

                  <p>
                    Try another Indian Standard number or remove some
                    filters and search again.
                  </p>
                </div>
              ) : (
                <div className="laboratory-results-grid">
                  {results.map((lab, index) => (
                    <article
                      className="laboratory-result-card"
                      key={`${lab.lab_name}-${lab.lab_code}-${lab.indian_standard}-${index}`}
                    >
                      <div className="laboratory-card-header">
                        <div className="laboratory-card-index">
                          {String(
                            lab.serial_number || index + 1
                          ).padStart(2, "0")}
                        </div>

                        <div className="laboratory-card-title">
                          <span>BIS LIMS LABORATORY</span>

                          <h3>{lab.lab_name}</h3>
                        </div>
                      </div>

                      <div className="laboratory-card-standard">
                        <span>INDIAN STANDARD</span>

                        <strong>
                          {lab.indian_standard || "—"}
                        </strong>
                      </div>

                      <div className="laboratory-card-details">
                        <div className="laboratory-detail">
                          <span>OSL Code</span>
                          <strong>
                            {lab.lab_code || "Not available"}
                          </strong>
                        </div>

                        <div className="laboratory-detail">
                          <span>Product</span>
                          <strong>
                            {lab.product || "Not specified"}
                          </strong>
                        </div>

                        <div className="laboratory-detail">
                          <span>Grade / Type / Size</span>
                          <strong>
                            {lab.grade_type_size_designation || "—"}
                          </strong>
                        </div>

                        <div className="laboratory-detail">
                          <span>Testing Charges</span>

                          <strong className="laboratory-price">
                            {lab.testing_charges
                              ? `₹${lab.testing_charges}`
                              : "Not listed"}
                          </strong>
                        </div>

                        <div className="laboratory-detail">
                          <span>Validity</span>
                          <strong>
                            {lab.validity_date || "Not listed"}
                          </strong>
                        </div>
                      </div>

                      {lab.remark && (
                        <div className="laboratory-remark">
                          <span>REMARK</span>
                          <p>{lab.remark}</p>
                        </div>
                      )}

                      <a
                        href={
                          lab.source_url ||
                          "https://lims.bis.gov.in/"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="laboratory-source-link"
                      >
                        <span>View official BIS source</span>
                        <span>↗</span>
                      </a>
                    </article>
                  ))}
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
                      <strong>Compare testing details</strong>
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
    </div>
  );
}