import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanName = name.trim();

      if (!cleanEmail || !password.trim()) {
        throw new Error("Please enter your email and password.");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (isSignup && !cleanName) {
        throw new Error("Please enter your name.");
      }

      if (isSignup) {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: cleanName,
              },
            },
          });

        if (signupError) {
          throw signupError;
        }

        if (data?.session) {
          navigate("/dashboard");
          return;
        }

        setMessage(
          "Account created. Check your email to confirm your account, then log in."
        );

        setMode("login");
        setPassword("");
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          throw loginError;
        }

        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        err?.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((currentMode) =>
      currentMode === "login" ? "signup" : "login"
    );

    setError("");
    setMessage("");
  };

  return (
    <div className="app-page auth-page">
      {/* =====================================================
          LOGIN-PAGE SCOPED STYLES
          These protect the auth text from mobile/browser
          color overrides without changing the rest of BISense.
          ===================================================== */}

      <style>
        {`
          .auth-page,
          .auth-page * {
            color-scheme: light;
          }

          .auth-page {
            color: #0F1B33;
          }

          .auth-page .auth-card {
            color: #0F1B33;
          }

          .auth-page .auth-card .logo {
            color: #0F1B33 !important;
            -webkit-text-fill-color: #0F1B33 !important;
          }

          .auth-page .auth-card .logo span {
            color: #0F1B33 !important;
            -webkit-text-fill-color: #0F1B33 !important;
          }

          .auth-page .auth-card .eyebrow {
            color: #52627A !important;
            -webkit-text-fill-color: #52627A !important;
          }

          .auth-page .auth-card h1 {
            color: #0F1B33 !important;
            -webkit-text-fill-color: #0F1B33 !important;
          }

          .auth-page .auth-subtitle {
            color: #4F607A !important;
            -webkit-text-fill-color: #4F607A !important;
          }

          .auth-page .form-group label {
            color: #243653 !important;
            -webkit-text-fill-color: #243653 !important;
          }

          .auth-page .form-group input {
            color: #0F1B33 !important;
            -webkit-text-fill-color: #0F1B33 !important;
            background: #FFFFFF !important;
            caret-color: #2563EB !important;
          }

          .auth-page .form-group input::placeholder {
            color: #8793A5 !important;
            -webkit-text-fill-color: #8793A5 !important;
            opacity: 1 !important;
          }

          .auth-page .auth-switch {
            color: #30425F !important;
            -webkit-text-fill-color: #30425F !important;
          }

          .auth-page .auth-switch span {
            color: #30425F !important;
            -webkit-text-fill-color: #30425F !important;
          }

          .auth-page .auth-switch button {
            color: #2563EB !important;
            -webkit-text-fill-color: #2563EB !important;
            background: transparent !important;
          }

          .auth-page .auth-links {
            color: #40526D !important;
            -webkit-text-fill-color: #40526D !important;
          }

          .auth-page .auth-links a {
            color: #2563EB !important;
            -webkit-text-fill-color: #2563EB !important;
          }

          .auth-page .auth-error {
            color: #8B3152 !important;
            -webkit-text-fill-color: #8B3152 !important;
          }

          .auth-page .auth-success {
            color: #247657 !important;
            -webkit-text-fill-color: #247657 !important;
          }

          .auth-page .auth-submit,
          .auth-page .auth-submit * {
            color: #FFFFFF !important;
            -webkit-text-fill-color: #FFFFFF !important;
          }

          @media (max-width: 600px) {
            .auth-page {
              width: 100%;
              min-width: 320px;
            }

            .auth-page .auth-card {
              color: #0F1B33 !important;
            }

            .auth-page .auth-card h1 {
              font-size: 34px !important;
              line-height: 1.05 !important;
            }

            .auth-page .auth-subtitle {
              font-size: 12px !important;
              line-height: 1.5 !important;
            }

            .auth-page .form-group label {
              font-size: 11px !important;
            }

            .auth-page .form-group input {
              font-size: 13px !important;
            }

            .auth-page .auth-switch,
            .auth-page .auth-links {
              font-size: 11px !important;
            }
          }
        `}
      </style>

      <main className="auth-page">
        <div className="auth-card">
          {/* Logo */}

          <Link
            to="/"
            className="logo"
            aria-label="BISense Home"
          >
            BIS<span>ense</span>
          </Link>

          {/* Heading */}

          <p className="eyebrow">
            {isSignup ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
          </p>

          <h1>
            {isSignup ? "Join BISense" : "Login to BISense"}
          </h1>

          <p className="auth-subtitle">
            {isSignup
              ? "Create your BISense workspace and keep your BIS research connected."
              : "Access your BISense dashboard, saved standards and workspace."}
          </p>

          {/* Authentication form */}

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            {isSignup && (
              <div className="form-group">
                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
                disabled={loading}
              />
            </div>

            {error && (
              <div
                className="auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="auth-success"
                role="status"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="primary-btn auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isSignup
                  ? "Create Account"
                  : "Login"}
            </button>
          </form>

          {/* Login / Signup switch */}

          <div className="auth-switch">
            <span>
              {isSignup
                ? "Already have an account?"
                : "Don't have an account?"}
            </span>

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
            >
              {isSignup ? "Login" : "Create one"}
            </button>
          </div>

          {/* Secondary navigation */}

          <div className="auth-links">
            <Link to="/copilot">
              Continue with BIS AI →
            </Link>

            <Link to="/">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}