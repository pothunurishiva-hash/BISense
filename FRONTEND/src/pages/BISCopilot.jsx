import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CHAT_HISTORY_KEY = "bisense_recent_chats";
const FIRST_AI_REQUEST_KEY = "bisense_ai_request_started";

function getAiLoadingCopy(isFirstRequest) {
  return isFirstRequest
    ? {
        title: "Getting BISense AI ready",
        subtitle:
          "Preparing your intelligent assistant for this request",
      }
    : {
        title: "BISense is thinking",
        subtitle: "Analyzing your request",
      };
}

function formatAnswer(text) {
  if (!text) return [];

  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSourceLabel(source) {
  if (!source) return "BIS reference";

  return (
    source.source_name ||
    source.standard ||
    source.title ||
    "BIS reference"
  );
}

function saveChatToHistory(question, answer) {
  try {
    const existing = JSON.parse(
      localStorage.getItem(CHAT_HISTORY_KEY) || "[]"
    );

    const entry = {
      question,
      query: question,
      title: question,
      answer,
      timestamp: new Date().toISOString(),
    };

    const updated = [
      entry,
      ...existing.filter((item) => {
        const previousQuestion = String(
          item?.question ||
            item?.query ||
            item?.title ||
            ""
        ).trim();

        return previousQuestion !== question;
      }),
    ].slice(0, 8);

    localStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify(updated)
    );

    window.dispatchEvent(new Event("storage"));
  } catch {
    // Ignore localStorage errors.
  }
}

function CopilotIcon({ type, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (type) {
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "external":
      return (
        <svg {...props}>
          <path d="M14 5h5v5" />
          <path d="m19 5-8 8" />
          <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </svg>
      );

    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "workflow":
      return (
        <svg {...props}>
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
          <path d="M10 7h4v10" />
          <path d="M14 17h-4V7" />
        </svg>
      );

    case "book":
      return (
        <svg {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
          <path d="M4 5.5V21" />
          <path d="M8 7h8M8 11h7" />
        </svg>
      );

    case "copy":
      return (
        <svg {...props}>
          <rect
            x="8"
            y="8"
            width="11"
            height="11"
            rx="2"
          />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );

    default:
      return null;
  }
}

function AnswerContent({ content }) {
  const lines = formatAnswer(content);

  if (!lines.length) {
    return (
      <p className="bis-answer-empty">
        I could not generate an answer for that
        request.
      </p>
    );
  }

  return (
    <div className="bis-answer-content">
      {lines.map((line, index) => {
        const isBullet =
          line.startsWith("•") ||
          line.startsWith("-") ||
          line.startsWith("*");

        const cleanLine = isBullet
          ? line.replace(/^[•\-*]\s*/, "")
          : line;

        if (isBullet) {
          return (
            <div
              className="bis-answer-bullet"
              key={index}
              style={{
                animationDelay: `${Math.min(
                  index * 40,
                  300
                )}ms`,
              }}
            >
              <span />
              <p>{cleanLine}</p>
            </div>
          );
        }

        return (
          <p
            className={
              index === 0
                ? "bis-answer-paragraph first"
                : "bis-answer-paragraph"
            }
            key={index}
            style={{
              animationDelay: `${Math.min(
                index * 40,
                300
              )}ms`,
            }}
          >
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

export default function BISCopilot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFirstRequest, setIsFirstRequest] =
    useState(false);
  const [focused, setFocused] = useState(false);

  const suggestions = [
    "What is IS 456?",
    "Which BIS certification does my product need?",
    "Find a BIS testing laboratory",
    "How do I check compliance?",
  ];

  const workflows = [
    {
      icon: "search",
      title: "Find a Standard",
      description:
        "Search Indian Standards and understand their purpose, scope and status.",
      to: "/standards",
    },
    {
      icon: "workflow",
      title: "Analyze Product",
      description:
        "Identify relevant standards and certification considerations for a product.",
      to: "/product-analyzer",
    },
    {
      icon: "shield",
      title: "Check Compliance",
      description:
        "Turn a standard into a practical compliance checklist.",
      to: "/compliance",
    },
    {
      icon: "book",
      title: "Certification",
      description:
        "Explore applicable certification and conformity requirements.",
      to: "/certification",
    },
    {
      icon: "search",
      title: "Find Laboratory",
      description:
        "Search BIS-recognized laboratories by name and location.",
      to: "/laboratories",
    },
  ];

  useEffect(() => {
    try {
      const alreadyStarted =
        sessionStorage.getItem(
          FIRST_AI_REQUEST_KEY
        ) === "1";

      if (!alreadyStarted) {
        setIsFirstRequest(true);
      }
    } catch {
      setIsFirstRequest(true);
    }
  }, []);

  const sendMessage = async (text = message) => {
    const cleanMessage = String(
      text || ""
    ).trim();

    if (!cleanMessage || loading) {
      return;
    }

    let firstRequest = false;

    try {
      firstRequest =
        sessionStorage.getItem(
          FIRST_AI_REQUEST_KEY
        ) !== "1";

      if (firstRequest) {
        sessionStorage.setItem(
          FIRST_AI_REQUEST_KEY,
          "1"
        );
      }
    } catch {
      firstRequest = messages.length === 0;
    }

    setIsFirstRequest(firstRequest);
    setLoading(true);
    setError("");

    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    setMessages((prev) => [
      ...prev,
      {
        id: `${requestId}-user`,
        role: "user",
        content: cleanMessage,
      },
      {
        id: requestId,
        role: "assistant",
        pending: true,
        content: "",
      },
    ]);

    setMessage("");

    try {
      let response = null;

      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
          }),
        });
      } catch (proxyError) {
        console.warn(
          "Vercel API request failed:",
          proxyError
        );
      }

      /*
       * Fallback to Render directly.
       */
      if (!response || !response.ok) {
        try {
          response = await fetch(
            "https://bisense-5ozn.onrender.com/api/chat",
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
            }
          );
        } catch (directError) {
          console.error(
            "Direct Render request failed:",
            directError
          );

          throw new Error(
            "BIS AI could not be reached. Please try again in a few seconds."
          );
        }
      }

      const contentType =
        response.headers.get("content-type") || "";

      let data = null;
      let rawText = "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        try {
          rawText = await response.text();
        } catch {
          rawText = "";
        }
      }

      if (!response.ok) {
        let backendMessage =
          data?.detail ||
          data?.message ||
          data?.error ||
          rawText ||
          "Unknown backend error.";

        if (
          typeof backendMessage !==
          "string"
        ) {
          backendMessage = JSON.stringify(
            backendMessage
          );
        }

        throw new Error(
          `BIS AI returned HTTP ${response.status}: ${backendMessage}`
        );
      }

      if (!data) {
        throw new Error(
          "BIS AI returned an invalid response from the backend."
        );
      }

      const assistantMessage = {
        id: requestId,
        role: "assistant",
        pending: false,
        content:
          data.answer ||
          "I could not generate an answer for that request.",
        source: data.source || null,
        agent: data.agent || null,
      };

      setMessages((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? assistantMessage
            : item
        )
      );

      saveChatToHistory(
        cleanMessage,
        assistantMessage.content
      );
    } catch (err) {
      console.error(
        "BIS Copilot request failed:",
        err
      );

      const errorMessage =
        err?.message ||
        "Something went wrong while contacting BIS AI.";

      setError(errorMessage);

      setMessages((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                pending: false,
                error: true,
                content:
                  "I couldn't complete that request right now. Please try again.",
              }
            : item
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError("");
  };

  const copyAnswer = async (content) => {
    try {
      await navigator.clipboard.writeText(
        content
      );
    } catch {
      // Ignore clipboard errors.
    }
  };

  return (
    <div className="bis-copilot-page">
      <style>{copilotStyles}</style>

      <Navbar />

      <main className="bis-copilot-main">
        <section
          className={
            messages.length > 0
              ? "bis-copilot-hero compact"
              : "bis-copilot-hero"
          }
        >
          <span className="bis-copilot-kicker bis-enter-1">
            BIS INTELLIGENCE COPILOT
          </span>

          <h1 className="bis-enter-2">
            Understand Indian Standards.
            <br />
            Act with confidence.
          </h1>

          <p className="bis-copilot-subtitle bis-enter-3">
            Ask questions in natural language and
            move from standards information to
            certification, testing and compliance
            workflows.
          </p>

          <div
            className={
              focused
                ? "bis-copilot-composer focused bis-enter-4"
                : "bis-copilot-composer bis-enter-4"
            }
          >
            <div className="bis-composer-top">
              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                onFocus={() =>
                  setFocused(true)
                }
                onBlur={() =>
                  setFocused(false)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about a BIS standard, product, certification or compliance requirement..."
                rows={1}
                disabled={loading}
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={
                  loading ||
                  !message.trim()
                }
              >
                {loading ? (
                  <span className="bis-send-loading">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <>
                    Ask BIS AI
                    <CopilotIcon
                      type="arrow"
                      size={15}
                    />
                  </>
                )}
              </button>
            </div>

            <div className="bis-suggestion-row">
              {suggestions.map(
                (suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      sendMessage(suggestion)
                    }
                    disabled={loading}
                    style={{
                      animationDelay: `${
                        80 + index * 45
                      }ms`,
                    }}
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>

          {error && (
            <div
              className="bis-copilot-error"
              role="alert"
            >
              <strong>
                We couldn't complete that request.
              </strong>

              <span>{error}</span>
            </div>
          )}
        </section>

        {messages.length > 0 && (
          <section className="bis-response-section bis-response-enter">
            <div className="bis-response-header">
              <div>
                <span className="bis-copilot-kicker">
                  YOUR CONVERSATION
                </span>

                <h2>BISense response</h2>
              </div>

              <div className="bis-response-header-actions">
                <span
                  className={
                    loading
                      ? "bis-live-status thinking"
                      : "bis-live-status"
                  }
                >
                  <i />

                  {loading
                    ? "Processing"
                    : "Response ready"}
                </span>

                <button
                  type="button"
                  onClick={
                    clearConversation
                  }
                  disabled={loading}
                >
                  New conversation
                </button>
              </div>
            </div>

            <div className="bis-conversation">
              {messages.map(
                (item, index) => {
                  if (
                    item.role === "user"
                  ) {
                    return (
                      <div
                        key={`user-${index}`}
                        className="bis-user-message bis-message-enter"
                      >
                        <div className="bis-user-message-meta">
                          YOU
                        </div>

                        <div className="bis-user-bubble">
                          {item.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <article
                      className={`bis-ai-response bis-ai-reveal ${
                        item.pending
                          ? "bis-ai-response-pending"
                          : ""
                      } ${
                        item.error
                          ? "bis-ai-response-error"
                          : ""
                      }`}
                      key={
                        item.id ||
                        `assistant-${index}`
                      }
                    >
                      <div className="bis-ai-response-top">
                        <div className="bis-ai-identity">
                          <div
                            className={`bis-ai-mark ${
                              item.pending
                                ? "is-thinking"
                                : ""
                            }`}
                          >
                            <span>B</span>
                          </div>

                          <div>
                            <strong>
                              BISense
                            </strong>

                            <span>
                              {item.pending
                                ? "Preparing response"
                                : "Standards intelligence"}
                            </span>
                          </div>
                        </div>

                        <span className="bis-ai-badge">
                          {item.pending
                            ? "RESPONDING"
                            : "AI ASSISTED"}
                        </span>
                      </div>

                      {item.pending ? (
                        <div className="bis-ai-pending-content">
                          <div className="bis-pending-main">
                            <strong>
                              {
                                getAiLoadingCopy(
                                  isFirstRequest
                                ).title
                              }
                            </strong>

                            <span>
                              {
                                getAiLoadingCopy(
                                  isFirstRequest
                                ).subtitle
                              }
                            </span>

                            <small>
                              Please wait while BISense
                              prepares your answer.
                            </small>
                          </div>

                          <div
                            className="bis-thinking-dots"
                            aria-hidden="true"
                          >
                            <i />
                            <i />
                            <i />
                          </div>
                        </div>
                      ) : (
                        <div className="bis-ai-answer-layout">
                          <div className="bis-ai-answer">
                            <div className="bis-answer-title">
                              <span>
                                ANSWER
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  copyAnswer(
                                    item.content
                                  )
                                }
                              >
                                <CopilotIcon
                                  type="copy"
                                  size={14}
                                />

                                Copy
                              </button>
                            </div>

                            <AnswerContent
                              content={
                                item.content
                              }
                            />
                          </div>

                          {(item.source ||
                            item.agent) && (
                            <aside className="bis-evidence-column">
                            {item.source && (
                              <div className="bis-evidence-block bis-evidence-reveal">
                                <div className="bis-evidence-heading">
                                  <div className="bis-evidence-icon">
                                    <CopilotIcon
                                      type="book"
                                      size={15}
                                    />
                                  </div>

                                  <div>
                                    <span>
                                      EVIDENCE
                                    </span>

                                    <strong>
                                      Reference
                                    </strong>
                                  </div>
                                </div>

                                <div className="bis-source-details">
                                  <strong>
                                    {getSourceLabel(
                                      item.source
                                    )}
                                  </strong>

                                  {item
                                    .source
                                    .title &&
                                    item
                                      .source
                                      .title !==
                                      item
                                        .source
                                        .source_name && (
                                      <span>
                                        {
                                          item
                                            .source
                                            .title
                                        }
                                      </span>
                                    )}

                                  {item
                                    .source
                                    .standard && (
                                    <span className="bis-source-standard">
                                      {
                                        item
                                          .source
                                          .standard
                                      }
                                    </span>
                                  )}
                                </div>

                                {item
                                  .source
                                  .source_url && (
                                  <a
                                    href={
                                      item
                                        .source
                                        .source_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View official source

                                    <CopilotIcon
                                      type="external"
                                      size={13}
                                    />
                                  </a>
                                )}
                              </div>
                            )}

                            {item.agent && (
                              <div className="bis-evidence-block workflow bis-evidence-reveal-delay">
                                <div className="bis-evidence-heading">
                                  <div className="bis-evidence-icon">
                                    <CopilotIcon
                                      type="workflow"
                                      size={15}
                                    />
                                  </div>

                                  <div>
                                    <span>
                                      WORKFLOW
                                    </span>

                                    <strong>
                                      How BISense
                                      handled it
                                    </strong>
                                  </div>
                                </div>

                                {item.agent
                                  .name && (
                                  <div className="bis-agent-name">
                                    {
                                      item.agent
                                        .name
                                    }
                                  </div>
                                )}

                                <div className="bis-agent-steps">
                                  {item.agent.steps?.map(
                                    (
                                      step,
                                      stepIndex
                                    ) => (
                                      <div
                                        className="bis-agent-step"
                                        key={
                                          stepIndex
                                        }
                                      >
                                        <span>
                                          {String(
                                            stepIndex +
                                              1
                                          ).padStart(
                                            2,
                                            "0"
                                          )}
                                        </span>

                                        <p>
                                          {step}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </aside>
                        )}
                        </div>
                      )}

                      {!item.pending && (
                        <div className="bis-response-trust">
                        <CopilotIcon
                          type="shield"
                          size={13}
                        />

                        <span>
                          AI-assisted
                          information. Verify
                          important requirements
                          against the latest
                          official BIS source.
                          </span>
                        </div>
                      )}
                    </article>
                  );
                }
              )}

            </div>
          </section>
        )}

        <section className="bis-copilot-section bis-section-enter">
          <div className="bis-section-heading">
            <div>
              <span className="bis-copilot-kicker">
                BIS WORKFLOWS
              </span>

              <h2>
                Go beyond the answer.
              </h2>
            </div>

            <p>
              Continue from information into the
              workflow you actually need.
            </p>
          </div>

          <div className="bis-workflow-list">
            {workflows.map(
              (workflow, index) => (
                <Link
                  key={workflow.title}
                  to={workflow.to}
                  className="bis-workflow-row"
                >
                  <span className="bis-workflow-number">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </span>

                  <div className="bis-workflow-icon">
                    <CopilotIcon
                      type={workflow.icon}
                      size={17}
                    />
                  </div>

                  <div className="bis-workflow-copy">
                    <strong>
                      {workflow.title}
                    </strong>

                    <span>
                      {
                        workflow.description
                      }
                    </span>
                  </div>

                  <CopilotIcon
                    type="arrow"
                    size={15}
                  />
                </Link>
              )
            )}
          </div>
        </section>

        <section className="bis-copilot-info bis-info-enter">
          <div className="bis-info-icon">
            <CopilotIcon
              type="shield"
              size={18}
            />
          </div>

          <div>
            <span className="bis-copilot-kicker">
              SOURCE VISIBILITY
            </span>

            <h2>
              AI helps explain. Official BIS
              information remains the reference.
            </h2>

            <p>
              BISense is an AI-assisted
              information and workflow tool. It
              does not issue certification or make
              official BIS, legal or compliance
              decisions.
            </p>
          </div>

          <Link to="/awareness">
            Explore BIS information
            <CopilotIcon
              type="arrow"
              size={14}
            />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const copilotStyles = `
.bis-copilot-page {
  min-height: 100vh;
  width: 100%;
  background: #f6f8fb;
  color: #101828;
  overflow-x: hidden;
}

.bis-copilot-main {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 55px 0 70px;
}

/* =========================
   ENTRANCE MOTION
========================= */

.bis-enter-1,
.bis-enter-2,
.bis-enter-3,
.bis-enter-4 {
  opacity: 0;
  animation: bisPageEnter .65s cubic-bezier(.22,.75,.25,1) forwards;
}

.bis-enter-1 {
  animation-delay: .05s;
}

.bis-enter-2 {
  animation-delay: .12s;
}

.bis-enter-3 {
  animation-delay: .19s;
}

.bis-enter-4 {
  animation-delay: .26s;
}

.bis-response-enter {
  animation:
    bisResponseEnter
    .55s
    cubic-bezier(.22,.75,.25,1)
    both;
}

.bis-section-enter {
  animation:
    bisSectionEnter
    .55s
    ease both;
  animation-delay: .12s;
}

.bis-info-enter {
  animation:
    bisSectionEnter
    .55s
    ease both;
  animation-delay: .18s;
}

@keyframes bisPageEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bisResponseEnter {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bisSectionEnter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================
   HERO
========================= */

.bis-copilot-hero {
  text-align: center;
  padding: 30px 0 32px;
}

.bis-copilot-hero.compact {
  padding-bottom: 20px;
}

.bis-copilot-kicker {
  display: block;
  margin-bottom: 12px;
  color: #667085;
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: .14em;
  font-weight: 800;
}

.bis-copilot-hero h1 {
  margin: 0;
  color: #101828;
  font-size: clamp(38px, 5.4vw, 60px);
  line-height: 1.01;
  letter-spacing: -.05em;
  font-weight: 780;
}

.bis-copilot-subtitle {
  max-width: 690px;
  margin: 18px auto 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

/* =========================
   COMPOSER
========================= */

.bis-copilot-composer {
  width: min(800px, 100%);
  margin: 30px auto 0;
  padding: 8px;
  border: 1px solid #d9dee7;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 8px 24px rgba(16,24,40,.05);
  text-align: left;
  transition:
    border-color .2s ease,
    box-shadow .2s ease,
    transform .2s ease;
}

.bis-copilot-composer.focused {
  border-color: #a7bde2;
  box-shadow:
    0 0 0 3px rgba(11,61,145,.07),
    0 10px 26px rgba(16,24,40,.07);
  transform: translateY(-1px);
}

.bis-composer-top {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.bis-composer-top textarea {
  width: 100%;
  min-width: 0;
  min-height: 56px;
  max-height: 145px;
  resize: vertical;
  padding: 16px 14px 11px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #101828;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.bis-composer-top textarea::placeholder {
  color: #98a2b3;
}

.bis-composer-top textarea:disabled {
  opacity: .65;
}

.bis-composer-top button {
  min-width: 118px;
  min-height: 43px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  border: 1px solid #0b3d91;
  border-radius: 8px;
  background: #0b3d91;
  color: #ffffff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background-color .16s ease,
    transform .16s ease,
    box-shadow .16s ease;
}

.bis-composer-top button:hover:not(:disabled) {
  background: #082f73;
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px rgba(11,61,145,.18);
}

.bis-composer-top button:active:not(:disabled) {
  transform: translateY(0);
}

.bis-composer-top button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.bis-send-loading {
  display: inline-flex;
  gap: 3px;
}

.bis-send-loading i,
.bis-thinking-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation:
    bisCopilotDot
    1s
    ease-in-out
    infinite;
}

.bis-send-loading i:nth-child(2),
.bis-thinking-dots i:nth-child(2) {
  animation-delay: .14s;
}

.bis-send-loading i:nth-child(3),
.bis-thinking-dots i:nth-child(3) {
  animation-delay: .28s;
}

@keyframes bisCopilotDot {
  0%,100% {
    opacity: .25;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.bis-suggestion-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 7px 6px 3px;
  border-top: 1px solid #f0f2f5;
}

.bis-suggestion-row button {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #f9fafb;
  color: #475467;
  font-family: inherit;
  font-size: 9px;
  cursor: pointer;

  opacity: 0;
  animation:
    bisSuggestionIn
    .45s
    cubic-bezier(.22,.75,.25,1)
    forwards;

  transition:
    background-color .15s ease,
    border-color .15s ease,
    color .15s ease,
    transform .15s ease;
}

.bis-suggestion-row button:hover:not(:disabled) {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #344054;
  transform: translateY(-1px);
}

.bis-suggestion-row button:disabled {
  opacity: .5;
}

@keyframes bisSuggestionIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bis-copilot-error {
  width: min(800px, 100%);
  margin: 12px auto 0;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;
  border: 1px solid #fecdca;
  border-radius: 8px;
  background: #fff7f6;
  color: #b42318;
  font-size: 11px;
  animation: bisErrorIn .35s ease both;
}

@keyframes bisErrorIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================
   RESPONSE
========================= */

.bis-response-section {
  width: 100%;
  margin: 18px auto 48px;
  border: 1px solid #dfe4ec;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  box-shadow:
    0 10px 28px rgba(16,24,40,.045);
}

.bis-response-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 17px;
  border-bottom: 1px solid #eaecf0;
}

.bis-response-header h2 {
  margin: 0;
  color: #101828;
  font-size: 20px;
  letter-spacing: -.025em;
}

.bis-response-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bis-live-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #17834d;
  font-size: 10px;
  font-weight: 700;
}

.bis-live-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #17834d;
}

.bis-live-status.thinking {
  color: #b54708;
}

.bis-live-status.thinking i {
  background: #f79009;
  animation: bisStatusPulse 1s ease-in-out infinite;
}

@keyframes bisStatusPulse {
  0%,100% {
    opacity: .45;
  }

  50% {
    opacity: 1;
  }
}

.bis-response-header-actions > button {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #d0d5dd;
  border-radius: 7px;
  background: #ffffff;
  color: #344054;
  font-family: inherit;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color .15s ease,
    transform .15s ease;
}

.bis-response-header-actions > button:hover:not(:disabled) {
  background: #f9fafb;
  transform: translateY(-1px);
}

.bis-response-header-actions > button:disabled {
  opacity: .45;
}

/* =========================
   MESSAGES
========================= */

.bis-conversation {
  padding: 24px 22px 25px;
}

.bis-user-message {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  margin-bottom: 20px;
}

.bis-message-enter {
  animation:
    bisMessageEnter
    .45s
    cubic-bezier(.22,.75,.25,1)
    both;
}

@keyframes bisMessageEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bis-user-message-meta {
  color: #98a2b3;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .1em;
}

.bis-user-bubble {
  max-width: min(720px, 82%);
  padding: 11px 14px;
  border: 1px solid #d9e3f1;
  border-radius: 9px 9px 3px 9px;
  background: #f4f8fd;
  color: #344054;
  font-size: 12px;
  line-height: 1.55;
}

.bis-ai-response {
  border: 1px solid #dce4ee;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}

.bis-ai-response-pending {
  animation:
    bisAiReveal
    .35s
    cubic-bezier(.22,.75,.25,1)
    both;
}

.bis-ai-response-error {
  border-color: #efc7c3;
}

.bis-ai-response-pending .bis-ai-response-top {
  background: #fbfcfe;
}

.bis-ai-mark.is-thinking {
  position: relative;
}

.bis-ai-mark.is-thinking::after {
  content: "";
  position: absolute;
  inset: -4px;
  border: 1px solid rgba(11,61,145,.18);
  border-radius: 11px;
  animation:
    bisPendingRing
    1.5s
    ease-out
    infinite;
}

.bis-ai-pending-content {
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 25px 22px;
  background: #ffffff;
}

.bis-pending-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bis-pending-main strong {
  color: #182230;
  font-size: 13px;
  font-weight: 700;
}

.bis-pending-main span {
  color: #667085;
  font-size: 11px;
  line-height: 1.5;
}

.bis-pending-main small {
  margin-top: 3px;
  color: #98a2b3;
  font-size: 9px;
  line-height: 1.45;
}

.bis-ai-pending-content .bis-thinking-dots {
  flex-shrink: 0;
  margin-left: auto;
}

@keyframes bisPendingRing {
  0% {
    opacity: .75;
    transform: scale(.96);
  }

  100% {
    opacity: 0;
    transform: scale(1.15);
  }
}

.bis-ai-reveal {
  animation:
    bisAiReveal
    .6s
    cubic-bezier(.22,.75,.25,1)
    both;
}

@keyframes bisAiReveal {
  from {
    opacity: 0;
    transform: translateY(10px) scale(.995);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.bis-ai-response-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 15px 17px;
  border-bottom: 1px solid #eaecf0;
  background: #fbfcfe;
}

.bis-ai-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bis-ai-mark {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: #0b3d91;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.bis-ai-mark span {
  animation:
    bisMarkAppear
    .4s
    ease
    .25s
    both;
}

@keyframes bisMarkAppear {
  from {
    opacity: 0;
    transform: scale(.7);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.bis-ai-identity strong {
  display: block;
  color: #101828;
  font-size: 11px;
}

.bis-ai-identity span {
  display: block;
  margin-top: 2px;
  color: #98a2b3;
  font-size: 9px;
}

.bis-ai-badge {
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid #d9e3f1;
  border-radius: 5px;
  background: #f4f8fd;
  color: #0b3d91;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .08em;
  animation:
    bisBadgeIn
    .4s
    ease
    .2s
    both;
}

@keyframes bisBadgeIn {
  from {
    opacity: 0;
    transform: translateX(5px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bis-ai-answer-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 275px;
  min-width: 0;
}

.bis-ai-answer {
  min-width: 0;
  padding: 21px 22px 22px;
  border-right: 1px solid #eaecf0;
}

.bis-answer-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.bis-answer-title > span {
  color: #98a2b3;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .11em;
}

.bis-answer-title button {
  min-height: 27px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #ffffff;
  color: #667085;
  font-family: inherit;
  font-size: 9px;
  cursor: pointer;
  transition:
    background-color .15s ease,
    color .15s ease,
    transform .15s ease;
}

.bis-answer-title button:hover {
  background: #f9fafb;
  color: #344054;
  transform: translateY(-1px);
}

.bis-answer-content {
  max-width: 760px;
}

.bis-answer-paragraph,
.bis-answer-bullet {
  opacity: 0;
  animation:
    bisAnswerLineIn
    .38s
    ease
    forwards;
}

.bis-answer-paragraph {
  margin: 0 0 12px;
  color: #344054;
  font-size: 13px;
  line-height: 1.78;
}

.bis-answer-paragraph.first {
  color: #182230;
  font-weight: 520;
}

.bis-answer-bullet {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  margin: 0 0 9px;
}

.bis-answer-bullet > span {
  width: 5px;
  height: 5px;
  margin-top: 8px;
  border-radius: 50%;
  background: #0b3d91;
}

.bis-answer-bullet p {
  margin: 0;
  color: #475467;
  font-size: 12px;
  line-height: 1.65;
}

.bis-answer-empty {
  margin: 0;
  color: #667085;
  font-size: 12px;
}

@keyframes bisAnswerLineIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================
   EVIDENCE
========================= */

.bis-evidence-column {
  min-width: 0;
  padding: 17px;
  background: #fafbfd;
}

.bis-evidence-block {
  padding: 14px;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
}

.bis-evidence-block + .bis-evidence-block {
  margin-top: 10px;
}

.bis-evidence-reveal {
  animation:
    bisEvidenceReveal
    .45s
    ease
    .22s
    both;
}

.bis-evidence-reveal-delay {
  animation:
    bisEvidenceReveal
    .45s
    ease
    .34s
    both;
}

@keyframes bisEvidenceReveal {
  from {
    opacity: 0;
    transform: translateX(7px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bis-evidence-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bis-evidence-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 7px;
  background: #edf4ff;
  color: #0b3d91;
  transition:
    transform .2s ease,
    background-color .2s ease;
}

.bis-evidence-block:hover .bis-evidence-icon {
  transform: translateY(-1px);
  background: #e6effe;
}

.bis-evidence-heading span {
  display: block;
  margin-bottom: 2px;
  color: #98a2b3;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .1em;
}

.bis-evidence-heading strong {
  display: block;
  color: #344054;
  font-size: 10px;
  line-height: 1.35;
}

.bis-source-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid #eaecf0;
}

.bis-source-details strong {
  color: #101828;
  font-size: 10px;
  line-height: 1.45;
}

.bis-source-details span {
  color: #667085;
  font-size: 9px;
  line-height: 1.45;
}

.bis-source-standard {
  color: #0b3d91 !important;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-weight: 700;
}

.bis-evidence-block > a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  color: #0b3d91;
  font-size: 9px;
  font-weight: 750;
  text-decoration: none;
  transition:
    gap .15s ease,
    color .15s ease;
}

.bis-evidence-block > a:hover {
  gap: 7px;
  color: #082f73;
}

.bis-agent-name {
  margin-top: 12px;
  padding: 7px 8px;
  border-radius: 6px;
  background: #f4f6f9;
  color: #475467;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size: 8px;
}

.bis-agent-steps {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 12px;
}

.bis-agent-step {
  display: grid;
  grid-template-columns: 21px minmax(0, 1fr);
  gap: 7px;
  animation:
    bisStepIn
    .35s
    ease
    both;
}

.bis-agent-step:nth-child(1) {
  animation-delay: .36s;
}

.bis-agent-step:nth-child(2) {
  animation-delay: .42s;
}

.bis-agent-step:nth-child(3) {
  animation-delay: .48s;
}

.bis-agent-step:nth-child(4) {
  animation-delay: .54s;
}

@keyframes bisStepIn {
  from {
    opacity: 0;
    transform: translateX(4px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bis-agent-step > span {
  color: #98a2b3;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size: 8px;
  font-weight: 700;
}

.bis-agent-step p {
  margin: 0;
  color: #667085;
  font-size: 9px;
  line-height: 1.45;
}

/* =========================
   TRUST
========================= */

.bis-response-trust {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 17px;
  border-top: 1px solid #eaecf0;
  background: #fbfcfe;
  color: #98a2b3;
  font-size: 9px;
  line-height: 1.45;
}

.bis-response-trust svg {
  color: #17834d;
  flex-shrink: 0;
}

/* =========================
   THINKING
========================= */

.bis-thinking-card {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 13px;
  padding: 14px 16px;
  border: 1px solid #dce4ee;
  border-radius: 9px;
  background: #fbfcfe;
  position: relative;
  overflow: hidden;
}

.bis-thinking-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: -35%;
  width: 30%;
  height: 100%;
  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.7),
      transparent
    );
  animation:
    bisShimmer
    1.7s
    ease-in-out
    infinite;
}

@keyframes bisShimmer {
  from {
    left: -35%;
  }

  to {
    left: 110%;
  }
}

.bis-thinking-enter {
  animation:
    bisThinkingEnter
    .4s
    ease
    both;
}

@keyframes bisThinkingEnter {
  from {
    opacity: 0;
    transform: translateY(7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bis-thinking-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: #0b3d91;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.bis-thinking-card > div:nth-child(2) {
  min-width: 0;
  position: relative;
  z-index: 1;
}

.bis-thinking-card strong {
  display: block;
  color: #101828;
  font-size: 11px;
}

.bis-thinking-card span {
  display: block;
  margin-top: 2px;
  color: #667085;
  font-size: 9px;
}

.bis-thinking-dots {
  display: flex;
  gap: 4px;
  margin-left: auto;
  position: relative;
  z-index: 1;
}

.bis-thinking-dots i {
  background: #0b3d91;
}

/* =========================
   WORKFLOWS
========================= */

.bis-copilot-section {
  margin-top: 45px;
}

.bis-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 25px;
  margin-bottom: 15px;
}

.bis-section-heading h2 {
  margin: 0;
  color: #101828;
  font-size: 23px;
  letter-spacing: -.03em;
}

.bis-section-heading p {
  max-width: 360px;
  margin: 0;
  color: #667085;
  font-size: 11px;
  line-height: 1.55;
  text-align: right;
}

.bis-workflow-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #dfe4ec;
}

.bis-workflow-row {
  display: grid;
  grid-template-columns: 30px 36px minmax(0, 1fr) 15px;
  align-items: center;
  gap: 11px;
  padding: 14px 4px;
  border-bottom: 1px solid #e7ebf0;
  color: inherit;
  text-decoration: none;
  transition:
    background-color .18s ease,
    padding-left .18s ease,
    border-color .18s ease;
}

.bis-workflow-row:hover {
  background: #fbfcfe;
  padding-left: 9px;
}

.bis-workflow-row:hover > svg {
  transform: translateX(2px);
}

.bis-workflow-number {
  color: #98a2b3;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size: 9px;
}

.bis-workflow-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
  color: #475467;
  transition:
    transform .18s ease,
    border-color .18s ease;
}

.bis-workflow-row:hover .bis-workflow-icon {
  transform: translateY(-1px);
  border-color: #cbd5e1;
}

.bis-workflow-copy {
  min-width: 0;
}

.bis-workflow-copy strong {
  display: block;
  color: #101828;
  font-size: 11px;
}

.bis-workflow-copy span {
  display: block;
  margin-top: 2px;
  color: #667085;
  font-size: 10px;
  line-height: 1.45;
}

.bis-workflow-row > svg {
  color: #98a2b3;
  transition: transform .18s ease;
}

/* =========================
   INFO
========================= */

.bis-copilot-info {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  margin-top: 45px;
  padding: 19px 20px;
  border: 1px solid #dce6f5;
  border-radius: 10px;
  background: #f7faff;
}

.bis-info-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #edf4ff;
  color: #0b3d91;
}

.bis-copilot-info .bis-copilot-kicker {
  margin-bottom: 5px;
}

.bis-copilot-info h2 {
  margin: 0;
  color: #101828;
  font-size: 14px;
  letter-spacing: -.015em;
}

.bis-copilot-info p {
  max-width: 730px;
  margin: 5px 0 0;
  color: #667085;
  font-size: 10px;
  line-height: 1.55;
}

.bis-copilot-info > a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: #0b3d91;
  font-size: 10px;
  font-weight: 750;
  text-decoration: none;
  transition: gap .15s ease;
}

.bis-copilot-info > a:hover {
  gap: 7px;
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 850px) {
  .bis-copilot-main {
    width: min(100% - 28px, 720px);
    padding-top: 35px;
  }

  .bis-ai-answer-layout {
    grid-template-columns: 1fr;
  }

  .bis-ai-answer {
    border-right: 0;
    border-bottom: 1px solid #eaecf0;
  }

  .bis-section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .bis-section-heading p {
    text-align: left;
  }

  .bis-copilot-info {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .bis-copilot-info > a {
    grid-column: 2;
  }
}

@media (max-width: 620px) {
  .bis-copilot-main {
    width: calc(100% - 18px);
    padding-top: 25px;
  }

  .bis-copilot-hero h1 {
    font-size: 34px;
  }

  .bis-copilot-subtitle {
    font-size: 12px;
  }

  .bis-composer-top {
    flex-direction: column;
    align-items: stretch;
  }

  .bis-composer-top button {
    width: 100%;
  }

  .bis-suggestion-row {
    align-items: stretch;
    flex-direction: column;
  }

  .bis-suggestion-row button {
    width: 100%;
  }

  .bis-response-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .bis-response-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .bis-conversation {
    padding: 16px 12px 18px;
  }

  .bis-ai-answer {
    padding: 17px 15px;
  }

  .bis-ai-pending-content {
    min-height: 105px;
    padding: 20px 15px;
  }

  .bis-evidence-column {
    padding: 12px;
  }

  .bis-user-bubble {
    max-width: 92%;
  }

  .bis-ai-response-top {
    align-items: flex-start;
  }

  .bis-workflow-row {
    grid-template-columns: 25px 34px minmax(0, 1fr) 14px;
    gap: 8px;
  }

  .bis-copilot-info {
    grid-template-columns: 34px minmax(0, 1fr);
    padding: 15px;
  }

  .bis-info-icon {
    width: 34px;
    height: 34px;
  }
}

@media (max-width: 430px) {
  .bis-copilot-hero h1 {
    font-size: 30px;
  }

  .bis-ai-badge {
    display: none;
  }

  .bis-response-header-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .bis-response-header-actions > button {
    width: 100%;
  }

  .bis-copilot-info {
    grid-template-columns: 1fr;
  }

  .bis-copilot-info > a {
    grid-column: 1;
  }
}

/* =========================
   REDUCED MOTION
========================= */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
`;