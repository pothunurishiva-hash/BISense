import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CHAT_HISTORY_KEY = "bisense_recent_chats";

function cleanAIResponse(text = "") {
  return String(text)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function saveRecentChat(query, answer = "") {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) return;

  try {
    const raw = localStorage.getItem(
      CHAT_HISTORY_KEY
    );

    const parsed = raw ? JSON.parse(raw) : [];

    const existing = Array.isArray(parsed)
      ? parsed
      : [];

    const newEntry = {
      query: cleanQuery,
      title: cleanQuery,
      question: cleanQuery,
      answer: String(answer || "").trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = [
      newEntry,
      ...existing.filter(
        (item) =>
          String(
            item?.query ||
              item?.question ||
              item?.title ||
              ""
          )
            .trim()
            .toLowerCase() !==
          cleanQuery.toLowerCase()
      ),
    ].slice(0, 10);

    localStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify(updated)
    );

    window.dispatchEvent(
      new Event("storage")
    );
  } catch (error) {
    console.error(
      "Unable to save AI conversation:",
      error
    );
  }
}

function getAgentActions(agent) {
  if (!agent) return [];

  if (
    Array.isArray(agent.actions)
  ) {
    return agent.actions;
  }

  if (
    Array.isArray(agent.steps)
  ) {
    return agent.steps;
  }

  if (
    Array.isArray(agent.plan)
  ) {
    return agent.plan;
  }

  return [];
}

export default function BISCopilot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const conversationRef =
    useRef(null);

  const inputRef = useRef(null);

  const suggestions = [
    "What is IS 456?",
    "Which BIS certification does my product need?",
    "Find a BIS testing laboratory",
    "How do I check compliance?",
  ];

  const workflows = [
    {
      icon: "⌕",
      title: "Find a Standard",
      description:
        "Search Indian Standards and understand their purpose, scope and status.",
      to: "/standards",
    },
    {
      icon: "◈",
      title: "Analyze Product",
      description:
        "Identify relevant standards and certification considerations for a product.",
      to: "/product-analyzer",
    },
    {
      icon: "✓",
      title: "Check Compliance",
      description:
        "Turn a standard into a practical compliance checklist.",
      to: "/compliance",
    },
    {
      icon: "▣",
      title: "Certification",
      description:
        "Explore applicable certification and conformity requirements.",
      to: "/certification",
    },
    {
      icon: "⌁",
      title: "Find Laboratory",
      description:
        "Search BIS-recognized laboratories by name and location.",
      to: "/laboratories",
    },
    {
      icon: "↗",
      title: "Launch Advisor",
      description:
        "Explore standards, testing and certification considerations before launch.",
      to: "/certification",
    },
  ];

  const sendMessage = async (
    text = message
  ) => {
    const cleanMessage = String(
      text || ""
    ).trim();

    if (!cleanMessage || loading) {
      return;
    }

    setLoading(true);
    setError("");

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setMessage("");

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
          }),
          cache: "no-store",
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `BISense AI returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            "Unable to get a response from BIS AI."
        );
      }

      const answer = cleanAIResponse(
        data?.answer ||
          "I could not generate an answer for that request."
      );

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: answer,
        source:
          data?.source || null,
        agent:
          data?.agent || null,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      saveRecentChat(
        cleanMessage,
        answer
      );
    } catch (err) {
      console.error(
        "BIS AI request failed:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while contacting BIS AI."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    if (loading) {
      return;
    }

    setMessages([]);
    setError("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      conversationRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "start",
        }
      );
    });
  }, [messages]);

  return (
    <div className="copilot-page">
      <Navbar />

      <main className="copilot-main">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="copilot-hero">
          <span className="copilot-kicker">
            BIS INTELLIGENCE COPILOT
          </span>

          <h1 className="copilot-title">
            Understand Indian Standards.
            <br />
            <span>
              Act with confidence.
            </span>
          </h1>

          <p className="copilot-subtitle">
            Search standards, understand
            certification requirements, analyze
            products, find recognized laboratories
            and build practical compliance workflows
            with BISense.
          </p>

          {/* =================================================
              AI INPUT
          ================================================= */}

          <div className="copilot-input-card">
            <div className="copilot-input-shell">
              <input
                ref={inputRef}
                className="copilot-input"
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask anything about BIS or Indian Standards..."
                aria-label="Ask BIS AI"
                disabled={loading}
              />

              <button
                className="copilot-send"
                type="button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  loading ||
                  !message.trim()
                }
              >
                {loading
                  ? "Thinking..."
                  : "Ask AI"}
              </button>
            </div>

            <div className="copilot-suggestions">
              {suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="copilot-suggestion"
                    onClick={() =>
                      sendMessage(
                        suggestion
                      )
                    }
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>

          {error && (
            <div
              className="copilot-error"
              role="alert"
            >
              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* =====================================================
            AI CONVERSATION
        ===================================================== */}

        {messages.length > 0 && (
          <section
            className="copilot-conversation"
            ref={conversationRef}
          >
            <div className="copilot-conversation-header">
              <div>
                <span className="copilot-kicker">
                  CONVERSATION
                </span>

                <h2>
                  BIS AI Response
                </h2>
              </div>

              <div className="copilot-conversation-actions">
                <span className="copilot-status">
                  {loading
                    ? "Thinking..."
                    : "Ready"}
                </span>

                {!loading && (
                  <button
                    type="button"
                    className="copilot-clear-button"
                    onClick={
                      clearConversation
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="copilot-message-list">
              {messages.map(
                (item) => (
                  <div
                    key={item.id}
                    className={`copilot-message ${item.role}`}
                  >
                    <div className="copilot-avatar">
                      {item.role ===
                      "user"
                        ? "You"
                        : "AI"}
                    </div>

                    <div className="copilot-bubble">
                      <p>
                        {item.content}
                      </p>

                      {/* SOURCE */}

                      {item.source && (
                        <div className="copilot-source-panel">
                          <strong>
                            Source
                          </strong>

                          {item.source
                            .source_name && (
                            <span>
                              {
                                item
                                  .source
                                  .source_name
                              }
                            </span>
                          )}

                          {item.source
                            .title && (
                            <span>
                              {
                                item
                                  .source
                                  .title
                              }
                            </span>
                          )}

                          {item.source
                            .standard && (
                            <span>
                              {
                                item
                                  .source
                                  .standard
                              }
                            </span>
                          )}

                          {item.source
                            .source_url && (
                            <a
                              href={
                                item
                                  .source
                                  .source_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Official Source →
                            </a>
                          )}
                        </div>
                      )}

                      {/* AGENT WORKFLOW */}

                      {item.agent && (
                        <div className="copilot-agent-panel">
                          <h4>
                            Workflow
                          </h4>

                          {(() => {
                            const actions =
                              getAgentActions(
                                item.agent
                              );

                            return actions.length >
                              0 ? (
                              <div className="copilot-agent-plan">
                                {actions.map(
                                  (
                                    action,
                                    actionIndex
                                  ) => (
                                    <div
                                      className="copilot-agent-step"
                                      key={`${action}-${actionIndex}`}
                                    >
                                      <span>
                                        {String(
                                          actionIndex +
                                            1
                                        ).padStart(
                                          2,
                                          "0"
                                        )}
                                      </span>

                                      <div>
                                        {typeof action ===
                                        "string"
                                          ? action
                                          : action?.name ||
                                            action?.action ||
                                            action?.description ||
                                            JSON.stringify(
                                              action
                                            )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="copilot-agent-empty">
                                BIS AI used its
                                available knowledge
                                and tools to prepare
                                this answer.
                              </p>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="copilot-message assistant">
                  <div className="copilot-avatar">
                    AI
                  </div>

                  <div className="copilot-bubble">
                    <p>
                      Analyzing your BIS
                      question...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BIS WORKFLOWS
        ===================================================== */}

        <section className="copilot-section">
          <div className="copilot-section-heading">
            <span className="copilot-kicker">
              BIS WORKFLOWS
            </span>

            <h2>
              Do more than ask questions.
            </h2>

            <p>
              Move from information to an actual BIS
              workflow.
            </p>
          </div>

          <div className="copilot-workflow-grid">
            {workflows.map(
              (workflow) => (
                <Link
                  key={workflow.title}
                  to={workflow.to}
                  className="copilot-workflow-card"
                >
                  <div className="copilot-workflow-icon">
                    {workflow.icon}
                  </div>

                  <h3>
                    {workflow.title}
                  </h3>

                  <p>
                    {workflow.description}
                  </p>

                  <span className="text-link">
                    Open workflow →
                  </span>
                </Link>
              )
            )}
          </div>
        </section>

        {/* =====================================================
            CAPABILITIES
        ===================================================== */}

        <section className="copilot-section">
          <div className="copilot-section-heading">
            <span className="copilot-kicker">
              WHAT BISENSE CONNECTS
            </span>

            <h2>
              One place for the BIS journey.
            </h2>
          </div>

          <div className="copilot-capability-grid">
            <div className="copilot-capability">
              <strong>
                Standards
              </strong>

              <span>
                Discover and understand relevant
                Indian Standards.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>
                Certification
              </strong>

              <span>
                Understand certification and
                conformity pathways.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>
                Testing
              </strong>

              <span>
                Find recognized laboratories for
                testing needs.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>
                Compliance
              </strong>

              <span>
                Convert requirements into
                actionable checklists.
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            BOTTOM CTA
        ===================================================== */}

        <section className="copilot-bottom-cta">
          <span className="copilot-kicker">
            KEEP EXPLORING
          </span>

          <h2>
            Build your BIS knowledge.
          </h2>

          <p>
            Explore official BIS information and
            learn how the standards ecosystem works.
          </p>

          <div className="copilot-footer-links">
            <Link
              to="/awareness"
              className="primary-btn"
            >
              BIS Knowledge Hub
            </Link>

            <Link
              to="/standards"
              className="secondary-btn"
            >
              Explore Standards
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .copilot-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          color: #111827;
        }

        .copilot-main {
          width: 100%;
          box-sizing: border-box;
        }

        .copilot-page h1,
        .copilot-page h2,
        .copilot-page h3,
        .copilot-page h4,
        .copilot-page p,
        .copilot-page span,
        .copilot-page strong {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-title {
          color: #111827 !important;
        }

        .copilot-title span {
          color: inherit;
        }

        .copilot-subtitle,
        .copilot-section-heading p,
        .copilot-bottom-cta p {
          color: #5f6b7c !important;
        }

        .copilot-input-card,
        .copilot-input-shell,
        .copilot-input,
        .copilot-conversation,
        .copilot-message,
        .copilot-bubble,
        .copilot-workflow-card,
        .copilot-capability {
          min-width: 0;
          box-sizing: border-box;
        }

        .copilot-input {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .copilot-input::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .copilot-input:focus {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .copilot-send {
          flex-shrink: 0;
          color: #fff !important;
        }

        .copilot-suggestions {
          max-width: 100%;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .copilot-suggestion {
          flex-shrink: 0;
          color: #374151 !important;
          overflow-wrap: anywhere;
        }

        .copilot-error {
          min-width: 0;
        }

        .copilot-error span {
          min-width: 0;
          color: inherit;
          overflow-wrap: anywhere;
        }

        .copilot-conversation-header {
          min-width: 0;
        }

        .copilot-conversation-header h2 {
          color: #111827 !important;
        }

        .copilot-conversation-actions {
          flex-shrink: 0;
        }

        .copilot-status {
          color: #667085 !important;
        }

        .copilot-clear-button {
          flex-shrink: 0;
          cursor: pointer;
        }

        .copilot-message-list {
          min-width: 0;
          overflow-x: hidden;
        }

        .copilot-message {
          max-width: 100%;
        }

        .copilot-message.user {
          justify-content: flex-end;
        }

        .copilot-avatar {
          flex-shrink: 0;
        }

        .copilot-bubble {
          max-width: min(
            800px,
            calc(100% - 55px)
          );
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-bubble > p {
          color: #111827 !important;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-source-panel,
        .copilot-agent-panel {
          min-width: 0;
          overflow: hidden;
        }

        .copilot-source-panel span,
        .copilot-source-panel strong {
          color: #374151 !important;
        }

        .copilot-source-panel a {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-agent-panel h4 {
          color: #111827 !important;
        }

        .copilot-agent-plan {
          min-width: 0;
        }

        .copilot-agent-step {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-agent-step > span {
          flex-shrink: 0;
        }

        .copilot-agent-empty {
          color: #6b7280 !important;
        }

        .copilot-workflow-card {
          text-decoration: none;
        }

        .copilot-workflow-card h3,
        .copilot-workflow-card p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .copilot-workflow-card h3 {
          color: #111827 !important;
        }

        .copilot-workflow-card p {
          color: #5f6b7c !important;
        }

        .copilot-workflow-card .text-link {
          color: #4f5fda !important;
        }

        .copilot-capability {
          color: #111827 !important;
        }

        .copilot-capability strong {
          color: #111827 !important;
        }

        .copilot-capability span {
          color: #5f6b7c !important;
        }

        .copilot-footer-links a {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 900px) {
          .copilot-workflow-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .copilot-capability-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 650px) {
          .copilot-main {
            width: 100%;
          }

          .copilot-hero,
          .copilot-conversation,
          .copilot-section,
          .copilot-bottom-cta {
            width: 100%;
            box-sizing: border-box;
          }

          .copilot-title {
            font-size: clamp(
              32px,
              9vw,
              48px
            ) !important;
            line-height: 1.08 !important;
          }

          .copilot-subtitle {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .copilot-input-shell {
            display: flex !important;
            align-items: stretch;
            gap: 8px;
          }

          .copilot-input {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .copilot-send {
            flex-shrink: 0;
            min-width: 90px;
          }

          .copilot-suggestions {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px;
            padding-bottom: 5px;
          }

          .copilot-suggestion {
            max-width: 270px;
            white-space: normal;
            text-align: left;
          }

          .copilot-conversation-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px;
          }

          .copilot-conversation-actions {
            width: 100%;
            justify-content: space-between;
          }

          .copilot-bubble {
            max-width: calc(
              100% - 48px
            );
          }

          .copilot-workflow-grid,
          .copilot-capability-grid {
            grid-template-columns: 1fr !important;
          }

          .copilot-footer-links {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .copilot-footer-links a {
            width: 100%;
          }
        }

        @media (max-width: 460px) {
          .copilot-title {
            font-size: 31px !important;
          }

          .copilot-input-shell {
            gap: 6px;
          }

          .copilot-send {
            min-width: 78px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .copilot-bubble {
            max-width: calc(
              100% - 42px
            );
          }

          .copilot-avatar {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            font-size: 10px !important;
          }
        }

        @media print {
          .copilot-page nav,
          .copilot-page footer,
          .copilot-input-card,
          .copilot-suggestions,
          .copilot-error,
          .copilot-conversation-actions,
          .copilot-section,
          .copilot-bottom-cta {
            display: none !important;
          }

          .copilot-page {
            background: #fff !important;
          }

          .copilot-main {
            max-width: 100% !important;
          }

          .copilot-conversation {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}