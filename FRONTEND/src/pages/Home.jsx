import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

function Home() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
          "Failed to load user:",
          error
        );

        if (mounted) {
          setUser(null);
        }
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
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const displayName =
    String(
      user?.user_metadata?.name || ""
    ).trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const profileInitial =
    displayName.charAt(0).toUpperCase() || "U";

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="home-page">
      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav
        className={`navbar ${
          menuOpen
            ? "mobile-menu-open"
            : ""
        }`}
      >
        <Link
          to="/"
          className="logo"
          aria-label="BISense Home"
          onClick={closeMenu}
        >
          BIS<span>ense</span>
        </Link>

        <div className="nav-links">
          <a
            href="#features"
            onClick={closeMenu}
          >
            Features
          </a>

          <a
            href="#modes"
            onClick={closeMenu}
          >
            Modes
          </a>

          <a
            href="#about"
            onClick={closeMenu}
          >
            About
          </a>
        </div>

        <div className="nav-actions">
          {user ? (
            <Link
              to="/profile"
              className="home-profile-button"
              title={`Open ${displayName}'s profile`}
              aria-label={`Open ${displayName}'s profile`}
              onClick={closeMenu}
            >
              {profileInitial}
            </Link>
          ) : (
            <Link
              to="/login"
              className="login-btn"
              onClick={closeMenu}
            >
              Login
            </Link>
          )}

          <Link
            to="/copilot"
            className="primary-btn navbar-get-started"
            onClick={closeMenu}
          >
            Get Started
          </Link>

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setMenuOpen(
                (current) => !current
              )
            }
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </nav>

      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      {menuOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />

          <aside
            id="mobile-navigation-menu"
            className="mobile-navigation-menu"
            aria-label="Mobile navigation"
          >
            <div className="mobile-navigation-header">
              <div>
                <p className="mobile-menu-eyebrow">
                  BISENSE
                </p>

                <h2>
                  Explore the platform
                </h2>
              </div>

              <button
                type="button"
                className="mobile-menu-close"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>

            <div className="mobile-navigation-list">
              <a
                href="#features"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ✦
                </span>

                <span>
                  <strong>
                    Features
                  </strong>

                  <small>
                    Explore BISense capabilities
                  </small>
                </span>
              </a>

              <a
                href="#modes"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ◎
                </span>

                <span>
                  <strong>
                    Modes
                  </strong>

                  <small>
                    Consumer and manufacturer
                    experiences
                  </small>
                </span>
              </a>

              <a
                href="#about"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ◈
                </span>

                <span>
                  <strong>
                    About
                  </strong>

                  <small>
                    Learn how BISense connects
                    BIS information
                  </small>
                </span>
              </a>

              <Link
                to="/copilot"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ✦
                </span>

                <span>
                  <strong>
                    BIS AI Assistant
                  </strong>

                  <small>
                    Ask questions about BIS and
                    Indian Standards
                  </small>
                </span>
              </Link>

              <Link
                to="/standards"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ⌕
                </span>

                <span>
                  <strong>
                    Standards
                  </strong>

                  <small>
                    Search Indian Standards
                  </small>
                </span>
              </Link>

              <Link
                to="/compare"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ⇄
                </span>

                <span>
                  <strong>
                    Compare Standards
                  </strong>

                  <small>
                    Compare standards side by side
                  </small>
                </span>
              </Link>

              <Link
                to="/certification"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ✓
                </span>

                <span>
                  <strong>
                    Certification
                  </strong>

                  <small>
                    Explore certification guidance
                  </small>
                </span>
              </Link>

              <Link
                to="/product-analyzer"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ◈
                </span>

                <span>
                  <strong>
                    Product Analyzer
                  </strong>

                  <small>
                    Analyze a product
                  </small>
                </span>
              </Link>

              <Link
                to="/compliance"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ☑
                </span>

                <span>
                  <strong>
                    Compliance
                  </strong>

                  <small>
                    Build a practical compliance
                    checklist
                  </small>
                </span>
              </Link>

              <Link
                to="/laboratories"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ⌁
                </span>

                <span>
                  <strong>
                    Laboratories
                  </strong>

                  <small>
                    Find BIS-recognized laboratories
                  </small>
                </span>
              </Link>

              <Link
                to="/awareness"
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">
                  ◎
                </span>

                <span>
                  <strong>
                    Knowledge Hub
                  </strong>

                  <small>
                    Learn about BIS and consumer
                    awareness
                  </small>
                </span>
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={closeMenu}
                  >
                    <span className="mobile-nav-icon">
                      ▦
                    </span>

                    <span>
                      <strong>
                        Dashboard
                      </strong>

                      <small>
                        Track your BIS work
                      </small>
                    </span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={closeMenu}
                  >
                    <span className="mobile-nav-icon">
                      ◉
                    </span>

                    <span>
                      <strong>
                        Profile
                      </strong>

                      <small>
                        Manage your BISense account
                      </small>
                    </span>
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                >
                  <span className="mobile-nav-icon">
                    →
                  </span>

                  <span>
                    <strong>
                      Login
                    </strong>

                    <small>
                      Access your BISense account
                    </small>
                  </span>
                </Link>
              )}
            </div>

            <div className="mobile-navigation-footer">
              <Link
                to="/copilot"
                className="primary-btn large"
                onClick={closeMenu}
              >
                Ask BIS AI →
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">
            {user
              ? `WELCOME BACK, ${displayName.toUpperCase()}`
              : "AI-POWERED BIS ASSISTANT"}
          </p>

          <h1>
            {user ? (
              <>
                Hello, {displayName}
                <br />
                <span>
                  Let's get started.
                </span>
              </>
            ) : (
              <>
                Understand Indian
                <br />
                Standards{" "}
                <span>
                  Simply.
                </span>
              </>
            )}
          </h1>

          <p className="hero-text">
            Search, understand, compare and
            work with BIS Standards using an
            intelligent AI assistant designed
            for consumers and manufacturers.
          </p>

          <div className="hero-buttons">
            <Link
              to="/copilot"
              className="primary-btn large"
            >
              Ask BIS AI →
            </Link>

            <Link
              to="/standards"
              className="secondary-btn large"
            >
              Explore Standards
            </Link>
          </div>

          <div className="trust-row">
            <span>
              ✓ Source-aware answers
            </span>

            <span>
              ✓ Consumer &amp; Manufacturer modes
            </span>

            <span>
              ✓ AI-powered assistance
            </span>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span className="status-dot" />
            BIS AI Assistant
          </div>

          <div className="question">
            What BIS standard applies to my product?
          </div>

          <div className="ai-answer">
            <span className="mini-icon">
              ✦
            </span>

            <div>
              <strong>
                AI Analysis
              </strong>

              <p>
                I'll help identify relevant
                Indian Standards and explain
                their requirements in simple
                language.
              </p>
            </div>
          </div>

          <div className="source-card">
            <span>Source</span>

            <strong>
              Official BIS Information
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          BISENSE TOOLS
      ====================================================== */}

      <section className="section home-tools-section">
        <div className="section-heading">
          <p className="eyebrow">
            BISENSE TOOLS
          </p>

          <h2>
            Everything you need in one place.
          </h2>

          <p>
            Move from discovering a standard
            to understanding certification,
            testing and compliance.
          </p>
        </div>

        <div className="home-tools-grid">
          {[
            [
              "/standards",
              "⌕",
              "Standards",
              "Search Indian Standards",
            ],
            [
              "/copilot",
              "✦",
              "BIS Copilot",
              "Ask BIS AI",
            ],
            [
              "/compare",
              "⇄",
              "Compare",
              "Compare standards",
            ],
            [
              "/certification",
              "✓",
              "Certification",
              "Find certification guidance",
            ],
            [
              "/product-analyzer",
              "◈",
              "Product Analyzer",
              "Analyze a product",
            ],
            [
              "/compliance",
              "☑",
              "Compliance",
              "Build a compliance checklist",
            ],
            [
              "/laboratories",
              "⌁",
              "Laboratories",
              "Find BIS-recognized labs",
            ],
            [
              "/dashboard",
              "▦",
              "Dashboard",
              "Track your BIS work",
            ],
            [
              "/awareness",
              "◎",
              "Knowledge Hub",
              "Learn about BIS",
            ],
          ].map(
            (
              [
                to,
                icon,
                title,
                description,
              ],
              index
            ) => (
              <Link
                key={to}
                to={to}
                className={`home-tool-button ${
                  index === 1
                    ? "featured"
                    : ""
                }`}
              >
                <span className="home-tool-icon">
                  {icon}
                </span>

                <span>
                  <strong>
                    {title}
                  </strong>

                  <small>
                    {description}
                  </small>
                </span>

                <span className="home-tool-arrow">
                  →
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* =====================================================
          MODES
      ====================================================== */}

      <section
        className="section"
        id="modes"
      >
        <div className="section-heading">
          <p className="eyebrow">
            CHOOSE YOUR EXPERIENCE
          </p>

          <h2>
            One platform. Two powerful modes.
          </h2>

          <p>
            Get information and tools tailored
            to what you're trying to do.
          </p>
        </div>

        <div className="mode-grid">
          <div className="mode-card consumer">
            <div className="mode-icon">
              🛒
            </div>

            <p className="card-label">
              CONSUMER
            </p>

            <h3>
              Understand the products you buy.
            </h3>

            <p>
              Learn about BIS marks, product
              standards, certification and
              consumer awareness through simple
              explanations.
            </p>

            <Link
              to="/awareness"
              className="text-btn"
            >
              Enter Consumer Mode →
            </Link>
          </div>

          <div className="mode-card manufacturer">
            <div className="mode-icon">
              🏭
            </div>

            <p className="card-label">
              MANUFACTURER
            </p>

            <h3>
              Navigate standards with confidence.
            </h3>

            <p>
              Discover applicable standards,
              certification guidance and
              compliance requirements.
            </p>

            <Link
              to="/certification"
              className="text-btn"
            >
              Enter Manufacturer Mode →
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          FEATURES
      ====================================================== */}

      <section
        className="section"
        id="features"
      >
        <div className="section-heading">
          <p className="eyebrow">
            POWERFUL TOOLS
          </p>

          <h2>
            Everything you need to work with BIS.
          </h2>
        </div>

        <div className="feature-grid">
          <Link
            to="/standards"
            className="feature-card"
          >
            <span className="feature-number">
              01
            </span>

            <h3>
              Search Standards
            </h3>

            <p>
              Find standards using product names,
              keywords or IS numbers.
            </p>
          </Link>

          <Link
            to="/copilot"
            className="feature-card highlighted"
          >
            <span className="feature-number">
              02
            </span>

            <h3>
              Ask BIS AI
            </h3>

            <p>
              Ask questions and get
              easy-to-understand answers with
              supporting sources.
            </p>
          </Link>

          <Link
            to="/compare"
            className="feature-card"
          >
            <span className="feature-number">
              03
            </span>

            <h3>
              Compare Standards
            </h3>

            <p>
              Compare the scope, requirements,
              testing and important differences
              between standards.
            </p>
          </Link>

          <Link
            to="/certification"
            className="feature-card"
          >
            <span className="feature-number">
              04
            </span>

            <h3>
              Certification Advisor
            </h3>

            <p>
              Get guided assistance to identify
              relevant certification requirements.
            </p>
          </Link>

          <Link
            to="/product-analyzer"
            className="feature-card"
          >
            <span className="feature-number">
              05
            </span>

            <h3>
              Product Image Analysis
            </h3>

            <p>
              Upload a product image for
              AI-assisted identification and
              BIS-related information.
            </p>
          </Link>

          <Link
            to="/compliance"
            className="feature-card"
          >
            <span className="feature-number">
              06
            </span>

            <h3>
              Compliance Checklist
            </h3>

            <p>
              Turn applicable requirements into
              a clear, trackable checklist.
            </p>
          </Link>
        </div>
      </section>

      {/* =====================================================
          AI SECTION
      ====================================================== */}

      <section
        className="ai-section"
        id="about"
      >
        <div>
          <p className="eyebrow">
            THE BIS KNOWLEDGE LAYER
          </p>

          <h2>
            Complex standards.
            <br />
            <span>
              Simple answers.
            </span>
          </h2>

          <p className="ai-section-text">
            BISense helps users discover relevant
            standards, understand technical
            language, compare requirements and
            work with BIS information more
            efficiently.
          </p>

          <Link
            to="/copilot"
            className="primary-btn large"
          >
            Try BIS AI →
          </Link>
        </div>

        <div className="stats-card">
          <div className="stat">
            <strong>
              AI
            </strong>

            <span>
              Assisted
            </span>
          </div>

          <div className="stat">
            <strong>
              2
            </strong>

            <span>
              User Modes
            </span>
          </div>

          <div className="stat">
            <strong>
              24/7
            </strong>

            <span>
              Accessible
            </span>
          </div>

          <div className="stat">
            <strong>
              1
            </strong>

            <span>
              Unified Platform
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          AWARENESS CTA
      ====================================================== */}

      <section className="section awareness-cta">
        <div className="awareness-box">
          <div>
            <p className="eyebrow">
              CONSUMER AWARENESS
            </p>

            <h2>
              Learn how to recognize and verify
              BIS information.
            </h2>

            <p>
              Understand BIS marks, certification
              concepts and important verification
              steps.
            </p>
          </div>

          <Link
            to="/awareness"
            className="primary-btn large"
          >
            Learn More →
          </Link>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">
        <div>
          <Link
            to="/"
            className="logo"
            aria-label="BISense Home"
          >
            BIS<span>ense</span>
          </Link>

          <p>
            AI-powered assistance for Indian Standards.
          </p>
        </div>

        <div className="footer-links">
          <Link to="/standards">
            Standards
          </Link>

          <Link to="/copilot">
            AI Assistant
          </Link>

          <Link to="/compare">
            Compare
          </Link>

          <Link to="/certification">
            Certification
          </Link>

          <Link to="/product-analyzer">
            Product Analyzer
          </Link>

          <Link to="/compliance">
            Compliance
          </Link>

          <Link to="/laboratories">
            Laboratories
          </Link>

          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/awareness">
            Knowledge Hub
          </Link>
        </div>

        <p className="copyright">
          © 2026 BISense. SIH project prototype.
        </p>
      </footer>

      <style>{`
        .home-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .home-page *,
        .home-page *::before,
        .home-page *::after {
          box-sizing: border-box;
        }

        .home-page h1,
        .home-page h2,
        .home-page h3,
        .home-page p,
        .home-page span,
        .home-page strong,
        .home-page small,
        .home-page a {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .home-page .navbar {
          position: relative;
          z-index: 100;
        }

        .home-page .nav-actions {
          min-width: 0;
        }

        .home-profile-button {
          flex-shrink: 0;
          text-decoration: none;
        }

        .navbar-get-started {
          text-decoration: none;
          white-space: nowrap;
        }

        .mobile-menu-button {
          flex-shrink: 0;
        }

        .mobile-navigation-menu {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-navigation-list a {
          min-width: 0;
          text-decoration: none;
        }

        .mobile-navigation-list a > span:last-child {
          min-width: 0;
        }

        .mobile-navigation-list strong,
        .mobile-navigation-list small {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .mobile-navigation-footer a {
          text-decoration: none;
        }

        .hero-content,
        .hero-card {
          min-width: 0;
        }

        .hero-content h1 {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hero-text {
          overflow-wrap: anywhere;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .hero-buttons a {
          text-decoration: none;
        }

        .trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 18px;
        }

        .home-tools-grid {
          min-width: 0;
        }

        .home-tool-button {
          min-width: 0;
          text-decoration: none;
        }

        .home-tool-button > span:nth-child(2) {
          min-width: 0;
        }

        .home-tool-button strong,
        .home-tool-button small {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .mode-card,
        .feature-card,
        .stats-card,
        .awareness-box {
          min-width: 0;
        }

        .mode-card a,
        .feature-card {
          text-decoration: none;
        }

        .mode-card p,
        .feature-card p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .ai-section > div {
          min-width: 0;
        }

        .ai-section a {
          text-decoration: none;
        }

        .awareness-box > div {
          min-width: 0;
        }

        .awareness-box a {
          flex-shrink: 0;
          text-decoration: none;
        }

        .footer-links {
          min-width: 0;
        }

        .footer-links a {
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        /* Prevent global styles from making navigation text unreadable */

        .home-page .mobile-navigation-menu,
        .home-page .mobile-navigation-menu h2,
        .home-page .mobile-navigation-menu p,
        .home-page .mobile-navigation-menu strong,
        .home-page .mobile-navigation-menu small {
          color: #111827;
        }

        .home-page .mobile-navigation-list a {
          color: #374151 !important;
        }

        .home-page .mobile-navigation-list strong {
          color: #111827 !important;
        }

        .home-page .mobile-navigation-list small {
          color: #6b7280 !important;
        }

        .home-page .home-tool-button strong {
          color: #111827 !important;
        }

        .home-page .home-tool-button small {
          color: #6b7280 !important;
        }

        .home-page .feature-card h3,
        .home-page .feature-card p {
          color: #111827 !important;
        }

        .home-page .feature-card p {
          color: #5f6b7c !important;
        }

        .home-page .mode-card h3,
        .home-page .mode-card p {
          color: #111827 !important;
        }

        .home-page .mode-card p {
          color: #5f6b7c !important;
        }

        @media (max-width: 900px) {
          .home-tools-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .mode-grid {
            grid-template-columns: 1fr !important;
          }

          .feature-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .ai-section {
            gap: 30px;
          }

          .footer-links {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 700px) {
          .nav-links {
            display: none !important;
          }

          .navbar-get-started {
            display: none !important;
          }

          .mobile-menu-button {
            display: inline-flex !important;
          }

          .hero {
            grid-template-columns: 1fr !important;
          }

          .hero-buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .hero-buttons a {
            width: 100%;
            justify-content: center;
          }

          .trust-row {
            display: grid;
            grid-template-columns: 1fr;
          }

          .hero-card {
            width: 100%;
          }

          .home-tools-grid,
          .feature-grid {
            grid-template-columns: 1fr !important;
          }

          .ai-section {
            grid-template-columns: 1fr !important;
          }

          .awareness-box {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .awareness-box a {
            width: 100%;
            justify-content: center;
          }

          .footer {
            gap: 25px;
          }
        }

        @media (max-width: 520px) {
          .home-page .navbar {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .home-page .logo {
            max-width: 120px;
          }

          .home-page .login-btn,
          .home-profile-button {
            display: none !important;
          }

          .hero {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .hero-content h1 {
            font-size: clamp(
              34px,
              10vw,
              48px
            ) !important;
            line-height: 1.07 !important;
          }

          .hero-text {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .section {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .home-tools-grid {
            gap: 10px !important;
          }

          .home-tool-button {
            width: 100%;
          }

          .mode-card,
          .feature-card {
            width: 100%;
          }

          .stats-card {
            grid-template-columns: 1fr 1fr !important;
          }

          .footer {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .footer-links {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px 16px;
          }
        }

        @media (max-width: 380px) {
          .home-page .logo {
            font-size: 22px !important;
          }

          .hero-content h1 {
            font-size: 32px !important;
          }

          .stats-card {
            grid-template-columns: 1fr !important;
          }

          .footer-links {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          .home-page .navbar,
          .home-page .mobile-navigation-menu,
          .home-page .mobile-menu-backdrop,
          .home-page .footer,
          .hero-buttons,
          .awareness-box a {
            display: none !important;
          }

          .home-page {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;