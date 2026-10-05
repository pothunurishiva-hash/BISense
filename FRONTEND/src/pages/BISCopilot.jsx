import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LanguageSelector, { getLanguageConfig, getStoredLanguage } from "../components/LanguageSelector";

const CHAT_HISTORY_KEY = "bisense_recent_chats";
const CHAT_SESSION_KEY = "bisense_copilot_session_v3";
const FIRST_AI_REQUEST_KEY = "bisense_ai_request_started";
const BACKEND_URL = "https://bisense-5ozn.onrender.com";

const LANGUAGE_LABELS = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

const LANGUAGE_PROMPTS = {
  en: "Please answer in English.",
  hi: "Please answer in Hindi (हिन्दी).",
  te: "Please answer in Telugu (తెలుగు).",
  ta: "Please answer in Tamil (தமிழ்).",
};

function canUseSpeechRecognition() {
  return Boolean(
    typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

function chooseSpeechVoice(langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const config = getLanguageConfig(langCode);
  const voices = window.speechSynthesis.getVoices?.() || [];
  const exact = voices.find((voice) =>
    String(voice.lang || "").toLowerCase().startsWith(config.speech.toLowerCase())
  );

  if (exact) return exact;

  const base = config.speech.split("-")[0].toLowerCase();
  return voices.find((voice) =>
    String(voice.lang || "").toLowerCase().startsWith(base)
  ) || null;
}


function getAiLoadingCopy(isFirstRequest, backendWaking) {
  if (backendWaking) {
    return {
      title: "Getting BISense ready",
      subtitle: "Connecting to the standards intelligence service",
      small: "The service may take a moment to wake up. Your question is saved.",
    };
  }

  return isFirstRequest
    ? {
        title: "Preparing BISense AI",
        subtitle: "Retrieving and analyzing relevant BIS information",
        small: "Your question is saved while the answer is prepared.",
      }
    : {
        title: "BISense is thinking",
        subtitle: "Analyzing your request",
        small: "Checking the relevant standards and BIS information.",
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

function normalizeAgent(agent) {
  if (!agent) return null;

  const steps = Array.isArray(agent.steps)
    ? agent.steps
    : agent.steps
      ? [String(agent.steps)]
      : [];

  return {
    ...agent,
    name: agent.name || agent.workflow || "standards_intelligence",
    steps,
  };
}

function loadSessionConversation() {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return { messages: [], draft: "" };

    const parsed = JSON.parse(raw);
    const messages = Array.isArray(parsed?.messages)
      ? parsed.messages.filter((item) => !item?.pending)
      : [];

    return {
      messages,
      draft: typeof parsed?.draft === "string" ? parsed.draft : "",
    };
  } catch {
    return { messages: [], draft: "" };
  }
}

function persistSessionConversation(messages, draft = "") {
  try {
    const safeMessages = (Array.isArray(messages) ? messages : [])
      .filter((item) => item && !item.pending)
      .slice(-30);

    sessionStorage.setItem(
      CHAT_SESSION_KEY,
      JSON.stringify({
        messages: safeMessages,
        draft: String(draft || "").slice(0, 4000),
      })
    );
  } catch {
    // Ignore storage errors.
  }
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
          item?.question || item?.query || item?.title || ""
        ).trim();

        return previousQuestion !== question;
      }),
    ].slice(0, 8);

    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
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
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
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
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );

    case "mic":
      return (
        <svg {...props}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
          <path d="M12 17v4" />
          <path d="M9 21h6" />
        </svg>
      );

    case "spark":
      return (
        <svg {...props}>
          <path d="M12 3 13.2 7.8 18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z" />
          <path d="m19 14 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14Z" />
        </svg>
      );

    case "globe":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 9h16.4M3.8 15h16.4" />
          <path d="M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5s-1.1 6.2-3.2 8.5c-2.1-2.3-3.2-5.1-3.2-8.5S9.9 5.8 12 3.5Z" />
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
        I could not generate an answer for that request.
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
              style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
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
            style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
          >
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

const WORKFLOWS = [
  {
    id: "standard",
    icon: "search",
    title: "Find a Standard",
    description:
      "Search Indian Standards by product, keyword or IS number and understand where to begin.",
    summary:
      "BISense turns a general product or standards query into a structured standard-discovery task so the user can move from uncertainty to a verifiable starting point.",
    steps: [
      ["Input", "Enter a product name, keyword or IS number."],
      ["Identify", "BISense interprets the request and looks for relevant standard records."],
      ["Review", "The result exposes standard details such as title, scope, status or edition where available."],
      ["Verify", "The user can inspect the available BIS reference/source information."],
      ["Continue", "Move into comparison, certification, laboratory or compliance workflows."],
    ],
    result:
      "A structured starting point for standards research instead of manually searching across disconnected information.",
    to: "/standards",
  },
  {
    id: "product",
    icon: "workflow",
    title: "Analyze Product",
    description:
      "Start from a product instead of a standard number and explore potentially relevant BIS information.",
    summary:
      "Useful when the user knows the product but does not know which Indian Standard or BIS service to look for.",
    steps: [
      ["Input", "Upload a product image or provide product details."],
      ["Understand", "The product-analysis workflow extracts useful product/category context."],
      ["Match", "That context is used to surface potentially relevant BIS standards or considerations."],
      ["Explain", "BISense presents the result in simpler, user-oriented language."],
      ["Act", "Continue toward certification guidance, testing or compliance support."],
    ],
    result:
      "The user starts with what they actually know—the product—and BISense helps connect it to the standards journey.",
    to: "/product-analyzer",
  },
  {
    id: "compliance",
    icon: "shield",
    title: "Check Compliance",
    description:
      "Turn available standard information into a practical checklist and track progress.",
    summary:
      "The compliance workflow converts information into visible tasks so users can keep track of what remains to be reviewed or completed.",
    steps: [
      ["Select", "Start from the relevant standard or product context."],
      ["Build", "BISense organizes available requirements into checklist-oriented items."],
      ["Track", "Mark requirements as checked or pending and keep notes where supported."],
      ["Review", "See the remaining work instead of repeatedly re-reading the source material."],
      ["Report", "Use the saved/printable workflow support when a record is needed."],
    ],
    result:
      "A reusable compliance workspace rather than a one-time AI answer.",
    to: "/compliance",
  },
  {
    id: "certification",
    icon: "book",
    title: "Certification",
    description:
      "Explore certification-oriented information, requirements and next steps for a product.",
    summary:
      "BISense provides guidance around potentially relevant certification pathways without making an official BIS certification decision.",
    steps: [
      ["Context", "Start with a product, category or identified standard."],
      ["Identify", "Surface potentially relevant certification/conformity information available to the platform."],
      ["Explain", "Summarize the process in plain language."],
      ["Verify", "Point the user back to official BIS information for important current requirements."],
      ["Continue", "Move into testing or compliance-oriented workflows."],
    ],
    result:
      "A clearer certification-oriented starting point with an explicit official-verification path.",
    to: "/certification",
  },
  {
    id: "laboratory",
    icon: "search",
    title: "Find Laboratory",
    description:
      "Search BIS-recognized testing laboratories using available standard and location information.",
    summary:
      "The laboratory workflow connects standards/testing needs with laboratory discovery so users know what to look for next.",
    steps: [
      ["Need", "Start from a product, standard or testing requirement."],
      ["Search", "Use the laboratory workflow to search available BIS LIMS-related information."],
      ["Filter", "Narrow results using the available information and filters."],
      ["Inspect", "Review the laboratory information returned by the platform."],
      ["Navigate", "Use the available details to continue the testing process."],
    ],
    result:
      "Testing support is connected to the standards journey instead of being treated as a separate search task.",
    to: "/laboratories",
  },
];

export default function BISCopilot() {
  const initialSession = useMemo(loadSessionConversation, []);
  const [message, setMessage] = useState(initialSession.draft);
  const [messages, setMessages] = useState(initialSession.messages);
  const [loading, setLoading] = useState(false);
  const [backendWaking, setBackendWaking] = useState(false);
  const [error, setError] = useState("");
  const [isFirstRequest, setIsFirstRequest] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(getStoredLanguage());
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const recognitionRef = useRef(null);
  const warmupPromiseRef = useRef(null);

  const suggestions = [
    "What is IS 456?",
    "Which BIS certification does my product need?",
    "Find a BIS testing laboratory",
    "How do I check compliance?",
  ];

  useEffect(() => {
    persistSessionConversation(initialSession.messages, initialSession.draft);

    try {
      setIsFirstRequest(
        sessionStorage.getItem(FIRST_AI_REQUEST_KEY) !== "1"
      );
    } catch {
      setIsFirstRequest(true);
    }
  }, [initialSession.messages, initialSession.draft]);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setSelectedLanguage(event?.detail || getStoredLanguage());
      setVoiceError("");
    };

    window.addEventListener("bisense-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener(
        "bisense-language-change",
        handleLanguageChange
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // Ignore speech recognition cleanup errors.
      }
      try {
        window.speechSynthesis?.cancel?.();
      } catch {
        // Ignore speech synthesis cleanup errors.
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const refreshVoices = () => window.speechSynthesis.getVoices();
    refreshVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.(
        "voiceschanged",
        refreshVoices
      );
    };
  }, []);

  useEffect(() => {
    setVoiceError("");
  }, [selectedLanguage]);

  useEffect(() => {
    if (typeof window === "undefined" || !canUseSpeechRecognition()) return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError("");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
      }
      setMessage(transcript.trim());
    };

    recognition.onerror = (event) => {
      const code = event?.error || "";
      if (code !== "aborted") {
        setVoiceError(
          code === "not-allowed"
            ? "Microphone access was blocked. Allow microphone permission and try again."
            : "Voice input could not be started. You can continue by typing your question."
        );
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore cleanup errors.
      }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    persistSessionConversation(messages, message);
  }, [messages, message]);

  useEffect(() => {
    const warmBackend = async () => {
      setBackendWaking(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 18000);

      try {
        await fetch(`${BACKEND_URL}/`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
      } catch {
        // The actual chat request will retry through both the Vercel route and Render directly.
      } finally {
        window.clearTimeout(timeout);
        setBackendWaking(false);
      }
    };

    warmupPromiseRef.current = warmBackend();

    return () => {
      warmupPromiseRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkflow) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedWorkflow(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedWorkflow]);

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let data = null;
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const backendMessage =
        data?.detail ||
        data?.message ||
        data?.error ||
        rawText ||
        `HTTP ${response.status}`;

      const error = new Error(String(backendMessage));
      error.status = response.status;
      error.transient = [502, 503, 504].includes(response.status);
      throw error;
    }

    if (data && typeof data === "object") {
      return data;
    }

    if (rawText.trim()) {
      return { answer: rawText.trim() };
    }

    throw new Error("BIS AI returned an empty response.");
  };

  const postChat = async (url, cleanMessage, language) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify({
          message: cleanMessage,
          language,
        }),
        signal: controller.signal,
      });

      return await parseResponse(response);
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(
          "BIS AI is taking longer than expected. Please try again."
        );
        timeoutError.transient = true;
        throw timeoutError;
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const getChatResponse = async (cleanMessage, language) => {
    if (warmupPromiseRef.current) {
      try {
        await warmupPromiseRef.current;
      } catch {
        // Continue to chat request even if warm-up failed.
      }
    }

    let lastError = null;

    try {
      return await postChat("/api/chat", cleanMessage, LANGUAGE_LABELS[language] || "English");
    } catch (error) {
      lastError = error;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await postChat(`${BACKEND_URL}/api/chat`, cleanMessage, LANGUAGE_LABELS[language] || "English");
      } catch (error) {
        lastError = error;

        if (!error?.transient && attempt === 0) {
          break;
        }

        if (attempt < 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
        }
      }
    }

    // Older BISense deployments may validate only { message }.
    // Retry once with a language instruction embedded in the prompt so
    // multilingual responses still work without requiring a new client route.
    if (language !== "en") {
      const fallbackMessage = `${cleanMessage}\n\n${LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en}`;

      try {
        return await postChat(`${BACKEND_URL}/api/chat`, fallbackMessage, undefined);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("BIS AI could not be reached.");
  };

  const sendMessage = async (text = message) => {
    const cleanMessage = String(text || "").trim();

    if (!cleanMessage || loading) return;

    let firstRequest = false;

    try {
      firstRequest =
        sessionStorage.getItem(FIRST_AI_REQUEST_KEY) !== "1";
      sessionStorage.setItem(FIRST_AI_REQUEST_KEY, "1");
    } catch {
      firstRequest = messages.length === 0;
    }

    setIsFirstRequest(firstRequest);
    setLoading(true);
    setBackendWaking(Boolean(warmupPromiseRef.current));
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
      const data = await getChatResponse(cleanMessage, selectedLanguage);
      const assistantMessage = {
        id: requestId,
        role: "assistant",
        pending: false,
        content:
          data.answer ||
          data.response ||
          data.content ||
          "I could not generate an answer for that request.",
        source: data.source || null,
        agent: normalizeAgent(data.agent),
      };

      setMessages((prev) =>
        prev.map((item) =>
          item.id === requestId ? assistantMessage : item
        )
      );

      saveChatToHistory(cleanMessage, assistantMessage.content);
    } catch (err) {
      console.error("BIS Copilot request failed:", err);

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
                  "BISense could not complete this request yet. Your question has been saved. Please try again.",
              }
            : item
        )
      );
    } finally {
      setLoading(false);
      setBackendWaking(false);
    }
  };

  const toggleVoiceInput = () => {
    if (!canUseSpeechRecognition()) {
      setVoiceError(
        "Voice input is not supported by this browser. Please use Chrome or Edge and allow microphone access."
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // Ignore stop errors.
      }
      setIsListening(false);
      return;
    }

    try {
      const config = getLanguageConfig(selectedLanguage);
      recognitionRef.current.lang = config.speech;
      recognitionRef.current.start();
    } catch (error) {
      console.error("Voice input failed:", error);
      setVoiceError("Voice input is already active or could not start. Try again.");
      setIsListening(false);
    }
  };

  const speakAnswer = (item) => {
    const text = String(item?.content || "").trim();
    if (!text || typeof window === "undefined" || !window.speechSynthesis) {
      setVoiceError("Speech playback is not supported by this browser.");
      return;
    }

    if (speakingMessageId === item.id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const config = getLanguageConfig(selectedLanguage);
    utterance.lang = config.speech;
    utterance.rate = 0.96;
    utterance.pitch = 1;

    const voice = chooseSpeechVoice(selectedLanguage);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeakingMessageId(item.id);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const clearConversation = () => {
    setMessages([]);
    setMessage("");
    setError("");
    persistSessionConversation([], "");
  };

  const copyAnswer = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const openWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
  };

  const getAgentWorkflow = (agent) => {
    if (!agent) return null;

    const haystack = `${agent.name || ""} ${agent.workflow || ""}`.toLowerCase();

    if (haystack.includes("product")) return WORKFLOWS.find((w) => w.id === "product");
    if (haystack.includes("compliance")) return WORKFLOWS.find((w) => w.id === "compliance");
    if (haystack.includes("certif")) return WORKFLOWS.find((w) => w.id === "certification");
    if (haystack.includes("labor")) return WORKFLOWS.find((w) => w.id === "laboratory");
    return WORKFLOWS.find((w) => w.id === "standard");
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
          <div className="bis-hero-badge bis-enter-1">
            <span className="bis-hero-badge-icon">
              <CopilotIcon type="spark" size={14} />
            </span>
            <span>BIS INTELLIGENCE COPILOT</span>
          </div>

          <h1 className="bis-enter-2">
            Understand Indian Standards.
            <br />
            <span>Act with confidence.</span>
          </h1>

          <p className="bis-copilot-subtitle bis-enter-3">
            Ask questions in natural language and move from standards information
            to certification, testing and compliance workflows.
          </p>

          <div
            className={
              focused
                ? "bis-copilot-composer focused bis-enter-4"
                : "bis-copilot-composer bis-enter-4"
            }
          >
            <div className="bis-composer-toolbar">
              <div className="bis-composer-language-group">
                <LanguageSelector compact />
                <span className="bis-toolbar-divider" aria-hidden="true" />
                <span className="bis-language-label">
                  Respond in {LANGUAGE_LABELS[selectedLanguage] || "English"}
                </span>
              </div>

              <div className={isListening ? "bis-voice-status listening" : "bis-voice-status"}>
                <span className="bis-voice-status-dot" />
                <span>{isListening ? "Listening" : "Voice ready"}</span>
              </div>
            </div>

            <div className="bis-composer-input-row">
              <div className="bis-composer-input-wrap">
                <span className="bis-input-leading-icon" aria-hidden="true">
                  <CopilotIcon type="spark" size={16} />
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Ask about a BIS standard, product, certification or compliance requirement...`}
                  rows={1}
                  disabled={loading}
                  aria-label={`Ask BISense in ${LANGUAGE_LABELS[selectedLanguage] || "English"}`}
                />

                <button
                  type="button"
                  className={isListening ? "bis-voice-button listening" : "bis-voice-button"}
                  onClick={toggleVoiceInput}
                  disabled={loading}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  title={isListening ? "Stop listening" : `Speak in ${LANGUAGE_LABELS[selectedLanguage] || "selected language"}`}
                >
                  <CopilotIcon type="mic" size={18} />
                </button>
              </div>

              <button
                type="button"
                className="bis-ask-button"
                onClick={() => sendMessage()}
                disabled={loading || !message.trim()}
              >
                {loading ? (
                  <>
                    <span className="bis-send-loading">
                      <i />
                      <i />
                      <i />
                    </span>
                    Processing
                  </>
                ) : (
                  <>
                    <span>Ask BIS AI</span>
                    <CopilotIcon type="arrow" size={15} />
                  </>
                )}
              </button>
            </div>

            <div className="bis-suggestion-row">
              <div className="bis-try-label">
                <span className="bis-try-icon">
                  <CopilotIcon type="spark" size={12} />
                </span>
                <span>Try asking</span>
              </div>

              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                  style={{ animationDelay: `${80 + index * 45}ms` }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {backendWaking && !loading && (
            <div className="bis-copilot-status-note warmup" role="status">
              <span className="bis-status-pulse" />
              BISense is connecting to the standards intelligence service in the background.
            </div>
          )}

          {voiceError && !error && (
            <div className="bis-copilot-status-note voice" role="status">
              <span className="bis-status-note-icon">
                <CopilotIcon type="mic" size={14} />
              </span>
              <span>{voiceError}</span>
            </div>
          )}

          {error && (
            <div className="bis-copilot-error" role="alert">
              <strong>We couldn't complete that request.</strong>
              <span>{error}</span>
            </div>
          )}
        </section>

        {messages.length > 0 && (
          <section className="bis-response-section bis-response-enter">
            <div className="bis-response-header">
              <div>
                <span className="bis-copilot-kicker">YOUR CONVERSATION</span>
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
                  {loading ? "Processing" : "Response ready"}
                </span>

                <button
                  type="button"
                  onClick={clearConversation}
                  disabled={loading}
                >
                  New conversation
                </button>
              </div>
            </div>

            <div className="bis-conversation">
              {messages.map((item, index) => {
                if (item.role === "user") {
                  return (
                    <div
                      key={item.id || `user-${index}`}
                      className="bis-user-message bis-message-enter"
                    >
                      <div className="bis-user-message-meta">YOU</div>
                      <div className="bis-user-bubble">{item.content}</div>
                    </div>
                  );
                }

                return (
                  <article
                    className={`bis-ai-response bis-ai-reveal ${
                      item.pending ? "bis-ai-response-pending" : ""
                    } ${item.error ? "bis-ai-response-error" : ""}`}
                    key={item.id || `assistant-${index}`}
                  >
                    <div className="bis-ai-response-top">
                      <div className="bis-ai-identity">
                        <div className={`bis-ai-mark ${item.pending ? "is-thinking" : ""}`}>
                          <span>B</span>
                        </div>

                        <div>
                          <strong>BISense</strong>
                          <span>
                            {item.pending
                              ? "Preparing response"
                              : "Standards intelligence"}
                          </span>
                        </div>
                      </div>

                      <span className="bis-ai-badge">
                        {item.pending ? "RESPONDING" : "AI ASSISTED"}
                      </span>
                    </div>

                    {item.pending ? (
                      <div className="bis-ai-pending-content">
                        <div className="bis-pending-main">
                          <strong>
                            {
                              getAiLoadingCopy(
                                isFirstRequest,
                                backendWaking
                              ).title
                            }
                          </strong>
                          <span>
                            {
                              getAiLoadingCopy(
                                isFirstRequest,
                                backendWaking
                              ).subtitle
                            }
                          </span>
                          <small>
                            {
                              getAiLoadingCopy(
                                isFirstRequest,
                                backendWaking
                              ).small
                            }
                          </small>
                        </div>

                        <div className="bis-thinking-dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    ) : (
                      <div className="bis-ai-answer-layout">
                        <div className="bis-ai-answer">
                          <div className="bis-answer-title">
                            <span>ANSWER</span>
                            <button
                              type="button"
                              onClick={() => copyAnswer(item.content)}
                            >
                              <CopilotIcon type="copy" size={14} />
                              Copy
                            </button>
                          </div>

                          <AnswerContent content={item.content} />

                          {!item.pending && !item.error && (
                            <div className="bis-ai-response-tools">
                              <span>
                                {LANGUAGE_LABELS[selectedLanguage] || "English"}
                              </span>
                              <button
                                type="button"
                                onClick={() => speakAnswer(item)}
                              >
                                {speakingMessageId === item.id
                                  ? "Stop speaking"
                                  : "🔊 Read aloud"}
                              </button>
                            </div>
                          )}

                          {item.agent && (
                            <div className="bis-inline-workflow">
                              <div>
                                <span className="bis-inline-workflow-kicker">
                                  EXECUTION WORKFLOW
                                </span>
                                <strong>
                                  {item.agent.name || "How BISense handled this"}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const workflow = getAgentWorkflow(item.agent);
                                  if (workflow) openWorkflow(workflow);
                                }}
                              >
                                View how it worked
                                <CopilotIcon type="arrow" size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {(item.source || item.agent) && (
                          <aside className="bis-evidence-column">
                            {item.source && (
                              <div className="bis-evidence-block bis-evidence-reveal">
                                <div className="bis-evidence-heading">
                                  <div className="bis-evidence-icon">
                                    <CopilotIcon type="book" size={15} />
                                  </div>
                                  <div>
                                    <span>EVIDENCE</span>
                                    <strong>Reference</strong>
                                  </div>
                                </div>

                                <div className="bis-source-details">
                                  <strong>{getSourceLabel(item.source)}</strong>
                                  {item.source.title &&
                                    item.source.title !== item.source.source_name && (
                                      <span>{item.source.title}</span>
                                    )}
                                  {item.source.standard && (
                                    <span className="bis-source-standard">
                                      {item.source.standard}
                                    </span>
                                  )}
                                </div>

                                {item.source.source_url && (
                                  <a
                                    href={item.source.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View official source
                                    <CopilotIcon type="external" size={13} />
                                  </a>
                                )}
                              </div>
                            )}

                            {item.agent && (
                              <div className="bis-evidence-block workflow bis-evidence-reveal-delay">
                                <div className="bis-evidence-heading">
                                  <div className="bis-evidence-icon">
                                    <CopilotIcon type="workflow" size={15} />
                                  </div>
                                  <div>
                                    <span>WORKFLOW</span>
                                    <strong>How BISense handled it</strong>
                                  </div>
                                </div>

                                {item.agent.name && (
                                  <div className="bis-agent-name">
                                    {item.agent.name}
                                  </div>
                                )}

                                <div className="bis-agent-steps">
                                  {item.agent.steps?.map((step, stepIndex) => (
                                    <div
                                      className="bis-agent-step"
                                      key={`${item.id || index}-${stepIndex}`}
                                    >
                                      <span>
                                        {String(stepIndex + 1).padStart(2, "0")}
                                      </span>
                                      <p>{step}</p>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  className="bis-evidence-workflow-button"
                                  onClick={() => {
                                    const workflow = getAgentWorkflow(item.agent);
                                    if (workflow) openWorkflow(workflow);
                                  }}
                                >
                                  View complete workflow
                                  <CopilotIcon type="arrow" size={13} />
                                </button>
                              </div>
                            )}
                          </aside>
                        )}
                      </div>
                    )}

                    {!item.pending && (
                      <div className="bis-response-trust">
                        <CopilotIcon type="shield" size={13} />
                        <span>
                          AI-assisted information. Verify important requirements against
                          the latest official BIS source.
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}

              {loading && (
                <div className="bis-thinking-card bis-thinking-enter">
                  <div className="bis-thinking-mark">B</div>
                  <div>
                    <strong>
                      {getAiLoadingCopy(isFirstRequest, backendWaking).title}
                    </strong>
                    <span>
                      {getAiLoadingCopy(isFirstRequest, backendWaking).subtitle}
                    </span>
                  </div>
                  <div className="bis-thinking-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="bis-copilot-section bis-section-enter">
          <div className="bis-section-heading">
            <div>
              <span className="bis-copilot-kicker">BIS WORKFLOWS</span>
              <h2>Go beyond the answer.</h2>
            </div>
            <p>
              See what each BISense workflow does and how it turns information into
              a practical next step.
            </p>
          </div>

          <div className="bis-workflow-list">
            {WORKFLOWS.map((workflow, index) => (
              <button
                key={workflow.id}
                type="button"
                className="bis-workflow-row bis-workflow-button"
                onClick={() => openWorkflow(workflow)}
              >
                <span className="bis-workflow-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="bis-workflow-icon">
                  <CopilotIcon type={workflow.icon} size={17} />
                </div>
                <div className="bis-workflow-copy">
                  <strong>{workflow.title}</strong>
                  <span>{workflow.description}</span>
                </div>
                <CopilotIcon type="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>

        <section className="bis-copilot-info bis-info-enter">
          <div className="bis-info-icon">
            <CopilotIcon type="shield" size={18} />
          </div>
          <div>
            <span className="bis-copilot-kicker">SOURCE VISIBILITY</span>
            <h2>AI helps explain. Official BIS information remains the reference.</h2>
            <p>
              BISense is an AI-assisted information and workflow tool. It does not
              issue certification or make official BIS, legal or compliance decisions.
            </p>
          </div>
          <Link to="/awareness">
            Explore BIS information
            <CopilotIcon type="arrow" size={14} />
          </Link>
        </section>
      </main>

      {selectedWorkflow && (
        <div
          className="bis-workflow-modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedWorkflow(null)}
        >
          <div
            className="bis-workflow-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bis-workflow-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="bis-workflow-modal-head">
              <div>
                <span className="bis-workflow-modal-kicker">BISENSE WORKFLOW</span>
                <h3 id="bis-workflow-dialog-title">{selectedWorkflow.title}</h3>
                <p>{selectedWorkflow.description}</p>
              </div>
              <button
                type="button"
                className="bis-workflow-modal-close"
                aria-label="Close workflow"
                onClick={() => setSelectedWorkflow(null)}
              >
                ×
              </button>
            </div>

            <div className="bis-workflow-modal-body">
              <p className="bis-workflow-modal-summary">
                {selectedWorkflow.summary}
              </p>

              <div className="bis-workflow-modal-section-title">
                <span>PROCESS</span>
                <strong>How it works</strong>
              </div>

              <div className="bis-workflow-modal-steps">
                {selectedWorkflow.steps.map(([title, description], index) => (
                  <div className="bis-workflow-modal-step" key={title}>
                    <span className="bis-workflow-modal-step-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bis-workflow-modal-result">
                <strong>What the user gets</strong>
                <p>{selectedWorkflow.result}</p>
              </div>
            </div>

            <div className="bis-workflow-modal-foot">
              <button
                type="button"
                className="bis-workflow-modal-secondary"
                onClick={() => setSelectedWorkflow(null)}
              >
                Close
              </button>
              <Link
                to={selectedWorkflow.to}
                className="bis-workflow-modal-primary"
                onClick={() => setSelectedWorkflow(null)}
              >
                Open full workflow
                <CopilotIcon type="arrow" size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

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
  position: relative;
  text-align: center;
  padding: 28px 0 36px;
}

.bis-copilot-hero::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: -90px;
  left: 50%;
  width: min(860px, 85vw);
  height: 410px;
  transform: translateX(-50%);
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 38%, rgba(33, 101, 218, .10), transparent 58%),
    radial-gradient(circle at 76% 46%, rgba(97, 147, 231, .07), transparent 50%);
  filter: blur(2px);
}

.bis-copilot-hero.compact {
  padding-bottom: 22px;
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

.bis-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 31px;
  padding: 0 12px 0 7px;
  border: 1px solid #d7e5fa;
  border-radius: 999px;
  background: rgba(239, 246, 255, .86);
  color: #1856a8;
  box-shadow: 0 7px 20px rgba(26, 80, 156, .06);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .13em;
}

.bis-hero-badge-icon {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  color: #2169da;
  box-shadow: 0 3px 10px rgba(31, 88, 167, .08);
}

.bis-copilot-hero h1 {
  margin: 18px 0 0;
  color: #101828;
  font-size: clamp(40px, 5.5vw, 64px);
  line-height: .99;
  letter-spacing: -.055em;
  font-weight: 800;
}

.bis-copilot-hero h1 span {
  color: #246fe0;
}

.bis-copilot-subtitle {
  max-width: 720px;
  margin: 18px auto 0;
  color: #687892;
  font-size: 14px;
  line-height: 1.68;
}

/* =========================
   COMPOSER
========================= */

.bis-copilot-composer {
  position: relative;
  width: min(940px, 100%);
  margin: 30px auto 0;
  padding: 14px;
  border: 1px solid #d8e1ec;
  border-radius: 18px;
  background: rgba(255, 255, 255, .94);
  box-shadow:
    0 18px 45px rgba(26, 48, 82, .07),
    0 3px 10px rgba(26, 48, 82, .04);
  backdrop-filter: blur(10px);
  text-align: left;
  transition:
    border-color .2s ease,
    box-shadow .2s ease,
    transform .2s ease;
}

.bis-copilot-composer.focused {
  border-color: #a9c4eb;
  box-shadow:
    0 0 0 4px rgba(37, 111, 224, .08),
    0 20px 50px rgba(26, 48, 82, .09);
  transform: translateY(-1px);
}

.bis-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 2px 3px 12px;
}

.bis-composer-language-group {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bis-toolbar-divider {
  width: 1px;
  height: 17px;
  background: #e3e9f0;
}

.bis-language-label {
  color: #667085;
  font-size: 10px;
  font-weight: 650;
}

.bisense-language-control {
  min-width: 116px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #d8e1ec;
  border-radius: 10px;
  background: #ffffff;
  color: #19345f;
  box-sizing: border-box;
  box-shadow: 0 2px 5px rgba(25, 52, 95, .03);
}

.bisense-language-control.compact {
  min-width: 116px;
}

.bisense-language-control > span {
  width: 16px;
  flex: 0 0 16px;
  display: grid;
  place-items: center;
  color: #2169da;
  font-size: 14px;
  line-height: 1;
}

.bisense-language-control select {
  width: auto;
  min-width: 0;
  max-width: 120px;
  flex: 1;
  border: 0;
  outline: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  color: #19345f;
  font-family: inherit;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.bis-voice-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 29px;
  padding: 0 10px;
  border: 1px solid #dcefe5;
  border-radius: 999px;
  background: #f5fbf8;
  color: #2b7a56;
  font-size: 9px;
  font-weight: 750;
  white-space: nowrap;
}

.bis-voice-status-dot,
.bis-status-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #25a66a;
}

.bis-voice-status.listening {
  border-color: #c9def8;
  background: #f2f7ff;
  color: #1e5fbf;
}

.bis-voice-status.listening .bis-voice-status-dot {
  background: #246fe0;
  box-shadow: 0 0 0 4px rgba(36, 111, 224, .10);
  animation: bisStatusPulse 1.2s ease-in-out infinite;
}

.bis-composer-input-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.bis-composer-input-wrap {
  position: relative;
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #dce5ef;
  border-radius: 13px;
  background: #ffffff;
  transition: border-color .18s ease, box-shadow .18s ease;
}

.bis-composer-input-wrap:focus-within {
  border-color: #9ebde8;
  box-shadow: 0 0 0 3px rgba(37, 111, 224, .06);
}

.bis-input-leading-icon {
  width: 40px;
  align-self: stretch;
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  color: #4e83d5;
}

.bis-composer-top {
  display: contents;
}

.bis-composer-input-wrap textarea,
.bis-composer-top textarea {
  width: 100%;
  min-width: 0;
  min-height: 58px;
  max-height: 145px;
  resize: vertical;
  padding: 15px 10px 14px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #101828;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
}

.bis-composer-input-wrap textarea::placeholder {
  color: #8b9bb2;
}

.bis-composer-input-wrap textarea:disabled {
  opacity: .65;
}

.bis-voice-button {
  width: 38px;
  height: 38px;
  margin: 0 8px 0 5px;
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  border: 1px solid #dce6f2;
  border-radius: 11px;
  background: #f5f9ff;
  color: #2169da;
  cursor: pointer;
  transition: background .16s ease, border-color .16s ease, transform .16s ease;
}

.bis-voice-button:hover:not(:disabled) {
  background: #edf5ff;
  border-color: #c8dcf5;
  transform: translateY(-1px);
}

.bis-voice-button.listening {
  border-color: #9ec4f1;
  background: #eaf4ff;
  color: #185fb9;
  box-shadow: 0 0 0 4px rgba(36, 111, 224, .08);
}

.bis-voice-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.bis-ask-button {
  min-width: 142px;
  min-height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  flex: 0 0 auto;
  padding: 0 18px;
  border: 1px solid #1554ad;
  border-radius: 13px;
  background: linear-gradient(180deg, #2169da, #1755b5);
  color: #ffffff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(22, 87, 183, .18);
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}

.bis-ask-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 11px 23px rgba(22, 87, 183, .23);
  filter: brightness(1.02);
}

.bis-ask-button:active:not(:disabled) {
  transform: translateY(0);
}

.bis-ask-button:disabled {
  opacity: .48;
  cursor: not-allowed;
  box-shadow: none;
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
  animation: bisCopilotDot 1s ease-in-out infinite;
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
  0%,100% { opacity: .25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

.bis-suggestion-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 11px;
  padding: 11px 3px 1px;
  border-top: 1px solid #eef2f6;
}

.bis-try-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 2px;
  color: #5b6f8a;
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
}

.bis-try-icon {
  display: inline-grid;
  place-items: center;
  color: #2169da;
}

.bis-suggestion-row button {
  min-height: 31px;
  padding: 0 11px;
  border: 1px solid #dfe8f3;
  border-radius: 999px;
  background: #f7faff;
  color: #365273;
  font-family: inherit;
  font-size: 9px;
  font-weight: 650;
  cursor: pointer;
  opacity: 0;
  animation: bisSuggestionIn .45s cubic-bezier(.22,.75,.25,1) forwards;
  transition: background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
}

.bis-suggestion-row button:hover:not(:disabled) {
  background: #eef5ff;
  border-color: #c9dbf2;
  color: #1b5bab;
  transform: translateY(-1px);
}

.bis-suggestion-row button:disabled {
  opacity: .5;
}

@keyframes bisSuggestionIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.bis-copilot-status-note {
  width: min(940px, 100%);
  margin: 11px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 10px;
  font-size: 10px;
  line-height: 1.4;
}

.bis-copilot-status-note.warmup {
  color: #536b89;
  background: #f4f8fd;
  border: 1px solid #e0e9f4;
}

.bis-copilot-status-note.voice {
  color: #185fae;
  background: #f1f7ff;
  border: 1px solid #d6e5f7;
}

.bis-status-pulse {
  box-shadow: 0 0 0 4px rgba(37, 166, 106, .08);
  animation: bisStatusPulse 1.3s ease-in-out infinite;
}

.bis-status-note-icon {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #e6f1ff;
  color: #2169da;
}

.bis-copilot-error {
  width: min(940px, 100%);
  margin: 11px auto 0;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  border: 1px solid #f3c7c2;
  border-radius: 10px;
  background: #fff7f6;
  color: #b42318;
  font-size: 10px;
  animation: bisErrorIn .35s ease both;
}

@keyframes bisErrorIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
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

@media (max-width: 620px) {
  .bis-copilot-main {
    width: calc(100% - 18px);
    padding-top: 22px;
  }

  .bis-copilot-hero {
    padding-top: 20px;
  }

  .bis-copilot-hero h1 {
    font-size: 35px;
    line-height: 1.02;
  }

  .bis-copilot-subtitle {
    font-size: 12px;
    line-height: 1.6;
  }

  .bis-copilot-composer {
    margin-top: 24px;
    padding: 11px;
    border-radius: 15px;
  }

  .bis-composer-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
  }

  .bis-composer-language-group {
    width: 100%;
  }

  .bis-language-label {
    font-size: 9px;
  }

  .bis-voice-status {
    align-self: flex-start;
  }

  .bis-composer-input-row {
    flex-direction: column;
  }

  .bis-ask-button {
    width: 100%;
    min-height: 50px;
  }

  .bis-suggestion-row {
    align-items: stretch;
    flex-direction: column;
  }

  .bis-try-label {
    margin-bottom: 1px;
  }

  .bis-suggestion-row button {
    width: 100%;
  }

  .bis-copilot-status-note {
    text-align: left;
    justify-content: flex-start;
  }
}

@media (max-width: 430px) {
  .bis-hero-badge {
    font-size: 8px;
  }

  .bis-copilot-hero h1 {
    font-size: 31px;
  }

  .bis-composer-language-group {
    flex-wrap: wrap;
  }

  .bis-toolbar-divider {
    display: none;
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


/* =========================
   WORKFLOW MODAL
========================= */

.bis-workflow-button {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.bis-workflow-button:focus-visible {
  outline: 2px solid #0b3d91;
  outline-offset: -2px;
  border-radius: 8px;
}

.bis-workflow-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(15, 23, 42, .38);
  backdrop-filter: blur(7px);
  animation: bisModalBackdropIn .2s ease both;
}

.bis-workflow-modal {
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 44px));
  overflow: auto;
  border: 1px solid #dce4ee;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, .20);
  animation: bisModalIn .28s cubic-bezier(.22,.75,.25,1) both;
}

.bis-workflow-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #eaecf0;
  background: #fbfcfe;
}

.bis-workflow-modal-kicker {
  display: block;
  margin-bottom: 7px;
  color: #98a2b3;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}

.bis-workflow-modal-head h3 {
  margin: 0;
  color: #101828;
  font-size: 23px;
  letter-spacing: -.025em;
}

.bis-workflow-modal-head p {
  margin: 7px 0 0;
  max-width: 570px;
  color: #667085;
  font-size: 11px;
  line-height: 1.6;
}

.bis-workflow-modal-close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #d9dee7;
  border-radius: 8px;
  background: #ffffff;
  color: #475467;
  font-family: inherit;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: transform .15s ease, background-color .15s ease;
}

.bis-workflow-modal-close:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.bis-workflow-modal-body {
  padding: 22px 24px 18px;
}

.bis-workflow-modal-summary {
  margin: 0 0 20px;
  color: #344054;
  font-size: 12px;
  line-height: 1.7;
}

.bis-workflow-modal-section-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}

.bis-workflow-modal-section-title span {
  color: #98a2b3;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}

.bis-workflow-modal-section-title strong {
  color: #101828;
  font-size: 12px;
}

.bis-workflow-modal-steps {
  display: grid;
  gap: 9px;
}

.bis-workflow-modal-step {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 11px;
  align-items: start;
  padding: 12px;
  border: 1px solid #e6eaf0;
  border-radius: 10px;
  background: #fcfdff;
}

.bis-workflow-modal-step-number {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #edf4ff;
  color: #0b3d91;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  font-weight: 800;
}

.bis-workflow-modal-step strong {
  display: block;
  color: #182230;
  font-size: 10px;
}

.bis-workflow-modal-step p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 10px;
  line-height: 1.55;
}

.bis-workflow-modal-result {
  margin-top: 18px;
  padding: 14px;
  border: 1px solid #dce6f5;
  border-radius: 10px;
  background: #f7faff;
}

.bis-workflow-modal-result strong {
  display: block;
  color: #101828;
  font-size: 11px;
}

.bis-workflow-modal-result p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 10px;
  line-height: 1.55;
}

.bis-workflow-modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 15px 24px 20px;
  border-top: 1px solid #eaecf0;
}

.bis-workflow-modal-secondary,
.bis-workflow-modal-primary {
  min-height: 37px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
  transition: transform .15s ease, background-color .15s ease;
}

.bis-workflow-modal-secondary {
  border: 1px solid #d0d5dd;
  background: #ffffff;
  color: #344054;
}

.bis-workflow-modal-primary {
  border: 1px solid #0b3d91;
  background: #0b3d91;
  color: #ffffff;
}

.bis-workflow-modal-secondary:hover,
.bis-workflow-modal-primary:hover {
  transform: translateY(-1px);
}

.bis-workflow-modal-secondary:hover {
  background: #f9fafb;
}

.bis-workflow-modal-primary:hover {
  background: #082f73;
}

@keyframes bisModalBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bisModalIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 620px) {
  .bis-workflow-modal-backdrop {
    padding: 10px;
  }

  .bis-workflow-modal {
    max-height: calc(100vh - 20px);
    border-radius: 13px;
  }

  .bis-workflow-modal-head {
    padding: 17px 16px 15px;
  }

  .bis-workflow-modal-head h3 {
    font-size: 20px;
  }

  .bis-workflow-modal-body {
    padding: 17px 16px 15px;
  }

  .bis-workflow-modal-foot {
    flex-direction: column-reverse;
    align-items: stretch;
    padding: 13px 16px 16px;
  }

  .bis-workflow-modal-secondary,
  .bis-workflow-modal-primary {
    width: 100%;
  }
}
`;