import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = "";

function StandardDetails() {
  const { standardNumber } = useParams();

  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStandard = async () => {
      try {
        setLoading(true);
        setError("");

        const decodedNumber = decodeURIComponent(standardNumber);

        const response = await fetch(
          `${API_URL}/api/standards/${encodeURIComponent(
            decodedNumber
          )}`
        );

        if (!response.ok) {
          throw new Error("Standard not found.");
        }

        const data = await response.json();
        setStandard(data);
      } catch (err) {
        setError(err.message || "Failed to load standard details.");
      } finally {
        setLoading(false);
      }
    };

    fetchStandard();
  }, [standardNumber]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p>Loading BIS standard details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h2>Standard Not Found</h2>
          <p>{error}</p>

          <Link to="/search" style={styles.backButton}>
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/search" style={styles.backLink}>
          ← Back to Standards Search
        </Link>

        <div style={styles.headerCard}>
          <div style={styles.badge}>BIS STANDARD</div>

          <h1>{standard.number}</h1>

          <h2>{standard.title}</h2>

          <span style={styles.status}>{standard.status}</span>
        </div>

        <div style={styles.section}>
          <h3>Standard Information</h3>

          <div style={styles.grid}>
            <InfoCard
              label="Standard Number"
              value={standard.number}
            />

            <InfoCard
              label="Category"
              value={standard.category || "Not available"}
            />

            <InfoCard
              label="Edition Year"
              value={standard.edition_year || "Not available"}
            />

            <InfoCard
              label="Status"
              value={standard.status || "Not available"}
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3>Scope</h3>

          <p style={styles.text}>
            {standard.scope || "Scope information is not available."}
          </p>
        </div>

        <div style={styles.section}>
          <h3>Certification Information</h3>

          <div style={styles.grid}>
            <InfoCard
              label="Certification Scheme"
              value={
                standard.certification_scheme || "Not specified"
              }
            />

            <InfoCard
              label="Certification Status"
              value={
                standard.certification_status || "Not specified"
              }
            />

            <InfoCard
              label="QCO Information"
              value={
                standard.qco_information || "Not specified"
              }
            />
          </div>
        </div>

        <div style={styles.sourceCard}>
          <h3>Official BIS Source</h3>

          <p>
            Source:{" "}
            <strong>
              {standard.source_name || "BIS"}
            </strong>
          </p>

          {standard.source_url && (
            <a
              href={standard.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.sourceButton}
            >
              View Official BIS Source ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "40px 20px",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  backLink: {
    display: "inline-block",
    marginBottom: "25px",
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: "600",
  },

  backButton: {
    display: "inline-block",
    marginTop: "20px",
    padding: "12px 20px",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
  },

  headerCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "16px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.06)",
    marginBottom: "25px",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "6px",
    background: "#e8f0ff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "15px",
  },

  headerCardH1: {
    margin: 0,
  },

  status: {
    display: "inline-block",
    marginTop: "15px",
    padding: "7px 12px",
    borderRadius: "20px",
    background: "#e8f7ee",
    color: "#16803c",
    fontWeight: "600",
    fontSize: "13px",
  },

  section: {
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
    marginBottom: "25px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  infoCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "18px",
  },

  label: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "8px",
  },

  value: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
  },

  text: {
    lineHeight: "1.7",
    color: "#374151",
  },

  sourceCard: {
    background: "#111827",
    color: "#fff",
    padding: "30px",
    borderRadius: "16px",
  },

  sourceButton: {
    display: "inline-block",
    marginTop: "10px",
    padding: "12px 18px",
    background: "#fff",
    color: "#111827",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
  },
};

export default StandardDetails;