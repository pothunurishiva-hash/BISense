import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "";

function StandardDetails() {
  const { standardNumber } = useParams();

  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchStandard = async () => {
      setLoading(true);
      setError("");
      setStandard(null);

      try {
        const decodedNumber = decodeURIComponent(
          standardNumber || ""
        ).trim();

        if (!decodedNumber) {
          throw new Error("No standard number was provided.");
        }

        const response = await fetch(
          `${API_BASE}/api/standards/${encodeURIComponent(
            decodedNumber
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "The requested BIS standard could not be found."
            );
          }

          throw new Error(
            `Unable to load this standard (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        if (!mounted) {
          return;
        }

        setStandard(data);
      } catch (err) {
        console.error(
          "Standard details request failed:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err?.message ||
            "Failed to load standard details."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStandard();

    return () => {
      mounted = false;
    };
  }, [standardNumber]);

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="standard-details-page">
          <div className="standard-details-container">
            <div className="standard-details-loading">
              <div className="standard-loading-spinner"></div>

              <h2>Loading BIS standard details...</h2>

              <p>
                Please wait while BISense retrieves the
                standard information.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  /* =========================================================
     ERROR
     ========================================================= */

  if (error || !standard) {
    return (
      <>
        <Navbar />

        <main className="standard-details-page">
          <div className="standard-details-container">
            <div className="standard-details-error">
              <span className="standard-error-badge">
                BIS STANDARD
              </span>

              <h1>Standard Not Found</h1>

              <p>
                {error ||
                  "The requested standard could not be loaded."}
              </p>

              <Link
                to="/standards"
                className="standard-back-button"
              >
                ← Back to Standards
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="standard-details-page">
        {/* ===================================================
            MOBILE / CROSS-BROWSER STYLE PROTECTION
            =================================================== */}

        <style>
          {`
            .standard-details-page,
            .standard-details-page * {
              color-scheme: light;
            }

            .standard-details-page {
              color: #111827;
            }

            .standard-details-page h1,
            .standard-details-page h2,
            .standard-details-page h3,
            .standard-details-page p,
            .standard-details-page span,
            .standard-details-page strong,
            .standard-details-page div {
              -webkit-text-fill-color: initial;
            }

            .standard-details-page
              .standard-main-title {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standard-details-page
              .standard-main-description {
              color: #4F607A !important;
              -webkit-text-fill-color: #4F607A !important;
            }

            .standard-details-page
              .standard-section-title {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standard-details-page
              .standard-body-text {
              color: #374151 !important;
              -webkit-text-fill-color: #374151 !important;
            }

            .standard-details-page
              .standard-info-label {
              color: #6B7280 !important;
              -webkit-text-fill-color: #6B7280 !important;
            }

            .standard-details-page
              .standard-info-value {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standard-details-page
              .standard-source-title,
            .standard-details-page
              .standard-source-text {
              color: #FFFFFF !important;
              -webkit-text-fill-color: #FFFFFF !important;
            }

            .standard-details-page
              .standard-source-label {
              color: #D7E1F0 !important;
              -webkit-text-fill-color: #D7E1F0 !important;
            }

            @media (max-width: 650px) {
              .standard-details-page {
                width: 100%;
                min-width: 0;
                overflow-x: hidden;
              }

              .standard-details-container {
                width: 100%;
                box-sizing: border-box;
                padding: 18px 14px 40px;
              }

              .standard-details-page
                .standard-header-card {
                padding: 22px 18px !important;
                border-radius: 18px !important;
              }

              .standard-details-page
                .standard-main-title {
                font-size: 34px !important;
                line-height: 1.05 !important;
                overflow-wrap: anywhere;
              }

              .standard-details-page
                .standard-main-description {
                font-size: 15px !important;
                line-height: 1.5 !important;
              }

              .standard-details-page
                .standard-section-card {
                padding: 20px 16px !important;
                border-radius: 18px !important;
              }

              .standard-details-page
                .standard-info-grid {
                grid-template-columns: 1fr !important;
              }

              .standard-details-page
                .standard-source-card {
                padding: 22px 18px !important;
              }

              .standard-details-page
                .standard-source-button {
                width: 100%;
                box-sizing: border-box;
                text-align: center;
              }
            }
          `}
        </style>

        <div className="standard-details-container">
          {/* =================================================
              BACK LINK
              ================================================= */}

          <Link
            to="/standards"
            className="standard-details-back-link"
          >
            ← Back to Standards Search
          </Link>

          {/* =================================================
              HEADER
              ================================================= */}

          <section className="standard-header-card">
            <span className="standard-badge">
              BIS STANDARD
            </span>

            <h1 className="standard-main-title">
              {standard.number || "Unknown Standard"}
            </h1>

            <p className="standard-main-description">
              {standard.title ||
                "BIS standard information"}
            </p>

            <span className="standard-status-badge">
              {standard.status || "Status unavailable"}
            </span>
          </section>

          {/* =================================================
              BASIC INFORMATION
              ================================================= */}

          <section className="standard-section-card">
            <h2 className="standard-section-title">
              Standard Information
            </h2>

            <div className="standard-info-grid">
              <InfoCard
                label="Standard Number"
                value={
                  standard.number ||
                  "Not available"
                }
              />

              <InfoCard
                label="Category"
                value={
                  standard.category ||
                  "Not available"
                }
              />

              <InfoCard
                label="Edition Year"
                value={
                  standard.edition_year ??
                  "Not available"
                }
              />

              <InfoCard
                label="Status"
                value={
                  standard.status ||
                  "Not available"
                }
              />
            </div>
          </section>

          {/* =================================================
              SCOPE
              ================================================= */}

          <section className="standard-section-card">
            <h2 className="standard-section-title">
              Scope
            </h2>

            <p className="standard-body-text">
              {standard.scope ||
                "Scope information is not available for this standard in the current BISense knowledge base."}
            </p>
          </section>

          {/* =================================================
              CERTIFICATION
              ================================================= */}

          <section className="standard-section-card">
            <h2 className="standard-section-title">
              Certification Information
            </h2>

            <div className="standard-info-grid">
              <InfoCard
                label="Certification Scheme"
                value={
                  standard.certification_scheme ||
                  "Not specified"
                }
              />

              <InfoCard
                label="Certification Status"
                value={
                  standard.certification_status ||
                  "Not specified"
                }
              />

              <InfoCard
                label="QCO Information"
                value={
                  standard.qco_information ||
                  "Not specified"
                }
              />
            </div>
          </section>

          {/* =================================================
              OFFICIAL SOURCE
              ================================================= */}

          <section className="standard-source-card">
            <span className="standard-source-label">
              OFFICIAL SOURCE
            </span>

            <h2 className="standard-source-title">
              Official BIS Information
            </h2>

            <p className="standard-source-text">
              Source:{" "}
              <strong>
                {standard.source_name ||
                  "BIS Standards Portal"}
              </strong>
            </p>

            {standard.source_url && (
              <a
                href={standard.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="standard-source-button"
              >
                View Official BIS Source ↗
              </a>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

/* =========================================================
   REUSABLE INFORMATION CARD
   ========================================================= */

function InfoCard({ label, value }) {
  return (
    <div className="standard-info-card">
      <div className="standard-info-label">
        {label}
      </div>

      <div className="standard-info-value">
        {value}
      </div>
    </div>
  );
}

export default StandardDetails;