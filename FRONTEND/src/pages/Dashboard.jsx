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
    const parsed = value ? JSON.parse(value) : fallback;

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
  const diffMs = now.getTime() - date.getTime();

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
    setSavedStandards(readStorage(SAVED_STANDARDS_KEY));
    setRecentSearches(readStorage(SEARCH_HISTORY_KEY));
    setRecentChats(readStorage(CHAT_HISTORY_KEY));
    setReports(readStorage(REPORTS_KEY));
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
        navigate("/login");
        return;
      }

      const metadata = user.user_metadata || {};

      const name =
        String(metadata.name || "").trim() ||
        "BISense User";

      setUserName(name);
      setUserEmail(user.email || "");

      if (metadata.role === "Manufacturer") {
        setActiveMode("Manufacturer");
      } else {
        setActiveMode("Consumer");
      }
    } catch (error) {
      console.error("Unable to load user:", error);
      navigate("/login");
    } finally {
      setLoadingUser(false);
    }
  };

  const removeSavedStandard = (number) => {
    try {
      const current = readStorage(SAVED_STANDARDS_KEY);

      const updated = current.filter(
        (item) =>
          String(item.number || "").toUpperCase() !==
          String(number || "").toUpperCase()
      );

      localStorage.setItem(
        SAVED_STANDARDS_KEY,
        JSON.stringify(updated)
      );

      setSavedStandards(updated);
    } catch (error) {
      console.error("Unable to remove saved standard:", error);
    }
  };

  const clearActivity = () => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      localStorage.removeItem(CHAT_HISTORY_KEY);

      setRecentSearches([]);
      setRecentChats([]);
    } catch (error) {
      console.error("Unable to clear activity:", error);
    }
  };

  if (loadingUser) {
    return (
      <div className="app-page">
        <Navbar />

        <main className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Loading your BISense workspace...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container">
        {/* Welcome */}
        <section className="dashboard-welcome">
          <div>
            <p className="eyebrow">
              PERSONAL DASHBOARD
            </p>

            <h1>
              Hello, {userName} 👋
            </h1>

            <p>
              Welcome back to your BISense workspace. Manage
              your saved standards, research history,
              conversations and compliance work from one place.
            </p>

            {userEmail && (
              <span className="dashboard-user-email">
                {userEmail}
              </span>
            )}
          </div>

          <Link
            to="/profile"
            className="primary-btn"
          >
            Edit Profile
          </Link>
        </section>

        {/* Workspace Mode */}
        <section className="dashboard-mode">
          <div>
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
                setActiveMode("Consumer")
              }
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
                setActiveMode("Manufacturer")
              }
            >
              🏭 Manufacturer
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="dashboard-stats">
          <div>
            <span>SAVED STANDARDS</span>
            <strong>{savedStandards.length}</strong>
            <p>Standards in your library</p>
          </div>

          <div>
            <span>RECENT SEARCHES</span>
            <strong>{recentSearches.length}</strong>
            <p>Latest research activity</p>
          </div>

          <div>
            <span>AI CONVERSATIONS</span>
            <strong>{recentChats.length}</strong>
            <p>Recent conversations</p>
          </div>

          <div>
            <span>REPORTS</span>
            <strong>{reports.length}</strong>
            <p>Compliance reports</p>
          </div>
        </section>

        {/* Saved Standards + Recent Searches */}
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
                savedStandards.map((standard) => (
                  <div
                    className="saved-standard-item"
                    key={standard.number}
                  >
                    <div>
                      <span>
                        {standard.number}
                      </span>

                      <strong>
                        {standard.title ||
                          "Untitled Standard"}
                      </strong>

                      <p>
                        {standard.category ||
                          "General"}

                        {standard.edition_year
                          ? ` · ${standard.edition_year}`
                          : ""}
                      </p>
                    </div>

                    <div className="saved-standard-actions">
                      <Link
                        to={`/standard/${encodeURIComponent(
                          standard.number
                        )}`}
                      >
                        Open
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          removeSavedStandard(
                            standard.number
                          )
                        }
                        title="Remove saved standard"
                      >
                        ☆
                      </button>
                    </div>
                  </div>
                ))
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
                recentSearches.map((item, index) => (
                  <Link
                    className="dashboard-list-item dashboard-link-item"
                    to={`/standards?q=${encodeURIComponent(
                      item.query || ""
                    )}`}
                    key={`${item.query}-${item.timestamp}-${index}`}
                  >
                    <div>
                      <strong>
                        {item.query}
                      </strong>

                      <span>
                        {item.resultCount ?? 0} result
                        {(item.resultCount ?? 0) ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    <time>
                      {formatTime(item.timestamp)}
                    </time>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* AI Conversations */}
        <section className="dashboard-card dashboard-full-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                AI ASSISTANT
              </p>

              <h2>Recent conversations</h2>
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
                  Questions you ask the BIS AI assistant
                  will appear here.
                </p>
              </div>
            ) : (
              recentChats.map((chat, index) => (
                <Link
                  to="/copilot"
                  className="conversation-card"
                  key={`${chat.query || chat.title}-${chat.timestamp}-${index}`}
                >
                  <span>✦</span>

                  <strong>
                    {chat.query ||
                      chat.title ||
                      "BIS AI conversation"}
                  </strong>

                  <p>
                    {formatTime(chat.timestamp)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Compliance Reports */}
        <section className="dashboard-card dashboard-full-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                WORKSPACE
              </p>

              <h2>Compliance reports</h2>
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
              reports.map((report, index) => {
                const progress = Math.max(
                  0,
                  Math.min(
                    100,
                    Number(report.progress) || 0
                  )
                );

                return (
                  <div
                    className="report-row dashboard-report"
                    key={`${report.title}-${report.timestamp}-${index}`}
                  >
                    <div className="report-info">
                      <strong>
                        {report.title ||
                          "Compliance Review"}
                      </strong>

                      <span>
                        {report.standard ||
                          "Standard not selected"}
                        {" · "}
                        {formatTime(
                          report.timestamp
                        )}
                      </span>
                    </div>

                    <div className="report-progress">
                      <div className="report-progress-track">
                        <div
                          style={{
                            width: `${progress}%`,
                          }}
                        ></div>
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
                      >
                        🖨
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-quick">
          <div>
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

              <strong>Ask BIS AI</strong>

              <p>
                Ask questions about Indian Standards.
              </p>
            </Link>

            <Link to="/standards">
              <span>⌕</span>

              <strong>Search Standards</strong>

              <p>
                Find standards by product or IS number.
              </p>
            </Link>

            <Link to="/certification">
              <span>🏷</span>

              <strong>Certification Advisor</strong>

              <p>
                Explore a potential BIS certification
                pathway.
              </p>
            </Link>

            <Link to="/product-analyzer">
              <span>📷</span>

              <strong>Analyze Product</strong>

              <p>
                Upload a product image for AI assistance.
              </p>
            </Link>

            <Link to="/laboratories">
              <span>⌁</span>

              <strong>Find Laboratory</strong>

              <p>
                Search BIS-recognized laboratories.
              </p>
            </Link>

            <Link to="/profile">
              <span>◉</span>

              <strong>Edit Profile</strong>

              <p>
                Update your BISense profile information.
              </p>
            </Link>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={clearActivity}
            style={{ marginTop: "18px" }}
          >
            Clear Activity
          </button>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;