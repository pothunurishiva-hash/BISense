import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Awareness() {
  const [activeSection, setActiveSection] = useState("bis");

  const sections = {
    bis: {
      title: "What is BIS?",
      content:
        "The Bureau of Indian Standards (BIS) is India's national standards body. It develops Indian Standards and carries out conformity-assessment and certification activities.",
      link:
        "https://www.bis.gov.in/product-certification/product-certification-overview/?lang=en",
      linkText:
        "Learn about BIS Product Certification →",
    },

    isi: {
      title: "Understanding the Standard Mark",
      content:
        "BIS uses different conformity marks depending on the applicable scheme. BIS states that these include the ISI Mark for products under Scheme-I, the Registration Mark for applicable registration schemes, and Hallmark for hallmarked articles.",
      link:
        "https://www.bis.gov.in/consumer-overview/for-consumers-faq/?lang=en",
      linkText:
        "View BIS Consumer FAQ →",
    },

    verify: {
      title: "How should you verify a product?",
      content:
        "Do not rely only on a logo or photograph. BIS provides official verification facilities, including licence verification through the BIS CARE app. For standards, the Know Your Standard service provides information about standards, related licences and laboratories.",
      link:
        "https://www.bis.gov.in/bis-apps/?lang=en",
      linkText:
        "Explore BIS CARE verification →",
    },

    fake: {
      title: "Fake BIS mark awareness",
      content:
        "A product displaying a BIS-related mark should be independently verified. BIS identifies misuse of the Standard Mark and misleading conformity claims as matters that can be reported through its complaint mechanisms.",
      link:
        "https://www.bis.gov.in/consumer-overview/for-consumers-faq/?lang=en",
      linkText:
        "View BIS complaint information →",
    },
  };

  const activeContent =
    sections[activeSection] || sections.bis;

  const selectSection = (section) => {
    if (!sections[section]) return;

    setActiveSection(section);

    requestAnimationFrame(() => {
      document
        .getElementById("awareness-feature")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  };

  return (
    <div className="app-page awareness-page">
      <Navbar />

      <main className="page-container awareness-container">
        {/* =====================================================
            INTRO
        ====================================================== */}

        <div className="page-intro awareness-intro">
          <p className="eyebrow">
            CONSUMER AWARENESS
          </p>

          <h1>
            Know what you're buying.
          </h1>

          <p>
            Learn what BIS does, understand
            certification-related information, and
            know how to verify important product claims.
          </p>
        </div>

        {/* =====================================================
            QUICK NAVIGATION
        ====================================================== */}

        <div
          className="awareness-tabs"
          role="tablist"
          aria-label="Consumer awareness topics"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              activeSection === "bis"
            }
            className={
              activeSection === "bis"
                ? "active"
                : ""
            }
            onClick={() =>
              selectSection("bis")
            }
          >
            What is BIS?
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              activeSection === "isi"
            }
            className={
              activeSection === "isi"
                ? "active"
                : ""
            }
            onClick={() =>
              selectSection("isi")
            }
          >
            Standard Mark
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              activeSection === "verify"
            }
            className={
              activeSection === "verify"
                ? "active"
                : ""
            }
            onClick={() =>
              selectSection("verify")
            }
          >
            Verification
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              activeSection === "fake"
            }
            className={
              activeSection === "fake"
                ? "active"
                : ""
            }
            onClick={() =>
              selectSection("fake")
            }
          >
            Fake Mark Awareness
          </button>
        </div>

        {/* =====================================================
            MAIN INFORMATION PANEL
        ====================================================== */}

        <section
          id="awareness-feature"
          className="awareness-feature"
        >
          <div className="awareness-feature-content">
            <p className="eyebrow">
              LEARN
            </p>

            <h2>
              {activeContent.title}
            </h2>

            <p>
              {activeContent.content}
            </p>

            <a
              href={activeContent.link}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-btn large"
            >
              {activeContent.linkText}
            </a>
          </div>

          <div className="awareness-symbol">
            <span aria-hidden="true">
              ✓
            </span>

            <p>
              Verify important certification claims
              using official BIS information.
            </p>
          </div>
        </section>

        {/* =====================================================
            KEY TOPICS
        ====================================================== */}

        <section className="section awareness-section">
          <div className="section-heading">
            <p className="eyebrow">
              KEY TOPICS
            </p>

            <h2>
              Things every consumer should understand.
            </h2>

            <p>
              BIS information can be technical. BISense
              turns the important concepts into simple,
              practical guidance.
            </p>
          </div>

          <div className="awareness-grid">
            <article>
              <span>01</span>

              <h2>
                What is BIS?
              </h2>

              <p>
                Learn about the role of BIS in Indian
                Standards, certification and conformity
                assessment.
              </p>

              <button
                type="button"
                onClick={() =>
                  selectSection("bis")
                }
              >
                Learn more →
              </button>
            </article>

            <article>
              <span>02</span>

              <h2>
                Product Marking
              </h2>

              <p>
                Understand that marking and certification
                details can differ depending on the
                product and applicable scheme.
              </p>

              <button
                type="button"
                onClick={() =>
                  selectSection("isi")
                }
              >
                Understand marks →
              </button>
            </article>

            <article>
              <span>03</span>

              <h2>
                Verification
              </h2>

              <p>
                Learn what information should be checked
                against official BIS records.
              </p>

              <button
                type="button"
                onClick={() =>
                  selectSection("verify")
                }
              >
                Learn verification →
              </button>
            </article>

            <article>
              <span>04</span>

              <h2>
                Fake Mark Awareness
              </h2>

              <p>
                Learn how to recognize suspicious claims
                and why official verification matters.
              </p>

              <button
                type="button"
                onClick={() =>
                  selectSection("fake")
                }
              >
                Learn warning signs →
              </button>
            </article>
          </div>
        </section>

        {/* =====================================================
            OFFICIAL BIS TOOLS
        ====================================================== */}

        <section className="section awareness-section">
          <div className="section-heading">
            <p className="eyebrow">
              OFFICIAL BIS TOOLS
            </p>

            <h2>
              Use the right source for verification.
            </h2>

            <p>
              BIS provides dedicated services for
              standards, certification verification and
              consumer complaints.
            </p>
          </div>

          <div className="awareness-grid">
            <article>
              <span>01</span>

              <h2>
                Know Your Standard
              </h2>

              <p>
                Find Indian Standards and related
                information such as licences and
                laboratories.
              </p>

              <a
                href="https://www.bis.gov.in/know-your-standard/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
              >
                Open BIS Service →
              </a>
            </article>

            <article>
              <span>02</span>

              <h2>
                BIS CARE
              </h2>

              <p>
                Verify applicable licence details and
                access consumer services provided by BIS.
              </p>

              <a
                href="https://www.bis.gov.in/bis-apps/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
              >
                Open BIS CARE →
              </a>
            </article>

            <article>
              <span>03</span>

              <h2>
                Compulsory Certification
              </h2>

              <p>
                Check the official BIS information for
                products whose compliance has been made
                compulsory by the Government.
              </p>

              <a
                href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
              >
                View Official List →
              </a>
            </article>

            <article>
              <span>04</span>

              <h2>
                Consumer Complaints
              </h2>

              <p>
                BIS provides complaint mechanisms for
                issues such as misuse of the Standard Mark
                and misleading conformity claims.
              </p>

              <a
                href="https://www.bis.gov.in/consumer-overview/for-consumers-faq/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
              >
                View BIS Guidance →
              </a>
            </article>
          </div>
        </section>

        {/* =====================================================
            VERIFICATION GUIDE
        ====================================================== */}

        <section className="verification-section">
          <div>
            <p className="eyebrow">
              VERIFICATION GUIDE
            </p>

            <h2>
              A simple checklist before you trust a BIS
              claim.
            </h2>

            <p className="verification-intro">
              Use this as an awareness guide. Final
              verification should always be performed using
              current official BIS information.
            </p>
          </div>

          <div className="verification-steps">
            <div>
              <strong>01</strong>

              <div>
                <h3>
                  Identify the product
                </h3>

                <p>
                  Confirm the exact product, model and
                  relevant product information.
                </p>
              </div>
            </div>

            <div>
              <strong>02</strong>

              <div>
                <h3>
                  Check the applicable standard
                </h3>

                <p>
                  Find out which Indian Standard or
                  certification framework is relevant.
                </p>
              </div>
            </div>

            <div>
              <strong>03</strong>

              <div>
                <h3>
                  Verify certification details
                </h3>

                <p>
                  Use official BIS records where licence
                  or registration verification is
                  available.
                </p>
              </div>
            </div>

            <div>
              <strong>04</strong>

              <div>
                <h3>
                  Report suspicious claims
                </h3>

                <p>
                  Use the appropriate official BIS
                  consumer or complaint channels when
                  necessary.
                </p>
              </div>
            </div>
          </div>

          <div className="warning-box large-warning">
            ⚠ A product photograph, logo or AI analysis
            alone cannot definitively prove that a BIS mark
            or certification is genuine.
          </div>
        </section>

        {/* =====================================================
            IMAGE CHECK CTA
        ====================================================== */}

        <section className="awareness-image-cta">
          <div>
            <p className="eyebrow">
              AI-ASSISTED CHECK
            </p>

            <h2>
              Have a product image?
            </h2>

            <p>
              BISense can help you examine visible product
              information and tell you what should be
              verified.
            </p>
          </div>

          <Link
            to="/product-analyzer"
            className="primary-btn large"
          >
            Analyze Product Image →
          </Link>
        </section>
      </main>

      <Footer />

      <style>{`
        .awareness-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          color: #111827;
        }

        .awareness-container {
          width: 100%;
          box-sizing: border-box;
        }

        .awareness-page h1,
        .awareness-page h2,
        .awareness-page h3,
        .awareness-page p,
        .awareness-page strong,
        .awareness-page span {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .awareness-intro h1,
        .awareness-intro p,
        .awareness-feature h2,
        .awareness-feature p,
        .awareness-section h2,
        .awareness-section p,
        .verification-section h2,
        .verification-section h3,
        .verification-section p,
        .awareness-image-cta h2,
        .awareness-image-cta p {
          color: #111827 !important;
        }

        .awareness-tabs {
          width: 100%;
          box-sizing: border-box;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .awareness-tabs button {
          color: #374151 !important;
          background: #fff !important;
          -webkit-text-fill-color: #374151 !important;
          flex-shrink: 0;
          cursor: pointer;
        }

        .awareness-tabs button.active {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        .awareness-grid article {
          min-width: 0;
        }

        .awareness-grid article h2,
        .awareness-grid article p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .awareness-grid article button {
          color: #4f5fda !important;
          cursor: pointer;
        }

        .awareness-grid article a {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .verification-steps > div {
          min-width: 0;
        }

        .verification-steps h3,
        .verification-steps p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .awareness-image-cta {
          min-width: 0;
        }

        .awareness-image-cta a {
          flex-shrink: 0;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 800px) {
          .awareness-feature {
            grid-template-columns: 1fr !important;
          }

          .awareness-image-cta {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .awareness-image-cta a {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .awareness-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .awareness-intro h1 {
            font-size: clamp(
              30px,
              8vw,
              42px
            ) !important;
            line-height: 1.1 !important;
          }

          .awareness-intro > p:last-child {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .awareness-tabs {
            display: flex;
            gap: 8px;
            padding-bottom: 5px;
          }

          .awareness-tabs button {
            min-height: 43px;
            padding: 0 14px;
            white-space: nowrap;
          }

          .awareness-feature,
          .awareness-section,
          .verification-section,
          .awareness-image-cta {
            width: 100%;
            box-sizing: border-box;
          }

          .awareness-grid {
            grid-template-columns: 1fr !important;
          }

          .verification-steps {
            grid-template-columns: 1fr !important;
          }

          .awareness-image-cta {
            gap: 18px !important;
          }

          .awareness-image-cta a {
            width: 100%;
            box-sizing: border-box;
          }
        }

        @media (max-width: 420px) {
          .awareness-container {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .awareness-tabs button {
            font-size: 12px;
            padding: 0 12px;
          }

          .awareness-feature h2 {
            font-size: 24px !important;
          }

          .awareness-feature p {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .verification-section h2 {
            font-size: 24px !important;
          }
        }

        @media print {
          .awareness-page nav,
          .awareness-page footer,
          .awareness-tabs,
          .awareness-image-cta a {
            display: none !important;
          }

          .awareness-page {
            background: #fff !important;
          }

          .awareness-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .awareness-feature,
          .awareness-grid article,
          .verification-section,
          .awareness-image-cta {
            break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Awareness;