import { useState } from "react";
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
      linkText: "Learn about BIS Product Certification →",
    },

    isi: {
      title: "Understanding the Standard Mark",
      content:
        "BIS uses different conformity marks depending on the applicable scheme. BIS states that these include the ISI Mark for products under Scheme-I, the Registration Mark for applicable registration schemes, and Hallmark for hallmarked articles.",
      link:
        "https://www.bis.gov.in/consumer-overview/for-consumers-faq/?lang=en",
      linkText: "View BIS Consumer FAQ →",
    },

    verify: {
      title: "How should you verify a product?",
      content:
        "Do not rely only on a logo or photograph. BIS provides official verification facilities, including licence verification through the BIS CARE app. For standards, the Know Your Standard service provides information about standards, related licences and laboratories.",
      link:
        "https://www.bis.gov.in/bis-apps/?lang=en",
      linkText: "Explore BIS CARE verification →",
    },

    fake: {
      title: "Fake BIS mark awareness",
      content:
        "A product displaying a BIS-related mark should be independently verified. BIS identifies misuse of the Standard Mark and misleading conformity claims as matters that can be reported through its complaint mechanisms.",
      link:
        "https://www.bis.gov.in/consumer-overview/for-consumers-faq/?lang=en",
      linkText: "View BIS complaint information →",
    },
  };

  const activeContent = sections[activeSection];

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container">
        {/* INTRO */}
        <div className="page-intro">
          <p className="eyebrow">CONSUMER AWARENESS</p>

          <h1>Know what you're buying.</h1>

          <p>
            Learn what BIS does, understand certification-related
            information, and know how to verify important product
            claims.
          </p>
        </div>

        {/* QUICK NAVIGATION */}
        <div className="awareness-tabs">
          <button
            className={activeSection === "bis" ? "active" : ""}
            onClick={() => setActiveSection("bis")}
          >
            What is BIS?
          </button>

          <button
            className={activeSection === "isi" ? "active" : ""}
            onClick={() => setActiveSection("isi")}
          >
            Standard Mark
          </button>

          <button
            className={activeSection === "verify" ? "active" : ""}
            onClick={() => setActiveSection("verify")}
          >
            Verification
          </button>

          <button
            className={activeSection === "fake" ? "active" : ""}
            onClick={() => setActiveSection("fake")}
          >
            Fake Mark Awareness
          </button>
        </div>

        {/* MAIN INFORMATION PANEL */}
        <section className="awareness-feature">
          <div className="awareness-feature-content">
            <p className="eyebrow">LEARN</p>

            <h2>{activeContent.title}</h2>

            <p>{activeContent.content}</p>

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
            <span>✓</span>

            <p>
              Verify important certification claims using official
              BIS information.
            </p>
          </div>
        </section>

        {/* TOPICS */}
        <section className="section awareness-section">
          <div className="section-heading">
            <p className="eyebrow">KEY TOPICS</p>

            <h2>Things every consumer should understand.</h2>

            <p>
              BIS information can be technical. BISense turns the
              important concepts into simple, practical guidance.
            </p>
          </div>

          <div className="awareness-grid">
            <article>
              <span>01</span>

              <h2>What is BIS?</h2>

              <p>
                Learn about the role of BIS in Indian Standards,
                certification and conformity assessment.
              </p>

              <button onClick={() => setActiveSection("bis")}>
                Learn more →
              </button>
            </article>

            <article>
              <span>02</span>

              <h2>Product Marking</h2>

              <p>
                Understand that marking and certification details can
                differ depending on the product and applicable scheme.
              </p>

              <button onClick={() => setActiveSection("isi")}>
                Understand marks →
              </button>
            </article>

            <article>
              <span>03</span>

              <h2>Verification</h2>

              <p>
                Learn what information should be checked against
                official BIS records.
              </p>

              <button onClick={() => setActiveSection("verify")}>
                Learn verification →
              </button>
            </article>

            <article>
              <span>04</span>

              <h2>Fake Mark Awareness</h2>

              <p>
                Learn how to recognize suspicious claims and why
                official verification matters.
              </p>

              <button onClick={() => setActiveSection("fake")}>
                Learn warning signs →
              </button>
            </article>
          </div>
        </section>

        {/* OFFICIAL TOOLS */}
        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">OFFICIAL BIS TOOLS</p>

            <h2>Use the right source for verification.</h2>

            <p>
              BIS provides dedicated services for standards,
              certification verification and consumer complaints.
            </p>
          </div>

          <div className="awareness-grid">
            <article>
              <span>01</span>

              <h2>Know Your Standard</h2>

              <p>
                Find Indian Standards and related information such as
                licences and laboratories.
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

              <h2>BIS CARE</h2>

              <p>
                Verify applicable licence details and access consumer
                services provided by BIS.
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

              <h2>Compulsory Certification</h2>

              <p>
                Check the official BIS information for products whose
                compliance has been made compulsory by the Government.
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

              <h2>Consumer Complaints</h2>

              <p>
                BIS provides complaint mechanisms for issues such as
                misuse of the Standard Mark and misleading conformity
                claims.
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

        {/* VERIFICATION GUIDE */}
        <section className="verification-section">
          <div>
            <p className="eyebrow">VERIFICATION GUIDE</p>

            <h2>A simple checklist before you trust a BIS claim.</h2>

            <p className="verification-intro">
              Use this as an awareness guide. Final verification
              should always be performed using current official BIS
              information.
            </p>
          </div>

          <div className="verification-steps">
            <div>
              <strong>01</strong>

              <div>
                <h3>Identify the product</h3>

                <p>
                  Confirm the exact product, model and relevant
                  product information.
                </p>
              </div>
            </div>

            <div>
              <strong>02</strong>

              <div>
                <h3>Check the applicable standard</h3>

                <p>
                  Find out which Indian Standard or certification
                  framework is relevant.
                </p>
              </div>
            </div>

            <div>
              <strong>03</strong>

              <div>
                <h3>Verify certification details</h3>

                <p>
                  Use official BIS records where licence or
                  registration verification is available.
                </p>
              </div>
            </div>

            <div>
              <strong>04</strong>

              <div>
                <h3>Report suspicious claims</h3>

                <p>
                  Use the appropriate official BIS consumer or
                  complaint channels when necessary.
                </p>
              </div>
            </div>
          </div>

          <div className="warning-box large-warning">
            ⚠ A product photograph, logo or AI analysis alone cannot
            definitively prove that a BIS mark or certification is
            genuine.
          </div>
        </section>

        {/* IMAGE CHECK CTA */}
        <section className="awareness-image-cta">
          <div>
            <p className="eyebrow">AI-ASSISTED CHECK</p>

            <h2>Have a product image?</h2>

            <p>
              BISense can help you examine visible product information
              and tell you what should be verified.
            </p>
          </div>

          <a
            href="/product-analyzer"
            className="primary-btn large"
          >
            Analyze Product Image →
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Awareness;