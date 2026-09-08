import { useState } from "react";

import "../App.css";

import Navbar from "../components/Navbar";

import Footer from "../components/Footer";

import ChatMessage from "../components/ChatMessage";

import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = "";

const CHAT_HISTORY_KEY = "bisense_recent_chats";

function cleanAIResponse(text = "") {
  return text
    .replace(/^#{1,6}\s\*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function saveRecentChat(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) return;

  try {
    const existing = JSON.parse(
      localStorage.getItem(CHAT_HISTORY_KEY) || "[]"
    );

    const newEntry = {
      query: cleanQuery,
      title: cleanQuery,
      timestamp: new Date().toISOString(),
    };

    const updated = [
      newEntry,
      ...existing.filter(
        (item) =>
          String(item.query || item.title || "").toLowerCase() !==
          cleanQuery.toLowerCase()
      ),
    ].slice(0, 10);

    localStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error("Unable to save AI conversation:", error);
  }
}

function AIChat() {
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("English");

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      message:
        "Hello! I'm BISense. Ask me about Indian Standards, BIS certification, compliance, or other BIS-related topics.",
      source: {
        standard: "",
        title: "",
        source_name: "BIS Standards Portal",
        source_url: "https://standards.bis.gov.in/",
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

  const sendMessage = async (text = message) => {
    const cleanMessage = String(text || "").trim();

    if (!cleanMessage || loading) return;

    setError("");

    const userMessage = {
      id: Date.now(),
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
            language,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      const aiMessage = {
        id: Date.now() + 1,
        role: "ai",
        message: cleanAIResponse(data.answer),
        source: data.source || {
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
      console.error(err);

      setError(
        "Unable to connect to BISense AI. Make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="app-page">
      <Navbar />

      <main className="chat-page">
        <div className="page-intro">
          <p className="eyebrow">BIS AI ASSISTANT</p>

          <h1>Ask anything about Indian Standards.</h1>

          <p>
            Understand BIS information through AI-assisted answers
            and supporting source information.
          </p>
        </div>

        <div className="chat-layout">
          <aside className="chat-sidebar">
            <h3>Quick tools</h3>

            <a href="/standards">
              Search Standards
            </a>

            <a href="/compare">
              Compare Standards
            </a>

            <a href="/certification">
              Certification Advisor
            </a>

            <a href="/product-analyzer">
              Product Analysis
            </a>

            <a href="/compliance">
              Compliance
            </a>

            <div className="chat-note">
              BISense provides AI-assisted information. Important
              requirements should be verified against current official
              BIS sources.
            </div>
          </aside>

          <section className="chat-box">
            <div className="chat-header">
              <div>
                <strong>BISense AI</strong>

                <span>
                  AI assistant for Indian Standards
                </span>
              </div>

              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value)
                }
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
              </select>
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
            </div>

            {error && (
              <div className="chat-error">
                <span>{error}</span>

                <button
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() =>
                    handleSuggestion(suggestion)
                  }
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="chat-input">
              <label
                className="upload-button"
                title="Upload document"
              >
                📎

                <input
                  type="file"
                  hidden
                  onChange={() =>
                    alert(
                      "Document upload will be connected next."
                    )
                  }
                />
              </label>

              <input
                type="text"
                placeholder="Ask about a BIS Standard..."
                value={message}
                disabled={loading}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={
                  loading || !message.trim()
                }
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            <div className="chat-footer">
              <span>
                AI-generated responses should be verified against
                official BIS information.
              </span>

              <button
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AIChat;