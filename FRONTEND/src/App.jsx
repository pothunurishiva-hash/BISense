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

/* =========================================================
   BISENSE — APPLICATION BOOT SCREEN
   Used while Supabase checks the current session.
   ========================================================= */

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
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   AUTH PROTECTION
   Existing Supabase authentication logic is preserved.
   ========================================================= */

function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setStatus(user ? "authenticated" : "unauthenticated");
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (mounted) {
          setStatus("unauthenticated");
        }
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return <AppLoadingScreen message="Checking your BISense session" />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/* =========================================================
   PAGE TRANSITION WRAPPER
   Gives each route a clean mount point for subtle animation.
   ========================================================= */

function PageFrame() {
  const location = useLocation();

  return (
    <main className="main-content">
      <div key={location.pathname} className="route-frame">
        <Outlet />
      </div>
    </main>
  );
}

/* =========================================================
   APPLICATION
   ========================================================= */

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Public routes */}
          <Route element={<PageFrame />}>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />

            <Route path="/copilot" element={<BISCopilot />} />

            <Route
              path="/ai"
              element={<Navigate to="/copilot" replace />}
            />

            <Route
              path="/search"
              element={<Navigate to="/standards" replace />}
            />

            <Route
              path="/standards"
              element={<StandardSearch />}
            />

            <Route
              path="/standard/:standardNumber"
              element={<StandardDetails />}
            />

            <Route
              path="/compare"
              element={<CompareStandards />}
            />

            <Route
              path="/certification"
              element={<CertificationAdvisor />}
            />

            <Route
              path="/product-analyzer"
              element={<ProductAnalyzer />}
            />

            <Route
              path="/compliance"
              element={<Compliance />}
            />

            <Route
              path="/laboratories"
              element={<Laboratories />}
            />

            <Route
              path="/awareness"
              element={<Awareness />}
            />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PageFrame />}>
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}