import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
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

function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

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
    return (
      <div className="app-page">
        <main className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Checking your BISense session...</span>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="main-content">
          <Routes>
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
              element={<ProtectedRoute />}
            >
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />
            </Route>

            <Route
              path="/awareness"
              element={<Awareness />}
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}