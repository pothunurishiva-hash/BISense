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
      if (!email.trim() || !password.trim()) {
        throw new Error("Please enter your email and password.");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (isSignup && !name.trim()) {
        throw new Error("Please enter your name.");
      }

      if (isSignup) {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
              },
            },
          });

        if (signupError) {
          throw signupError;
        }

        if (data.session) {
          navigate("/dashboard");
        } else {
          setMessage(
            "Account created. Check your email to confirm your account, then log in."
          );
          setMode("login");
        }
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) {
          throw loginError;
        }

        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err?.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page">
      <main className="auth-page">
        <div className="auth-card">
          <Link
            to="/"
            className="logo"
            aria-label="BISense Home"
          >
            BIS<span>ense</span>
          </Link>

          <p className="eyebrow">
            {isSignup ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
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
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
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

          <div className="auth-switch">
            <span>
              {isSignup
                ? "Already have an account?"
                : "Don't have an account?"}
            </span>

            <button
              type="button"
              onClick={() => {
                setMode(
                  isSignup ? "login" : "signup"
                );
                setError("");
                setMessage("");
              }}
            >
              {isSignup
                ? "Login"
                : "Create one"}
            </button>
          </div>

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