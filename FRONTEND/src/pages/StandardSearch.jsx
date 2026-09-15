import React, { useEffect, useMemo, useState } from "react";
import StandardCard from "../components/StandardCard";
import Navbar from "../components/Navbar";

const API_BASE = "";
const SEARCH_HISTORY_KEY = "bisense_recent_searches";

function saveRecentSearch(query, resultCount) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    return;
  }

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

async function fetchStandards(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Standards request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data?.results) ? data.results : [];
}

export default function StandardSearch() {
  const [query, setQuery] = useState("");

  /*
   * allStandards = the complete dataset currently loaded
   * searchResults = the result of the current search
   * visibleResults = searchResults + active filters
   */
  const [allStandards, setAllStandards] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [visibleResults, setVisibleResults] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  /* =========================================================
     FILTER OPTIONS
     ========================================================= */

  const categories = useMemo(() => {
    const values = allStandards
      .map((item) => String(item.category || "").trim())
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set(values)).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [allStandards]);

  const statuses = useMemo(() => {
    const values = allStandards
      .map((item) => String(item.status || "").trim())
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set(values)).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [allStandards]);

  const years = useMemo(() => {
    const values = allStandards
      .map((item) => item.edition_year)
      .filter(
        (year) =>
          year !== null &&
          year !== undefined &&
          String(year).trim() !== ""
      )
      .map((year) => String(year));

    return [
      "All",
      ...Array.from(new Set(values)).sort(
        (a, b) => Number(b) - Number(a)
      ),
    ];
  }, [allStandards]);

  /* =========================================================
     APPLY FILTERS
     ========================================================= */

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
        String(standard.edition_year ?? "") === currentYear;

      return (
        categoryMatch &&
        statusMatch &&
        yearMatch
      );
    });
  };

  /* =========================================================
     LOAD ALL STANDARDS
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadStandards = async () => {
      setLoadingAll(true);
      setError("");

      try {
        let standards = await fetchStandards(
          `${API_BASE}/api/standards/search?q=`
        );

        /*
         * Fallback for backends that behave differently with an
         * empty q parameter.
         */
        if (standards.length === 0) {
          standards = await fetchStandards(
            `${API_BASE}/api/standards/search?q=IS`
          );
        }

        if (!mounted) {
          return;
        }

        setAllStandards(standards);
        setSearchResults(standards);
        setVisibleResults(
          applyFiltersToItems(
            standards,
            "All",
            "All",
            "All"
          )
        );
      } catch (err) {
        console.error(
          "Could not load BIS standards:",
          err
        );

        if (!mounted) {
          return;
        }

        setAllStandards([]);
        setSearchResults([]);
        setVisibleResults([]);

        setError(
          "Unable to load BIS standards from the backend."
        );
      } finally {
        if (mounted) {
          setLoadingAll(false);
        }
      }
    };

    loadStandards();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     READ URL QUERY AFTER INITIAL DATA LOAD
     ========================================================= */

  useEffect(() => {
    if (loadingAll) {
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const initialQuery = params.get("q");

    if (!initialQuery) {
      return;
    }

    setQuery(initialQuery);
    performSearch(initialQuery);
  }, [loadingAll]);

  /* =========================================================
     SEARCH
     ========================================================= */

  const performSearch = async (
    searchValue = query
  ) => {
    const cleanQuery = String(
      searchValue || ""
    ).trim();

    setLoading(true);
    setError("");

    try {
      let results = [];

      if (!cleanQuery) {
        /*
         * Empty search means use the complete loaded dataset.
         */
        results = allStandards;
      } else {
        results = await fetchStandards(
          `${API_BASE}/api/standards/search?q=${encodeURIComponent(
            cleanQuery
          )}`
        );
      }

      const filtered = applyFiltersToItems(
        results,
        categoryFilter,
        statusFilter,
        yearFilter
      );

      setSearchResults(results);
      setVisibleResults(filtered);
      setSearched(true);

      if (cleanQuery) {
        saveRecentSearch(
          cleanQuery,
          filtered.length
        );
      }
    } catch (err) {
      console.error(
        "BIS standards search failed:",
        err
      );

      setSearchResults([]);
      setVisibleResults([]);
      setSearched(true);

      setError(
        "Unable to connect to the BISense standards service."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FILTER CHANGES
     ========================================================= */

  const handleFilterChange = ({
    category = categoryFilter,
    status = statusFilter,
    year = yearFilter,
  }) => {
    setCategoryFilter(category);
    setStatusFilter(status);
    setYearFilter(year);

    /*
     * IMPORTANT:
     * Always filter the ORIGINAL search result set.
     * Never filter already-filtered visibleResults.
     */
    const source =
      searched && query.trim()
        ? searchResults
        : allStandards;

    const filtered = applyFiltersToItems(
      source,
      category,
      status,
      year
    );

    setVisibleResults(filtered);
  };

  /* =========================================================
     CLEAR FILTERS
     ========================================================= */

  const clearFilters = () => {
    setCategoryFilter("All");
    setStatusFilter("All");
    setYearFilter("All");

    const source =
      searched && query.trim()
        ? searchResults
        : allStandards;

    setVisibleResults(source);
  };

  /* =========================================================
     FORM SUBMIT
     ========================================================= */

  const handleSubmit = (event) => {
    event.preventDefault();
    performSearch();
  };

  /* =========================================================
     STYLES
     ========================================================= */

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid #D9D9D9",
    borderRadius: "14px",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    WebkitTextFillColor: "#111827",
  };

  const selectStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #D9D9D9",
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

  const optionStyle = {
    backgroundColor: "#FFFFFF",
    color: "#111827",
  };

  return (
    <>
      <Navbar />

      <div className="page-container">
        {/* =====================================================
            MOBILE TEXT SAFETY
            ===================================================== */}

        <style>
          {`
            .standards-search-page,
            .standards-search-page * {
              color-scheme: light;
            }

            .standards-search-page .standards-title,
            .standards-search-page .standards-results-title {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standards-search-page .standards-description {
              color: #4F607A !important;
              -webkit-text-fill-color: #4F607A !important;
            }

            .standards-search-page .filter-label {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standards-search-page .result-count {
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standards-search-page select,
            .standards-search-page select option {
              background-color: #FFFFFF !important;
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standards-search-page input {
              background-color: #FFFFFF !important;
              color: #111827 !important;
              -webkit-text-fill-color: #111827 !important;
            }

            .standards-search-page input::placeholder {
              color: #7B8798 !important;
              -webkit-text-fill-color: #7B8798 !important;
              opacity: 1 !important;
            }

            @media (max-width: 650px) {
              .standards-search-page .standards-title {
                color: #111827 !important;
                font-size: 36px !important;
              }

              .standards-search-page .standards-description {
                color: #4F607A !important;
              }

              .standards-search-page .standards-results-title {
                color: #111827 !important;
              }

              .standards-search-page .result-count {
                color: #111827 !important;
              }
            }
          `}
        </style>

        <div className="standards-search-page">
          {/* ===================================================
              PAGE HEADER
              =================================================== */}

          <section className="page-header">
            <h1 className="standards-title">
              Standards Search
            </h1>

            <p className="standards-description">
              Search BIS standards by IS number, title,
              category, or technical keywords.
            </p>
          </section>

          {/* ===================================================
              SEARCH BAR
              =================================================== */}

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
                    ...inputStyle,
                    flex: "1 1 260px",
                    minWidth: "0",
                  }}
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: "0 0 auto",
                    padding: "14px 22px",
                    border: "none",
                    borderRadius: "14px",
                    background: "#111827",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: loading
                      ? "not-allowed"
                      : "pointer",
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading
                    ? "Searching..."
                    : "Search"}
                </button>
              </div>
            </form>
          </section>

          {/* ===================================================
              FILTERS
              =================================================== */}

          <section
            style={{
              marginTop: "22px",
              padding: "18px",
              border: "1px solid #DEDEDE",
              borderRadius: "18px",
              background: "#FFFFFF",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "14px",
                alignItems: "end",
              }}
            >
              {/* Category */}

              <div style={{ minWidth: 0 }}>
                <label
                  htmlFor="category-filter"
                  className="filter-label"
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
                  Category
                </label>

                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(event) =>
                    handleFilterChange({
                      category: event.target.value,
                    })
                  }
                  style={selectStyle}
                >
                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                      style={optionStyle}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}

              <div style={{ minWidth: 0 }}>
                <label
                  htmlFor="status-filter"
                  className="filter-label"
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
                  Status
                </label>

                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    handleFilterChange({
                      status: event.target.value,
                    })
                  }
                  style={selectStyle}
                >
                  {statuses.map((status) => (
                    <option
                      key={status}
                      value={status}
                      style={optionStyle}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Edition Year */}

              <div style={{ minWidth: 0 }}>
                <label
                  htmlFor="year-filter"
                  className="filter-label"
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
                  Edition Year
                </label>

                <select
                  id="year-filter"
                  value={yearFilter}
                  onChange={(event) =>
                    handleFilterChange({
                      year: event.target.value,
                    })
                  }
                  style={selectStyle}
                >
                  {years.map((year) => (
                    <option
                      key={year}
                      value={year}
                      style={optionStyle}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear */}

              <button
                type="button"
                onClick={clearFilters}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  border: "1px solid #D9D9D9",
                  borderRadius: "12px",
                  background: "#FFFFFF",
                  color: "#111827",
                  WebkitTextFillColor: "#111827",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  minHeight: "47px",
                }}
              >
                Clear Filters
              </button>
            </div>
          </section>

          {/* ===================================================
              STATUS
              =================================================== */}

          {loadingAll && (
            <div className="search-status">
              Loading BIS standards...
            </div>
          )}

          {error && (
            <div
              className="search-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ===================================================
              RESULTS HEADER
              =================================================== */}

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
                <h2 className="standards-results-title">
                  {searched
                    ? "Search Results"
                    : "BIS Standards"}
                </h2>

                <span
                  className="result-count"
                  style={{
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
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

          {/* ===================================================
              EMPTY SEARCH RESULTS
              =================================================== */}

          {!loadingAll &&
            !loading &&
            !error &&
            searched &&
            visibleResults.length === 0 && (
              <div className="empty-state">
                <h3>No standards found</h3>

                <p>
                  Try another IS number, product,
                  keyword, category, status, or
                  edition year.
                </p>
              </div>
            )}

          {/* ===================================================
              EMPTY DATASET
              =================================================== */}

          {!loadingAll &&
            !loading &&
            !error &&
            !searched &&
            visibleResults.length === 0 && (
              <div className="empty-state">
                <h3>No standards available</h3>

                <p>
                  The standards database could not be
                  loaded.
                </p>
              </div>
            )}

          {/* ===================================================
              STANDARD CARDS
              =================================================== */}

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
      </div>
    </>
  );
}