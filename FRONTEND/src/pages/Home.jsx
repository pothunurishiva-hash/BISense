import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Icon({ type, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {
    case "home":
      return (
        <svg {...common}>
          <path d="m4 10 8-6 8 6" />
          <path d="M6 9.5V20h12V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );

    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3.5 13.7 9l5.3 1.8-5.3 1.8L12 18l-1.7-5.4L5 10.8 10.3 9 12 3.5Z" />
          <path d="m19 4 .5 1.5L21 6l-1.5.5L19 8l-.5-1.5L17 6l1.5-.5L19 4Z" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );

    case "compare":
      return (
        <svg {...common}>
          <path d="M8 5v14" />
          <path d="m5 8 3-3 3 3" />
          <path d="M16 19V5" />
          <path d="m13 16 3 3 3-3" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5.5c0 4.4-2.8 7.9-7 9.5-4.2-1.6-7-5.1-7-9.5V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "image":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m5 17 4-4 3 3 2-2 5 5" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "lab":
      return (
        <svg {...common}>
          <path d="M9 3v6l-4.5 8.2A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-2.8L15 9V3" />
          <path d="M8 14h8" />
          <path d="M9 3h6" />
        </svg>
      );

    case "book":
      return (
        <svg {...common}>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v15H7.5A2.5 2.5 0 0 0 5 20.5Z" />
          <path d="M5 5.5v15" />
          <path d="M8.5 7H17" />
          <path d="M8.5 10H17" />
        </svg>
      );

    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 20c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "external":
      return (
        <svg {...common}>
          <path d="M14 5h5v5" />
          <path d="m19 5-8 8" />
          <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
        </svg>
      );

    default:
      return null;
  }
}

function Home() {
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const commandPhrases = [
    "Find the right standard for your product...",
    "Explain IS 456:2000 in simple terms...",
    "What certification does this product need?",
    "Find a BIS-recognized testing laboratory...",
  ];

  const [typedCommand, setTypedCommand] = useState("");
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [typewriterPhrase, setTypewriterPhrase] =
    useState(0);
  const [isDeletingCommand, setIsDeletingCommand] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error(
          "Unable to load BISense user:",
          error
        );
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const phrase =
      commandPhrases[typewriterPhrase] || "";

    const isFinishedTyping =
      !isDeletingCommand &&
      typewriterIndex >= phrase.length;

    const isFinishedDeleting =
      isDeletingCommand &&
      typewriterIndex <= 0;

    let delay = 54;

    if (isFinishedTyping) {
      delay = 1700;
    } else if (isDeletingCommand) {
      delay = 27;
    }

    const timer = window.setTimeout(() => {
      if (isFinishedTyping) {
        setIsDeletingCommand(true);
        return;
      }

      if (isFinishedDeleting) {
        setIsDeletingCommand(false);

        setTypewriterPhrase(
          (current) =>
            (current + 1) % commandPhrases.length
        );

        setTypewriterIndex(0);
        setTypedCommand("");
        return;
      }

      if (isDeletingCommand) {
        const nextIndex =
          Math.max(typewriterIndex - 1, 0);

        setTypewriterIndex(nextIndex);
        setTypedCommand(
          phrase.slice(0, nextIndex)
        );
      } else {
        const nextIndex = Math.min(
          typewriterIndex + 1,
          phrase.length
        );

        setTypewriterIndex(nextIndex);
        setTypedCommand(
          phrase.slice(0, nextIndex)
        );
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    typewriterIndex,
    typewriterPhrase,
    isDeletingCommand,
  ]);

  const displayName =
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  const profileInitial =
    displayName.charAt(0).toUpperCase();

  const closeMobile = () => {
    setMobileSidebar(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 800) {
      setMobileSidebar((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  };

  return (
    <div
      className={`bis-workspace ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <style>{`
        .bis-workspace {
          --bis-sidebar: #eef3f9;
          --bis-sidebar-hover: #e5ecf5;
          --bis-sidebar-active: #e1ebff;
          --bis-sidebar-line: #d5dfeb;

          --bis-navy: #0f1b33;
          --bis-navy-2: #162441;

          --bis-blue: #2563eb;
          --bis-blue-dark: #1f57cf;

          --bis-bg: #f8fafc;
          --bis-surface: #ffffff;
          --bis-soft: #f1f5fa;
          --bis-soft-blue: #eef4ff;

          --bis-line: #d9e2ee;
          --bis-line-dark: #cad5e4;

          --bis-text: #0f1b33;
          --bis-text-2: #30425f;
          --bis-muted: #718096;
          --bis-muted-2: #98a5b7;

          min-height: 100vh;
          background: var(--bis-bg);
          color: var(--bis-text);

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;

          overflow-x: hidden;
        }

        .bis-workspace *,
        .bis-workspace *::before,
        .bis-workspace *::after {
          box-sizing: border-box;
        }

        .bis-workspace a {
          color: inherit;
          text-decoration: none;
        }

        .bis-workspace button,
        .bis-workspace input {
          font: inherit;
        }

        /* =====================================================
           SIDEBAR
        ====================================================== */

        .bis-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;

          width: 235px;
          height: 100vh;

          display: flex;
          flex-direction: column;

          padding: 18px 12px;

          background: var(--bis-sidebar);
          color: var(--bis-text);

          border-right: 1px solid var(--bis-sidebar-line);

          z-index: 100;

          overflow-x: hidden;
          overflow-y: auto;

          scrollbar-width: thin;
          scrollbar-color: #c7d2df transparent;

          transition:
            width .24s ease,
            transform .24s ease;
        }

        .bis-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .bis-sidebar::-webkit-scrollbar-thumb {
          background: #c7d2df;
          border-radius: 99px;
        }

        .bis-sidebar-brand {
          width: 100%;

          min-height: 42px;

          display: flex;
          align-items: center;
          gap: 10px;

          padding: 4px 7px 18px;

          border: none;

          background: transparent;
          color: var(--bis-text);

          cursor: pointer;

          text-align: left;
        }

        .bis-brand-mark {
          width: 34px;
          height: 34px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background: var(--bis-navy);
          color: #ffffff;

          font-size: 10px;
          font-weight: 900;
        }

        .bis-brand-copy {
          min-width: 0;

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .bis-brand-name {
          color: var(--bis-text);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -1px;

          white-space: nowrap;
        }

        .bis-brand-name span {
          color: #6d7f98;
          font-weight: 400;
        }

        .bis-brand-hint {
          display: block;

          margin-top: 2px;

          color: #8998ac;
          font-size: 7px;
          font-weight: 600;

          white-space: nowrap;
        }

        .bis-sidebar-label {
          padding: 0 9px 8px;

          color: #8191a8;

          font-size: 8px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;

          white-space: nowrap;

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .bis-sidebar-section {
          margin-bottom: 14px;
        }

        .bis-sidebar-nav {
          display: grid;
          gap: 2px;
        }

        .bis-sidebar-link {
          min-height: 38px;

          display: flex;
          align-items: center;
          gap: 10px;

          padding: 0 10px;

          border: 1px solid transparent;
          border-radius: 8px;

          color: #5b6c85;

          font-size: 10px;
          font-weight: 650;

          white-space: nowrap;

          transition:
            color .18s ease,
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .bis-sidebar-link svg {
          flex: 0 0 auto;
          color: #7589a7;

          transition: color .18s ease;
        }

        .bis-sidebar-link:hover {
          color: var(--bis-text);
          background: var(--bis-sidebar-hover);
          transform: translateX(1px);
        }

        .bis-sidebar-link:hover svg {
          color: var(--bis-blue);
        }

        .bis-sidebar-link.active {
          color: var(--bis-blue);
          border-color: #d2e0f7;
          background: var(--bis-sidebar-active);
        }

        .bis-sidebar-link.active svg {
          color: var(--bis-blue);
        }

        .bis-sidebar-text {
          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .bis-sidebar-spacer {
          flex: 1;
          min-height: 15px;
        }

        .bis-sidebar-account {
          padding: 10px 7px 5px;

          border-top: 1px solid var(--bis-sidebar-line);
        }

        .bis-sidebar-account-link {
          min-height: 37px;

          display: flex;
          align-items: center;
          gap: 9px;

          padding: 4px 2px;
        }

        .bis-sidebar-avatar {
          width: 30px;
          height: 30px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background: var(--bis-navy);
          color: #fff;

          font-size: 9px;
          font-weight: 800;
        }

        .bis-sidebar-account-copy {
          min-width: 0;

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .bis-sidebar-account-copy strong {
          display: block;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: var(--bis-text);
          font-size: 9px;
        }

        .bis-sidebar-account-copy span {
          display: block;

          margin-top: 2px;

          color: #8796aa;
          font-size: 7px;
        }

        .bis-sidebar-account-arrow {
          margin-left: auto;
          color: #8292a8;

          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .bis-sidebar-login {
          min-height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-top: 2px;

          border: 1px solid #cdd9e7;
          border-radius: 8px;

          background: #f8fafc;
          color: var(--bis-text) !important;

          font-size: 9px;
          font-weight: 800;
        }

        /* =====================================================
           COLLAPSED SIDEBAR
        ====================================================== */

        .bis-workspace.sidebar-collapsed .bis-sidebar {
          width: 72px;
        }

        .bis-workspace.sidebar-collapsed .bis-sidebar-brand {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }

        .bis-workspace.sidebar-collapsed .bis-brand-copy,
        .bis-workspace.sidebar-collapsed .bis-sidebar-label,
        .bis-workspace.sidebar-collapsed .bis-sidebar-text,
        .bis-workspace.sidebar-collapsed .bis-sidebar-account-copy {
          opacity: 0;
          pointer-events: none;
          transform: translateX(-5px);
          width: 0;
        }

        .bis-workspace.sidebar-collapsed .bis-sidebar-link {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }

        .bis-workspace.sidebar-collapsed .bis-sidebar-account-link {
          justify-content: center;
        }

        .bis-workspace.sidebar-collapsed .bis-sidebar-account-arrow {
          display: none;
        }

        .bis-workspace.sidebar-collapsed .bis-sidebar-account {
          padding-left: 0;
          padding-right: 0;
        }

        /* =====================================================
           MAIN
        ====================================================== */

        .bis-main {
          min-width: 0;

          margin-left: 235px;

          min-height: 100vh;

          background: var(--bis-bg);

          transition: margin-left .24s ease;
        }

        .bis-workspace.sidebar-collapsed .bis-main {
          margin-left: 72px;
        }

        /* =====================================================
           TOP BAR
        ====================================================== */

        .bis-topbar {
          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          padding: 0 32px;

          border-bottom: 1px solid var(--bis-line);
          background: rgba(255,255,255,.96);

          position: sticky;
          top: 0;
          z-index: 40;

          backdrop-filter: blur(12px);
        }

        .bis-topbar-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          color: #52637d;

          font-size: 10px;
          font-weight: 700;
        }

        .bis-topbar-title-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #2f806a;
        }

        .bis-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bis-topbar-profile {
          min-height: 38px;

          display: flex;
          align-items: center;
          gap: 8px;

          padding: 4px 8px 4px 4px;

          border: 1px solid var(--bis-line);
          border-radius: 9px;

          background: #fff;
        }

        .bis-topbar-avatar {
          width: 29px;
          height: 29px;

          display: grid;
          place-items: center;

          border-radius: 7px;

          background: var(--bis-navy);
          color: #fff;

          font-size: 9px;
          font-weight: 800;
        }

        .bis-topbar-profile span {
          max-width: 135px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #394b68;

          font-size: 9px;
          font-weight: 700;
        }

        .bis-topbar-menu {
          display: none;

          width: 36px;
          height: 36px;

          place-items: center;

          border: 1px solid var(--bis-line);
          border-radius: 9px;

          background: #ffffff;
          color: var(--bis-navy);

          cursor: pointer;
        }

        /* =====================================================
           CONTENT
        ====================================================== */

        .bis-content {
          width: min(1160px, 94%);

          margin: 0 auto;

          padding: 37px 0 60px;
        }

        .bis-page-intro {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 30px;

          margin-bottom: 26px;
        }

        .bis-eyebrow {
          color: #6b7fa1;

          font-size: 8px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .bis-page-intro h1 {
          margin-top: 9px;

          color: var(--bis-text);

          font-size: clamp(39px, 5vw, 59px);
          line-height: .96;
          letter-spacing: -3px;
          font-weight: 800;
        }

        .bis-page-intro p {
          max-width: 500px;

          margin-top: 10px;

          color: var(--bis-muted);

          font-size: 11px;
          line-height: 1.7;
        }

        .bis-intro-status {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #6d7e98;

          font-size: 9px;

          white-space: nowrap;
        }

        .bis-intro-status i {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #2f806a;
        }

        /* =====================================================
           COMMAND — BISENSE AI ANIMATION
        ====================================================== */

        .bis-command {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;

          min-height: 84px;

          overflow: hidden;

          border: 1px solid #c9d6e7;
          border-radius: 14px;

          background:
            radial-gradient(
              circle at 18% 50%,
              rgba(37,99,235,.055),
              transparent 25%
            ),
            #ffffff;

          box-shadow:
            0 10px 28px rgba(15,27,51,.045);

          text-decoration: none;

          position: relative;

          transition:
            border-color .22s ease,
            box-shadow .22s ease,
            transform .22s ease;
        }

        .bis-command:hover {
          border-color: #b9cbe2;

          box-shadow:
            0 14px 32px rgba(15,27,51,.07);

          transform: translateY(-1px);
        }

        .bis-command-main {
          min-width: 0;
          min-height: 84px;

          display: flex;
          align-items: center;

          gap: 15px;

          padding: 10px 18px;
        }

        /* =========================
           CLEAN B → BISENSE
           Fixed geometry prevents overlap.
        ========================= */

        .bis-command-visual {
          width: 76px;
          height: 58px;

          flex: 0 0 76px;

          display: grid;
          place-items: center;

          overflow: visible;

          perspective: 600px;
        }

        .bis-command-brand {
          width: 76px;
          height: 50px;

          position: relative;

          display: block;

          overflow: visible;

          transform-style: preserve-3d;
        }

        .bis-command-brand::before {
          content: "";

          position: absolute;

          left: 19px;
          top: 6px;

          width: 38px;
          height: 38px;

          border-radius: 11px;

          background: #0f1b33;

          box-shadow:
            0 8px 18px rgba(15,27,51,.16),
            inset 0 1px 0 rgba(255,255,255,.12);

          transform-origin: center;

          animation:
            bisCommandTile
            6.6s
            cubic-bezier(.22,.75,.25,1)
            infinite;
        }

        .bis-command-brand::after {
          content: "";

          position: absolute;

          left: 15px;
          top: 2px;

          width: 46px;
          height: 46px;

          border-radius: 50%;

          border: 1px solid rgba(37,99,235,.15);

          transform-origin: center;

          animation:
            bisCommandHalo
            6.6s
            ease-in-out
            infinite;
        }

        .bis-command-brand-b {
          position: absolute;

          z-index: 4;

          left: 32px;
          top: 15px;

          width: 13px;

          color: #ffffff;

          font-size: 18px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.8px;

          text-align: center;

          text-shadow:
            0 2px 8px rgba(0,0,0,.2);

          transform-origin: center;

          animation:
            bisCommandB
            6.6s
            cubic-bezier(.22,.75,.25,1)
            infinite;
        }

        .bis-command-brand-word {
          position: absolute;

          z-index: 3;

          left: 38px;
          top: 17px;

          display: flex;
          align-items: center;

          gap: 0;

          color: #0f1b33;

          font-size: 14px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -.7px;

          white-space: nowrap;

          pointer-events: none;
        }

        .bis-command-brand-word span {
          display: inline-block;

          opacity: 0;

          transform:
            translate3d(-9px, 0, -22px)
            scale(.45)
            rotateY(65deg);

          transform-origin: left center;

          animation:
            bisCommandLetter
            6.6s
            cubic-bezier(.22,.75,.25,1)
            infinite;
        }

        .bis-command-brand-word span:nth-child(1) {
          animation-delay: .03s;
        }

        .bis-command-brand-word span:nth-child(2) {
          animation-delay: .07s;
        }

        .bis-command-brand-word span:nth-child(3) {
          animation-delay: .11s;
        }

        .bis-command-brand-word span:nth-child(4) {
          animation-delay: .15s;
        }

        .bis-command-brand-word span:nth-child(5) {
          animation-delay: .19s;
        }

        .bis-command-brand-word span:nth-child(6) {
          animation-delay: .23s;
        }

        /* =========================
           TYPEWRITER
        ========================= */

        .bis-command-typewriter {
          min-width: 0;

          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .bis-command-label {
          display: block;

          color: #6b7fa1;

          font-size: 7px;
          font-weight: 850;

          letter-spacing: .14em;
        }

        .bis-command-line {
          min-width: 0;

          display: flex;
          align-items: center;

          margin-top: 5px;

          min-height: 21px;

          color: #1b3154;

          font-size: 14px;
          line-height: 1.35;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bis-command-line > span:first-child {
          min-width: 0;

          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bis-command-cursor {
          width: 1.5px;
          height: 17px;

          flex: 0 0 auto;

          margin-left: 3px;

          background: #2563eb;

          animation:
            bisCommandCursor
            .85s
            steps(1)
            infinite;
        }

        .bis-command-live {
          display: flex;
          align-items: center;

          gap: 6px;

          margin-top: 5px;

          color: #9aa7b9;

          font-size: 7px;
        }

        .bis-command-live-dots {
          display: inline-flex;
          align-items: center;

          gap: 3px;
        }

        .bis-command-live-dots i {
          width: 3px;
          height: 3px;

          border-radius: 50%;

          background: #5b85dc;

          animation:
            bisCommandDots
            1.1s
            ease-in-out
            infinite;
        }

        .bis-command-live-dots i:nth-child(2) {
          animation-delay: .14s;
        }

        .bis-command-live-dots i:nth-child(3) {
          animation-delay: .28s;
        }

        /* =========================
           BUTTON
        ========================= */

        .bis-command-button {
          min-width: 126px;

          margin: 7px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          border: none;
          border-radius: 9px;

          background: #2563eb;

          color: #ffffff !important;

          font-size: 9px;
          font-weight: 800;

          white-space: nowrap;

          box-shadow:
            0 5px 14px rgba(37,99,235,.16);

          transition:
            background .18s ease,
            transform .18s ease,
            box-shadow .18s ease;
        }

        .bis-command:hover .bis-command-button {
          background: #1f57cf;

          transform: translateX(1px);

          box-shadow:
            0 7px 16px rgba(37,99,235,.2);
        }

        /* =========================
           ANIMATIONS
        ========================= */

        @keyframes bisCommandTile {
          0%,
          12% {
            left: 19px;
            top: 6px;
            width: 38px;
            height: 38px;
            border-radius: 11px;

            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              scale(1);
          }

          21%,
          58% {
            left: 4px;
            top: 10px;
            width: 31px;
            height: 31px;
            border-radius: 9px;

            transform:
              translate3d(0,0,0)
              rotateY(-5deg)
              scale(1);
          }

          68% {
            left: 4px;
            top: 10px;
            width: 31px;
            height: 31px;
            border-radius: 9px;

            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              scale(1);
          }

          77% {
            left: 19px;
            top: 6px;
            width: 38px;
            height: 38px;
            border-radius: 11px;

            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              rotateZ(-4deg)
              scale(1.06);
          }

          81% {
            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              rotateZ(4deg)
              scale(1.03);
          }

          85% {
            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              rotateZ(-2deg)
              scale(1.01);
          }

          90%,
          100% {
            left: 19px;
            top: 6px;
            width: 38px;
            height: 38px;
            border-radius: 11px;

            transform:
              translate3d(0,0,0)
              rotateY(0deg)
              rotateZ(0)
              scale(1);
          }
        }

        @keyframes bisCommandB {
          0%,
          12% {
            transform:
              translate3d(0,0,0)
              scale(1)
              rotateZ(0);
          }

          21%,
          68% {
            transform:
              translate3d(-15px,4px,0)
              scale(.88)
              rotateZ(0);
          }

          77% {
            transform:
              translate3d(0,0,0)
              scale(1.02)
              rotateZ(-4deg);
          }

          81% {
            transform:
              translate3d(0,0,0)
              scale(1.04)
              rotateZ(4deg);
          }

          85% {
            transform:
              translate3d(0,0,0)
              scale(1.02)
              rotateZ(-2deg);
          }

          90%,
          100% {
            transform:
              translate3d(0,0,0)
              scale(1)
              rotateZ(0);
          }
        }

        @keyframes bisCommandLetter {
          0%,
          20% {
            opacity: 0;

            transform:
              translate3d(-9px,0,-22px)
              scale(.45)
              rotateY(65deg);
          }

          29%,
          58% {
            opacity: 1;

            transform:
              translate3d(0,0,0)
              scale(1)
              rotateY(0deg);
          }

          67%,
          100% {
            opacity: 0;

            transform:
              translate3d(-6px,0,-18px)
              scale(.55)
              rotateY(-45deg);
          }
        }

        @keyframes bisCommandHalo {
          0%,
          12% {
            opacity: .55;

            transform:
              translate3d(0,0,0)
              scale(.92);
          }

          28%,
          58% {
            opacity: .18;

            transform:
              translate3d(-6px,4px,0)
              scale(1.14);
          }

          78%,
          100% {
            opacity: .55;

            transform:
              translate3d(0,0,0)
              scale(.92);
          }
        }

        @keyframes bisCommandCursor {
          0%,
          45% {
            opacity: 1;
          }

          46%,
          100% {
            opacity: 0;
          }
        }

        @keyframes bisCommandDots {
          0%,
          100% {
            opacity: .28;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }

        /* =====================================================
           PRIMARY AREA
        ====================================================== */

        .bis-primary-grid {
          display: grid;
          grid-template-columns: 1.28fr .72fr;

          gap: 12px;

          margin-top: 13px;
        }

        .bis-ai-panel {
          min-height: 292px;

          padding: 23px;

          border: 1px solid #c7d4e5;
          border-radius: 14px;

          background: var(--bis-navy);

          color: #fff;

          position: relative;

          overflow: hidden;
        }

        .bis-ai-panel::after {
          content: "";

          position: absolute;

          width: 280px;
          height: 280px;

          right: -90px;
          top: -135px;

          border: 1px solid rgba(255,255,255,.08);

          border-radius: 50%;

          box-shadow:
            0 0 0 48px rgba(255,255,255,.018),
            0 0 0 96px rgba(255,255,255,.011);

          pointer-events: none;
        }

        .bis-ai-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          position: relative;
          z-index: 2;
        }

        .bis-ai-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          color: #9eb2cf;

          font-size: 8px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .bis-ai-status i {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #71bd91;
        }

        .bis-ai-tag {
          padding: 6px 8px;

          border: 1px solid rgba(255,255,255,.13);
          border-radius: 7px;

          background: rgba(255,255,255,.035);

          color: #9eb1cd;

          font-size: 7px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .bis-ai-content {
          max-width: 590px;

          position: relative;
          z-index: 2;
        }

        .bis-ai-content h2 {
          margin-top: 47px;

          color: #ffffff;

          font-size: clamp(30px, 3.9vw, 43px);
          line-height: 1.02;
          letter-spacing: -1.8px;
        }

        .bis-ai-content p {
          max-width: 550px;

          margin-top: 12px;

          color: #acbdd1;

          font-size: 10px;
          line-height: 1.7;
        }

        .bis-ai-actions {
          display: flex;
          flex-wrap: wrap;

          gap: 7px;

          margin-top: 22px;
        }

        .bis-ai-button {
          min-height: 40px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          padding: 0 14px;

          border: 1px solid #ffffff;
          border-radius: 8px;

          background: #ffffff !important;

          color: #0f1b33 !important;
          -webkit-text-fill-color: #0f1b33 !important;

          font-size: 9px;
          font-weight: 800;

          text-decoration: none;

          transition:
            transform .18s ease,
            background .18s ease;
        }

        .bis-ai-button span,
        .bis-ai-button svg {
          color: #0f1b33 !important;
        }

        .bis-ai-button:hover {
          transform: translateY(-1px);

          background: #edf3fb !important;
        }

        .bis-ai-link {
          min-height: 40px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          padding: 0 14px;

          border: 1px solid rgba(255,255,255,.16);
          border-radius: 8px;

          background: transparent;

          color: #d9e4f1;

          font-size: 9px;
          font-weight: 700;

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .bis-ai-link:hover {
          border-color: rgba(255,255,255,.25);
          background: rgba(255,255,255,.05);
        }

        /* =====================================================
           SIDE CARDS
        ====================================================== */

        .bis-side-stack {
          display: grid;
          grid-template-rows: 1fr 1fr;

          gap: 12px;
        }

        .bis-side-card {
          min-height: 140px;

          display: flex;
          flex-direction: column;

          padding: 19px;

          border: 1px solid var(--bis-line);
          border-radius: 13px;

          background: #fff;

          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .bis-side-card:hover {
          transform: translateY(-2px);

          border-color: #c1cfdf;

          box-shadow:
            0 12px 24px rgba(15,27,51,.045);
        }

        .bis-side-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bis-side-icon {
          width: 34px;
          height: 34px;

          display: grid;
          place-items: center;

          border: 1px solid #d9e2ee;
          border-radius: 8px;

          background: #f7f9fc;

          color: var(--bis-blue);
        }

        .bis-side-number {
          color: #a4b0c0;

          font-size: 8px;
          font-weight: 800;
        }

        .bis-side-card h3 {
          margin-top: auto;

          color: #172844;

          font-size: 14px;
          letter-spacing: -.3px;
        }

        .bis-side-card p {
          margin-top: 5px;

          color: #77869a;

          font-size: 8px;
          line-height: 1.55;
        }

        /* =====================================================
           SECTION
        ====================================================== */

        .bis-section {
          margin-top: 47px;
        }

        .bis-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 18px;
        }

        .bis-section-heading h2 {
          margin-top: 7px;

          color: var(--bis-text);

          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -1.2px;
        }

        .bis-section-heading p {
          max-width: 360px;

          color: #8090a4;

          font-size: 9px;
          line-height: 1.6;
        }

        /* =====================================================
           FLOW
        ====================================================== */

        .bis-flow {
          display: grid;
          grid-template-columns: repeat(5, 1fr);

          border-top: 1px solid var(--bis-line);
          border-bottom: 1px solid var(--bis-line);
        }

        .bis-flow-step {
          min-height: 160px;

          padding: 17px;

          border-right: 1px solid var(--bis-line);

          background: transparent;

          transition:
            background .18s ease,
            transform .18s ease;
        }

        .bis-flow-step:first-child {
          border-left: 1px solid var(--bis-line);
        }

        .bis-flow-step:last-child {
          border-right: none;
        }

        .bis-flow-step:hover {
          background: #fff;
          transform: translateY(-2px);
        }

        .bis-flow-step-number {
          color: #a6b1c0;

          font-size: 8px;
          font-weight: 800;
        }

        .bis-flow-icon {
          width: 34px;
          height: 34px;

          margin-top: 20px;

          display: grid;
          place-items: center;

          border: 1px solid #dce3ec;
          border-radius: 8px;

          background: #fff;

          color: var(--bis-blue);
        }

        .bis-flow-step h3 {
          margin-top: 11px;

          color: #243650;

          font-size: 13px;
        }

        .bis-flow-step p {
          margin-top: 5px;

          color: #8090a3;

          font-size: 8px;
          line-height: 1.5;
        }

        /* =====================================================
           LOWER PANELS
        ====================================================== */

        .bis-lower-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 12px;

          margin-top: 12px;
        }

        .bis-panel {
          min-height: 282px;

          padding: 20px;

          border: 1px solid var(--bis-line);
          border-radius: 13px;

          background: #fff;
        }

        .bis-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 15px;

          padding-bottom: 15px;

          border-bottom: 1px solid #e5eaf0;
        }

        .bis-panel-header h3 {
          margin-top: 6px;

          color: #1b2d47;

          font-size: 16px;
          letter-spacing: -.45px;
        }

        .bis-panel-header a {
          color: var(--bis-blue);

          font-size: 8px;
          font-weight: 800;
        }

        .bis-continue {
          margin-top: 15px;

          display: grid;
          grid-template-columns: 35px 1fr 16px;

          gap: 10px;
          align-items: center;

          padding: 11px;

          border: 1px solid #dfe6ef;
          border-radius: 9px;

          background: #fbfcfe;

          transition:
            transform .18s ease,
            border-color .18s ease;
        }

        .bis-continue:hover {
          transform: translateY(-1px);
          border-color: #c7d4e3;
        }

        .bis-continue-icon {
          width: 35px;
          height: 35px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background: var(--bis-soft-blue);

          color: var(--bis-blue);
        }

        .bis-continue strong {
          display: block;

          color: #263750;

          font-size: 9px;
          line-height: 1.4;
        }

        .bis-continue span {
          display: block;

          margin-top: 3px;

          color: #8794a6;

          font-size: 7px;
          line-height: 1.4;
        }

        .bis-continue-arrow {
          color: var(--bis-blue);
        }

        .bis-recent-list {
          display: grid;

          margin-top: 7px;
        }

        .bis-recent-item {
          display: grid;
          grid-template-columns: 28px 1fr auto;

          gap: 10px;
          align-items: center;

          padding: 12px 0;

          border-bottom: 1px solid #e8edf2;
        }

        .bis-recent-item:last-child {
          border-bottom: none;
        }

        .bis-recent-number {
          color: #a4afbd;

          font-size: 8px;
          font-weight: 800;
        }

        .bis-recent-copy strong {
          display: block;

          color: #31415a;

          font-size: 9px;
        }

        .bis-recent-copy span {
          display: block;

          margin-top: 3px;

          color: #8996a6;

          font-size: 7px;
        }

        .bis-recent-arrow {
          color: #7991b6;
        }

        /* =====================================================
           MODE
        ====================================================== */

        .bis-personal {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 12px;

          margin-top: 12px;
        }

        .bis-personal-card {
          min-height: 205px;

          padding: 21px;

          border: 1px solid var(--bis-line);
          border-radius: 13px;

          background: #fff;
        }

        .bis-personal-card.manufacturer {
          background: #f5f7fa;
        }

        .bis-personal-icon {
          width: 36px;
          height: 36px;

          display: grid;
          place-items: center;

          border: 1px solid #dce4ef;
          border-radius: 8px;

          background: #fff;

          color: var(--bis-blue);
        }

        .bis-personal-card .bis-eyebrow {
          margin-top: 21px;
        }

        .bis-personal-card h3 {
          margin-top: 7px;

          color: #1b2b45;

          font-size: 20px;
          line-height: 1.04;
          letter-spacing: -.7px;
        }

        .bis-personal-card p {
          max-width: 420px;

          margin-top: 7px;

          color: #77869a;

          font-size: 9px;
          line-height: 1.6;
        }

        .bis-personal-link {
          display: inline-flex;
          align-items: center;

          gap: 6px;

          margin-top: 17px;

          color: var(--bis-blue);

          font-size: 8px;
          font-weight: 800;
        }

        /* =====================================================
           SOURCE
        ====================================================== */

        .bis-source-bar {
          margin-top: 40px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 25px;

          padding: 18px 0;

          border-top: 1px solid var(--bis-line);
        }

        .bis-source-copy strong {
          display: block;

          color: #52647e;

          font-size: 8px;
          letter-spacing: .08em;
        }

        .bis-source-copy span {
          display: block;

          margin-top: 4px;

          color: #8997a8;

          font-size: 8px;
        }

        .bis-source-links {
          display: flex;
          flex-wrap: wrap;

          gap: 7px;
        }

        .bis-source-links a {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 8px 9px;

          border: 1px solid #dde4ed;
          border-radius: 7px;

          background: #fff;
          color: #5d6d84;

          font-size: 7px;
          font-weight: 700;
        }

        .bis-source-links a:hover {
          border-color: #c8d4e2;
        }

        /* =====================================================
           FOOTER
        ====================================================== */

        .bis-home-footer {
          margin-top: 42px;

          padding: 20px 0 4px;

          border-top: 1px solid var(--bis-line);

          color: #8290a2;

          font-size: 8px;
        }

        .bis-home-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;
        }

        .bis-home-footer-links {
          display: flex;
          flex-wrap: wrap;

          gap: 14px;
        }

        .bis-home-footer-links a:hover {
          color: var(--bis-text-2);
        }

        /* =====================================================
           MOBILE OVERLAY
        ====================================================== */

        .bis-mobile-overlay {
          display: none;

          position: fixed;
          inset: 0;

          background: rgba(15,27,51,.36);

          z-index: 90;
        }

        /* =====================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 1050px) {
          .bis-sidebar {
            width: 205px;
          }

          .bis-main {
            margin-left: 205px;
          }

          .bis-workspace.sidebar-collapsed .bis-sidebar {
            width: 72px;
          }

          .bis-workspace.sidebar-collapsed .bis-main {
            margin-left: 72px;
          }

          .bis-primary-grid {
            grid-template-columns: 1fr;
          }

          .bis-side-stack {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: none;
          }

          .bis-flow {
            grid-template-columns: repeat(3, 1fr);
          }

          .bis-flow-step {
            border-bottom: 1px solid var(--bis-line);
          }

          .bis-flow-step:nth-child(3) {
            border-right: none;
          }

          .bis-flow-step:nth-child(4),
          .bis-flow-step:nth-child(5) {
            border-bottom: none;
          }
        }

        @media (max-width: 800px) {
          .bis-sidebar {
            width: 265px;

            transform: translateX(-105%);

            box-shadow:
              18px 0 45px rgba(15,27,51,.15);
          }

          .bis-sidebar.mobile-open {
            transform: translateX(0);
          }

          .bis-workspace.sidebar-collapsed .bis-sidebar {
            width: 265px;
          }

          .bis-workspace.sidebar-collapsed .bis-brand-copy,
          .bis-workspace.sidebar-collapsed .bis-sidebar-label,
          .bis-workspace.sidebar-collapsed .bis-sidebar-text,
          .bis-workspace.sidebar-collapsed .bis-sidebar-account-copy {
            opacity: 1;
            pointer-events: auto;
            transform: none;
            width: auto;
          }

          .bis-workspace.sidebar-collapsed .bis-sidebar-link {
            justify-content: flex-start;
            padding-left: 10px;
            padding-right: 10px;
          }

          .bis-workspace.sidebar-collapsed .bis-sidebar-account-link {
            justify-content: flex-start;
          }

          .bis-main,
          .bis-workspace.sidebar-collapsed .bis-main {
            margin-left: 0;
          }

          .bis-topbar {
            min-height: 62px;
            padding: 0 3%;
          }

          .bis-topbar-menu {
            display: grid;
          }

          .bis-topbar-profile {
            padding-right: 5px;
          }

          .bis-topbar-profile span {
            display: none;
          }

          .bis-mobile-overlay.open {
            display: block;
          }

          .bis-content {
            width: 94%;
            padding-top: 30px;
          }

          .bis-page-intro {
            align-items: flex-start;
            flex-direction: column;

            gap: 10px;
          }

          .bis-page-intro h1 {
            font-size: 46px;
          }

          .bis-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .bis-lower-grid {
            grid-template-columns: 1fr;
          }

          .bis-personal {
            grid-template-columns: 1fr;
          }

          .bis-source-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .bis-home-footer-inner {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .bis-sidebar {
            width: 280px;
          }

          .bis-command {
            grid-template-columns: 1fr;
          }

          .bis-command-main {
            min-height: 78px;
            padding: 10px 13px;
            gap: 10px;
          }

          /*
            Keep enough horizontal room for the complete
            BISense mark even on narrow phones.
          */
          .bis-command-visual {
            width: 76px;
            flex-basis: 76px;
          }

          .bis-command-brand {
            width: 76px;
            transform: none;
          }

          .bis-command-brand-b {
            left: 32px;
            top: 16px;
            width: 12px;
            font-size: 17px;
          }

          .bis-command-brand-word {
            left: 37px;
            top: 18px;
            font-size: 13px;
            letter-spacing: -.65px;
          }

          .bis-command-brand::before {
            left: 19px;
            top: 7px;

            width: 36px;
            height: 36px;

            border-radius: 10px;
          }

          .bis-command-brand::after {
            left: 14px;
            top: 2px;

            width: 45px;
            height: 45px;
          }

          @keyframes bisCommandTile {
            0%,
            12% {
              left: 19px;
              top: 7px;
              width: 36px;
              height: 36px;
              border-radius: 10px;

              transform:
                translate3d(0,0,0)
                rotateY(0deg)
                scale(1);
            }

            21%,
            58% {
              left: 5px;
              top: 10px;
              width: 29px;
              height: 29px;
              border-radius: 8px;

              transform:
                translate3d(0,0,0)
                rotateY(-4deg)
                scale(1);
            }

            68% {
              left: 5px;
              top: 10px;
              width: 29px;
              height: 29px;
              border-radius: 8px;

              transform:
                translate3d(0,0,0)
                rotateY(0deg)
                scale(1);
            }

            77% {
              left: 19px;
              top: 7px;
              width: 36px;
              height: 36px;
              border-radius: 10px;

              transform:
                translate3d(0,0,0)
                rotateZ(-4deg)
                scale(1.05);
            }

            81% {
              transform:
                translate3d(0,0,0)
                rotateZ(4deg)
                scale(1.03);
            }

            85% {
              transform:
                translate3d(0,0,0)
                rotateZ(-2deg)
                scale(1.01);
            }

            90%,
            100% {
              left: 19px;
              top: 7px;
              width: 36px;
              height: 36px;
              border-radius: 10px;

              transform:
                translate3d(0,0,0)
                rotateZ(0)
                scale(1);
            }
          }

          @keyframes bisCommandB {
            0%,
            12% {
              transform:
                translate3d(0,0,0)
                scale(1)
                rotateZ(0);
            }

            21%,
            68% {
              transform:
                translate3d(-14px,3px,0)
                scale(.87)
                rotateZ(0);
            }

            77% {
              transform:
                translate3d(0,0,0)
                scale(1.02)
                rotateZ(-4deg);
            }

            81% {
              transform:
                translate3d(0,0,0)
                scale(1.04)
                rotateZ(4deg);
            }

            85% {
              transform:
                translate3d(0,0,0)
                scale(1.02)
                rotateZ(-2deg);
            }

            90%,
            100% {
              transform:
                translate3d(0,0,0)
                scale(1)
                rotateZ(0);
            }
          }

          .bis-command-line {
            font-size: 11px;
          }

          .bis-command-live {
            font-size: 6.5px;
          }

          .bis-command-button {
            min-height: 41px;

            margin: 0 7px 7px;

            width: auto;
          }

          .bis-ai-panel {
            min-height: 360px;
            padding: 19px;
          }

          .bis-ai-content h2 {
            margin-top: 37px;
            font-size: 33px;
          }

          .bis-ai-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .bis-ai-button,
          .bis-ai-link {
            width: 100%;
          }

          .bis-side-stack {
            grid-template-columns: 1fr;
          }

          .bis-side-card {
            min-height: 130px;
          }

          .bis-flow {
            grid-template-columns: 1fr;
          }

          .bis-flow-step,
          .bis-flow-step:nth-child(3),
          .bis-flow-step:nth-child(4),
          .bis-flow-step:nth-child(5) {
            min-height: 140px;

            border-right: none;
            border-bottom: 1px solid var(--bis-line);
          }

          .bis-flow-step:first-child {
            border-left: none;
          }

          .bis-flow-step:last-child {
            border-bottom: none;
          }

          .bis-page-intro h1 {
            font-size: 42px;
            letter-spacing: -2.4px;
          }

          .bis-panel,
          .bis-personal-card {
            padding: 17px;
          }

          .bis-home-footer {
            padding-bottom: 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bis-workspace *,
          .bis-workspace *::before,
          .bis-workspace *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      <div
        className={`bis-mobile-overlay ${
          mobileSidebar ? "open" : ""
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      ></div>

      <div className="bis-app-shell">

        {/* ===================================================
            SIDEBAR
        ==================================================== */}

        <aside
          className={`bis-sidebar ${
            mobileSidebar ? "mobile-open" : ""
          }`}
        >
          <button
            type="button"
            className="bis-sidebar-brand"
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? "Expand BISense navigation"
                : "Collapse BISense navigation"
            }
            aria-label={
              sidebarCollapsed
                ? "Expand BISense navigation"
                : "Collapse BISense navigation"
            }
          >
            <div className="bis-brand-mark">
              B
            </div>

            <div className="bis-brand-copy">
              <div className="bis-brand-name">
                BIS<span>ense</span>
              </div>

              <span className="bis-brand-hint">
                Click to{" "}
                {sidebarCollapsed
                  ? "expand"
                  : "collapse"}
              </span>
            </div>
          </button>

          <div className="bis-sidebar-section">
            <div className="bis-sidebar-label">
              Workspace
            </div>

            <nav className="bis-sidebar-nav">
              <Link
                to="/"
                className="bis-sidebar-link active"
                onClick={closeMobile}
                title="Overview"
              >
                <Icon type="home" size={16} />

                <span className="bis-sidebar-text">
                  Overview
                </span>
              </Link>

              <Link
                to="/copilot"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="BIS Copilot"
              >
                <Icon type="ai" size={16} />

                <span className="bis-sidebar-text">
                  BIS Copilot
                </span>
              </Link>

              <Link
                to="/dashboard"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Intelligence Hub"
              >
                <Icon type="grid" size={16} />

                <span className="bis-sidebar-text">
                  Intelligence Hub
                </span>
              </Link>
            </nav>
          </div>

          <div className="bis-sidebar-section">
            <div className="bis-sidebar-label">
              Explore
            </div>

            <nav className="bis-sidebar-nav">
              <Link
                to="/standards"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Standards"
              >
                <Icon type="search" size={16} />

                <span className="bis-sidebar-text">
                  Standards
                </span>
              </Link>

              <Link
                to="/compare"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Compare"
              >
                <Icon type="compare" size={16} />

                <span className="bis-sidebar-text">
                  Compare
                </span>
              </Link>

              <Link
                to="/product-analyzer"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Product Analyzer"
              >
                <Icon type="image" size={16} />

                <span className="bis-sidebar-text">
                  Product Analyzer
                </span>
              </Link>

              <Link
                to="/awareness"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Awareness"
              >
                <Icon type="book" size={16} />

                <span className="bis-sidebar-text">
                  Awareness
                </span>
              </Link>
            </nav>
          </div>

          <div className="bis-sidebar-section">
            <div className="bis-sidebar-label">
              Workflows
            </div>

            <nav className="bis-sidebar-nav">
              <Link
                to="/certification"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Certification"
              >
                <Icon type="shield" size={16} />

                <span className="bis-sidebar-text">
                  Certification
                </span>
              </Link>

              <Link
                to="/laboratories"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Laboratories"
              >
                <Icon type="lab" size={16} />

                <span className="bis-sidebar-text">
                  Laboratories
                </span>
              </Link>

              <Link
                to="/compliance"
                className="bis-sidebar-link"
                onClick={closeMobile}
                title="Compliance"
              >
                <Icon type="check" size={16} />

                <span className="bis-sidebar-text">
                  Compliance
                </span>
              </Link>
            </nav>
          </div>

          <div className="bis-sidebar-spacer"></div>

          <div className="bis-sidebar-account">
            {user ? (
              <Link
                to="/profile"
                className="bis-sidebar-account-link"
                onClick={closeMobile}
                title="Open profile"
              >
                <div className="bis-sidebar-avatar">
                  {profileInitial}
                </div>

                <div className="bis-sidebar-account-copy">
                  <strong>
                    {displayName}
                  </strong>

                  <span>
                    Open profile
                  </span>
                </div>

                <span className="bis-sidebar-account-arrow">
                  <Icon type="arrow" size={11} />
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="bis-sidebar-login"
                onClick={closeMobile}
              >
                <span className="bis-sidebar-text">
                  Sign in to BISense
                </span>

                {sidebarCollapsed && (
                  <span
                    style={{
                      display: "none",
                    }}
                  >
                    Sign in
                  </span>
                )}
              </Link>
            )}
          </div>
        </aside>

        {/* ===================================================
            MAIN
        ==================================================== */}

        <main className="bis-main">

          {/* TOP BAR */}

          <header className="bis-topbar">
            <div className="bis-topbar-title">
              <span className="bis-topbar-title-dot"></span>

              BISense Workspace
            </div>

            <div className="bis-topbar-actions">

              {user && (
                <Link
                  to="/profile"
                  className="bis-topbar-profile"
                >
                  <div className="bis-topbar-avatar">
                    {profileInitial}
                  </div>

                  <span>
                    {displayName}
                  </span>
                </Link>
              )}

              <button
                type="button"
                className="bis-topbar-menu"
                onClick={() =>
                  setMobileSidebar(true)
                }
                aria-label="Open navigation"
              >
                <Icon type="menu" size={17} />
              </button>
            </div>
          </header>

          <div className="bis-content">

            {/* =================================================
                INTRO
            ================================================== */}

            <section className="bis-page-intro">
              <div>
                <div className="bis-eyebrow">
                  YOUR BIS WORKSPACE
                </div>

                <h1>
                  {user
                    ? `Welcome back, ${displayName}.`
                    : "Welcome to BISense."}
                </h1>

                <p>
                  Discover Indian Standards, understand
                  requirements and continue into the right BIS
                  workflow from one workspace.
                </p>
              </div>

              <div className="bis-intro-status">
                <i></i>
                AI-assisted workspace
              </div>
            </section>

            {/* =================================================
                COMMAND
            ================================================== */}

            <Link
              to="/copilot"
              className="bis-command"
              aria-label="Open BIS Copilot"
            >
              <div className="bis-command-main">

                <div
                  className="bis-command-visual"
                  aria-hidden="true"
                >
                  <div className="bis-command-brand">
                    <span className="bis-command-brand-b">
                      B
                    </span>

                    <span className="bis-command-brand-word">
                      <span>I</span>
                      <span>S</span>
                      <span>e</span>
                      <span>n</span>
                      <span>s</span>
                      <span>e</span>
                    </span>
                  </div>
                </div>

                <div className="bis-command-typewriter">

                  <span className="bis-command-label">
                    BISENSE AI
                  </span>

                  <div className="bis-command-line">
                    <span>
                      {typedCommand}
                    </span>

                    <span
                      className="bis-command-cursor"
                      aria-hidden="true"
                    ></span>
                  </div>

                  <div className="bis-command-live">
                    <span className="bis-command-live-dots">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>

                    AI-assisted BIS workspace
                  </div>

                </div>

              </div>

              <div className="bis-command-button">
                Open BIS Copilot
                <Icon type="arrow" size={12} />
              </div>
            </Link>

            {/* =================================================
                PRIMARY
            ================================================== */}

            <section className="bis-primary-grid">

              <article className="bis-ai-panel">

                <div className="bis-ai-top">
                  <div className="bis-ai-status">
                    <i></i>
                    BIS AI ASSISTANT
                  </div>

                  <div className="bis-ai-tag">
                    SOURCE-AWARE
                  </div>
                </div>

                <div className="bis-ai-content">
                  <h2>
                    Start with a question.
                    <br />
                    Continue with the right workflow.
                  </h2>

                  <p>
                    Ask about a product, an Indian Standard,
                    certification, testing or compliance.
                    BISense helps you move from information
                    toward the next action.
                  </p>

                  <div className="bis-ai-actions">
                    <Link
                      to="/copilot"
                      className="bis-ai-button"
                    >
                      Open BIS Copilot
                      <Icon type="arrow" size={12} />
                    </Link>

                    <Link
                      to="/product-analyzer"
                      className="bis-ai-link"
                    >
                      Analyze a product
                      <Icon type="image" size={12} />
                    </Link>
                  </div>
                </div>
              </article>

              <div className="bis-side-stack">

                <Link
                  to="/standards"
                  className="bis-side-card"
                >
                  <div className="bis-side-card-top">
                    <div className="bis-side-icon">
                      <Icon type="search" size={16} />
                    </div>

                    <span className="bis-side-number">
                      01
                    </span>
                  </div>

                  <h3>
                    Find a Standard
                  </h3>

                  <p>
                    Search by product, keyword or
                    IS number.
                  </p>
                </Link>

                <Link
                  to="/certification"
                  className="bis-side-card"
                >
                  <div className="bis-side-card-top">
                    <div className="bis-side-icon">
                      <Icon type="shield" size={16} />
                    </div>

                    <span className="bis-side-number">
                      02
                    </span>
                  </div>

                  <h3>
                    Certification Guidance
                  </h3>

                  <p>
                    Explore possible certification
                    requirements and next steps.
                  </p>
                </Link>

              </div>
            </section>

            {/* =================================================
                WORKFLOW
            ================================================== */}

            <section className="bis-section">

              <div className="bis-section-heading">
                <div>
                  <div className="bis-eyebrow">
                    BISENSE JOURNEY
                  </div>

                  <h2>
                    From discovery to compliance.
                  </h2>
                </div>

                <p>
                  Follow the connected workflow instead
                  of stopping at a search result.
                </p>
              </div>

              <div className="bis-flow">

                <Link
                  to="/copilot"
                  className="bis-flow-step"
                >
                  <span className="bis-flow-step-number">
                    01
                  </span>

                  <div className="bis-flow-icon">
                    <Icon type="ai" size={15} />
                  </div>

                  <h3>
                    Ask
                  </h3>

                  <p>
                    Start with a natural-language
                    question.
                  </p>
                </Link>

                <Link
                  to="/standards"
                  className="bis-flow-step"
                >
                  <span className="bis-flow-step-number">
                    02
                  </span>

                  <div className="bis-flow-icon">
                    <Icon type="search" size={15} />
                  </div>

                  <h3>
                    Discover
                  </h3>

                  <p>
                    Find potentially relevant
                    standards.
                  </p>
                </Link>

                <Link
                  to="/compare"
                  className="bis-flow-step"
                >
                  <span className="bis-flow-step-number">
                    03
                  </span>

                  <div className="bis-flow-icon">
                    <Icon type="compare" size={15} />
                  </div>

                  <h3>
                    Understand
                  </h3>

                  <p>
                    Compare and interpret important
                    information.
                  </p>
                </Link>

                <Link
                  to="/certification"
                  className="bis-flow-step"
                >
                  <span className="bis-flow-step-number">
                    04
                  </span>

                  <div className="bis-flow-icon">
                    <Icon type="shield" size={15} />
                  </div>

                  <h3>
                    Certify
                  </h3>

                  <p>
                    Continue into certification
                    guidance.
                  </p>
                </Link>

                <Link
                  to="/compliance"
                  className="bis-flow-step"
                >
                  <span className="bis-flow-step-number">
                    05
                  </span>

                  <div className="bis-flow-icon">
                    <Icon type="check" size={15} />
                  </div>

                  <h3>
                    Comply
                  </h3>

                  <p>
                    Organize requirements and
                    continue your work.
                  </p>
                </Link>

              </div>
            </section>

            {/* =================================================
                LOWER AREA
            ================================================== */}

            <section className="bis-lower-grid">

              <article className="bis-panel">

                <div className="bis-panel-header">
                  <div>
                    <div className="bis-eyebrow">
                      CONTINUE
                    </div>

                    <h3>
                      Pick up where you left off.
                    </h3>
                  </div>

                  <Link to="/dashboard">
                    View Hub
                  </Link>
                </div>

                <Link
                  to="/dashboard"
                  className="bis-continue"
                >
                  <div className="bis-continue-icon">
                    <Icon type="clock" size={14} />
                  </div>

                  <div>
                    <strong>
                      Continue your BISense workspace
                    </strong>

                    <span>
                      Open your Intelligence Hub,
                      saved research and recent activity.
                    </span>
                  </div>

                  <div className="bis-continue-arrow">
                    <Icon type="arrow" size={13} />
                  </div>
                </Link>

                <Link
                  to="/copilot"
                  className="bis-continue"
                >
                  <div className="bis-continue-icon">
                    <Icon type="ai" size={14} />
                  </div>

                  <div>
                    <strong>
                      Start a new BIS AI conversation
                    </strong>

                    <span>
                      Ask questions about Indian
                      Standards and BIS workflows.
                    </span>
                  </div>

                  <div className="bis-continue-arrow">
                    <Icon type="arrow" size={13} />
                  </div>
                </Link>

              </article>

              <article className="bis-panel">

                <div className="bis-panel-header">
                  <div>
                    <div className="bis-eyebrow">
                      EXPLORE
                    </div>

                    <h3>
                      Frequently used workflows.
                    </h3>
                  </div>

                  <Link to="/standards">
                    Explore
                  </Link>
                </div>

                <div className="bis-recent-list">

                  <Link
                    to="/standards"
                    className="bis-recent-item"
                  >
                    <span className="bis-recent-number">
                      01
                    </span>

                    <div className="bis-recent-copy">
                      <strong>
                        Search Indian Standards
                      </strong>

                      <span>
                        Product, keyword or IS number
                      </span>
                    </div>

                    <span className="bis-recent-arrow">
                      <Icon type="arrow" size={11} />
                    </span>
                  </Link>

                  <Link
                    to="/product-analyzer"
                    className="bis-recent-item"
                  >
                    <span className="bis-recent-number">
                      02
                    </span>

                    <div className="bis-recent-copy">
                      <strong>
                        Analyze a Product
                      </strong>

                      <span>
                        AI-assisted product intelligence
                      </span>
                    </div>

                    <span className="bis-recent-arrow">
                      <Icon type="arrow" size={11} />
                    </span>
                  </Link>

                  <Link
                    to="/laboratories"
                    className="bis-recent-item"
                  >
                    <span className="bis-recent-number">
                      03
                    </span>

                    <div className="bis-recent-copy">
                      <strong>
                        Find a Laboratory
                      </strong>

                      <span>
                        BIS-recognized testing laboratories
                      </span>
                    </div>

                    <span className="bis-recent-arrow">
                      <Icon type="arrow" size={11} />
                    </span>
                  </Link>

                  <Link
                    to="/compliance"
                    className="bis-recent-item"
                  >
                    <span className="bis-recent-number">
                      04
                    </span>

                    <div className="bis-recent-copy">
                      <strong>
                        Check Compliance
                      </strong>

                      <span>
                        Build and track requirements
                      </span>
                    </div>

                    <span className="bis-recent-arrow">
                      <Icon type="arrow" size={11} />
                    </span>
                  </Link>

                </div>
              </article>

            </section>

            {/* =================================================
                PERSPECTIVES
            ================================================== */}

            <section className="bis-personal">

              <article className="bis-personal-card">

                <div className="bis-personal-icon">
                  <Icon type="user" size={16} />
                </div>

                <div className="bis-eyebrow">
                  CONSUMER
                </div>

                <h3>
                  Understand the products you buy.
                </h3>

                <p>
                  Learn about BIS marks, product standards,
                  certification concepts and verification.
                </p>

                <Link
                  to="/awareness"
                  className="bis-personal-link"
                >
                  Consumer experience
                  <Icon type="arrow" size={11} />
                </Link>

              </article>

              <article className="bis-personal-card manufacturer">

                <div className="bis-personal-icon">
                  <Icon type="grid" size={16} />
                </div>

                <div className="bis-eyebrow">
                  MANUFACTURER
                </div>

                <h3>
                  Navigate the BIS journey with confidence.
                </h3>

                <p>
                  Discover standards, certification,
                  testing and compliance workflows.
                </p>

                <Link
                  to="/certification"
                  className="bis-personal-link"
                >
                  Manufacturer experience
                  <Icon type="arrow" size={11} />
                </Link>

              </article>

            </section>

            {/* =================================================
                SOURCES
            ================================================== */}

            <section className="bis-source-bar">

              <div className="bis-source-copy">
                <strong>
                  VERIFY IMPORTANT INFORMATION
                </strong>

                <span>
                  BISense is an AI-assisted information
                  and workflow layer.
                </span>
              </div>

              <div className="bis-source-links">

                <a
                  href="https://www.bis.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  BIS Official
                  <Icon type="external" size={9} />
                </a>

                <a
                  href="https://standards.bis.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Standards Portal
                  <Icon type="external" size={9} />
                </a>

                <a
                  href="https://lims.bis.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  BIS LIMS
                  <Icon type="external" size={9} />
                </a>

              </div>

            </section>

            {/* =================================================
                FOOTER
            ================================================== */}

            <footer className="bis-home-footer">

              <div className="bis-home-footer-inner">

                <span>
                  BISense · SIH project prototype
                </span>

                <div className="bis-home-footer-links">

                  <Link to="/copilot">
                    BIS AI
                  </Link>

                  <Link to="/standards">
                    Standards
                  </Link>

                  <Link to="/dashboard">
                    Intelligence Hub
                  </Link>

                  <Link to="/profile">
                    Profile
                  </Link>

                </div>

              </div>

            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;