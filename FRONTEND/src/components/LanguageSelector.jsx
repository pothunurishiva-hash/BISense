import { useEffect, useState } from "react";

export const BISENSE_LANGUAGES = [
  { code: "en", label: "English", native: "English", speech: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
];

const STORAGE_KEY = "bisense_language_v1";

export function getStoredLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return BISENSE_LANGUAGES.some((item) => item.code === saved)
      ? saved
      : "en";
  } catch {
    return "en";
  }
}

export function saveLanguage(code) {
  const next = BISENSE_LANGUAGES.some((item) => item.code === code)
    ? code
    : "en";

  try {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(
      new CustomEvent("bisense-language-change", { detail: next })
    );
  } catch {
    // Ignore storage failures.
  }

  return next;
}

export function getLanguageConfig(code) {
  return (
    BISENSE_LANGUAGES.find((item) => item.code === code) ||
    BISENSE_LANGUAGES[0]
  );
}

export default function LanguageSelector({ compact = false }) {
  const [language, setLanguage] = useState(getStoredLanguage());

  useEffect(() => {
    const onLanguageChange = (event) => {
      setLanguage(event?.detail || getStoredLanguage());
    };

    window.addEventListener("bisense-language-change", onLanguageChange);
    return () =>
      window.removeEventListener(
        "bisense-language-change",
        onLanguageChange
      );
  }, []);

  return (
    <label
      className={`bisense-language-control ${compact ? "compact" : ""}`.trim()}
      title="Choose BISense response language"
    >
      <span aria-hidden="true">文</span>
      <select
        value={language}
        onChange={(event) => {
          const next = saveLanguage(event.target.value);
          setLanguage(next);
        }}
        aria-label="Response language"
      >
        {BISENSE_LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {compact ? item.native : `${item.native} · ${item.label}`}
          </option>
        ))}
      </select>
    </label>
  );
}
