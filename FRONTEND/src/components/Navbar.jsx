import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    default:
      return null;
  }
}

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        to: "/",
        icon: "home",
      },
      {
        label: "BIS Copilot",
        to: "/copilot",
        icon: "ai",
      },
      {
        label: "Intelligence Hub",
        to: "/dashboard",
        icon: "grid",
      },
    ],
  },
  {
    label: "Explore",
    items: [
      {
        label: "Standards",
        to: "/standards",
        icon: "search",
      },
      {
        label: "Compare",
        to: "/compare",
        icon: "compare",
      },
      {
        label: "Product Analyzer",
        to: "/product-analyzer",
        icon: "image",
      },
      {
        label: "Awareness",
        to: "/awareness",
        icon: "book",
      },
    ],
  },
  {
    label: "Workflows",
    items: [
      {
        label: "Certification",
        to: "/certification",
        icon: "shield",
      },
      {
        label: "Laboratories",
        to: "/laboratories",
        icon: "lab",
      },
      {
        label: "Compliance",
        to: "/compliance",
        icon: "check",
      },
    ],
  },
];

function isRouteActive(pathname, route) {
  if (route === "/") {
    return pathname === "/";
  }

  if (pathname === route) {
    return true;
  }

  if (
    route === "/standards" &&
    pathname.startsWith("/standard/")
  ) {
    return true;
  }

  return false;
}

export default function Navbar() {
  const location = useLocation();

  const [user, setUser] = useState(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return (
        localStorage.getItem(
          "bisense_sidebar_collapsed"
        ) === "true"
      );
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

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
    try {
      localStorage.setItem(
        "bisense_sidebar_collapsed",
        String(collapsed)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [collapsed]);

  /*
    Keep the mobile drawer closed when the route changes.
  */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /*
    This is the key part.

    We ONLY control the outer .main-content.
    We no longer try to resize every individual
    page <main>, which was causing the overlap.
  */
  useEffect(() => {
    const root = document.documentElement;

    root.classList.add(
      "bisense-shell-enabled"
    );

    const updateLayout = () => {
      const mobile =
        window.innerWidth <= 800;

      const width = mobile
        ? "0px"
        : collapsed
        ? "72px"
        : "235px";

      root.style.setProperty(
        "--bisense-shell-sidebar-width",
        width
      );
    };

    updateLayout();

    window.addEventListener(
      "resize",
      updateLayout
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateLayout
      );

      root.classList.remove(
        "bisense-shell-enabled"
      );

      root.style.removeProperty(
        "--bisense-shell-sidebar-width"
      );
    };
  }, [collapsed]);

  const displayName =
    user?.user_metadata?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "BISense User";

  const initial =
    displayName.charAt(0).toUpperCase();

  const toggleBrand = () => {
    if (window.innerWidth <= 800) {
      setMobileOpen(
        (current) => !current
      );
      return;
    }

    setCollapsed(
      (current) => !current
    );
  };

  const openMobile = () => {
    setMobileOpen(true);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <style>{`

        /* =====================================================
           FOUNDATION
        ====================================================== */

        :root {
          --bisense-shell-sidebar-width: 235px;

          --bisense-shell-sidebar:
            #eef3f9;

          --bisense-shell-sidebar-hover:
            #e5ecf5;

          --bisense-shell-sidebar-active:
            #e1ebff;

          --bisense-shell-border:
            #d6e0eb;

          --bisense-shell-text:
            #0f1b33;

          --bisense-shell-muted:
            #687991;

          --bisense-shell-blue:
            #2563eb;

          --bisense-shell-bg:
            #f8fafc;
        }

        html.bisense-shell-enabled,
        html.bisense-shell-enabled body {
          min-width: 320px;
          overflow-x: hidden !important;
        }

        /*
          Prevent old global styles from making the
          route container wider than the viewport.
        */
        html.bisense-shell-enabled
          .main-content {

          width: auto !important;

          min-width: 0 !important;

          max-width: none !important;

          margin-left:
            var(
              --bisense-shell-sidebar-width
            ) !important;

          margin-right: 0 !important;

          padding-top: 67px !important;

          box-sizing: border-box !important;

          overflow-x: hidden !important;

          transition:
            margin-left .24s ease,
            padding-top .24s ease;
        }

        /*
          Do NOT alter inner page widths here.

          Their existing max-width / width rules
          will now calculate inside the available
          main-content area naturally.
        */

        /* =====================================================
           SIDEBAR
        ====================================================== */

        .bisense-shell-sidebar {
          position: fixed;

          top: 0;
          left: 0;
          bottom: 0;

          width:
            var(
              --bisense-shell-sidebar-width
            );

          height: 100vh;

          z-index: 1000;

          display: flex;
          flex-direction: column;

          padding: 18px 12px;

          border-right:
            1px solid
            var(
              --bisense-shell-border
            );

          background:
            var(
              --bisense-shell-sidebar
            );

          color:
            var(
              --bisense-shell-text
            );

          overflow-x: hidden;
          overflow-y: auto;

          scrollbar-width: thin;

          scrollbar-color:
            #c6d1df transparent;

          transition:
            width .24s ease,
            transform .24s ease;
        }

        .bisense-shell-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .bisense-shell-sidebar::-webkit-scrollbar-thumb {
          background: #c6d1df;
          border-radius: 99px;
        }

        /* =====================================================
           BRAND
        ====================================================== */

        .bisense-shell-brand {
          width: 100%;

          min-height: 42px;

          display: flex;
          align-items: center;

          gap: 10px;

          padding: 4px 7px 22px;

          border: 0;

          background: transparent;

          color:
            var(
              --bisense-shell-text
            );

          cursor: pointer;

          text-align: left;
        }

        .bisense-shell-brand-mark {
          width: 34px;
          height: 34px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background:
            var(
              --bisense-shell-text
            );

          color: #ffffff;

          font-size: 10px;
          font-weight: 900;

          transition:
            transform .18s ease,
            background .18s ease;
        }

        .bisense-shell-brand:hover
          .bisense-shell-brand-mark {
          transform: translateY(-1px);

          background: #172641;
        }

        .bisense-shell-brand-copy {
          min-width: 0;

          overflow: hidden;

          transition:
            opacity .18s ease,
            width .18s ease;
        }

        .bisense-shell-brand-name {
          color:
            var(
              --bisense-shell-text
            );

          font-size: 20px;
          font-weight: 800;

          letter-spacing: -1px;

          line-height: 1;

          white-space: nowrap;
        }

        .bisense-shell-brand-name span {
          color: #6d7f98;
          font-weight: 400;
        }

        .bisense-shell-brand-hint {
          display: block;

          margin-top: 3px;

          color: #8998ab;

          font-size: 7px;
          font-weight: 600;

          white-space: nowrap;
        }

        /* =====================================================
           NAVIGATION
        ====================================================== */

        .bisense-shell-group {
          margin-bottom: 15px;

          min-width: 0;
        }

        .bisense-shell-label {
          padding:
            0 9px 8px;

          color: #8191a8;

          font-size: 8px;
          font-weight: 800;

          letter-spacing: .14em;

          text-transform: uppercase;

          white-space: nowrap;

          transition:
            opacity .18s ease;
        }

        .bisense-shell-nav {
          display: grid;
          gap: 2px;
        }

        .bisense-shell-link {
          width: 100%;
          min-width: 0;
          min-height: 38px;

          display: flex;
          align-items: center;

          gap: 10px;

          padding: 0 10px;

          border:
            1px solid transparent;

          border-radius: 8px;

          background: transparent;

          color: #5c6d85;

          font-size: 10px;
          font-weight: 650;

          white-space: nowrap;

          overflow: hidden;

          transition:
            color .18s ease,
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .bisense-shell-link svg {
          flex: 0 0 auto;

          color: #7589a7;

          transition:
            color .18s ease;
        }

        .bisense-shell-link:hover {
          color: #0f1b33;

          background:
            var(
              --bisense-shell-sidebar-hover
            );

          transform:
            translateX(1px);
        }

        .bisense-shell-link:hover svg {
          color:
            var(
              --bisense-shell-blue
            );
        }

        .bisense-shell-link.active {
          color:
            var(
              --bisense-shell-blue
            );

          border-color:
            #d2e0f7;

          background:
            var(
              --bisense-shell-sidebar-active
            );
        }

        .bisense-shell-link.active svg {
          color:
            var(
              --bisense-shell-blue
            );
        }

        .bisense-shell-link-text {
          min-width: 0;

          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          transition:
            opacity .18s ease,
            width .18s ease;
        }

        /* =====================================================
           ACCOUNT
        ====================================================== */

        .bisense-shell-spacer {
          flex: 1;

          min-height: 15px;
        }

        .bisense-shell-account {
          padding:
            10px 7px 5px;

          border-top:
            1px solid
            var(
              --bisense-shell-border
            );
        }

        .bisense-shell-account-link {
          min-width: 0;
          min-height: 37px;

          display: flex;
          align-items: center;

          gap: 9px;

          padding:
            4px 2px;

          overflow: hidden;
        }

        .bisense-shell-avatar {
          width: 30px;
          height: 30px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background:
            var(
              --bisense-shell-text
            );

          color: #fff;

          font-size: 9px;
          font-weight: 800;
        }

        .bisense-shell-account-copy {
          min-width: 0;

          overflow: hidden;

          transition:
            opacity .18s ease,
            width .18s ease;
        }

        .bisense-shell-account-copy strong {
          display: block;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #243650;

          font-size: 9px;
        }

        .bisense-shell-account-copy span {
          display: block;

          margin-top: 2px;

          color: #8796aa;

          font-size: 7px;
        }

        .bisense-shell-account-arrow {
          margin-left: auto;

          flex: 0 0 auto;

          color: #8191a7;
        }

        .bisense-shell-login {
          min-height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 8px;

          border:
            1px solid #ccd8e6;

          border-radius: 8px;

          background: #f8fafc;

          color: #0f1b33 !important;

          font-size: 9px;
          font-weight: 800;

          white-space: nowrap;

          overflow: hidden;
        }

        /* =====================================================
           TOP BAR
        ====================================================== */

        .bisense-shell-topbar {
          position: fixed;

          top: 0;
          right: 0;

          left:
            var(
              --bisense-shell-sidebar-width
            );

          height: 67px;

          z-index: 900;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          padding:
            0 28px;

          border-bottom:
            1px solid #d9e2ee;

          background:
            rgba(
              255,
              255,
              255,
              .96
            );

          box-shadow:
            0 1px 12px
            rgba(15,27,51,.025);

          backdrop-filter:
            blur(12px);

          transition:
            left .24s ease;
        }

        .bisense-shell-top-left {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 8px;

          color: #52637d;

          font-size: 10px;
          font-weight: 700;
        }

        .bisense-shell-top-dot {
          width: 6px;
          height: 6px;

          flex: 0 0 auto;

          border-radius: 50%;

          background: #2f806a;
        }

        .bisense-shell-top-right {
          display: flex;

          align-items: center;

          gap: 8px;
        }

        .bisense-shell-profile {
          min-height: 38px;

          display: flex;
          align-items: center;

          gap: 8px;

          padding:
            4px 8px 4px 4px;

          border:
            1px solid #d9e2ee;

          border-radius: 9px;

          background: #ffffff;

          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .bisense-shell-profile:hover {
          border-color: #c4d1e1;

          box-shadow:
            0 7px 18px
            rgba(15,27,51,.045);
        }

        .bisense-shell-profile-name {
          max-width: 145px;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #3d4e68;

          font-size: 9px;
          font-weight: 700;
        }

        .bisense-shell-mobile-button {
          display: none;

          width: 36px;
          height: 36px;

          place-items: center;

          border:
            1px solid #d9e2ee;

          border-radius: 9px;

          background: #fff;

          color: #0f1b33;

          cursor: pointer;
        }

        /* =====================================================
           COLLAPSE
        ====================================================== */

        html.bisense-shell-collapsed
          .bisense-shell-sidebar {
          width: 72px;
        }

        html.bisense-shell-collapsed
          .bisense-shell-brand {
          justify-content: center;

          padding-left: 0;
          padding-right: 0;
        }

        html.bisense-shell-collapsed
          .bisense-shell-brand-copy,
        html.bisense-shell-collapsed
          .bisense-shell-label,
        html.bisense-shell-collapsed
          .bisense-shell-link-text,
        html.bisense-shell-collapsed
          .bisense-shell-account-copy {
          width: 0;

          opacity: 0;

          pointer-events: none;

          overflow: hidden;
        }

        html.bisense-shell-collapsed
          .bisense-shell-link {
          justify-content: center;

          padding-left: 0;
          padding-right: 0;
        }

        html.bisense-shell-collapsed
          .bisense-shell-account-link {
          justify-content: center;
        }

        html.bisense-shell-collapsed
          .bisense-shell-account-arrow {
          display: none;
        }

        html.bisense-shell-collapsed
          .bisense-shell-account {
          padding-left: 0;
          padding-right: 0;
        }

        /* =====================================================
           MOBILE
        ====================================================== */

        .bisense-shell-overlay {
          display: none;

          position: fixed;

          inset: 0;

          z-index: 950;

          background:
            rgba(
              15,
              27,
              51,
              .34
            );
        }

        .bisense-shell-overlay.open {
          display: block;
        }

        @media (max-width: 800px) {

          html.bisense-shell-enabled
            .main-content {
            width: 100% !important;

            min-width: 0 !important;

            max-width: none !important;

            margin-left: 0 !important;

            margin-right: 0 !important;

            padding-top: 62px !important;
          }

          .bisense-shell-sidebar {
            width: 280px;

            transform:
              translateX(-105%);

            box-shadow:
              18px 0 45px
              rgba(15,27,51,.16);
          }

          .bisense-shell-sidebar.mobile-open {
            transform:
              translateX(0);
          }

          html.bisense-shell-collapsed
            .bisense-shell-sidebar {
            width: 280px;
          }

          html.bisense-shell-collapsed
            .bisense-shell-brand {
            justify-content: flex-start;

            padding-left: 7px;
            padding-right: 7px;
          }

          html.bisense-shell-collapsed
            .bisense-shell-brand-copy,
          html.bisense-shell-collapsed
            .bisense-shell-label,
          html.bisense-shell-collapsed
            .bisense-shell-link-text,
          html.bisense-shell-collapsed
            .bisense-shell-account-copy {
            width: auto;

            opacity: 1;

            pointer-events: auto;

            overflow: visible;
          }

          html.bisense-shell-collapsed
            .bisense-shell-link {
            justify-content: flex-start;

            padding-left: 10px;
            padding-right: 10px;
          }

          html.bisense-shell-collapsed
            .bisense-shell-account-link {
            justify-content: flex-start;
          }

          .bisense-shell-topbar {
            left: 0;

            height: 62px;

            padding:
              0 12px;
          }

          .bisense-shell-mobile-button {
            display: grid;
          }

          .bisense-shell-profile-name {
            display: none;
          }
        }

        @media (max-width: 500px) {

          .bisense-shell-sidebar {
            width: 286px;
          }

          html.bisense-shell-collapsed
            .bisense-shell-sidebar {
            width: 286px;
          }

          .bisense-shell-topbar {
            padding:
              0 10px;
          }

          .bisense-shell-top-left {
            font-size: 9px;
          }
        }
      `}</style>

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      <div
        className={`bisense-shell-overlay ${
          mobileOpen
            ? "open"
            : ""
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      ></div>

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`bisense-shell-sidebar ${
          mobileOpen
            ? "mobile-open"
            : ""
        }`}
        aria-label="BISense navigation"
      >
        <button
          type="button"
          className="bisense-shell-brand"
          onClick={toggleBrand}
          title={
            collapsed
              ? "Expand BISense"
              : "Collapse BISense"
          }
          aria-label={
            collapsed
              ? "Expand BISense navigation"
              : "Collapse BISense navigation"
          }
        >
          <div className="bisense-shell-brand-mark">
            B
          </div>

          <div className="bisense-shell-brand-copy">
            <div className="bisense-shell-brand-name">
              BIS<span>ense</span>
            </div>

            <span className="bisense-shell-brand-hint">
              Click to collapse
            </span>
          </div>
        </button>

        {NAV_GROUPS.map((group) => (
          <div
            className="bisense-shell-group"
            key={group.label}
          >
            <div className="bisense-shell-label">
              {group.label}
            </div>

            <nav className="bisense-shell-nav">
              {group.items.map((item) => {
                const active =
                  isRouteActive(
                    location.pathname,
                    item.to
                  );

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`bisense-shell-link ${
                      active
                        ? "active"
                        : ""
                    }`}
                    title={item.label}
                    onClick={closeMobile}
                  >
                    <Icon
                      type={item.icon}
                      size={16}
                    />

                    <span className="bisense-shell-link-text">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="bisense-shell-spacer"></div>

        <div className="bisense-shell-account">
          {user ? (
            <Link
              to="/profile"
              className="bisense-shell-account-link"
              title="Open profile"
              onClick={closeMobile}
            >
              <div className="bisense-shell-avatar">
                {initial}
              </div>

              <div className="bisense-shell-account-copy">
                <strong>
                  {displayName}
                </strong>

                <span>
                  Open profile
                </span>
              </div>

              <span className="bisense-shell-account-arrow">
                <Icon
                  type="arrow"
                  size={11}
                />
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="bisense-shell-login"
              onClick={closeMobile}
            >
              <span className="bisense-shell-link-text">
                Sign in to BISense
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header className="bisense-shell-topbar">
        <div className="bisense-shell-top-left">
          <span className="bisense-shell-top-dot"></span>

          BISense Workspace
        </div>

        <div className="bisense-shell-top-right">
          {user && (
            <Link
              to="/profile"
              className="bisense-shell-profile"
            >
              <div className="bisense-shell-avatar">
                {initial}
              </div>

              <span className="bisense-shell-profile-name">
                {displayName}
              </span>
            </Link>
          )}

          <button
            type="button"
            className="bisense-shell-mobile-button"
            onClick={openMobile}
            aria-label="Open BISense navigation"
          >
            <Icon
              type="menu"
              size={17}
            />
          </button>
        </div>
      </header>
    </>
  );
}