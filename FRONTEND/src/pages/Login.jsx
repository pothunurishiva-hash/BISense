import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

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

        if (mounted && session?.user) {
          navigate("/dashboard", {
            replace: true,
          });
        }
      } catch (err) {
        console.error("Session check failed:", err);
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

    if (loading) return;

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
        throw new Error("Please enter your name.");
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
        } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

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
    if (loading) return;

    setMode((current) =>
      current === "login" ? "signup" : "login"
    );

    setError("");
    setMessage("");
    setPassword("");
  };

  if (checkingSession) {
    return (
      <div className="bis-auth-page">
        <style>{authStyles}</style>

        <div className="bis-auth-loading">
          <div className="bis-auth-loading-mark">
            B
          </div>

          <strong>Checking your BISense session</strong>

          <span>
            Preparing secure access...
          </span>

          <div className="bis-auth-dots">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bis-auth-page">
      <style>{authStyles}</style>

      <div className="bis-auth-shell">
        <section className="bis-auth-intro">
          <div className="bis-auth-brand">
            BIS<span>ense</span>
          </div>

          <div className="bis-auth-intro-content">
            <span className="bis-auth-kicker">
              STANDARDS INTELLIGENCE
            </span>

            <h1>
              Discover.
              <br />
              Understand.
              <br />
              Comply.
            </h1>

            <p>
              One place to explore Indian Standards,
              understand requirements and navigate the
              BIS journey with source-backed guidance.
            </p>

            <div className="bis-auth-points">
              <div>
                <b>01</b>
                <span>Standards discovery</span>
              </div>

              <div>
                <b>02</b>
                <span>Guided understanding</span>
              </div>

              <div>
                <b>03</b>
                <span>Compliance workflows</span>
              </div>
            </div>
          </div>

          <div className="bis-auth-intro-footer">
            Built for consumers & industry
            <span />
            BISense
          </div>
        </section>

        <section className="bis-auth-form-side">
          <div className="bis-auth-card">
            <div className="bis-auth-mobile-brand">
              BIS<span>ense</span>
            </div>

            <span className="bis-auth-form-kicker">
              {isSignup
                ? "CREATE YOUR ACCOUNT"
                : "SECURE ACCESS"}
            </span>

            <h2>
              {isSignup
                ? "Create your BISense workspace"
                : "Welcome back"}
            </h2>

            <p className="bis-auth-subtitle">
              {isSignup
                ? "Create an account to keep your BIS research and compliance work connected."
                : "Continue your standards and compliance journey."}
            </p>

            <form
              className="bis-auth-form"
              onSubmit={handleSubmit}
            >
              {isSignup && (
                <div className="bis-field">
                  <label htmlFor="login-name">
                    Full name
                  </label>

                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
              )}

              <div className="bis-field">
                <label htmlFor="login-email">
                  Email address
                </label>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                />
              </div>

              <div className="bis-field">
                <div className="bis-password-label">
                  <label htmlFor="login-password">
                    Password
                  </label>

                  <span>Minimum 6 characters</span>
                </div>

                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
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
                  className="bis-auth-message error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  className="bis-auth-message success"
                  role="status"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="bis-auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isSignup
                    ? "Create Account"
                    : "Sign in"}
              </button>
            </form>

            <div className="bis-auth-switch">
              <span>
                {isSignup
                  ? "Already have an account?"
                  : "New to BISense?"}
              </span>

              <button
                type="button"
                onClick={switchMode}
                disabled={loading}
              >
                {isSignup
                  ? "Sign in"
                  : "Create an account"}
              </button>
            </div>

            <div className="bis-auth-bottom-links">
              <Link to="/copilot">
                Explore BIS AI →
              </Link>

              <Link to="/">
                Back to home
              </Link>
            </div>

            <div className="bis-auth-note">
              BISense is an AI-assisted information tool.
              Verify important requirements with official
              BIS sources.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const authStyles = `
.bis-auth-page {
  min-height: 100vh;
  width: 100%;
  background: #f4f6f9;
  color: #101828;
  overflow-x: hidden;
}

.bis-auth-shell {
  width: min(1160px, calc(100% - 40px));
  min-height: 680px;
  margin: 32px auto;

  display: grid;
  grid-template-columns: 1fr 0.86fr;

  background: #ffffff;
  border: 1px solid #dfe4ec;
  border-radius: 16px;
  overflow: hidden;

  box-shadow:
    0 18px 45px rgba(16, 24, 40, 0.08),
    0 3px 10px rgba(16, 24, 40, 0.03);
}

.bis-auth-intro {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  padding: 52px 56px;

  background: #0d1f3d;
  color: #ffffff;
  overflow: hidden;
}

.bis-auth-intro::before {
  content: "";
  position: absolute;
  width: 500px;
  height: 500px;
  right: -250px;
  bottom: -270px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 50%;
}

.bis-auth-intro::after {
  content: "";
  position: absolute;
  width: 300px;
  height: 300px;
  right: -160px;
  bottom: -160px;
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 50%;
}

.bis-auth-brand,
.bis-auth-mobile-brand {
  position: relative;
  z-index: 2;

  color: #ffffff;
  font-size: 24px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -.05em;
}

.bis-auth-brand span,
.bis-auth-mobile-brand span {
  font-weight: 500;
}

.bis-auth-intro-content {
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.bis-auth-kicker,
.bis-auth-form-kicker {
  display: block;
  margin-bottom: 15px;

  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.bis-auth-kicker {
  color: rgba(255,255,255,.62);
}

.bis-auth-intro h1 {
  margin: 0;

  color: #ffffff;

  font-size: clamp(48px, 5vw, 68px);
  line-height: .99;
  letter-spacing: -.055em;
  font-weight: 780;
}

.bis-auth-intro-content > p {
  max-width: 500px;
  margin: 23px 0 0;

  color: rgba(255,255,255,.76);

  font-size: 14px;
  line-height: 1.75;
}

.bis-auth-points {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 31px;
}

.bis-auth-points div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bis-auth-points b {
  width: 26px;
  color: #9fc3ff;
  font-size: 10px;
  letter-spacing: .08em;
}

.bis-auth-points span {
  color: rgba(255,255,255,.88);
  font-size: 12px;
}

.bis-auth-intro-footer {
  position: relative;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 10px;

  color: rgba(255,255,255,.5);
  font-size: 10px;
}

.bis-auth-intro-footer > span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255,255,255,.35);
}

.bis-auth-form-side {
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 48px;
  background: #ffffff;
}

.bis-auth-card {
  width: 100%;
  max-width: 400px;
}

.bis-auth-mobile-brand {
  display: none;
  color: #101828;
  margin-bottom: 35px;
}

.bis-auth-form-kicker {
  color: #667085;
}

.bis-auth-card h2 {
  margin: 0;

  color: #101828;

  font-size: 34px;
  line-height: 1.08;
  letter-spacing: -.04em;
  font-weight: 760;
}

.bis-auth-subtitle {
  max-width: 380px;
  margin: 10px 0 0;

  color: #667085;

  font-size: 13px;
  line-height: 1.65;
}

.bis-auth-form {
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin-top: 27px;
}

.bis-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bis-field label,
.bis-password-label label {
  color: #344054;
  font-size: 11px;
  font-weight: 700;
}

.bis-field input {
  width: 100%;
  height: 47px;

  padding: 0 13px;

  border: 1px solid #d0d5dd;
  border-radius: 8px;

  background: #ffffff;

  color: #101828;
  font-size: 13px;

  outline: none;

  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.bis-field input::placeholder {
  color: #98a2b3;
}

.bis-field input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,.1);
}

.bis-field input:disabled {
  background: #f9fafb;
}

.bis-password-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.bis-password-label span {
  color: #98a2b3;
  font-size: 9px;
}

.bis-auth-message {
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.bis-auth-message.error {
  border: 1px solid #fecdca;
  background: #fff6f5;
  color: #b42318;
}

.bis-auth-message.success {
  border: 1px solid #abefc6;
  background: #ecfdf3;
  color: #067647;
}

.bis-auth-submit {
  width: 100%;
  min-height: 47px;

  margin-top: 2px;

  border: 1px solid #2563eb;
  border-radius: 8px;

  background: #2563eb;
  color: #ffffff;

  font-size: 13px;
  font-weight: 750;

  cursor: pointer;

  transition:
    background-color 150ms ease,
    transform 150ms ease;
}

.bis-auth-submit:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.bis-auth-submit:disabled {
  opacity: .7;
  cursor: wait;
}

.bis-auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  margin-top: 20px;

  color: #667085;
  font-size: 11px;
}

.bis-auth-switch button {
  padding: 0;
  border: 0;
  background: transparent;

  color: #2563eb;
  font-size: inherit;
  font-weight: 750;

  cursor: pointer;
}

.bis-auth-bottom-links {
  display: flex;
  justify-content: space-between;
  gap: 15px;

  margin-top: 19px;
}

.bis-auth-bottom-links a {
  color: #475467;
  font-size: 10px;
  font-weight: 650;
  text-decoration: none;
}

.bis-auth-bottom-links a:first-child {
  color: #2563eb;
}

.bis-auth-note {
  margin-top: 23px;
  padding-top: 16px;

  border-top: 1px solid #eaecf0;

  color: #98a2b3;
  font-size: 9px;
  line-height: 1.6;
}

.bis-auth-loading {
  min-height: 100vh;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;

  text-align: center;
}

.bis-auth-loading-mark {
  width: 50px;
  height: 50px;

  display: grid;
  place-items: center;

  margin-bottom: 7px;

  border-radius: 12px;

  background: #0b3d91;
  color: #ffffff;

  font-size: 20px;
  font-weight: 800;
}

.bis-auth-loading strong {
  color: #101828;
  font-size: 13px;
}

.bis-auth-loading > span {
  color: #667085;
  font-size: 11px;
}

.bis-auth-dots {
  display: flex;
  gap: 4px;
  margin-top: 7px;
}

.bis-auth-dots i {
  width: 4px;
  height: 4px;

  border-radius: 50%;
  background: #2563eb;

  animation: bisAuthDot 1.1s ease-in-out infinite;
}

.bis-auth-dots i:nth-child(2) {
  animation-delay: .15s;
}

.bis-auth-dots i:nth-child(3) {
  animation-delay: .3s;
}

@keyframes bisAuthDot {
  0%,100% {
    opacity: .25;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (max-width: 850px) {
  .bis-auth-shell {
    width: min(680px, calc(100% - 28px));
    grid-template-columns: 1fr;
  }

  .bis-auth-intro {
    display: none;
  }

  .bis-auth-form-side {
    min-height: 650px;
  }

  .bis-auth-mobile-brand {
    display: block;
  }
}

@media (max-width: 520px) {
  .bis-auth-shell {
    width: calc(100% - 18px);
    margin: 9px auto;
    border-radius: 11px;
  }

  .bis-auth-form-side {
    padding: 34px 20px;
    min-height: calc(100vh - 18px);
  }

  .bis-auth-card h2 {
    font-size: 29px;
  }

  .bis-auth-subtitle {
    font-size: 12px;
  }

  .bis-auth-bottom-links {
    flex-direction: column;
    align-items: center;
  }
}
`;