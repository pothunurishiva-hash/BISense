import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "bisense_saved_standards";

function getSavedStandards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Unable to read saved standards:", error);
    return [];
  }
}

function normalizeNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export default function StandardCard({
  standard,
  number,
  title,
  category,
  year,
  status,
  scope,
}) {
  const standardNumber = normalizeNumber(
    number || standard?.number
  );

  const standardTitle = title || standard?.title || "Untitled Standard";
  const standardCategory = category || standard?.category || "General";
  const standardYear = year || standard?.edition_year || "—";
  const standardStatus = status || standard?.status || "—";
  const standardScope = scope || standard?.scope || "";

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!standardNumber) return;

    const savedStandards = getSavedStandards();

    const exists = savedStandards.some(
      (item) => normalizeNumber(item.number) === standardNumber
    );

    setSaved(exists);
  }, [standardNumber]);

  const handleSave = () => {
    if (!standardNumber) return;

    try {
      const savedStandards = getSavedStandards();

      if (saved) {
        const updated = savedStandards.filter(
          (item) => normalizeNumber(item.number) !== standardNumber
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSaved(false);
        return;
      }

      const standardToSave = {
        id: standard?.id || standardNumber,
        number: standardNumber,
        title: standardTitle,
        category: standardCategory,
        edition_year: standardYear,
        status: standardStatus,
        scope: standardScope,
        savedAt: new Date().toISOString(),
      };

      const updated = [
        standardToSave,
        ...savedStandards.filter(
          (item) => normalizeNumber(item.number) !== standardNumber
        ),
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(true);
    } catch (error) {
      console.error("Unable to save standard:", error);
    }
  };

  const detailsUrl = `/standard/${encodeURIComponent(standardNumber)}`;

  return (
    <div className="standard-card">
      <div className="standard-card-top">
        <div>
          <span className="standard-number">
            {standardNumber}
          </span>

          <h3 className="standard-title">
            {standardTitle}
          </h3>
        </div>

        <button
          type="button"
          className={`save-standard-btn ${saved ? "saved" : ""}`}
          onClick={handleSave}
          title={saved ? "Remove from saved standards" : "Save standard"}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="standard-card-meta">
        <span>{standardCategory}</span>
        <span>Edition: {standardYear}</span>
        <span>Status: {standardStatus}</span>
      </div>

      {standardScope && (
        <p className="standard-scope">
          {standardScope}
        </p>
      )}

      <div className="standard-card-actions">
        <Link
          to={detailsUrl}
          className="standard-action primary"
        >
          View Details
        </Link>

        <Link
          to="/compare"
          className="standard-action secondary"
        >
          Compare
        </Link>
      </div>
    </div>
  );
}