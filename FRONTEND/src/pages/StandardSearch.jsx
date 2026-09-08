import React, { useEffect, useMemo, useState } from "react";
import StandardCard from "../components/StandardCard";
import Navbar from "../components/Navbar";

const API_BASE = "";
const SEARCH_HISTORY_KEY = "bisense_recent_searches";

function saveRecentSearch(query, resultCount) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) return;

  try {
    const existing = JSON.parse(
      localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"
    );

    const newEntry = {
      query: cleanQuery,
      resultCount,
      timestamp: new Date().toISOString(),
    };

    const updated = [
      newEntry,
      ...existing.filter(
        (item) =>
          String(item.query || "").toLowerCase() !==
          cleanQuery.toLowerCase()
      ),
    ].slice(0, 10);

    localStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error("Could not save recent search:", error);
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export default function StandardSearch() {
  const [query, setQuery] = useState("");
  const [allStandards, setAllStandards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  const [visibleResults, setVisibleResults] = useState([]);

  useEffect(() => {
    const loadStandards = async () => {
      setLoadingAll(true);
      setError("");

      try {
        let response = await fetch(
          `${API_BASE}/api/standards/search?q=`
        );

        let data = response.ok ? await response.json() : null;
        let standards = Array.isArray(data?.results)
          ? data.results
          : [];

        if (standards.length === 0) {
          response = await fetch(
            `${API_BASE}/api/standards/search?q=IS`
          );

          if (response.ok) {
            data = await response.json();

            standards = Array.isArray(data?.results)
              ? data.results
              : [];
          }
        }

        setAllStandards(standards);
        setVisibleResults(standards);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load BIS standards. Make sure the FastAPI backend is running."
        );
      } finally {
        setLoadingAll(false);
      }
    };

    loadStandards();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const initialQuery = params.get("q");

    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          allStandards
            .map((item) =>
              String(item.category || "").trim()
            )
            .filter(Boolean)
        )
      ).sort(),
    ];
  }, [allStandards]);

  const statuses = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          allStandards
            .map((item) =>
              String(item.status || "").trim()
            )
            .filter(Boolean)
        )
      ).sort(),
    ];
  }, [allStandards]);

  const years = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          allStandards
            .map((item) => item.edition_year)
            .filter(
              (year) =>
                year !== null &&
                year !== undefined &&
                String(year).trim() !== ""
            )
            .map((year) => String(year))
        )
      ).sort((a, b) => Number(b) - Number(a)),
    ];
  }, [allStandards]);

  const applyFiltersToItems = (
    items,
    currentCategory = categoryFilter,
    currentStatus = statusFilter,
    currentYear = yearFilter
  ) => {
    return items.filter((standard) => {
      const categoryMatch =
        currentCategory === "All" ||
        normalize(standard.category) ===
          normalize(currentCategory);

      const statusMatch =
        currentStatus === "All" ||
        normalize(standard.status) ===
          normalize(currentStatus);

      const yearMatch =
        currentYear === "All" ||
        String(standard.edition_year || "") === currentYear;

      return categoryMatch && statusMatch && yearMatch;
    });
  };

  const performSearch = async (searchValue = query) => {
    const cleanQuery = String(searchValue || "").trim();

    setLoading(true);
    setError("");

    try {
      let searchResults = [];

      if (!cleanQuery) {
        searchResults = allStandards;
      } else {
        const response = await fetch(
          `${API_BASE}/api/standards/search?q=${encodeURIComponent(
            cleanQuery
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Search failed with status ${response.status}`
          );
        }

        const data = await response.json();

        searchResults = Array.isArray(data.results)
          ? data.results
          : [];
      }

      const filtered = applyFiltersToItems(searchResults);

      setVisibleResults(filtered);
      setSearched(true);

      if (cleanQuery) {
        saveRecentSearch(
          cleanQuery,
          filtered.length
        );
      }
    } catch (err) {
      console.error(err);

      setVisibleResults([]);
      setSearched(true);

      setError(
        "Unable to connect to the BISense backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    newCategory,
    newStatus,
    newYear
  ) => {
    const currentCategory =
      newCategory ?? categoryFilter;

    const currentStatus =
      newStatus ?? statusFilter;

    const currentYear =
      newYear ?? yearFilter;

    setCategoryFilter(currentCategory);
    setStatusFilter(currentStatus);
    setYearFilter(currentYear);

    const source =
      searched && query.trim()
        ? visibleResults
        : allStandards;

    const filtered = applyFiltersToItems(
      source,
      currentCategory,
      currentStatus,
      currentYear
    );

    setVisibleResults(filtered);
  };

  const clearFilters = () => {
    setCategoryFilter("All");
    setStatusFilter("All");
    setYearFilter("All");

    if (searched && query.trim()) {
      performSearch(query);
    } else {
      setVisibleResults(allStandards);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    performSearch();
  };

  return (
    <>
      <Navbar />

      <div className="page-container">
        <section className="page-header">
          <h1>Standards Search</h1>

          <p>
            Search BIS standards by IS number, title, category,
            or technical keywords.
          </p>
        </section>

        <section className="search-section">
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                width: "100%",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search by IS number, title, product or keyword..."
                aria-label="Search BIS standards"
                style={{
                  flex: "1",
                  minWidth: "260px",
                  padding: "14px 16px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "14px",
                  fontSize: "16px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "14px 22px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#111827",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
        </section>

        <section
          style={{
            marginTop: "22px",
            padding: "18px",
            border: "1px solid #dedede",
            borderRadius: "18px",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: "1",
                minWidth: "180px",
              }}
            >
              <label
                htmlFor="category-filter"
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Category
              </label>

              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  handleFilterChange(
                    event.target.value,
                    null,
                    null
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "12px",
                  background: "#ffffff",
                  fontSize: "15px",
                }}
              >
                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                flex: "1",
                minWidth: "180px",
              }}
            >
              <label
                htmlFor="status-filter"
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  handleFilterChange(
                    null,
                    event.target.value,
                    null
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "12px",
                  background: "#ffffff",
                  fontSize: "15px",
                }}
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                flex: "1",
                minWidth: "180px",
              }}
            >
              <label
                htmlFor="year-filter"
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Edition Year
              </label>

              <select
                id="year-filter"
                value={yearFilter}
                onChange={(event) =>
                  handleFilterChange(
                    null,
                    null,
                    event.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "12px",
                  background: "#ffffff",
                  fontSize: "15px",
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: "12px 18px",
                border: "1px solid #d9d9d9",
                borderRadius: "12px",
                background: "#ffffff",
                color: "#111827",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          </div>
        </section>

        {loadingAll && (
          <div className="search-status">
            Loading BIS standards...
          </div>
        )}

        {error && (
          <div className="search-error">
            {error}
          </div>
        )}

        {!loadingAll &&
          !loading &&
          !error && (
            <div
              className="search-results-header"
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <h2>
                {searched
                  ? "Search Results"
                  : "BIS Standards"}
              </h2>

              <span>
                {visibleResults.length} standard
                {visibleResults.length === 1
                  ? ""
                  : "s"}
                {searched
                  ? " found"
                  : " available"}
              </span>
            </div>
          )}

        {!loadingAll &&
          !loading &&
          !error &&
          searched &&
          visibleResults.length === 0 && (
            <div className="empty-state">
              <h3>No standards found</h3>

              <p>
                Try another IS number, product, keyword,
                category, status, or edition year.
              </p>
            </div>
          )}

        {!loadingAll &&
          !loading &&
          !error &&
          !searched &&
          visibleResults.length === 0 && (
            <div className="empty-state">
              <h3>No standards available</h3>

              <p>
                The standards database could not be loaded.
              </p>
            </div>
          )}

        {visibleResults.length > 0 && (
          <section className="standards-grid">
            {visibleResults.map((standard) => (
              <StandardCard
                key={
                  standard.id ||
                  standard.number
                }
                standard={standard}
                number={standard.number}
                title={standard.title}
                category={standard.category}
                year={standard.edition_year}
                status={standard.status}
                scope={standard.scope}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}