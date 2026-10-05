import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    let completed = false;

    const finishAuthentication = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const callbackError =
          params.get("error_description") ||
          hash.get("error_description");

        if (callbackError) {
          throw new Error(callbackError.replace(/\+/g, " "));
        }

        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        if (session?.user) {
          completed = true;
          setStatus("success");
          navigate("/dashboard", { replace: true });
          return;
        }

        setStatus("error");
        setError(
          "Your account could not be signed in automatically. Please return to Login and try again."
        );
      } catch (err) {
        console.error("Authentication callback error:", err);

        if (!mounted) return;

        setStatus("error");
        setError(
          err?.message ||
            "Authentication could not be completed. Please return to Login and try again."
        );
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user && ["SIGNED_IN", "INITIAL_SESSION"].includes(event)) {
        completed = true;
        setStatus("success");
        navigate("/dashboard", { replace: true });
      }
    });

    finishAuthentication();

    timeoutId = window.setTimeout(() => {
      if (!mounted || completed) return;

      setStatus("error");
      setError(
        "Authentication is taking longer than expected. Please return to Login and try again."
      );
    }, 10000);

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="bis-auth-callback-page">
      <style>{callbackStyles}</style>

      <div className="bis-auth-callback-card">
        <div className="bis-auth-callback-mark">B</div>

        {status !== "error" ? (
          <>
            <h1>Finishing secure sign-in</h1>
            <p>
              BISense is completing your authenticated session. You will be
              redirected automatically.
            </p>
            <div className="bis-auth-callback-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </>
        ) : (
          <>
            <h1>Authentication needs attention</h1>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const callbackStyles = `
.bis-auth-callback-page {
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: #f4f6f9;
  color: #101828;
}

.bis-auth-callback-card {
  width: min(430px, 100%);
  padding: 36px 32px;
  border: 1px solid #dfe4ec;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(16, 24, 40, 0.08);
  text-align: center;
}

.bis-auth-callback-mark {
  width: 50px;
  height: 50px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #0b3d91;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
}

.bis-auth-callback-card h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -.03em;
}

.bis-auth-callback-card p {
  margin: 12px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.bis-auth-callback-card button {
  width: 100%;
  min-height: 46px;
  margin-top: 22px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.bis-auth-callback-dots {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 20px;
}

.bis-auth-callback-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2563eb;
  animation: bisAuthCallbackDot 1.1s ease-in-out infinite;
}

.bis-auth-callback-dots i:nth-child(2) {
  animation-delay: .15s;
}

.bis-auth-callback-dots i:nth-child(3) {
  animation-delay: .3s;
}

@keyframes bisAuthCallbackDot {
  0%, 100% {
    opacity: .25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
`;
