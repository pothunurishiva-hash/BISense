import React, { useEffect, useState } from "react";
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
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Unable to check session:",
            sessionError
          );
        }

        if (
          mounted &&
          session?.user
        ) {
          navigate("/dashboard", {
            replace: true,
          });
          return;
        }
      } catch (err) {
        console.error(
          "Session check failed:",
          err
        );
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanName = name.trim();

      if (!cleanEmail || !password) {
        throw new Error(
          "Please enter your email and password."
        );
      }

      if (isSignup && !cleanName) {
        throw new Error(
          "Please enter your name."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must be at least 6 characters."
        );
      }

      if (isSignup) {
        const {
          data,
          error: signupError,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              role: "Consumer",
              organization: "",
              product: "",
              location: "",
            },
          },
        });

        if (signupError) {
          throw signupError;
        }

        if (data?.session?.user) {
          navigate("/dashboard", {
            replace: true,
          });
          return;
        }

        setMessage(
          "Account created. Check your email to confirm your account, then log in."
        );

        setMode("login");
        setPassword("");
      } else {
        const {
          data,
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            }
          );

        if (loginError) {
          throw loginError;
        }

        if (!data?.user) {
          throw new Error(
            "Login completed, but no user session was returned."
          );
        }

        navigate("/dashboard", {
          replace: true,
        });
      }
    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setError(
        err?.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    if (loading) {
      return;
    }

    setMode((currentMode) =>
      currentMode === "login"
        ? "signup"
        : "login"
    );

    setError("");
    setMessage("");
    setPassword("");
  };

  if (checkingSession) {
    return (
      <div className="app-page auth-page">
        <style>{`
          .auth-page,
          .auth-page * {
            color-scheme: light;
          }

          .auth-page {
            min-height: 100vh;
            width: 100%;
            display: grid;
            place-items: center;
            box-sizing: border-box;
            background: #f8fafc;
            color: #0f1b33;
          }

          .auth-session-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #0f1b33 !important;
            text-align: center;
          }

          .auth-session-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: authSpin 0.8s linear infinite;
          }

          .auth-session-loading span {
            color: #0f1b33 !important;
            font-size: 14px;
          }

          @keyframes authSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="auth-session-loading">
          <div className="auth-session-spinner"></div>

          <span>
            Checking your session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page auth-page">
      <style>{`
        .auth-page,
        .auth-page * {
          color-scheme: light;
        }

        .auth-page {
          width: 100%;
          min-height: 100vh;
          color: #0F1B33;
          background: #f8fafc;
          overflow-x: hidden;
        }

        .auth-page .auth-card {
          color: #0F1B33 !important;
        }

        .auth-page .auth-card .logo {
          color: #0F1B33 !important;
          -webkit-text-fill-color: #0F1B33 !important;
          text-decoration: none;
        }

        .auth-page .auth-card .logo span {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
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
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .auth-page .form-group {
          min-width: 0;
        }

        .auth-page .form-group label {
          color: #243653 !important;
          -webkit-text-fill-color: #243653 !important;
        }

        .auth-page .form-group input {
          width: 100%;
          box-sizing: border-box;
          color: #0F1B33 !important;
          -webkit-text-fill-color: #0F1B33 !important;
          background: #FFFFFF !important;
          caret-color: #2563EB !important;
          border-color: #d3dae6;
        }

        .auth-page .form-group input::placeholder {
          color: #8793A5 !important;
          -webkit-text-fill-color: #8793A5 !important;
          opacity: 1 !important;
        }

        .auth-page .form-group input:focus {
          color: #0F1B33 !important;
          -webkit-text-fill-color: #0F1B33 !important;
          background: #FFFFFF !important;
        }

        .auth-page .form-group input:-webkit-autofill,
        .auth-page .form-group input:-webkit-autofill:hover,
        .auth-page .form-group input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0F1B33 !important;
          box-shadow: 0 0 0 1000px #FFFFFF inset !important;
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
          cursor: pointer;
        }

        .auth-page .auth-switch button:disabled {
          cursor: wait;
          opacity: 0.65;
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
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .auth-page .auth-success {
          color: #247657 !important;
          -webkit-text-fill-color: #247657 !important;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .auth-page .auth-submit,
        .auth-page .auth-submit * {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }

        .auth-page .auth-submit:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        @media (max-width: 600px) {
          .auth-page {
            width: 100%;
            min-width: 0;
          }

          .auth-page .auth-card {
            width: calc(100% - 28px);
            max-width: 440px;
            margin: 0 auto;
            box-sizing: border-box;
            color: #0F1B33 !important;
          }

          .auth-page .auth-card h1 {
            font-size: clamp(
              30px,
              8vw,
              36px
            ) !important;
            line-height: 1.08 !important;
          }

          .auth-page .auth-subtitle {
            font-size: 13px !important;
            line-height: 1.55 !important;
          }

          .auth-page .form-group label {
            font-size: 12px !important;
          }

          .auth-page .form-group input {
            min-height: 46px;
            font-size: 14px !important;
          }

          .auth-page .auth-switch,
          .auth-page .auth-links {
            font-size: 12px !important;
          }

          .auth-page .auth-submit {
            width: 100%;
            min-height: 47px;
          }
        }

        @media (max-width: 380px) {
          .auth-page .auth-card {
            width: calc(100% - 20px);
          }

          .auth-page .auth-card h1 {
            font-size: 29px !important;
          }

          .auth-page .auth-subtitle {
            font-size: 12px !important;
          }

          .auth-page .auth-links {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
        }
      `}</style>

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
            {isSignup
              ? "CREATE YOUR ACCOUNT"
              : "WELCOME BACK"}
          </p>

          <h1>
            {isSignup
              ? "Join BISense"
              : "Login to BISense"}
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
                <label htmlFor="login-name">
                  Full Name
                </label>

                <input
                  id="login-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
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
              {isSignup
                ? "Login"
                : "Create one"}
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