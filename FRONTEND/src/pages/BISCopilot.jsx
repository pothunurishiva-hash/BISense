import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function BISCopilot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const conversationRef = useRef(null);

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

  const sendMessage = async (text = message) => {
    const cleanMessage = text.trim();

    if (!cleanMessage || loading) {
      return;
    }

    setLoading(true);
    setError("");

    const userMessage = {
      role: "user",
      content: cleanMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to get a response from BIS AI."
        );
      }

      const assistantMessage = {
        role: "assistant",
        content:
          data.answer ||
          "I could not generate an answer for that request.",
        source: data.source || null,
        agent: data.agent || null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const existing = JSON.parse(
          localStorage.getItem("bisense_recent_chats") || "[]"
        );

        const updated = [
          {
            question: cleanMessage,
            answer: assistantMessage.content,
            timestamp: new Date().toISOString(),
          },
          ...existing.filter(
            (item) => item.question !== cleanMessage
          ),
        ].slice(0, 8);

        localStorage.setItem(
          "bisense_recent_chats",
          JSON.stringify(updated)
        );
      } catch {
        // Ignore localStorage errors.
      }
    } catch (err) {
      console.error("BIS AI request failed:", err);

      setError(
        err.message ||
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
  };

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      conversationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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
            <span>Act with confidence.</span>
          </h1>

          <p className="copilot-subtitle">
            Search standards, understand certification requirements,
            analyze products, find recognized laboratories and build
            practical compliance workflows with BISense.
          </p>

          {/* =================================================
              AI INPUT
              ================================================= */}

          <div className="copilot-input-card">
            <div className="copilot-input-shell">
              <input
                className="copilot-input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
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
                onClick={() => sendMessage()}
                disabled={loading || !message.trim()}
              >
                {loading ? "Thinking..." : "Ask AI"}
              </button>
            </div>

            <div className="copilot-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="copilot-suggestion"
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="copilot-error" role="alert">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* =====================================================
            AI CONVERSATION
            IMPORTANT:
            This is intentionally BEFORE BIS WORKFLOWS.
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

                <h2>BIS AI Response</h2>
              </div>

              <div className="copilot-conversation-actions">
                <span className="copilot-status">
                  {loading ? "Thinking..." : "Ready"}
                </span>

                {!loading && (
                  <button
                    type="button"
                    className="copilot-clear-button"
                    onClick={clearConversation}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="copilot-message-list">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`copilot-message ${item.role}`}
                >
                  <div className="copilot-avatar">
                    {item.role === "user" ? "You" : "AI"}
                  </div>

                  <div className="copilot-bubble">
                    <p>{item.content}</p>

                    {item.source && (
                      <div className="copilot-source-panel">
                        <strong>Source</strong>

                        {item.source.source_name && (
                          <span>
                            {item.source.source_name}
                          </span>
                        )}

                        {item.source.title && (
                          <span>{item.source.title}</span>
                        )}

                        {item.source.standard && (
                          <span>{item.source.standard}</span>
                        )}

                        {item.source.source_url && (
                          <a
                            href={item.source.source_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Official Source →
                          </a>
                        )}
                      </div>
                    )}

                    {item.agent && (
                      <div className="copilot-agent-panel">
                        <h4>Workflow</h4>

                        {Array.isArray(item.agent.steps) &&
                          item.agent.steps.length > 0 && (
                            <div className="copilot-agent-plan">
                              {item.agent.steps.map(
                                (step, stepIndex) => (
                                  <div
                                    className="copilot-agent-step"
                                    key={`${step}-${stepIndex}`}
                                  >
                                    {step}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="copilot-message assistant">
                  <div className="copilot-avatar">AI</div>

                  <div className="copilot-bubble">
                    <p>Analyzing your BIS question...</p>
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

            <h2>Do more than ask questions.</h2>

            <p>
              Move from information to an actual BIS workflow.
            </p>
          </div>

          <div className="copilot-workflow-grid">
            {workflows.map((workflow) => (
              <Link
                key={workflow.title}
                to={workflow.to}
                className="copilot-workflow-card"
              >
                <div className="copilot-workflow-icon">
                  {workflow.icon}
                </div>

                <h3>{workflow.title}</h3>

                <p>{workflow.description}</p>

                <span className="text-link">
                  Open workflow →
                </span>
              </Link>
            ))}
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

            <h2>One place for the BIS journey.</h2>
          </div>

          <div className="copilot-capability-grid">
            <div className="copilot-capability">
              <strong>Standards</strong>

              <span>
                Discover and understand relevant Indian Standards.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>Certification</strong>

              <span>
                Understand certification and conformity pathways.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>Testing</strong>

              <span>
                Find recognized laboratories for testing needs.
              </span>
            </div>

            <div className="copilot-capability">
              <strong>Compliance</strong>

              <span>
                Convert requirements into actionable checklists.
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

          <h2>Build your BIS knowledge.</h2>

          <p>
            Explore official BIS information and learn how the
            standards ecosystem works.
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
    </div>
  );
}