import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ChatMessage from "../components/ChatMessage";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = "";
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

function saveRecentChat(query, resultCount = null) {
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
      timestamp: new Date().toISOString(),
      ...(resultCount !== null
        ? { resultCount }
        : {}),
    };

    const updated = [
      newEntry,
      ...existing.filter(
        (item) =>
          String(
            item?.query ||
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

function AIChat() {
  const messagesEndRef = useRef(null);

  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState(
    "English"
  );

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "ai",
      message:
        "Hello! I'm BISense. Ask me about Indian Standards, BIS certification, compliance, or other BIS-related topics.",
      source: {
        standard: "",
        title: "",
        source_name:
          "BIS Standards Portal",
        source_url:
          "https://standards.bis.gov.in/",
      },
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = [
    "What is BIS certification?",
    "Explain Indian Standards in simple language",
    "Which BIS standard applies to LED lamps?",
    "What should a manufacturer check before certification?",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async (
    text = message
  ) => {
    const cleanMessage = String(
      text || ""
    ).trim();

    if (!cleanMessage || loading) {
      return;
    }

    setError("");

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      message: cleanMessage,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
            language,
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
            data?.error ||
            `Backend request failed with status ${response.status}.`
        );
      }

      const answer = cleanAIResponse(
        data?.answer ||
          "BISense AI did not return an answer."
      );

      const aiMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        message: answer,
        source: data?.source || {
          standard: "",
          title: "",
          source_name: "",
          source_url: "",
        },
      };

      setMessages((current) => [
        ...current,
        aiMessage,
      ]);

      saveRecentChat(cleanMessage);
    } catch (err) {
      console.error(
        "BISense AI error:",
        err
      );

      setError(
        err?.message ||
          "Unable to connect to BISense AI. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (
    suggestion
  ) => {
    sendMessage(suggestion);
  };

  const handleUploadClick = () => {
    setError(
      "Document upload is not connected to this chat yet."
    );
  };

  return (
    <div className="app-page ai-chat-page">
      <Navbar />

      <main className="chat-page">
        <div className="page-intro ai-chat-intro">
          <p className="eyebrow">
            BIS AI ASSISTANT
          </p>

          <h1>
            Ask anything about Indian Standards.
          </h1>

          <p>
            Understand BIS information through
            AI-assisted answers and supporting
            source information.
          </p>
        </div>

        <div className="chat-layout">
          {/* =================================================
              SIDEBAR
          ================================================== */}

          <aside className="chat-sidebar">
            <h3>Quick tools</h3>

            <Link to="/standards">
              Search Standards
            </Link>

            <Link to="/compare">
              Compare Standards
            </Link>

            <Link to="/certification">
              Certification Advisor
            </Link>

            <Link to="/product-analyzer">
              Product Analysis
            </Link>

            <Link to="/compliance">
              Compliance
            </Link>

            <div className="chat-note">
              BISense provides AI-assisted
              information. Important requirements
              should be verified against current
              official BIS sources.
            </div>
          </aside>

          {/* =================================================
              CHAT BOX
          ================================================== */}

          <section className="chat-box">
            <div className="chat-header">
              <div className="chat-header-info">
                <strong>
                  BISense AI
                </strong>

                <span>
                  AI assistant for Indian Standards
                </span>
              </div>

              <label className="chat-language">
                <span>Language</span>

                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  aria-label="Response language"
                >
                  <option value="English">
                    English
                  </option>

                  <option value="Hindi">
                    Hindi
                  </option>

                  <option value="Telugu">
                    Telugu
                  </option>
                </select>
              </label>
            </div>

            <div className="messages">
              {messages.map((item) => (
                <ChatMessage
                  key={item.id}
                  role={item.role}
                  message={item.message}
                  source={item.source}
                />
              ))}

              {loading && (
                <div className="ai-loading-message">
                  <LoadingSpinner text="BISense is thinking..." />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div
                className="chat-error"
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

            {/* =================================================
                SUGGESTIONS
            ================================================== */}

            <div className="suggestions">
              {suggestions.map(
                (suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() =>
                      handleSuggestion(
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

            {/* =================================================
                INPUT
            ================================================== */}

            <div className="chat-input">
              <button
                type="button"
                className="upload-button"
                onClick={
                  handleUploadClick
                }
                title="Document upload"
                aria-label="Document upload"
                disabled={loading}
              >
                📎
              </button>

              <input
                type="text"
                placeholder="Ask about a BIS Standard..."
                value={message}
                disabled={loading}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                aria-label="Ask BISense AI"
              />

              <button
                type="button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  loading ||
                  !message.trim()
                }
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            <div className="chat-footer">
              <span>
                AI-generated responses should
                be verified against official BIS
                information.
              </span>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
              >
                Print
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      <style>{`
        .ai-chat-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          color: #111827;
        }

        .ai-chat-intro h1,
        .ai-chat-intro p {
          color: #111827 !important;
        }

        .chat-layout {
          min-width: 0;
        }

        .chat-sidebar,
        .chat-box {
          min-width: 0;
          box-sizing: border-box;
        }

        .chat-sidebar h3 {
          color: #111827 !important;
        }

        .chat-sidebar a {
          color: #374151 !important;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .chat-sidebar a:hover {
          color: #4f5fda !important;
        }

        .chat-note {
          color: #6b7280 !important;
          overflow-wrap: anywhere;
          line-height: 1.55;
        }

        .chat-header {
          min-width: 0;
        }

        .chat-header-info {
          min-width: 0;
        }

        .chat-header-info strong {
          color: #111827 !important;
        }

        .chat-header-info span {
          color: #6b7280 !important;
          overflow-wrap: anywhere;
        }

        .chat-language {
          flex-shrink: 0;
        }

        .chat-language > span {
          color: #6b7280 !important;
        }

        .chat-language select {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .chat-language select option {
          color: #111827 !important;
          background: #fff !important;
        }

        .messages {
          min-width: 0;
          overflow-x: hidden;
          overflow-y: auto;
        }

        .messages * {
          max-width: 100%;
        }

        .suggestions {
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .suggestions button {
          flex-shrink: 0;
          color: #374151 !important;
        }

        .chat-input {
          min-width: 0;
        }

        .chat-input input {
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .chat-input input::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1;
        }

        .chat-input input:focus {
          color: #111827 !important;
          background: #fff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .chat-input .upload-button {
          flex-shrink: 0;
          cursor: pointer;
        }

        .chat-input > button:last-child {
          flex-shrink: 0;
        }

        .chat-error {
          min-width: 0;
        }

        .chat-error span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .chat-footer {
          min-width: 0;
        }

        .chat-footer span {
          min-width: 0;
          color: #6b7280 !important;
          overflow-wrap: anywhere;
        }

        .chat-footer button {
          flex-shrink: 0;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .chat-layout {
            grid-template-columns: 1fr !important;
          }

          .chat-sidebar {
            display: none !important;
          }
        }

        @media (max-width: 650px) {
          .chat-page {
            width: 100%;
            box-sizing: border-box;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .ai-chat-intro h1 {
            font-size: clamp(
              29px,
              8vw,
              42px
            ) !important;
            line-height: 1.1 !important;
          }

          .ai-chat-intro > p:last-child {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .chat-box {
            width: 100% !important;
            border-radius: 18px !important;
          }

          .chat-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 13px !important;
          }

          .chat-language {
            width: 100%;
          }

          .chat-language select {
            width: 100%;
          }

          .messages {
            min-height: 350px;
            max-height: 60vh;
          }

          .suggestions {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px;
            padding-bottom: 5px;
          }

          .suggestions button {
            max-width: 280px;
            white-space: normal;
            text-align: left;
          }

          .chat-input {
            display: flex !important;
            align-items: center;
            gap: 7px !important;
          }

          .chat-input input {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .chat-input .upload-button,
          .chat-input > button:last-child {
            width: 42px;
            height: 42px;
            min-width: 42px;
            padding: 0;
          }

          .chat-footer {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px;
          }

          .chat-footer button {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .chat-page {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .chat-box {
            border-radius: 15px !important;
          }

          .messages {
            min-height: 320px;
          }

          .chat-input {
            gap: 5px !important;
          }

          .chat-input .upload-button,
          .chat-input > button:last-child {
            width: 39px;
            height: 39px;
            min-width: 39px;
          }
        }

        @media print {
          .ai-chat-page nav,
          .ai-chat-page footer,
          .chat-sidebar,
          .suggestions,
          .chat-input,
          .chat-footer,
          .chat-error {
            display: none !important;
          }

          .ai-chat-page {
            background: #fff !important;
          }

          .chat-page {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .chat-box {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }

          .messages {
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AIChat;