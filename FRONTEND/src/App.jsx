import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import StandardSearch from "./pages/StandardSearch";
import StandardDetails from "./pages/StandardDetails";
import CompareStandards from "./pages/CompareStandards";
import CertificationAdvisor from "./pages/CertificationAdvisor";
import ProductAnalyzer from "./pages/ProductAnalyzer";
import Compliance from "./pages/Compliance";
import Laboratories from "./pages/Laboratories";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Awareness from "./pages/Awareness";
import BISCopilot from "./pages/BISCopilot";

const BACKEND_ORIGIN = (
  import.meta.env.VITE_RENDER_BACKEND_URL ||
  "https://bisense-5ozn.onrender.com"
).replace(/\/+$/, "");

// One initial readiness gate per full page load. This keeps the app from
// opening into a page whose first backend request is still waking Render.
const SPLASH_DURATION_MS = 1_300;
const BACKEND_WARMUP_TIMEOUT_MS = 20_000;

function BackendStartupScreen({
  status,
  elapsedMs,
  errorMessage,
  onRetry,
  onContinue,
}) {
  const seconds = Math.floor(elapsedMs / 1000);
  const isReady = status === "ready";
  const hasFailed = status === "failed";

  let heading = "Connecting to BISense";
  let detail = "Waking up the backend so your tools are ready when you enter.";

  if (isReady) {
    heading = "Connection established";
    detail = "The BISense backend is responding. Opening your workspace…";
  } else if (seconds >= 60) {
    heading = "Still starting up";
    detail = "The service is taking longer than usual. Keep this tab open while we try again.";
  } else if (seconds >= 20) {
    heading = "Waking up the backend";
    detail = "On free hosting, the first start after inactivity can take around a minute.";
  }

  if (hasFailed) {
    heading = "We couldn’t confirm the connection";
    detail = errorMessage || "The backend did not become ready within the waiting period.";
  }

  return (
    <div className="bis-startup-screen" role="status" aria-live="polite">
      <style>{STARTUP_CSS}</style>

      <div className="bis-startup-decoration bis-startup-decoration-a" />
      <div className="bis-startup-decoration bis-startup-decoration-b" />

      <main className="bis-startup-card" role="status" aria-live="polite">
        <div className="bis-startup-workout-illustration" aria-hidden="true">
          <svg className="bis-startup-lifter-svg" viewBox="0 0 180 112" role="img" aria-label="A man lifting a weighted barbell">
            <defs>
              <linearGradient id="bisLifterBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f2f7ff" />
                <stop offset="100%" stopColor="#dceaff" />
              </linearGradient>
              <linearGradient id="bisLifterBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dbe4ef" />
                <stop offset="50%" stopColor="#7f91a9" />
                <stop offset="100%" stopColor="#e8eef6" />
              </linearGradient>
            </defs>

            <rect width="180" height="112" rx="18" fill="url(#bisLifterBg)" />
            <circle cx="25" cy="20" r="13" fill="#ffffff" opacity="0.55" />
            <circle cx="153" cy="26" r="19" fill="#ffffff" opacity="0.4" />
            <path d="M15 96 H165" stroke="#c8d9f0" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="90" cy="97" rx="36" ry="5" fill="#a9bfdf" opacity="0.35" />

            {/* Torso and upper arms */}
            <path d="M78 35 Q83 32 87 33 L93 33 Q98 32 102 35 L110 57 L106 91 L74 91 L70 57 Z" fill="#162b4d" />
            <path d="M82 39 Q90 43 98 39" fill="none" stroke="#2e4c76" strokeWidth="2" strokeLinecap="round" />
            <path d="M76 40 Q70 43 65 56" fill="none" stroke="#d99b75" strokeWidth="10" strokeLinecap="round" />
            <path d="M104 40 Q110 43 115 56" fill="none" stroke="#d99b75" strokeWidth="10" strokeLinecap="round" />
            <path d="M77 91 L76 104 L88 104 L90 91 Z" fill="#21395d" />
            <path d="M90 91 L92 104 L104 104 L103 91 Z" fill="#21395d" />

            {/* Head, hair and face */}
            <path d="M84 30 L84 37 Q90 41 96 37 L96 30" fill="#c98761" />
            <circle cx="90" cy="21" r="11" fill="#e4ad86" />
            <path d="M79 21 Q77 10 88 9 Q99 7 102 18 L100 22 L96 16 Q89 20 81 17 Z" fill="#18263b" />
            <path d="M83 22 L86 22 M94 22 L97 22" stroke="#493329" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M87 28 Q90 30 93 28" fill="none" stroke="#8f523e" strokeWidth="1.4" strokeLinecap="round" />

            {/* Forearms curl upward as the barbell lifts */}
            <g className="bis-startup-lifter-left-forearm">
              <path d="M65 56 Q70 64 78 72" fill="none" stroke="#e0a47d" strokeWidth="8" strokeLinecap="round" />
              <path d="M68 60 Q72 66 77 69" fill="none" stroke="#f0bd98" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            </g>
            <g className="bis-startup-lifter-right-forearm">
              <path d="M115 56 Q110 64 102 72" fill="none" stroke="#e0a47d" strokeWidth="8" strokeLinecap="round" />
              <path d="M112 60 Q108 66 103 69" fill="none" stroke="#f0bd98" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            </g>

            {/* Loaded barbell */}
            <g className="bis-startup-barbell">
              <rect x="29" y="60" width="8" height="27" rx="2" fill="#253248" />
              <rect x="23" y="56" width="6" height="35" rx="2" fill="#111e32" />
              <rect x="143" y="60" width="8" height="27" rx="2" fill="#253248" />
              <rect x="151" y="56" width="6" height="35" rx="2" fill="#111e32" />
              <rect x="34" y="70" width="112" height="5" rx="2.5" fill="url(#bisLifterBar)" />
              <rect x="38" y="71" width="104" height="1" rx="0.5" fill="#ffffff" opacity="0.8" />
              <rect x="39" y="68" width="3" height="9" rx="1" fill="#7a8ba2" />
              <rect x="138" y="68" width="3" height="9" rx="1" fill="#7a8ba2" />
            </g>

            {/* Hands sit in front of the bar to make the grip clear */}
            <g className="bis-startup-lifter-left-hand">
              <path d="M73 69 Q77 65 81 69 L83 73 Q82 77 78 77 L74 74 Z" fill="#e7b08b" stroke="#c98761" strokeWidth="1" />
              <path d="M75 70 L80 73" stroke="#c98761" strokeWidth="1" strokeLinecap="round" />
            </g>
            <g className="bis-startup-lifter-right-hand">
              <path d="M107 69 Q103 65 99 69 L97 73 Q98 77 102 77 L106 74 Z" fill="#e7b08b" stroke="#c98761" strokeWidth="1" />
              <path d="M105 70 L100 73" stroke="#c98761" strokeWidth="1" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <div className="bis-startup-brand-row">
          <div className="bis-startup-brand-mark" aria-hidden="true">
            <span />
          </div>
          <div className="bis-startup-brand-name">BIS<span>ense</span></div>
          <div className="bis-startup-platform-label">STANDARDS INTELLIGENCE</div>
        </div>

        <div className={`bis-startup-status-icon ${isReady ? "is-ready" : hasFailed ? "is-error" : ""}`} aria-hidden="true">
          {isReady ? (
            <svg viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.2 4.2L19.5 6.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : hasFailed ? (
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 3h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.74 3h15.12a2 2 0 0 0 1.74-3l-7.56-13.1a2 2 0 0 0-3.44 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <span className="bis-startup-spinner" />
          )}
        </div>

        <p className="bis-startup-eyebrow">{hasFailed ? "CONNECTION NEEDS ATTENTION" : isReady ? "BACKEND READY" : "PREPARING YOUR WORKSPACE"}</p>
        <h1>{heading}</h1>
        <p className="bis-startup-detail">{detail}</p>

        {!hasFailed && (
          <div className="bis-startup-progress-wrap" aria-hidden="true">
            <div className={`bis-startup-progress ${isReady ? "progress-complete" : ""}`} />
          </div>
        )}

        <div className="bis-startup-steps">
          <div className={`bis-startup-step ${!hasFailed ? "step-active" : ""} ${isReady ? "step-done" : ""}`}>
            <span className="bis-startup-step-dot">{isReady ? "✓" : "1"}</span>
            <span>Start backend</span>
          </div>
          <div className={`bis-startup-step ${isReady ? "step-done" : ""}`}>
            <span className="bis-startup-step-dot">{isReady ? "✓" : "2"}</span>
            <span>Confirm response</span>
          </div>
          <div className={`bis-startup-step ${isReady ? "step-done" : ""}`}>
            <span className="bis-startup-step-dot">{isReady ? "✓" : "3"}</span>
            <span>Open BISense</span>
          </div>
        </div>

        {!hasFailed && (
          <p className="bis-startup-elapsed">{isReady ? "Ready — one moment…" : `Waiting ${seconds}s · Please keep this tab open`}</p>
        )}

        {hasFailed && (
          <div className="bis-startup-actions">
            <button type="button" className="bis-startup-retry" onClick={onRetry}>Retry connection</button>
            <button type="button" className="bis-startup-continue" onClick={onContinue}>Continue anyway</button>
            <p className="bis-startup-footnote">Continuing without a confirmed connection means some live features may remain unavailable until the backend responds.</p>
          </div>
        )}

        <div className="bis-startup-footer">
          <span className="bis-startup-footer-dot" />
          BISense · Indian Standards Intelligence
        </div>
      </main>
    </div>
  );
}

const STARTUP_CSS = `
  .bis-startup-screen, .bis-startup-screen * { box-sizing: border-box; }
  .bis-startup-screen {
    --startup-navy: #0c1e3a;
    --startup-blue: #1d65d8;
    min-height: 100vh; width: 100%; position: relative; overflow: hidden;
    display: grid; place-items: center; padding: 28px 16px;
    color: var(--startup-navy);
    background: radial-gradient(circle at 12% 12%, rgba(45,124,240,.11), transparent 30%),
                radial-gradient(circle at 90% 88%, rgba(45,124,240,.09), transparent 28%), #f5f8fd;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .bis-startup-decoration { position:absolute; border-radius:50%; border:1px solid rgba(29,101,216,.10); pointer-events:none; }
  .bis-startup-decoration-a { width:560px; height:560px; left:-260px; bottom:-320px; }
  .bis-startup-decoration-b { width:460px; height:460px; right:-230px; top:-260px; }
  .bis-startup-card {
    position:relative; width:min(100%, 530px); padding:34px clamp(22px, 5vw, 42px) 24px;
    border:1px solid rgba(208,220,236,.92); border-radius:26px;
    background:rgba(255,255,255,.95); box-shadow:0 30px 90px rgba(22,50,91,.12), 0 2px 8px rgba(22,50,91,.04);
    text-align:center;
  }
  .bis-startup-workout-illustration {
    width: 180px; height: 112px; margin: 0 auto 18px;
    overflow: hidden; border: 1px solid #d6e5fb; border-radius: 18px;
    background: #e8f1ff; box-shadow: 0 8px 22px rgba(29,101,216,.11);
  }
  .bis-startup-lifter-svg { display: block; width: 100%; height: 100%; }
  .bis-startup-lifter-left-forearm,
  .bis-startup-lifter-left-hand {
    transform-box: view-box; transform-origin: 65px 56px;
    animation: bisStartupCurlLeft 1.8s ease-in-out infinite;
  }
  .bis-startup-lifter-right-forearm,
  .bis-startup-lifter-right-hand {
    transform-box: view-box; transform-origin: 115px 56px;
    animation: bisStartupCurlRight 1.8s ease-in-out infinite;
  }
  .bis-startup-barbell {
    transform-box: view-box; transform-origin: 90px 73px;
    animation: bisStartupBarLift 1.8s ease-in-out infinite;
  }
  @keyframes bisStartupCurlLeft {
    0%, 100% { transform: rotate(0deg); }
    45%, 65% { transform: rotate(-17deg); }
  }
  @keyframes bisStartupCurlRight {
    0%, 100% { transform: rotate(0deg); }
    45%, 65% { transform: rotate(17deg); }
  }
  @keyframes bisStartupBarLift {
    0%, 100% { transform: translateY(0); }
    45%, 65% { transform: translateY(-6px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .bis-startup-lifter-left-forearm,
    .bis-startup-lifter-left-hand,
    .bis-startup-lifter-right-forearm,
    .bis-startup-lifter-right-hand,
    .bis-startup-barbell { animation: none; }
  }
  @media (max-width: 380px) {
    .bis-startup-workout-illustration { width: 164px; height: 102px; }
  }

  .bis-startup-brand-row { display:flex; align-items:center; gap:10px; text-align:left; }
  .bis-startup-brand-mark { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; background:linear-gradient(145deg,#104ca7,#2c7cf0); box-shadow:0 7px 17px rgba(29,101,216,.22); }
  .bis-startup-brand-mark span { display:block; width:13px; height:13px; border:3px solid #fff; border-radius:50%; box-shadow:5px 4px 0 -2px rgba(255,255,255,.82); }
  .bis-startup-brand-name { font-size:21px; font-weight:850; letter-spacing:-.045em; color:#0c1e3a; }
  .bis-startup-brand-name span { color:#1d65d8; }
  .bis-startup-platform-label { margin-left:auto; color:#8190a7; font-size:8px; font-weight:850; letter-spacing:.11em; }
  .bis-startup-status-icon { width:66px; height:66px; margin:34px auto 19px; display:grid; place-items:center; border:1px solid #d6e5fb; border-radius:21px; background:#f0f6ff; color:#1d65d8; }
  .bis-startup-status-icon svg { width:29px; height:29px; }
  .bis-startup-status-icon.is-ready { color:#15805d; border-color:#c9ebdc; background:#edfaf4; }
  .bis-startup-status-icon.is-error { color:#ac4b35; border-color:#f1d5c8; background:#fff5f0; }
  .bis-startup-spinner { width:27px; height:27px; display:block; border:3px solid #cfe0fb; border-top-color:#1d65d8; border-radius:50%; animation:bisStartupSpin .8s linear infinite; }
  @keyframes bisStartupSpin { to { transform:rotate(360deg); } }
  .bis-startup-eyebrow { margin:0 0 9px; color:#5b7da9; font-size:9px; font-weight:850; letter-spacing:.16em; }
  .bis-startup-card h1 { margin:0; color:#0c1e3a; font-size:clamp(27px, 5vw, 34px); line-height:1.12; letter-spacing:-.05em; }
  .bis-startup-detail { max-width:370px; margin:12px auto 0; color:#6d7c92; font-size:13px; line-height:1.65; }
  .bis-startup-progress-wrap { height:5px; margin:25px 0 23px; overflow:hidden; border-radius:20px; background:#e9eff7; }
  .bis-startup-progress { width:38%; height:100%; border-radius:20px; background:linear-gradient(90deg,#1657bb,#4897ff); animation:bisStartupProgress 1.7s ease-in-out infinite; }
  .bis-startup-progress.progress-complete { width:100%; animation:none; background:#279a70; transition:width .2s ease; }
  @keyframes bisStartupProgress { 0% { transform:translateX(-110%); } 100% { transform:translateX(280%); } }
  .bis-startup-steps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:16px 0 8px; border-top:1px solid #edf1f7; border-bottom:1px solid #edf1f7; }
  .bis-startup-step { display:flex; flex-direction:column; align-items:center; gap:8px; color:#98a5b7; font-size:10px; font-weight:700; }
  .bis-startup-step-dot { width:25px; height:25px; border:1px solid #dce4ef; border-radius:50%; display:grid; place-items:center; color:#8190a5; background:#f7f9fc; font-size:10px; }
  .bis-startup-step.step-active { color:#2d5e9b; }
  .bis-startup-step.step-active .bis-startup-step-dot { color:#1d65d8; border-color:#aacaf9; background:#edf5ff; }
  .bis-startup-step.step-done { color:#25805f; }
  .bis-startup-step.step-done .bis-startup-step-dot { color:#fff; border-color:#218b65; background:#218b65; }
  .bis-startup-elapsed { margin:16px 0 0; color:#8694a7; font-size:10px; }
  .bis-startup-actions { margin-top:20px; display:grid; gap:10px; }
  .bis-startup-retry { height:44px; border:0; border-radius:11px; color:white; background:linear-gradient(135deg,#1455b7,#287af0); font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 9px 20px rgba(29,101,216,.19); }
  .bis-startup-continue { border:0; padding:7px; color:#687a92; background:transparent; font-size:12px; font-weight:750; cursor:pointer; }
  .bis-startup-footnote { margin:0; color:#929fb0; font-size:10px; line-height:1.5; }
  .bis-startup-footer { display:flex; align-items:center; justify-content:center; gap:7px; margin-top:22px; color:#9aa6b6; font-size:9px; font-weight:700; }
  .bis-startup-footer-dot { width:6px; height:6px; border-radius:50%; background:#33a477; }
  @media(max-width:480px) { .bis-startup-card { padding:27px 19px 21px; border-radius:21px; } .bis-startup-platform-label { display:none; } .bis-startup-status-icon { margin-top:29px; } .bis-startup-step { font-size:9px; } }
`;

function AppLoadingScreen({ message = "Preparing BISense" }) {
  return (
    <div className="app-boot-screen" role="status" aria-live="polite">
      <div className="app-boot-content">
        <div className="app-boot-mark" aria-hidden="true">
          <span className="app-boot-mark-core" />
        </div>
        <div className="app-boot-brand">BISense</div>
        <div className="app-boot-message">{message}</div>
        <div className="app-boot-loader" aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    // Avoid leaving protected pages on an endless session-check screen if
    // Supabase is slow or unreachable. Normal auth events still update status.
    const sessionTimeout = window.setTimeout(() => {
      if (mounted) setStatus("unauthenticated");
    }, 10_000);

    const applySession = (session) => {
      if (mounted) setStatus(session?.user ? "authenticated" : "unauthenticated");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        applySession(session);
      } catch (error) {
        console.error("Authentication check failed:", error);
        if (mounted) setStatus("unauthenticated");
      } finally {
        window.clearTimeout(sessionTimeout);
      }
    };

    void checkSession();

    return () => {
      mounted = false;
      window.clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") return <AppLoadingScreen message="Checking your BISense session" />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PageFrame() {
  const location = useLocation();
  return (
    <main className="main-content">
      <div key={location.pathname} className="route-frame"><Outlet /></div>
    </main>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route element={<PageFrame />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/copilot" element={<BISCopilot />} />
            <Route path="/ai" element={<Navigate to="/copilot" replace />} />
            <Route path="/search" element={<Navigate to="/standards" replace />} />
            <Route path="/standards" element={<StandardSearch />} />
            <Route path="/standard/:standardNumber" element={<StandardDetails />} />
            <Route path="/compare" element={<CompareStandards />} />
            <Route path="/certification" element={<CertificationAdvisor />} />
            <Route path="/product-analyzer" element={<ProductAnalyzer />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/laboratories" element={<Laboratories />} />
            <Route path="/awareness" element={<Awareness />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<PageFrame />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    const controller = new AbortController();

    // Keep the branded lifter splash briefly, but NEVER make entering the app
    // depend on the backend's response. Render may be asleep, the root route
    // may differ, or an endpoint may return a non-JSON response.
    const elapsedTimer = window.setInterval(() => {
      if (!cancelled) setElapsedMs(Date.now() - startedAt);
    }, 250);
    const splashTimer = window.setTimeout(() => {
      if (!cancelled) setEntered(true);
    }, SPLASH_DURATION_MS);
    const warmupTimeout = window.setTimeout(() => controller.abort(), BACKEND_WARMUP_TIMEOUT_MS);

    // Fire a best-effort request to wake the backend in the background. This
    // request is intentionally not parsed or used as a gate for the frontend.
    void fetch(`${BACKEND_ORIGIN}/`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.debug("BISense backend warm-up request did not complete:", error?.message || error);
        }
      })
      .finally(() => window.clearTimeout(warmupTimeout));

    return () => {
      cancelled = true;
      window.clearInterval(elapsedTimer);
      window.clearTimeout(splashTimer);
      window.clearTimeout(warmupTimeout);
      controller.abort();
    };
  }, []);

  if (!entered) {
    return (
      <BackendStartupScreen
        status="checking"
        elapsedMs={elapsedMs}
        errorMessage=""
        onRetry={() => setEntered(true)}
        onContinue={() => setEntered(true)}
      />
    );
  }

  return <AppRoutes />;
}
