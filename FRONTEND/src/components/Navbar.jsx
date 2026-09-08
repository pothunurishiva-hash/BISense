import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const navLinkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  const isCopilot = location.pathname === "/copilot";

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(currentUser);
        setLoadingUser(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Logout failed:", error);
      return;
    }

    setUser(null);
    navigate("/");
  };

  const displayName =
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <nav className="navbar">
      <Link
        to="/"
        className="logo"
        aria-label="BISense Home"
      >
        BISense
      </Link>

      <div className="nav-links">
        <NavLink
          to="/standards"
          end
          className={navLinkClass}
        >
          Standards
        </NavLink>

        <NavLink
          to="/compare"
          end
          className={navLinkClass}
        >
          Compare
        </NavLink>

        <NavLink
          to="/certification"
          end
          className={navLinkClass}
        >
          Certification
        </NavLink>

        <NavLink
          to="/compliance"
          end
          className={navLinkClass}
        >
          Compliance
        </NavLink>

        <NavLink
          to="/dashboard"
          end
          className={navLinkClass}
        >
          Dashboard
        </NavLink>
      </div>

      <div className="nav-actions">
        {user && !loadingUser ? (
          <>
            <Link
              to="/profile"
              className="navbar-user"
            >
              {displayName}
            </Link>

            <button
              type="button"
              className="login-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : isCopilot ? (
          <Link
            to="/awareness"
            className="primary-btn navbar-ai-btn navbar-hub-btn"
          >
            BIS Knowledge Hub
          </Link>
        ) : (
          <Link
            to="/copilot"
            className="primary-btn navbar-ai-btn navbar-hub-btn"
          >
            Ask BIS AI
          </Link>
        )}
      </div>
    </nav>
  );
}