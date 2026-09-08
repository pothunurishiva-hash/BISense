import { useRef, useState } from "react";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = "";

function ProductAnalyzer() {
  const fileInputRef = useRef(null);

  const [image, setImage] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleImage = (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setResult(null);

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (image) {
      URL.revokeObjectURL(image);
    }

    const imageUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setImage(imageUrl);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      handleImage(selectedFile);
    }

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleImage(droppedFile);
    }
  };

  const analyzeProduct = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/product/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Product analysis failed."
        );
      }

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to analyze the product. Make sure the FastAPI backend is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeImage = () => {
    if (image) {
      URL.revokeObjectURL(image);
    }

    setImage("");
    setFile(null);
    setFileName("");
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-container">
        <div className="page-intro">
          <p className="eyebrow">AI PRODUCT ANALYSIS</p>

          <h1>Understand a product from an image.</h1>

          <p>
            Upload a product image and BISense will identify the
            visible product information and search for potentially
            relevant BIS standards.
          </p>
        </div>

        <div className="analyzer-grid">
          <section className="upload-card">
            {!image ? (
              <div
                className="drop-zone"
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <div className="upload-icon">📷</div>

                <h3>Drop a product image here</h3>

                <p>
                  Drag and drop an image or click to browse your
                  device.
                </p>

                <span>PNG, JPG, WEBP</span>
              </div>
            ) : (
              <div className="image-preview-container">
                <img
                  src={image}
                  alt="Uploaded product"
                  className="preview-image"
                />

                <div className="image-file-info">
                  <span>{fileName}</span>

                  <button onClick={removeImage}>
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              hidden
            />

            <div className="upload-actions">
              <button
                className="secondary-btn large"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                {image
                  ? "Choose Another Image"
                  : "Choose Image"}
              </button>

              <button
                className="primary-btn large"
                onClick={analyzeProduct}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing
                  ? "Analyzing..."
                  : "Analyze Product →"}
              </button>
            </div>

            {isAnalyzing && (
              <LoadingSpinner text="Analyzing product image..." />
            )}

            {error && (
              <div className="warning-box large-warning">
                {error}
              </div>
            )}
          </section>

          <section className="analysis-card">
            {!result ? (
              <>
                <p className="eyebrow">
                  WHAT WE ANALYZE
                </p>

                <h2>AI-assisted product insights.</h2>

                <div className="analysis-item">
                  <span>01</span>

                  <div>
                    <strong>
                      Product identification
                    </strong>

                    <p>
                      Gemini analyzes the visible product and
                      estimates its type and category.
                    </p>
                  </div>
                </div>

                <div className="analysis-item">
                  <span>02</span>

                  <div>
                    <strong>BIS relevance</strong>

                    <p>
                      BISense searches its standards database
                      using the identified product information.
                    </p>
                  </div>
                </div>

                <div className="analysis-item">
                  <span>03</span>

                  <div>
                    <strong>
                      Verification guidance
                    </strong>

                    <p>
                      Potentially relevant standards are shown
                      with their BIS source information.
                    </p>
                  </div>
                </div>

                <div className="warning-box">
                  An image alone cannot prove that a product is
                  BIS-certified or that a BIS mark is genuine.
                </div>
              </>
            ) : (
              <div className="analysis-result">
                <div className="analysis-success">
                  <span>✓</span>

                  <div>
                    <strong>Analysis complete</strong>

                    <p>
                      Confidence:{" "}
                      {result.product.confidence || "Low"}
                    </p>
                  </div>
                </div>

                <p className="eyebrow">
                  IDENTIFIED PRODUCT
                </p>

                <h2>{result.product.name}</h2>

                <div className="result-highlight">
                  <span>CATEGORY</span>

                  <strong>
                    {result.product.category}
                  </strong>

                  <p>
                    {result.product.description ||
                      "No additional visible description was returned."}
                  </p>
                </div>

                <div className="analysis-result-list">
                  <div>
                    <span>Product</span>

                    <strong>
                      {result.product.name}
                    </strong>
                  </div>

                  <div>
                    <span>Category</span>

                    <strong>
                      {result.product.category}
                    </strong>
                  </div>

                  <div>
                    <span>Potential BIS matches</span>

                    <strong>
                      {result.standards.length}
                    </strong>
                  </div>
                </div>

                <div className="next-steps-card">
                  <p className="eyebrow">
                    POTENTIALLY RELEVANT STANDARDS
                  </p>

                  {result.standards.length > 0 ? (
                    result.standards.map((standard) => (
                      <div
                        className="next-step"
                        key={standard.number}
                      >
                        <span>•</span>

                        <div>
                          <strong>
                            {standard.number}
                          </strong>

                          <p>
                            {standard.title}
                          </p>

                          <p>
                            {standard.category}
                            {standard.edition_year
                              ? ` · ${standard.edition_year}`
                              : ""}
                          </p>

                          <a
                            href={`/standard/${encodeURIComponent(
                              standard.number
                            )}`}
                            className="text-btn"
                          >
                            View Standard Details →
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="result-intro">
                      No strong match was found in the
                      current BISense database.
                    </p>
                  )}
                </div>

                <div className="result-actions">
                  <a
                    href="/search"
                    className="primary-btn"
                  >
                    Search Standards →
                  </a>

                  <a
                    href="/ai"
                    className="secondary-btn"
                  >
                    Ask BIS AI
                  </a>

                  <button
                    className="secondary-btn"
                    onClick={() => window.print()}
                  >
                    🖨 Print
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={removeImage}
                  >
                    Analyze Another
                  </button>
                </div>

                <div className="warning-box">
                  {result.disclaimer}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="product-analyzer-info">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>

            <h2>From image to BIS guidance.</h2>
          </div>

          <div className="workflow">
            <div>
              <span>01</span>
              <strong>Upload</strong>
              <p>
                Provide a clear product image.
              </p>
            </div>

            <div>
              <span>02</span>
              <strong>Analyze</strong>
              <p>
                Gemini examines the visible product information.
              </p>
            </div>

            <div>
              <span>03</span>
              <strong>Match</strong>
              <p>
                BISense searches its standards database.
              </p>
            </div>

            <div>
              <span>04</span>
              <strong>Verify</strong>
              <p>
                Check important information against official BIS
                sources.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ProductAnalyzer;