import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

const SAVED_STANDARDS_KEY = "bisense_saved_standards";
const SEARCH_HISTORY_KEY = "bisense_recent_searches";
const CHAT_HISTORY_KEY = "bisense_recent_chats";
const REPORTS_KEY = "bisense_compliance_reports";

const INSIGHTS = [
  {
    tag: "STANDARDS",
    title: "Start with the right standard",
    text: "BISense helps you move from a product, keyword or IS number to relevant Indian Standards.",
    action: "Explore Standards",
    to: "/standards",
    source: "BISense workflow",
  },
  {
    tag: "UNDERSTAND",
    title: "Technical information should be easier to use",
    text: "Use BISense AI to turn standards-related questions into simpler explanations and practical next steps.",
    action: "Ask BIS AI",
    to: "/copilot",
    source: "BISense AI workflow",
  },
  {
    tag: "CERTIFICATION",
    title: "Discovery is only the beginning",
    text: "Once a relevant standard is identified, BISense can guide you toward certification-related information.",
    action: "Open Certification",
    to: "/certification",
    source: "BISense workflow",
  },
  {
    tag: "TESTING",
    title: "Connect standards with testing",
    text: "Testing laboratories are part of the same journey, so users can continue from information to laboratory discovery.",
    action: "Find a Laboratory",
    to: "/laboratories",
    source: "BISense workflow",
  },
  {
    tag: "COMPLIANCE",
    title: "Turn information into action",
    text: "Compliance guidance helps organize requirements and follow the next steps instead of stopping at a search result.",
    action: "Open Compliance",
    to: "/compliance",
    source: "BISense workflow",
  },
  {
    tag: "CONSUMER",
    title: "Verification matters",
    text: "Consumer awareness features help users understand BIS-related information and verify important claims through official sources.",
    action: "Consumer Awareness",
    to: "/awareness",
    source: "BISense research",
  },
];

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

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

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getStandardNumber(item) {
  return cleanText(
    item?.number ||
      item?.standardNumber ||
      item?.isNumber ||
      item?.code ||
      item?.standard_number,
    "Standard"
  );
}

function getStandardTitle(item) {
  return cleanText(
    item?.title ||
      item?.name ||
      item?.standardTitle ||
      item?.description,
    "Saved BIS Standard"
  );
}

function getSearchQuery(item) {
  return cleanText(
    item?.query ||
      item?.searchQuery ||
      item?.term ||
      item?.keyword,
    "Standards search"
  );
}

function getChatQuestion(item) {
  return cleanText(
    item?.question ||
      item?.query ||
      item?.title,
    "BIS AI conversation"
  );
}

function getReportTitle(item) {
  return cleanText(
    item?.title ||
      item?.name,
    "Compliance Review"
  );
}

function getReportStandard(item) {
  return cleanText(
    item?.standard ||
      item?.standardNumber,
    "Standard not selected"
  );
}

function clampProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getInitials(name, email) {
  const source = cleanText(name, cleanText(email, "BIS"));

  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loadingUser, setLoadingUser] = useState(true);
  const [updatingMode, setUpdatingMode] = useState(false);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("Consumer");
  const [organization, setOrganization] = useState("");

  const [savedStandards, setSavedStandards] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [reports, setReports] = useState([]);

  const [insightIndex, setInsightIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const metadata = user.user_metadata || {};

        const name =
          metadata.name ||
          metadata.full_name ||
          user.email?.split("@")[0] ||
          "there";

        setUserName(name);
        setUserEmail(user.email || "");

        const savedRole = cleanText(
          metadata.role,
          "Consumer"
        );

        setUserRole(
          savedRole.toLowerCase() === "manufacturer"
            ? "Manufacturer"
            : "Consumer"
        );

        setOrganization(
          cleanText(
            metadata.organization ||
              metadata.company ||
              metadata.business
          )
        );

        setSavedStandards(
          readStorage(SAVED_STANDARDS_KEY, [])
        );

        setRecentSearches(
          readStorage(SEARCH_HISTORY_KEY, [])
        );

        setRecentChats(
          readStorage(CHAT_HISTORY_KEY, [])
        );

        setReports(
          readStorage(REPORTS_KEY, [])
        );
      } catch (error) {
        console.error("Unable to load BISense Intelligence Hub:", error);
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    };

    loadDashboard();

    const handleStorage = () => {
      setSavedStandards(
        readStorage(SAVED_STANDARDS_KEY, [])
      );

      setRecentSearches(
        readStorage(SEARCH_HISTORY_KEY, [])
      );

      setRecentChats(
        readStorage(CHAT_HISTORY_KEY, [])
      );

      setReports(
        readStorage(REPORTS_KEY, [])
      );
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate]);

  const insight = INSIGHTS[insightIndex];

  const nextInsight = () => {
    setInsightIndex(
      (current) => (current + 1) % INSIGHTS.length
    );
  };

  const changeMode = async (mode) => {
    if (updatingMode || mode === userRole) {
      return;
    }

    setUpdatingMode(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          role: mode,
        },
      });

      if (error) {
        throw error;
      }

      setUserRole(mode);
    } catch (error) {
      console.error("Unable to change workspace mode:", error);
    } finally {
      setUpdatingMode(false);
    }
  };

  const continueItem = useMemo(() => {
    if (recentChats.length > 0) {
      const item = recentChats[0];

      return {
        type: "AI",
        title: getChatQuestion(item),
        meta: "Continue your recent BIS AI conversation",
        to: "/copilot",
      };
    }

    if (recentSearches.length > 0) {
      const item = recentSearches[0];
      const query = getSearchQuery(item);

      return {
        type: "SEARCH",
        title: query,
        meta: "Continue your latest standards research",
        to: `/standards?q=${encodeURIComponent(query)}`,
      };
    }

    if (savedStandards.length > 0) {
      const item = savedStandards[0];
      const number = getStandardNumber(item);

      return {
        type: "SAVED",
        title: getStandardTitle(item),
        meta: `Saved standard · ${number}`,
        to: `/standard/${encodeURIComponent(number)}`,
      };
    }

    return {
      type: "START",
      title: "Start exploring Indian Standards",
      meta: "Search a product, keyword or IS number",
      to: "/standards",
    };
  }, [
    recentChats,
    recentSearches,
    savedStandards,
  ]);

  const totalWorkspaceItems =
    savedStandards.length +
    recentSearches.length +
    recentChats.length +
    reports.length;

  const initials = getInitials(userName, userEmail);

  if (loadingUser) {
    return (
      <div className="app-page bisintel-page">
        <Navbar />

        <main className="bisintel-loading-page">
          <div className="bisintel-loading">
            <div className="bisintel-spinner"></div>
            <strong>Preparing your BISense workspace</strong>
            <span>Loading your intelligence hub...</span>
          </div>
        </main>

        <style>{`
          .bisintel-page {
            min-height: 100vh;
            background: #f6f7f4;
            color: #111827;
          }

          .bisintel-loading-page {
            min-height: calc(100vh - 90px);
            display: grid;
            place-items: center;
            padding: 40px 20px;
          }

          .bisintel-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            text-align: center;
          }

          .bisintel-spinner {
            width: 34px;
            height: 34px;
            margin-bottom: 8px;
            border: 3px solid #dfe5e1;
            border-top-color: #17666d;
            border-radius: 50%;
            animation: bisintel-spin 0.8s linear infinite;
          }

          .bisintel-loading strong {
            font-size: 15px;
            color: #111827;
          }

          .bisintel-loading span {
            font-size: 12px;
            color: #6b7280;
          }

          @keyframes bisintel-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-page bisintel-page">
      <Navbar />

      <main className="bisintel-shell">

        {/* HEADER */}
        <section className="bisintel-header">
          <div className="bisintel-header-copy">
            <div className="bisintel-eyebrow">
              BIS INTELLIGENCE HUB
            </div>

            <h1>
              {getGreeting()}, {userName}.
            </h1>

            <p>
              Stay informed, revisit your work and discover
              what to explore next across the BISense ecosystem.
            </p>

            <div className="bisintel-header-meta">
              <span className="bisintel-status-dot"></span>
              <span>
                {userRole} workspace
              </span>

              {organization && (
                <>
                  <span className="bisintel-meta-divider">
                    /
                  </span>
                  <span>{organization}</span>
                </>
              )}
            </div>
          </div>

          <div className="bisintel-account">
            <div className="bisintel-avatar">
              {initials}
            </div>

            <div>
              <span className="bisintel-account-label">
                SIGNED IN AS
              </span>

              <strong>{userEmail}</strong>
            </div>

            <Link
              to="/profile"
              className="bisintel-account-link"
            >
              Profile
            </Link>
          </div>
        </section>

        {/* MODE */}
        <section className="bisintel-control-strip">
          <div>
            <span className="bisintel-control-label">
              YOUR PERSPECTIVE
            </span>

            <p>
              Personalize the intelligence you see.
            </p>
          </div>

          <div className="bisintel-mode-switch">
            <button
              type="button"
              className={
                userRole === "Consumer"
                  ? "bisintel-mode-active"
                  : ""
              }
              onClick={() => changeMode("Consumer")}
              disabled={updatingMode}
            >
              Consumer
            </button>

            <button
              type="button"
              className={
                userRole === "Manufacturer"
                  ? "bisintel-mode-active"
                  : ""
              }
              onClick={() => changeMode("Manufacturer")}
              disabled={updatingMode}
            >
              Manufacturer
            </button>
          </div>
        </section>

        {/* BRIEFING */}
        <section className="bisintel-section">
          <div className="bisintel-section-heading">
            <div>
              <span className="bisintel-section-kicker">
                BISENSE BRIEFING
              </span>

              <h2>
                Know what to explore next.
              </h2>
            </div>

            <span className="bisintel-section-note">
              Curated from your BISense workflows
            </span>
          </div>

          <div className="bisintel-briefing-grid">
            {INSIGHTS.slice(0, 4).map((item, index) => (
              <article
                className="bisintel-brief-card"
                key={item.tag}
              >
                <div className="bisintel-brief-top">
                  <span>{item.tag}</span>
                  <span className="bisintel-brief-number">
                    0{index + 1}
                  </span>
                </div>

                <h3>{item.title}</h3>

                <p>{item.text}</p>

                <Link
                  to={item.to}
                  className="bisintel-text-link"
                >
                  {item.action}
                  <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* MIDDLE GRID */}
        <section className="bisintel-main-grid">

          {/* INSIGHT */}
          <article className="bisintel-insight-panel">
            <div className="bisintel-insight-header">
              <div>
                <span className="bisintel-section-kicker">
                  INSIGHT OF THE DAY
                </span>

                <span className="bisintel-insight-index">
                  {insightIndex + 1} / {INSIGHTS.length}
                </span>
              </div>

              <button
                type="button"
                className="bisintel-refresh-button"
                onClick={nextInsight}
                aria-label="Show another insight"
                title="Show another insight"
              >
                ↻
              </button>
            </div>

            <div className="bisintel-insight-rule"></div>

            <div className="bisintel-insight-content">
              <span className="bisintel-insight-tag">
                {insight.tag}
              </span>

              <h2>{insight.title}</h2>

              <p>{insight.text}</p>

              <div className="bisintel-insight-footer">
                <Link
                  to={insight.to}
                  className="bisintel-primary-link"
                >
                  {insight.action}
                  <span>→</span>
                </Link>

                <span className="bisintel-source-label">
                  {insight.source}
                </span>
              </div>
            </div>
          </article>

          {/* CONTINUE */}
          <article className="bisintel-continue-panel">
            <div className="bisintel-panel-heading">
              <div>
                <span className="bisintel-section-kicker">
                  CONTINUE WHERE YOU LEFT OFF
                </span>

                <h2>Your latest activity</h2>
              </div>

              <span className="bisintel-activity-type">
                {continueItem.type}
              </span>
            </div>

            <Link
              to={continueItem.to}
              className="bisintel-continue-card"
            >
              <div className="bisintel-continue-symbol">
                {continueItem.type === "AI"
                  ? "A"
                  : continueItem.type === "SEARCH"
                  ? "S"
                  : continueItem.type === "SAVED"
                  ? "B"
                  : "→"}
              </div>

              <div className="bisintel-continue-copy">
                <strong>
                  {continueItem.title}
                </strong>

                <span>
                  {continueItem.meta}
                </span>
              </div>

              <span className="bisintel-continue-arrow">
                →
              </span>
            </Link>

            <div className="bisintel-mini-stats">
              <div>
                <strong>
                  {savedStandards.length}
                </strong>
                <span>Saved standards</span>
              </div>

              <div>
                <strong>
                  {recentChats.length}
                </strong>
                <span>AI conversations</span>
              </div>

              <div>
                <strong>
                  {reports.length}
                </strong>
                <span>Compliance reports</span>
              </div>
            </div>
          </article>
        </section>

        {/* WORKSPACE */}
        <section className="bisintel-workspace-section">
          <div className="bisintel-section-heading">
            <div>
              <span className="bisintel-section-kicker">
                YOUR WORKSPACE
              </span>

              <h2>
                Everything you have been working on.
              </h2>
            </div>

            <span className="bisintel-workspace-total">
              {totalWorkspaceItems} activity item
              {totalWorkspaceItems === 1 ? "" : "s"}
            </span>
          </div>

          <div className="bisintel-workspace-grid">

            {/* SAVED */}
            <article className="bisintel-list-panel">
              <div className="bisintel-list-heading">
                <div>
                  <span className="bisintel-list-index">
                    01
                  </span>

                  <div>
                    <h3>Saved standards</h3>
                    <p>
                      Standards you chose to keep close.
                    </p>
                  </div>
                </div>

                <Link to="/standards">
                  View all
                </Link>
              </div>

              {savedStandards.length === 0 ? (
                <div className="bisintel-empty">
                  <strong>
                    Nothing saved yet.
                  </strong>

                  <p>
                    Save a standard from Standards Search
                    and it will appear here.
                  </p>

                  <Link to="/standards">
                    Browse standards →
                  </Link>
                </div>
              ) : (
                <div className="bisintel-list">
                  {savedStandards
                    .slice(0, 3)
                    .map((item, index) => {
                      const number =
                        getStandardNumber(item);

                      return (
                        <Link
                          key={`${number}-${index}`}
                          to={`/standard/${encodeURIComponent(
                            number
                          )}`}
                          className="bisintel-list-row"
                        >
                          <div>
                            <span className="bisintel-row-code">
                              {number}
                            </span>

                            <strong>
                              {getStandardTitle(item)}
                            </strong>
                          </div>

                          <span className="bisintel-row-arrow">
                            →
                          </span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </article>

            {/* AI */}
            <article className="bisintel-list-panel">
              <div className="bisintel-list-heading">
                <div>
                  <span className="bisintel-list-index">
                    02
                  </span>

                  <div>
                    <h3>Recent AI questions</h3>
                    <p>
                      Questions you asked BISense.
                    </p>
                  </div>
                </div>

                <Link to="/copilot">
                  Ask AI
                </Link>
              </div>

              {recentChats.length === 0 ? (
                <div className="bisintel-empty">
                  <strong>
                    No AI conversations yet.
                  </strong>

                  <p>
                    Your BISense Copilot conversations
                    will appear here.
                  </p>

                  <Link to="/copilot">
                    Ask BIS AI →
                  </Link>
                </div>
              ) : (
                <div className="bisintel-list">
                  {recentChats
                    .slice(0, 3)
                    .map((item, index) => (
                      <Link
                        key={`${getChatQuestion(
                          item
                        )}-${index}`}
                        to="/copilot"
                        className="bisintel-list-row"
                      >
                        <div>
                          <span className="bisintel-row-meta">
                            {formatTime(item?.timestamp)}
                          </span>

                          <strong>
                            {getChatQuestion(item)}
                          </strong>
                        </div>

                        <span className="bisintel-row-arrow">
                          →
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </article>

            {/* SEARCHES */}
            <article className="bisintel-list-panel">
              <div className="bisintel-list-heading">
                <div>
                  <span className="bisintel-list-index">
                    03
                  </span>

                  <div>
                    <h3>Recent searches</h3>
                    <p>
                      Your latest standards research.
                    </p>
                  </div>
                </div>

                <Link to="/standards">
                  Search
                </Link>
              </div>

              {recentSearches.length === 0 ? (
                <div className="bisintel-empty">
                  <strong>
                    No recent searches.
                  </strong>

                  <p>
                    Search activity will appear here
                    as you research standards.
                  </p>

                  <Link to="/standards">
                    Start searching →
                  </Link>
                </div>
              ) : (
                <div className="bisintel-list">
                  {recentSearches
                    .slice(0, 3)
                    .map((item, index) => {
                      const query =
                        getSearchQuery(item);

                      return (
                        <Link
                          key={`${query}-${index}`}
                          to={`/standards?q=${encodeURIComponent(
                            query
                          )}`}
                          className="bisintel-list-row"
                        >
                          <div>
                            <span className="bisintel-row-meta">
                              {formatTime(
                                item?.timestamp
                              )}
                            </span>

                            <strong>
                              {query}
                            </strong>
                          </div>

                          <span className="bisintel-row-arrow">
                            →
                          </span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </article>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="bisintel-compliance-panel">
          <div className="bisintel-compliance-copy">
            <span className="bisintel-section-kicker">
              COMPLIANCE WORKSPACE
            </span>

            <h2>
              Keep compliance work visible.
            </h2>

            <p>
              Review saved compliance work and continue
              from the same workspace instead of starting
              over.
            </p>
          </div>

          <div className="bisintel-report-area">
            {reports.length === 0 ? (
              <div className="bisintel-report-empty">
                <div>
                  <strong>
                    No compliance reports yet
                  </strong>

                  <span>
                    Start a compliance review to track
                    progress here.
                  </span>
                </div>

                <Link
                  to="/compliance"
                  className="bisintel-dark-button"
                >
                  Start Compliance
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="bisintel-report-list">
                {reports.slice(0, 3).map((report, index) => {
                  const progress = clampProgress(
                    report?.progress
                  );

                  return (
                    <div
                      className="bisintel-report-row"
                      key={`${getReportTitle(
                        report
                      )}-${index}`}
                    >
                      <div className="bisintel-report-copy">
                        <strong>
                          {getReportTitle(report)}
                        </strong>

                        <span>
                          {getReportStandard(report)}
                          {" · "}
                          {formatTime(
                            report?.timestamp
                          )}
                        </span>
                      </div>

                      <div className="bisintel-progress">
                        <div className="bisintel-progress-track">
                          <span
                            style={{
                              width: `${progress}%`,
                            }}
                          ></span>
                        </div>

                        <strong>
                          {progress}%
                        </strong>
                      </div>

                      <Link
                        to="/compliance"
                        className="bisintel-report-open"
                      >
                        Open
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* OFFICIAL SOURCES */}
        <section className="bisintel-source-section">
          <div>
            <span className="bisintel-section-kicker">
              SOURCE CENTRE
            </span>

            <h2>
              Verify important information at the source.
            </h2>

            <p>
              BISense is an AI-assisted information and
              workflow layer. Important requirements should
              be checked against official BIS or government
              sources.
            </p>
          </div>

          <div className="bisintel-source-links">
            <a
              href="https://www.bis.gov.in/"
              target="_blank"
              rel="noreferrer"
            >
              BIS Official
              <span>↗</span>
            </a>

            <a
              href="https://standards.bis.gov.in/"
              target="_blank"
              rel="noreferrer"
            >
              Standards Portal
              <span>↗</span>
            </a>

            <a
              href="https://lims.bis.gov.in/"
              target="_blank"
              rel="noreferrer"
            >
              BIS LIMS
              <span>↗</span>
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bisintel-footer">
          <span>
            BISense · Intelligence Hub
          </span>

          <div>
            <Link to="/">
              Home
            </Link>

            <Link to="/copilot">
              BIS AI
            </Link>

            <Link to="/profile">
              Profile
            </Link>

            <Link to="/awareness">
              Awareness
            </Link>
          </div>
        </footer>
      </main>

      <style>{`
        .bisintel-page {
          min-height: 100vh;
          overflow-x: hidden;
          background: #f6f7f4;
          color: #111827;
        }

        .bisintel-shell {
          width: min(1180px, 92%);
          margin: 0 auto;
          padding: 50px 0 70px;
        }

        .bisintel-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 35px;
          padding: 20px 0 42px;
        }

        .bisintel-header-copy {
          max-width: 720px;
        }

        .bisintel-eyebrow,
        .bisintel-section-kicker,
        .bisintel-account-label,
        .bisintel-control-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .bisintel-eyebrow {
          color: #17666d;
        }

        .bisintel-header h1 {
          margin: 12px 0 0;
          color: #111827;
          font-size: clamp(40px, 5.6vw, 70px);
          line-height: 0.96;
          letter-spacing: -3.5px;
          font-weight: 800;
        }

        .bisintel-header-copy > p {
          max-width: 680px;
          margin: 18px 0 0;
          color: #626d72;
          font-size: 15px;
          line-height: 1.7;
        }

        .bisintel-header-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 19px;
          color: #687379;
          font-size: 11px;
        }

        .bisintel-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2f7f69;
        }

        .bisintel-meta-divider {
          color: #a5abad;
        }

        .bisintel-account {
          min-width: 285px;
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #dde2de;
          border-radius: 16px;
        }

        .bisintel-avatar {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #15333a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .bisintel-account-label {
          display: block;
          margin-bottom: 4px;
          color: #90999c;
          font-size: 8px;
        }

        .bisintel-account strong {
          display: block;
          max-width: 165px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #162228;
          font-size: 11px;
          font-weight: 700;
        }

        .bisintel-account-link {
          color: #17666d;
          font-size: 10px;
          font-weight: 800;
        }

        .bisintel-control-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding: 16px 18px;
          border-top: 1px solid #dde2de;
          border-bottom: 1px solid #dde2de;
        }

        .bisintel-control-label {
          color: #687379;
        }

        .bisintel-control-strip p {
          margin-top: 5px;
          color: #91999d;
          font-size: 11px;
        }

        .bisintel-mode-switch {
          display: inline-flex;
          padding: 4px;
          background: #e9ece8;
          border: 1px solid #dde2de;
          border-radius: 11px;
        }

        .bisintel-mode-switch button {
          min-width: 104px;
          padding: 9px 13px;
          border-radius: 8px;
          background: transparent;
          color: #707a7e;
          font-size: 11px;
          font-weight: 700;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .bisintel-mode-switch button:hover:not(:disabled) {
          color: #162228;
        }

        .bisintel-mode-switch .bisintel-mode-active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 5px rgba(15, 23, 42, 0.06);
        }

        .bisintel-section {
          padding-top: 54px;
        }

        .bisintel-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .bisintel-section-kicker {
          color: #8a9498;
        }

        .bisintel-section-heading h2 {
          margin-top: 7px;
          color: #182127;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -1.4px;
        }

        .bisintel-section-note,
        .bisintel-workspace-total {
          color: #8a9498;
          font-size: 10px;
        }

        .bisintel-briefing-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 1px solid #dfe4e0;
          border-bottom: 1px solid #dfe4e0;
        }

        .bisintel-brief-card {
          min-height: 260px;
          padding: 22px 20px 20px;
          border-right: 1px solid #dfe4e0;
          background: #fbfcfa;
          transition:
            background 0.22s ease,
            transform 0.22s ease;
        }

        .bisintel-brief-card:last-child {
          border-right: none;
        }

        .bisintel-brief-card:hover {
          background: #ffffff;
          transform: translateY(-2px);
        }

        .bisintel-brief-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .bisintel-brief-top > span:first-child {
          color: #17666d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .bisintel-brief-number {
          color: #b4bcbe;
          font-size: 10px;
          font-weight: 800;
        }

        .bisintel-brief-card h3 {
          max-width: 210px;
          margin-top: 48px;
          color: #182127;
          font-size: 19px;
          line-height: 1.2;
          letter-spacing: -0.6px;
        }

        .bisintel-brief-card p {
          margin-top: 10px;
          color: #707b80;
          font-size: 11px;
          line-height: 1.6;
        }

        .bisintel-text-link,
        .bisintel-primary-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          font-weight: 800;
        }

        .bisintel-text-link {
          margin-top: 17px;
          color: #17666d;
        }

        .bisintel-text-link span,
        .bisintel-primary-link span {
          transition: transform 0.18s ease;
        }

        .bisintel-text-link:hover span,
        .bisintel-primary-link:hover span {
          transform: translateX(3px);
        }

        .bisintel-main-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
          padding-top: 18px;
        }

        .bisintel-insight-panel,
        .bisintel-continue-panel {
          min-height: 340px;
          border: 1px solid #dfe4e0;
          background: #ffffff;
          border-radius: 18px;
        }

        .bisintel-insight-panel {
          padding: 24px;
          background: #edf2ef;
        }

        .bisintel-insight-header,
        .bisintel-panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .bisintel-insight-header > div:first-child {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .bisintel-insight-index {
          color: #8d989b;
          font-size: 9px;
        }

        .bisintel-refresh-button {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid #d3dcda;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.72);
          color: #17666d;
          font-size: 17px;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .bisintel-refresh-button:hover {
          transform: rotate(30deg);
          background: #ffffff;
        }

        .bisintel-insight-rule {
          height: 1px;
          margin-top: 18px;
          background: #d6dfdc;
        }

        .bisintel-insight-content {
          max-width: 650px;
          padding-top: 40px;
        }

        .bisintel-insight-tag {
          display: inline-flex;
          padding: 6px 9px;
          border: 1px solid #cddbd7;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.5);
          color: #17666d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .bisintel-insight-content h2 {
          max-width: 640px;
          margin-top: 14px;
          color: #172428;
          font-size: clamp(27px, 3vw, 41px);
          line-height: 1.02;
          letter-spacing: -1.8px;
        }

        .bisintel-insight-content p {
          max-width: 600px;
          margin-top: 13px;
          color: #657278;
          font-size: 13px;
          line-height: 1.65;
        }

        .bisintel-insight-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 30px;
        }

        .bisintel-primary-link {
          color: #153e45;
        }

        .bisintel-source-label {
          color: #8a9498;
          font-size: 9px;
        }

        .bisintel-continue-panel {
          padding: 24px;
        }

        .bisintel-panel-heading h2 {
          margin-top: 6px;
          color: #182127;
          font-size: 24px;
          letter-spacing: -1px;
        }

        .bisintel-activity-type {
          padding-top: 2px;
          color: #17666d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .bisintel-continue-card {
          display: grid;
          grid-template-columns: 42px 1fr 20px;
          align-items: center;
          gap: 12px;
          margin-top: 34px;
          padding: 14px;
          border: 1px solid #e0e5e1;
          border-radius: 13px;
          background: #fbfcfa;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .bisintel-continue-card:hover {
          transform: translateY(-2px);
          background: #ffffff;
          border-color: #cfd8d4;
        }

        .bisintel-continue-symbol {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #172b31;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
        }

        .bisintel-continue-copy strong {
          display: block;
          overflow: hidden;
          color: #172228;
          font-size: 12px;
          line-height: 1.35;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .bisintel-continue-copy span {
          display: block;
          margin-top: 5px;
          color: #8a9498;
          font-size: 9px;
          line-height: 1.45;
        }

        .bisintel-continue-arrow {
          color: #17666d;
          font-size: 15px;
          font-weight: 800;
        }

        .bisintel-mini-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .bisintel-mini-stats > div {
          padding: 12px;
          border-top: 1px solid #e5e9e6;
        }

        .bisintel-mini-stats strong {
          display: block;
          color: #172228;
          font-size: 18px;
          letter-spacing: -0.5px;
        }

        .bisintel-mini-stats span {
          display: block;
          margin-top: 3px;
          color: #8a9498;
          font-size: 8px;
          line-height: 1.4;
        }

        .bisintel-workspace-section {
          padding-top: 56px;
        }

        .bisintel-workspace-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .bisintel-list-panel {
          min-height: 345px;
          border-top: 1px solid #dfe4e0;
          border-bottom: 1px solid #dfe4e0;
          background: #fbfcfa;
        }

        .bisintel-list-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 19px 0 16px;
          border-bottom: 1px solid #e2e7e4;
        }

        .bisintel-list-heading > div:first-child {
          display: flex;
          gap: 11px;
        }

        .bisintel-list-index {
          padding-top: 2px;
          color: #b3babc;
          font-size: 9px;
          font-weight: 800;
        }

        .bisintel-list-heading h3 {
          color: #182127;
          font-size: 16px;
          letter-spacing: -0.4px;
        }

        .bisintel-list-heading p {
          margin-top: 4px;
          color: #8b9599;
          font-size: 9px;
          line-height: 1.4;
        }

        .bisintel-list-heading > a {
          flex-shrink: 0;
          color: #17666d;
          font-size: 9px;
          font-weight: 800;
        }

        .bisintel-list {
          display: flex;
          flex-direction: column;
        }

        .bisintel-list-row {
          display: grid;
          grid-template-columns: 1fr 20px;
          gap: 10px;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #e7ebe8;
          transition:
            padding-left 0.18s ease,
            background 0.18s ease;
        }

        .bisintel-list-row:hover {
          padding-left: 5px;
        }

        .bisintel-row-code,
        .bisintel-row-meta {
          display: block;
          color: #17666d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .bisintel-row-meta {
          color: #98a1a4;
          letter-spacing: 0;
          font-weight: 600;
        }

        .bisintel-list-row strong {
          display: block;
          margin-top: 5px;
          color: #263237;
          font-size: 11px;
          line-height: 1.45;
        }

        .bisintel-row-arrow {
          color: #17666d;
          font-size: 13px;
          text-align: right;
        }

        .bisintel-empty {
          padding: 32px 0 20px;
        }

        .bisintel-empty strong {
          display: block;
          color: #253138;
          font-size: 12px;
        }

        .bisintel-empty p {
          max-width: 230px;
          margin-top: 7px;
          color: #8a9498;
          font-size: 9px;
          line-height: 1.6;
        }

        .bisintel-empty a {
          display: inline-flex;
          margin-top: 15px;
          color: #17666d;
          font-size: 9px;
          font-weight: 800;
        }

        .bisintel-compliance-panel {
          margin-top: 18px;
          padding: 25px;
          border: 1px solid #dfe4e0;
          border-radius: 18px;
          background: #152c31;
          color: #ffffff;
        }

        .bisintel-compliance-panel
          .bisintel-section-kicker {
          color: #9fb1b4;
        }

        .bisintel-compliance-panel h2 {
          max-width: 430px;
          margin-top: 8px;
          color: #ffffff;
          font-size: 29px;
          line-height: 1.05;
          letter-spacing: -1.2px;
        }

        .bisintel-compliance-copy p {
          max-width: 480px;
          margin-top: 9px;
          color: #adbbbe;
          font-size: 11px;
          line-height: 1.6;
        }

        .bisintel-report-area {
          margin-top: 25px;
        }

        .bisintel-report-empty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .bisintel-report-empty strong {
          display: block;
          color: #ffffff;
          font-size: 11px;
        }

        .bisintel-report-empty span {
          display: block;
          margin-top: 5px;
          color: #9eafb3;
          font-size: 9px;
        }

        .bisintel-dark-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 9px;
          background: #ffffff;
          color: #172428;
          font-size: 9px;
          font-weight: 800;
        }

        .bisintel-report-list {
          display: flex;
          flex-direction: column;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .bisintel-report-row {
          display: grid;
          grid-template-columns: minmax(200px, 1.2fr) minmax(160px, 0.8fr) auto;
          gap: 20px;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bisintel-report-copy strong {
          display: block;
          color: #ffffff;
          font-size: 11px;
        }

        .bisintel-report-copy span {
          display: block;
          margin-top: 4px;
          color: #94a6a9;
          font-size: 8px;
        }

        .bisintel-progress {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bisintel-progress-track {
          flex: 1;
          height: 5px;
          overflow: hidden;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.13);
        }

        .bisintel-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #c6ded5;
        }

        .bisintel-progress strong {
          min-width: 30px;
          color: #e2ecea;
          font-size: 9px;
          text-align: right;
        }

        .bisintel-report-open {
          padding: 8px 11px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          color: #ffffff;
          font-size: 8px;
          font-weight: 800;
        }

        .bisintel-source-section {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: center;
          gap: 35px;
          padding: 55px 0 30px;
        }

        .bisintel-source-section h2 {
          max-width: 620px;
          margin-top: 8px;
          color: #182127;
          font-size: 25px;
          line-height: 1.1;
          letter-spacing: -1.1px;
        }

        .bisintel-source-section p {
          max-width: 650px;
          margin-top: 10px;
          color: #7a858a;
          font-size: 10px;
          line-height: 1.65;
        }

        .bisintel-source-links {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .bisintel-source-links a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 13px;
          border: 1px solid #dde3df;
          border-radius: 10px;
          background: #ffffff;
          color: #334046;
          font-size: 10px;
          font-weight: 700;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        }

        .bisintel-source-links a:hover {
          transform: translateX(2px);
          border-color: #c3cfca;
        }

        .bisintel-source-links span {
          color: #17666d;
          font-size: 12px;
        }

        .bisintel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid #dde3df;
          color: #8c969a;
          font-size: 9px;
        }

        .bisintel-footer div {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
        }

        .bisintel-footer a:hover {
          color: #182127;
        }

        @media (max-width: 1050px) {
          .bisintel-briefing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bisintel-brief-card:nth-child(2) {
            border-right: none;
          }

          .bisintel-brief-card:nth-child(-n + 2) {
            border-bottom: 1px solid #dfe4e0;
          }

          .bisintel-main-grid,
          .bisintel-source-section {
            grid-template-columns: 1fr;
          }

          .bisintel-workspace-grid {
            grid-template-columns: 1fr 1fr;
          }

          .bisintel-list-panel:last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .bisintel-shell {
            width: 94%;
            padding-top: 35px;
          }

          .bisintel-header {
            align-items: flex-start;
            flex-direction: column;
            padding-bottom: 32px;
          }

          .bisintel-account {
            width: 100%;
          }

          .bisintel-control-strip {
            align-items: flex-start;
            flex-direction: column;
          }

          .bisintel-mode-switch {
            width: 100%;
          }

          .bisintel-mode-switch button {
            flex: 1;
          }

          .bisintel-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .bisintel-briefing-grid,
          .bisintel-workspace-grid {
            grid-template-columns: 1fr;
          }

          .bisintel-brief-card {
            min-height: auto;
            border-right: none;
            border-bottom: 1px solid #dfe4e0;
          }

          .bisintel-brief-card:last-child {
            border-bottom: none;
          }

          .bisintel-brief-card h3 {
            margin-top: 30px;
          }

          .bisintel-list-panel:last-child {
            grid-column: auto;
          }

          .bisintel-report-empty {
            align-items: flex-start;
            flex-direction: column;
          }

          .bisintel-report-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .bisintel-report-open {
            justify-self: flex-start;
          }

          .bisintel-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .bisintel-header h1 {
            font-size: 43px;
            letter-spacing: -2.3px;
          }

          .bisintel-header-copy > p {
            font-size: 13px;
          }

          .bisintel-account {
            grid-template-columns: 42px 1fr;
          }

          .bisintel-avatar {
            width: 42px;
            height: 42px;
          }

          .bisintel-account-link {
            grid-column: 2;
          }

          .bisintel-insight-panel,
          .bisintel-continue-panel,
          .bisintel-compliance-panel {
            padding: 20px;
          }

          .bisintel-insight-content {
            padding-top: 30px;
          }

          .bisintel-insight-content h2 {
            font-size: 29px;
          }

          .bisintel-mini-stats {
            grid-template-columns: 1fr;
          }

          .bisintel-mini-stats > div {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .bisintel-source-section {
            padding-top: 42px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bisintel-page *,
          .bisintel-page *::before,
          .bisintel-page *::after {
            scroll-behavior: auto !important;
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}