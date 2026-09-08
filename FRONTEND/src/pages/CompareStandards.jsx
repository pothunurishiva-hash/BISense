import { useEffect, useMemo, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = "";

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

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        setLoadingStandards(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/standards/search`
        );

        if (!response.ok) {
          throw new Error("Failed to load standards.");
        }

        const data = await response.json();
        const results = data.results || [];

        setStandards(results);

        if (results.length >= 2) {
          setStandardA(results[0].number);
          setStandardB(results[1].number);
        } else if (results.length === 1) {
          setStandardA(results[0].number);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load BIS standards. Make sure the FastAPI backend is running."
        );
      } finally {
        setLoadingStandards(false);
      }
    };

    fetchStandards();
  }, []);

  const selectedA = useMemo(
    () => standards.find((item) => item.number === standardA),
    [standards, standardA]
  );

  const selectedB = useMemo(
    () => standards.find((item) => item.number === standardB),
    [standards, standardB]
  );

  const handleCompare = async () => {
    if (!standardA || !standardB) {
      alert("Please select two standards.");
      return;
    }

    if (standardA === standardB) {
      alert("Please select two different standards.");
      return;
    }

    try {
      setLoadingComparison(true);
      setError("");
      setShowComparison(false);

      const [responseA, responseB] = await Promise.all([
        fetch(
          `${API_URL}/api/standards/${encodeURIComponent(standardA)}`
        ),
        fetch(
          `${API_URL}/api/standards/${encodeURIComponent(standardB)}`
        ),
      ]);

      if (!responseA.ok || !responseB.ok) {
        throw new Error("Failed to fetch standard details.");
      }

      const [resultA, resultB] = await Promise.all([
        responseA.json(),
        responseB.json(),
      ]);

      setDataA(resultA);
      setDataB(resultB);
      setShowComparison(true);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load the selected standards. Please try again."
      );
    } finally {
      setLoadingComparison(false);
    }
  };

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
        a: dataA.edition_year || "Not available",
        b: dataB.edition_year || "Not available",
      },
      {
        category: "Certification Scheme",
        a: dataA.certification_scheme || "Not specified",
        b: dataB.certification_scheme || "Not specified",
      },
      {
        category: "Certification Status",
        a: dataA.certification_status || "Not specified",
        b: dataB.certification_status || "Not specified",
      },
      {
        category: "QCO Information",
        a: dataA.qco_information || "Not specified",
        b: dataB.qco_information || "Not specified",
      },
      {
        category: "Official Source",
        a: dataA.source_name || "BIS",
        b: dataB.source_name || "BIS",
      },
    ];
  }, [dataA, dataB]);

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container">
        <div className="page-intro">
          <p className="eyebrow">STANDARD COMPARISON</p>

          <h1>See the difference clearly.</h1>

          <p>
            Compare two Indian Standards side by side using the BISense
            knowledge base.
          </p>
        </div>

        {error && (
          <div className="error-state">
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        <section className="compare-selectors">
          <div>
            <label htmlFor="standard-a">STANDARD A</label>

            <select
              id="standard-a"
              value={standardA}
              onChange={(event) => {
                setStandardA(event.target.value);
                setShowComparison(false);
              }}
              disabled={loadingStandards}
            >
              <option value="">
                {loadingStandards
                  ? "Loading standards..."
                  : "Select a standard"}
              </option>

              {standards.map((standard) => (
                <option
                  key={standard.number}
                  value={standard.number}
                >
                  {standard.number}
                </option>
              ))}
            </select>
          </div>

          <div className="vs">VS</div>

          <div>
            <label htmlFor="standard-b">STANDARD B</label>

            <select
              id="standard-b"
              value={standardB}
              onChange={(event) => {
                setStandardB(event.target.value);
                setShowComparison(false);
              }}
              disabled={loadingStandards}
            >
              <option value="">
                {loadingStandards
                  ? "Loading standards..."
                  : "Select a standard"}
              </option>

              {standards.map((standard) => (
                <option
                  key={standard.number}
                  value={standard.number}
                >
                  {standard.number}
                </option>
              ))}
            </select>
          </div>

          <button
            className="primary-btn"
            onClick={handleCompare}
            disabled={loadingStandards || loadingComparison}
          >
            {loadingComparison ? "Loading..." : "Compare →"}
          </button>
        </section>

        <div className="comparison-overview">
          <div className="overview-card">
            <span>STANDARD A</span>

            <strong>
              {selectedA?.number || "Not selected"}
            </strong>

            <p>
              {selectedA?.title ||
                "Choose a standard above."}
            </p>
          </div>

          <div className="overview-card">
            <span>STANDARD B</span>

            <strong>
              {selectedB?.number || "Not selected"}
            </strong>

            <p>
              {selectedB?.title ||
                "Choose a standard above."}
            </p>
          </div>
        </div>

        {showComparison && dataA && dataB && (
          <>
            <div className="results-header comparison-results-header">
              <div>
                <h2>Detailed comparison</h2>

                <p>
                  Review the available BISense information side by side.
                </p>
              </div>

              <button
                className="secondary-btn"
                onClick={() => window.print()}
              >
                🖨 Print
              </button>
            </div>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>{dataA.number}</th>
                    <th>{dataB.number}</th>
                  </tr>
                </thead>

                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.category}>
                      <td>
                        <strong>{row.category}</strong>
                      </td>

                      <td>{row.a}</td>

                      <td>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <section className="ai-summary-box">
              <p className="eyebrow">
                BISENSE COMPARISON SUMMARY
              </p>

              <h2>
                {dataA.number} vs {dataB.number}
              </h2>

              <p>
                These standards differ in their title, category, scope,
                edition information and certification-related details.
                Review the table above for the currently available
                BISense database information and verify the current
                official BIS source before making compliance decisions.
              </p>

              <div className="comparison-summary-grid">
                <div>
                  <span>STANDARD A CATEGORY</span>

                  <strong>
                    {dataA.category || "Not available"}
                  </strong>
                </div>

                <div>
                  <span>STANDARD B CATEGORY</span>

                  <strong>
                    {dataB.category || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="comparison-summary-grid">
                <div>
                  <span>STANDARD A STATUS</span>

                  <strong>
                    {dataA.status || "Not available"}
                  </strong>
                </div>

                <div>
                  <span>STANDARD B STATUS</span>

                  <strong>
                    {dataB.status || "Not available"}
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
                    Verify current edition on official BIS
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {!showComparison && !loadingComparison && (
          <div className="compare-placeholder">
            <div className="compare-placeholder-icon">
              ⚖
            </div>

            <h2>Choose two standards to begin.</h2>

            <p>
              Select two standards above and click Compare to
              generate a database-backed comparison.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CompareStandards;