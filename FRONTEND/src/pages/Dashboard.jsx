import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

import Navbar from "../components/Navbar";

const SAVED_STANDARDS_KEY = "bisense_saved_standards";
const SEARCH_HISTORY_KEY = "bisense_recent_searches";
const CHAT_HISTORY_KEY = "bisense_recent_chats";
const REPORTS_KEY = "bisense_compliance_reports";

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return fallback;
  }
}

function formatTime(timestamp) {
  if (!timestamp) {
    return "Recently";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString();
}

function getProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
}

function Dashboard() {
  const navigate = useNavigate();

  const [activeMode, setActiveMode] = useState("Consumer");

  const [savedStandards, setSavedStandards] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [reports, setReports] = useState([]);

  const [userName, setUserName] = useState("BISense User");
  const [userEmail, setUserEmail] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [modeSaving, setModeSaving] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadUser();

    const handleStorageChange = () => {
      loadDashboardData();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const loadDashboardData = () => {
    setSavedStandards(
      readStorage(SAVED_STANDARDS_KEY)
    );

    setRecentSearches(
      readStorage(SEARCH_HISTORY_KEY)
    );

    setRecentChats(
      readStorage(CHAT_HISTORY_KEY)
    );

    setReports(
      readStorage(REPORTS_KEY)
    );
  };

  const loadUser = async () => {
    setLoadingUser(true);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const metadata = user.user_metadata || {};

      const name =
        String(metadata.name || "").trim() ||
        "BISense User";

      setUserName(name);
      setUserEmail(user.email || "");

      setActiveMode(
        metadata.role === "Manufacturer"
          ? "Manufacturer"
          : "Consumer"
      );
    } catch (error) {
      console.error("Unable to load user:", error);
      navigate("/login", { replace: true });
    } finally {
      setLoadingUser(false);
    }
  };

  const changeMode = async (mode) => {
    if (
      mode === activeMode ||
      modeSaving
    ) {
      return;
    }

    setModeSaving(true);

    const previousMode = activeMode;
    setActiveMode(mode);

    try {
      const { error } =
        await supabase.auth.updateUser({
          data: {
            role: mode,
          },
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        "Unable to save workspace mode:",
        error
      );

      setActiveMode(previousMode);
    } finally {
      setModeSaving(false);
    }
  };

  const removeSavedStandard = (number) => {
    try {
      const current = readStorage(
        SAVED_STANDARDS_KEY
      );

      const target = String(number || "")
        .trim()
        .toUpperCase();

      const updated = current.filter(
        (item) =>
          String(item?.number || "")
            .trim()
            .toUpperCase() !== target
      );

      localStorage.setItem(
        SAVED_STANDARDS_KEY,
        JSON.stringify(updated)
      );

      setSavedStandards(updated);

      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error(
        "Unable to remove saved standard:",
        error
      );
    }
  };

  const clearActivity = () => {
    try {
      localStorage.removeItem(
        SEARCH_HISTORY_KEY
      );

      localStorage.removeItem(
        CHAT_HISTORY_KEY
      );

      setRecentSearches([]);
      setRecentChats([]);

      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error(
        "Unable to clear activity:",
        error
      );
    }
  };

  if (loadingUser) {
    return (
      <div className="app-page dashboard-page">
        <Navbar />

        <main className="page-container">
          <div className="loading-container dashboard-loading">
            <div className="loading-spinner"></div>

            <span>
              Loading your BISense workspace...
            </span>
          </div>
        </main>

        <style>{`
          .dashboard-page {
            min-height: 100vh;
            overflow-x: hidden;
            background: #f8fafc;
            color: #111827;
          }

          .dashboard-loading {
            color: #111827 !important;
          }

          .dashboard-loading span {
            color: #111827 !important;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-page dashboard-page">
      <Navbar />

      <main className="page-container dashboard-container">
        {/* =====================================================
            WELCOME
        ====================================================== */}

        <section className="dashboard-welcome">
          <div className="dashboard-welcome-content">
            <p className="eyebrow">
              PERSONAL DASHBOARD
            </p>

            <h1>
              Hello, {userName} 👋
            </h1>

            <p>
              Welcome back to your BISense workspace.
              Manage your saved standards, research
              history, conversations and compliance work
              from one place.
            </p>

            {userEmail && (
              <span className="dashboard-user-email">
                {userEmail}
              </span>
            )}
          </div>

          <Link
            to="/profile"
            className="primary-btn dashboard-profile-btn"
          >
            Edit Profile
          </Link>
        </section>

        {/* =====================================================
            WORKSPACE MODE
        ====================================================== */}

        <section className="dashboard-mode">
          <div className="dashboard-mode-text">
            <p className="eyebrow">
              YOUR CURRENT MODE
            </p>

            <h2>
              {activeMode} workspace
            </h2>

            <p>
              Switch between consumer and manufacturer
              tools whenever you need.
            </p>
          </div>

          <div className="mode-switch">
            <button
              type="button"
              className={
                activeMode === "Consumer"
                  ? "mode-active"
                  : ""
              }
              onClick={() =>
                changeMode("Consumer")
              }
              disabled={modeSaving}
            >
              🛒 Consumer
            </button>

            <button
              type="button"
              className={
                activeMode === "Manufacturer"
                  ? "mode-active"
                  : ""
              }
              onClick={() =>
                changeMode("Manufacturer")
              }
              disabled={modeSaving}
            >
              🏭 Manufacturer
            </button>
          </div>
        </section>

        {/* =====================================================
            STATS
        ====================================================== */}

        <section className="dashboard-stats">
          <div>
            <span>SAVED STANDARDS</span>
            <strong>
              {savedStandards.length}
            </strong>
            <p>
              Standards in your library
            </p>
          </div>

          <div>
            <span>RECENT SEARCHES</span>
            <strong>
              {recentSearches.length}
            </strong>
            <p>
              Latest research activity
            </p>
          </div>

          <div>
            <span>AI CONVERSATIONS</span>
            <strong>
              {recentChats.length}
            </strong>
            <p>
              Recent conversations
            </p>
          </div>

          <div>
            <span>REPORTS</span>
            <strong>
              {reports.length}
            </strong>
            <p>
              Compliance reports
            </p>
          </div>
        </section>

        {/* =====================================================
            SAVED STANDARDS + SEARCHES
        ====================================================== */}

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">
                  YOUR LIBRARY
                </p>

                <h2>Saved standards</h2>
              </div>

              <Link to="/standards">
                Explore →
              </Link>
            </div>

            <div className="saved-standard-list">
              {savedStandards.length === 0 ? (
                <div className="dashboard-empty">
                  <strong>
                    No saved standards yet
                  </strong>

                  <p>
                    Save a standard from the Standards
                    Search page and it will appear here.
                  </p>
                </div>
              ) : (
                savedStandards.map(
                  (standard, index) => {
                    const number =
                      standard?.number ||
                      `standard-${index}`;

                    return (
                      <div
                        className="saved-standard-item"
                        key={`${number}-${index}`}
                      >
                        <div className="saved-standard-content">
                          <span>
                            {number}
                          </span>

                          <strong>
                            {standard?.title ||
                              "Untitled Standard"}
                          </strong>

                          <p>
                            {standard?.category ||
                              "General"}

                            {standard?.edition_year
                              ? ` · ${standard.edition_year}`
                              : ""}
                          </p>
                        </div>

                        <div className="saved-standard-actions">
                          <Link
                            to={`/standard/${encodeURIComponent(
                              number
                            )}`}
                          >
                            Open
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              removeSavedStandard(
                                number
                              )
                            }
                            title="Remove saved standard"
                            aria-label={`Remove ${number}`}
                          >
                            ☆
                          </button>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">
                  ACTIVITY
                </p>

                <h2>Recent searches</h2>
              </div>

              <Link to="/standards">
                Search →
              </Link>
            </div>

            <div className="dashboard-list">
              {recentSearches.length === 0 ? (
                <div className="dashboard-empty">
                  <strong>
                    No recent searches
                  </strong>

                  <p>
                    Your Standards Search activity
                    will appear here.
                  </p>
                </div>
              ) : (
                recentSearches.map(
                  (item, index) => {
                    const query =
                      String(
                        item?.query || ""
                      ).trim();

                    const resultCount =
                      Number(
                        item?.resultCount
                      ) || 0;

                    return (
                      <Link
                        className="dashboard-list-item dashboard-link-item"
                        to={`/standards?q=${encodeURIComponent(
                          query
                        )}`}
                        key={`${query}-${item?.timestamp || ""}-${index}`}
                      >
                        <div>
                          <strong>
                            {query ||
                              "Standards search"}
                          </strong>

                          <span>
                            {resultCount} result
                            {resultCount === 1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <time>
                          {formatTime(
                            item?.timestamp
                          )}
                        </time>
                      </Link>
                    );
                  }
                )
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            AI CONVERSATIONS
        ====================================================== */}

        <section className="dashboard-card dashboard-full-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                AI ASSISTANT
              </p>

              <h2>
                Recent conversations
              </h2>
            </div>

            <Link to="/copilot">
              Open BIS Copilot →
            </Link>
          </div>

          <div className="conversation-grid">
            {recentChats.length === 0 ? (
              <div className="dashboard-empty">
                <strong>
                  No conversations yet
                </strong>

                <p>
                  Questions you ask the BIS AI
                  assistant will appear here.
                </p>
              </div>
            ) : (
              recentChats.map(
                (chat, index) => {
                  const title =
                    String(
                      chat?.query ||
                        chat?.title ||
                        ""
                    ).trim();

                  return (
                    <Link
                      to="/copilot"
                      className="conversation-card"
                      key={`${title}-${chat?.timestamp || ""}-${index}`}
                    >
                      <span>✦</span>

                      <strong>
                        {title ||
                          "BIS AI conversation"}
                      </strong>

                      <p>
                        {formatTime(
                          chat?.timestamp
                        )}
                      </p>
                    </Link>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* =====================================================
            COMPLIANCE REPORTS
        ====================================================== */}

        <section className="dashboard-card dashboard-full-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                WORKSPACE
              </p>

              <h2>
                Compliance reports
              </h2>
            </div>

            <Link to="/compliance">
              Create report →
            </Link>
          </div>

          <div className="reports-list">
            {reports.length === 0 ? (
              <div className="dashboard-empty">
                <strong>
                  No compliance reports yet
                </strong>

                <p>
                  Start a Compliance review and save
                  its progress to create a report here.
                </p>
              </div>
            ) : (
              reports.map(
                (report, index) => {
                  const progress =
                    getProgress(
                      report?.progress
                    );

                  return (
                    <div
                      className="report-row dashboard-report"
                      key={`${report?.title || "report"}-${report?.timestamp || ""}-${index}`}
                    >
                      <div className="report-info">
                        <strong>
                          {report?.title ||
                            "Compliance Review"}
                        </strong>

                        <span>
                          {report?.standard ||
                            "Standard not selected"}
                          {" · "}
                          {formatTime(
                            report?.timestamp
                          )}
                        </span>
                      </div>

                      <div className="report-progress">
                        <div className="report-progress-track">
                          <div
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <span>
                          {progress}%
                        </span>
                      </div>

                      <div className="report-actions">
                        <Link
                          to="/compliance"
                          className="secondary-btn"
                        >
                          Open
                        </Link>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            window.print()
                          }
                          aria-label="Print report"
                        >
                          🖨
                        </button>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* =====================================================
            QUICK ACTIONS
        ====================================================== */}

        <section className="dashboard-quick">
          <div className="dashboard-quick-heading">
            <p className="eyebrow">
              QUICK ACTIONS
            </p>

            <h2>
              What do you want to do next?
            </h2>
          </div>

          <div className="quick-action-grid">
            <Link to="/copilot">
              <span>✦</span>

              <strong>
                Ask BIS AI
              </strong>

              <p>
                Ask questions about Indian
                Standards.
              </p>
            </Link>

            <Link to="/standards">
              <span>⌕</span>

              <strong>
                Search Standards
              </strong>

              <p>
                Find standards by product or
                IS number.
              </p>
            </Link>

            <Link to="/certification">
              <span>🏷</span>

              <strong>
                Certification Advisor
              </strong>

              <p>
                Explore a potential BIS
                certification pathway.
              </p>
            </Link>

            <Link to="/product-analyzer">
              <span>📷</span>

              <strong>
                Analyze Product
              </strong>

              <p>
                Upload a product image for
                AI assistance.
              </p>
            </Link>

            <Link to="/laboratories">
              <span>⌁</span>

              <strong>
                Find Laboratory
              </strong>

              <p>
                Search BIS-recognized
                laboratories.
              </p>
            </Link>

            <Link to="/profile">
              <span>◉</span>

              <strong>
                Edit Profile
              </strong>

              <p>
                Update your BISense profile
                information.
              </p>
            </Link>
          </div>

          <button
            type="button"
            className="secondary-btn dashboard-clear-btn"
            onClick={clearActivity}
          >
            Clear Activity
          </button>
        </section>
      </main>

      <style>{`
        .dashboard-page {
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          color: #111827;
        }

        .dashboard-container {
          width: 100%;
          box-sizing: border-box;
        }

        .dashboard-page h1,
        .dashboard-page h2,
        .dashboard-page h3,
        .dashboard-page p,
        .dashboard-page span,
        .dashboard-page strong,
        .dashboard-page time {
          overflow-wrap: anywhere;
        }

        .dashboard-welcome-content,
        .dashboard-mode-text,
        .dashboard-card,
        .dashboard-quick {
          min-width: 0;
        }

        .dashboard-welcome h1,
        .dashboard-welcome p,
        .dashboard-mode h2,
        .dashboard-mode p,
        .dashboard-card h2,
        .dashboard-card p,
        .dashboard-card strong,
        .dashboard-quick h2,
        .dashboard-user-email {
          color: #111827 !important;
        }

        .dashboard-user-email {
          display: inline-block;
          margin-top: 8px;
          color: #6b7280 !important;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .dashboard-profile-btn {
          text-decoration: none;
          flex-shrink: 0;
        }

        .mode-switch button {
          color: #374151;
          background: #fff;
          border-color: #d9dee8;
        }

        .mode-switch button.mode-active {
          color: #fff !important;
          background: #18233c;
          border-color: #18233c;
        }

        .mode-switch button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .dashboard-stats > div {
          min-width: 0;
        }

        .dashboard-stats span,
        .dashboard-stats p {
          color: #6b7280 !important;
        }

        .dashboard-stats strong {
          color: #111827 !important;
        }

        .card-heading {
          min-width: 0;
        }

        .card-heading > div {
          min-width: 0;
        }

        .card-heading a {
          flex-shrink: 0;
          color: #4f5fda;
          text-decoration: none;
          white-space: nowrap;
        }

        .dashboard-empty {
          min-width: 0;
        }

        .dashboard-empty strong {
          color: #1f2937 !important;
        }

        .dashboard-empty p {
          color: #6b7280 !important;
        }

        .saved-standard-item,
        .dashboard-list-item,
        .conversation-card,
        .dashboard-report {
          min-width: 0;
        }

        .saved-standard-content {
          min-width: 0;
          flex: 1;
        }

        .saved-standard-content > strong,
        .saved-standard-content > p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .saved-standard-actions {
          flex-shrink: 0;
        }

        .saved-standard-actions a {
          text-decoration: none;
        }

        .saved-standard-actions button {
          cursor: pointer;
        }

        .dashboard-link-item {
          text-decoration: none;
        }

        .dashboard-list-item strong,
        .dashboard-list-item span,
        .dashboard-list-item time {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .conversation-card {
          text-decoration: none;
        }

        .conversation-card strong,
        .conversation-card p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .report-info {
          min-width: 0;
          flex: 1;
        }

        .report-info strong,
        .report-info span {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .report-progress {
          min-width: 130px;
        }

        .report-progress-track {
          overflow: hidden;
        }

        .report-actions {
          flex-shrink: 0;
        }

        .report-actions a {
          text-decoration: none;
        }

        .report-actions button {
          cursor: pointer;
        }

        .quick-action-grid a {
          min-width: 0;
          text-decoration: none;
        }

        .quick-action-grid strong,
        .quick-action-grid p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .dashboard-clear-btn {
          margin-top: 18px;
        }

        @media (max-width: 900px) {
          .dashboard-welcome {
            align-items: flex-start !important;
            gap: 20px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-stats {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .quick-action-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .dashboard-report {
            grid-template-columns: 1fr !important;
          }

          .report-progress {
            width: 100%;
          }

          .report-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 650px) {
          .dashboard-welcome {
            flex-direction: column !important;
          }

          .dashboard-profile-btn {
            width: 100%;
            justify-content: center;
          }

          .dashboard-mode {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px;
          }

          .mode-switch {
            width: 100%;
          }

          .mode-switch button {
            flex: 1;
            min-width: 0;
          }

          .dashboard-stats {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          .dashboard-stats > div {
            min-height: 120px;
          }

          .card-heading {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 10px;
          }

          .card-heading a {
            white-space: normal;
          }

          .saved-standard-item {
            align-items: flex-start !important;
            gap: 12px;
          }

          .saved-standard-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 7px;
          }

          .quick-action-grid {
            grid-template-columns: 1fr !important;
          }

          .conversation-grid {
            grid-template-columns: 1fr !important;
          }

          .report-actions {
            width: 100%;
            display: flex;
            gap: 10px;
          }

          .report-actions > * {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .dashboard-container {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .dashboard-welcome h1 {
            font-size: clamp(
              28px,
              8vw,
              38px
            ) !important;
            line-height: 1.12 !important;
          }

          .dashboard-welcome > p,
          .dashboard-welcome-content > p {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .dashboard-mode h2 {
            font-size: 22px !important;
          }

          .mode-switch {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px;
          }

          .mode-switch button {
            width: 100%;
            min-height: 45px;
          }

          .dashboard-stats {
            grid-template-columns: 1fr !important;
          }

          .dashboard-stats > div {
            min-height: auto;
          }

          .saved-standard-item {
            flex-direction: column !important;
          }

          .saved-standard-actions {
            width: 100%;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .dashboard-list-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 5px;
          }

          .conversation-card {
            padding: 17px !important;
          }

          .report-actions {
            flex-direction: column;
          }

          .report-actions > * {
            width: 100%;
          }

          .dashboard-clear-btn {
            width: 100%;
          }
        }

        @media print {
          .dashboard-page nav,
          .dashboard-page footer,
          .dashboard-profile-btn,
          .dashboard-clear-btn,
          .quick-action-grid,
          .mode-switch {
            display: none !important;
          }

          .dashboard-page {
            background: #fff !important;
          }

          .dashboard-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .dashboard-card,
          .dashboard-report {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;