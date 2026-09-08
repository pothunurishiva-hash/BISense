import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(currentUser);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const profileInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="navbar">
        <Link to="/" className="logo" aria-label="BISense Home">
          BIS<span>ense</span>
        </Link>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#modes">Modes</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          {user ? (
            <Link
              to="/profile"
              className="home-profile-button"
              title={`Open ${displayName}'s profile`}
              aria-label={`Open ${displayName}'s profile`}
            >
              {profileInitial}
            </Link>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}

          <Link to="/copilot" className="primary-btn">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
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
                <span>Let's get started.</span>
              </>
            ) : (
              <>
                Understand Indian
                <br />
                Standards <span>Simply.</span>
              </>
            )}
          </h1>

          <p className="hero-text">
            Search, understand, compare and work with BIS Standards using
            an intelligent AI assistant designed for consumers and
            manufacturers.
          </p>

          <div className="hero-buttons">
            <Link to="/copilot" className="primary-btn large">
              Ask BIS AI →
            </Link>

            <Link to="/standards" className="secondary-btn large">
              Explore Standards
            </Link>
          </div>

          <div className="trust-row">
            <span>✓ Source-aware answers</span>
            <span>✓ Consumer &amp; Manufacturer modes</span>
            <span>✓ AI-powered assistance</span>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span className="status-dot"></span>
            BIS AI Assistant
          </div>

          <div className="question">
            What BIS standard applies to my product?
          </div>

          <div className="ai-answer">
            <span className="mini-icon">✦</span>

            <div>
              <strong>AI Analysis</strong>

              <p>
                I'll help identify relevant Indian Standards and explain
                their requirements in simple language.
              </p>
            </div>
          </div>

          <div className="source-card">
            <span>Source</span>
            <strong>Official BIS Information</strong>
          </div>
        </div>
      </section>

      {/* BISense Tools */}
      <section className="section home-tools-section">
        <div className="section-heading">
          <p className="eyebrow">BISENSE TOOLS</p>

          <h2>Everything you need in one place.</h2>

          <p>
            Move from discovering a standard to understanding certification,
            testing and compliance.
          </p>
        </div>

        <div className="home-tools-grid">
          <Link to="/standards" className="home-tool-button">
            <span className="home-tool-icon">⌕</span>
            <span>
              <strong>Standards</strong>
              <small>Search Indian Standards</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/copilot" className="home-tool-button featured">
            <span className="home-tool-icon">✦</span>
            <span>
              <strong>BIS Copilot</strong>
              <small>Ask BIS AI</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/compare" className="home-tool-button">
            <span className="home-tool-icon">⇄</span>
            <span>
              <strong>Compare</strong>
              <small>Compare standards</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/certification" className="home-tool-button">
            <span className="home-tool-icon">✓</span>
            <span>
              <strong>Certification</strong>
              <small>Find certification guidance</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/product-analyzer" className="home-tool-button">
            <span className="home-tool-icon">◈</span>
            <span>
              <strong>Product Analyzer</strong>
              <small>Analyze a product</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/compliance" className="home-tool-button">
            <span className="home-tool-icon">☑</span>
            <span>
              <strong>Compliance</strong>
              <small>Build a compliance checklist</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/laboratories" className="home-tool-button">
            <span className="home-tool-icon">⌁</span>
            <span>
              <strong>Laboratories</strong>
              <small>Find BIS-recognized labs</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/dashboard" className="home-tool-button">
            <span className="home-tool-icon">▦</span>
            <span>
              <strong>Dashboard</strong>
              <small>Track your BIS work</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>

          <Link to="/awareness" className="home-tool-button">
            <span className="home-tool-icon">◎</span>
            <span>
              <strong>Knowledge Hub</strong>
              <small>Learn about BIS</small>
            </span>
            <span className="home-tool-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Modes */}
      <section className="section" id="modes">
        <div className="section-heading">
          <p className="eyebrow">CHOOSE YOUR EXPERIENCE</p>

          <h2>One platform. Two powerful modes.</h2>

          <p>
            Get information and tools tailored to what you're trying to do.
          </p>
        </div>

        <div className="mode-grid">
          <div className="mode-card consumer">
            <div className="mode-icon">🛒</div>

            <p className="card-label">CONSUMER</p>

            <h3>Understand the products you buy.</h3>

            <p>
              Learn about BIS marks, product standards, certification and
              consumer awareness through simple explanations.
            </p>

            <Link to="/awareness" className="text-btn">
              Enter Consumer Mode →
            </Link>
          </div>

          <div className="mode-card manufacturer">
            <div className="mode-icon">🏭</div>

            <p className="card-label">MANUFACTURER</p>

            <h3>Navigate standards with confidence.</h3>

            <p>
              Discover applicable standards, certification guidance and
              compliance requirements.
            </p>

            <Link to="/certification" className="text-btn">
              Enter Manufacturer Mode →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-heading">
          <p className="eyebrow">POWERFUL TOOLS</p>

          <h2>Everything you need to work with BIS.</h2>
        </div>

        <div className="feature-grid">
          <Link to="/standards" className="feature-card">
            <span className="feature-number">01</span>
            <h3>Search Standards</h3>
            <p>
              Find standards using product names, keywords or IS numbers.
            </p>
          </Link>

          <Link to="/copilot" className="feature-card highlighted">
            <span className="feature-number">02</span>
            <h3>Ask BIS AI</h3>
            <p>
              Ask questions and get easy-to-understand answers with
              supporting sources.
            </p>
          </Link>

          <Link to="/compare" className="feature-card">
            <span className="feature-number">03</span>
            <h3>Compare Standards</h3>
            <p>
              Compare the scope, requirements, testing and important
              differences between standards.
            </p>
          </Link>

          <Link to="/certification" className="feature-card">
            <span className="feature-number">04</span>
            <h3>Certification Advisor</h3>
            <p>
              Get guided assistance to identify relevant certification
              requirements.
            </p>
          </Link>

          <Link to="/product-analyzer" className="feature-card">
            <span className="feature-number">05</span>
            <h3>Product Image Analysis</h3>
            <p>
              Upload a product image for AI-assisted identification and
              BIS-related information.
            </p>
          </Link>

          <Link to="/compliance" className="feature-card">
            <span className="feature-number">06</span>
            <h3>Compliance Checklist</h3>
            <p>
              Turn applicable requirements into a clear, trackable checklist.
            </p>
          </Link>
        </div>
      </section>

      {/* AI Section */}
      <section className="ai-section" id="about">
        <div>
          <p className="eyebrow">THE BIS KNOWLEDGE LAYER</p>

          <h2>
            Complex standards.
            <br />
            <span>Simple answers.</span>
          </h2>

          <p className="ai-section-text">
            BISense helps users discover relevant standards, understand
            technical language, compare requirements and work with BIS
            information more efficiently.
          </p>

          <Link to="/copilot" className="primary-btn large">
            Try BIS AI →
          </Link>
        </div>

        <div className="stats-card">
          <div className="stat">
            <strong>AI</strong>
            <span>Assisted</span>
          </div>

          <div className="stat">
            <strong>2</strong>
            <span>User Modes</span>
          </div>

          <div className="stat">
            <strong>24/7</strong>
            <span>Accessible</span>
          </div>

          <div className="stat">
            <strong>1</strong>
            <span>Unified Platform</span>
          </div>
        </div>
      </section>

      {/* Awareness CTA */}
      <section className="section awareness-cta">
        <div className="awareness-box">
          <div>
            <p className="eyebrow">CONSUMER AWARENESS</p>

            <h2>
              Learn how to recognize and verify BIS information.
            </h2>

            <p>
              Understand BIS marks, certification concepts and important
              verification steps.
            </p>
          </div>

          <Link to="/awareness" className="primary-btn large">
            Learn More →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>
          <Link to="/" className="logo" aria-label="BISense Home">
            BIS<span>ense</span>
          </Link>

          <p>AI-powered assistance for Indian Standards.</p>
        </div>

        <div className="footer-links">
          <Link to="/standards">Standards</Link>
          <Link to="/copilot">AI Assistant</Link>
          <Link to="/compare">Compare</Link>
          <Link to="/certification">Certification</Link>
          <Link to="/product-analyzer">Product Analyzer</Link>
          <Link to="/compliance">Compliance</Link>
          <Link to="/laboratories">Laboratories</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/awareness">Knowledge Hub</Link>
        </div>

        <p className="copyright">
          © 2026 BISense. SIH project prototype.
        </p>
      </footer>
    </div>
  );
}

export default Home;