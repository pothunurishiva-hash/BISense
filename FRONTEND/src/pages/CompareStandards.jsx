import React, { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "";

function CompareStandards() {
  const [standards, setStandards] = useState([]);

  const [standardA, setStandardA] = useState("");
  const [standardB, setStandardB] = useState("");

  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);

  const [loadingStandards, setLoadingStandards] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD STANDARDS
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchStandards = async () => {
      setLoadingStandards(true);
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
            `Failed to load standards (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        const results = Array.isArray(data?.results)
          ? data.results
          : [];

        if (!mounted) {
          return;
        }

        setStandards(results);

        if (results.length >= 2) {
          setStandardA(results[0].number || "");
          setStandardB(results[1].number || "");
        } else if (results.length === 1) {
          setStandardA(results[0].number || "");
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
          "Unable to load BIS standards from the backend."
        );
      } finally {
        if (mounted) {
          setLoadingStandards(false);
        }
      }
    };

    fetchStandards();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     SELECTED STANDARDS
     ========================================================= */

  const selectedA = useMemo(() => {
    return standards.find(
      (item) => item.number === standardA
    );
  }, [standards, standardA]);

  const selectedB = useMemo(() => {
    return standards.find(
      (item) => item.number === standardB
    );
  }, [standards, standardB]);

  /* =========================================================
     FETCH STANDARD DETAILS
     ========================================================= */

  const fetchStandardDetails = async (number) => {
    const response = await fetch(
      `${API_BASE}/api/standards/${encodeURIComponent(number)}`,
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
        `Unable to load ${number} (HTTP ${response.status}).`
      );
    }

    return response.json();
  };

  /* =========================================================
     COMPARE
     ========================================================= */

  const handleCompare = async () => {
    if (!standardA || !standardB) {
      setError("Please select two standards.");
      setShowComparison(false);
      return;
    }

    if (standardA === standardB) {
      setError("Please select two different standards.");
      setShowComparison(false);
      return;
    }

    setLoadingComparison(true);
    setError("");
    setShowComparison(false);

    try {
      const [resultA, resultB] = await Promise.all([
        fetchStandardDetails(standardA),
        fetchStandardDetails(standardB),
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
        err?.message ||
          "Unable to load the selected standards."
      );
    } finally {
      setLoadingComparison(false);
    }
  };

  /* =========================================================
     COMPARISON ROWS
     ========================================================= */

  const comparisonRows = useMemo(() => {
    if (!dataA || !dataB) {
      return [];
    }

    return [
      {
        category: "Standard Number",
        a: dataA.number || "Not available",
        b: dataB.number || "Not available",
      },
      {
        category: "Title",
        a: dataA.title || "Not available",
        b: dataB.title || "Not available",
      },
      {
        category: "Category",
        a: dataA.category || "Not available",
        b: dataB.category || "Not available",
      },
      {
        category: "Scope",
        a: dataA.scope || "Not available",
        b: dataB.scope || "Not available",
      },
      {
        category: "Status",
        a: dataA.status || "Not available",
        b: dataB.status || "Not available",
      },
      {
        category: "Edition Year",
        a:
          dataA.edition_year ??
          "Not available",
        b:
          dataB.edition_year ??
          "Not available",
      },
      {
        category: "Certification Scheme",
        a:
          dataA.certification_scheme ||
          "Not specified",
        b:
          dataB.certification_scheme ||
          "Not specified",
      },
      {
        category: "Certification Status",
        a:
          dataA.certification_status ||
          "Not specified",
        b:
          dataB.certification_status ||
          "Not specified",
      },
      {
        category: "QCO Information",
        a:
          dataA.qco_information ||
          "Not specified",
        b:
          dataB.qco_information ||
          "Not specified",
      },
      {
        category: "Official Source",
        a:
          dataA.source_name ||
          "BIS Standards Portal",
        b:
          dataB.source_name ||
          "BIS Standards Portal",
      },
    ];
  }, [dataA, dataB]);

  /* =========================================================
     DROPDOWN STYLE
     ========================================================= */

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

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container compare-page">
        {/* ===================================================
            MOBILE COLOR / VISIBILITY PROTECTION
            =================================================== */}

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
            }
          `}
        </style>

        {/* ===================================================
            INTRO
            =================================================== */}

        <div className="page-intro">
          <p className="eyebrow">
            STANDARD COMPARISON
          </p>

          <h1>
            See the difference clearly.
          </h1>

          <p>
            Compare two Indian Standards side by side
            using the BISense knowledge base.
          </p>
        </div>

        {/* ===================================================
            ERROR
            =================================================== */}

        {error && (
          <div
            className="error-state"
            role="alert"
          >
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        {/* ===================================================
            SELECTORS
            =================================================== */}

        <section className="compare-selectors">
          <div>
            <label
              htmlFor="standard-a"
              style={{
                color: "#111827",
                WebkitTextFillColor: "#111827",
              }}
            >
              STANDARD A
            </label>

            <select
              id="standard-a"
              value={standardA}
              onChange={(event) => {
                setStandardA(event.target.value);
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
                  ? "Loading standards..."
                  : "Select a standard"}
              </option>

              {standards.map((standard) => (
                <option
                  key={`a-${standard.number}`}
                  value={standard.number}
                  style={{
                    backgroundColor: "#FFFFFF",
                    color: "#111827",
                  }}
                >
                  {standard.number}
                </option>
              ))}
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
                WebkitTextFillColor: "#111827",
              }}
            >
              STANDARD B
            </label>

            <select
              id="standard-b"
              value={standardB}
              onChange={(event) => {
                setStandardB(event.target.value);
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
                  ? "Loading standards..."
                  : "Select a standard"}
              </option>

              {standards.map((standard) => (
                <option
                  key={`b-${standard.number}`}
                  value={standard.number}
                  style={{
                    backgroundColor: "#FFFFFF",
                    color: "#111827",
                  }}
                >
                  {standard.number}
                </option>
              ))}
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
              ? "Comparing..."
              : "Compare →"}
          </button>
        </section>

        {/* ===================================================
            OVERVIEW
            =================================================== */}

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

        {/* ===================================================
            COMPARISON RESULT
            =================================================== */}

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
                    Review the available
                    BISense information side
                    by side.
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

              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Category</th>
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
                          key={row.category}
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

              {/* =================================================
                  AI / DATABASE SUMMARY
                  ================================================= */}

              <section className="ai-summary-box">
                <p className="eyebrow">
                  BISENSE COMPARISON SUMMARY
                </p>

                <h2>
                  {dataA.number} vs{" "}
                  {dataB.number}
                </h2>

                <p>
                  These standards can be
                  compared using their
                  available BISense database
                  information, including
                  title, category, scope,
                  status, edition and
                  certification-related
                  fields. Review the table
                  above and verify the latest
                  official BIS source before
                  making compliance decisions.
                </p>

                <div className="comparison-summary-grid">
                  <div>
                    <span>
                      STANDARD A CATEGORY
                    </span>

                    <strong>
                      {dataA.category ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      STANDARD B CATEGORY
                    </span>

                    <strong>
                      {dataB.category ||
                        "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="comparison-summary-grid">
                  <div>
                    <span>
                      STANDARD A STATUS
                    </span>

                    <strong>
                      {dataA.status ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      STANDARD B STATUS
                    </span>

                    <strong>
                      {dataB.status ||
                        "Not available"}
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
                      Verify current edition
                      on official BIS
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}

        {/* ===================================================
            PLACEHOLDER
            =================================================== */}

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
                Select two standards above and
                click Compare to generate a
                database-backed comparison.
              </p>
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}

export default CompareStandards;