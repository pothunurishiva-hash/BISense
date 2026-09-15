import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

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
    event.stopPropagation();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleImage(droppedFile);
    }
  };

  const analyzeProduct = async () => {
    if (!file || isAnalyzing) return;

    setIsAnalyzing(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/product/analyze`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Product analysis failed. Please try again."
        );
      }

      if (!data?.product) {
        throw new Error(
          "The backend returned an incomplete product analysis."
        );
      }

      setResult({
        ...data,
        product: {
          name: data.product?.name || "Unknown product",
          category: data.product?.category || "Unknown category",
          confidence: data.product?.confidence || "Low",
          description:
            data.product?.description ||
            "No additional visible description was returned.",
        },
        standards: Array.isArray(data.standards) ? data.standards : [],
        disclaimer:
          data.disclaimer ||
          "This result is AI-assisted guidance and does not prove BIS certification.",
      });
    } catch (err) {
      console.error("Product analysis error:", err);

      setError(
        err?.message ||
          "Unable to analyze the product. Make sure the backend is running."
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
    <div className="app-page product-analyzer-page">
      <Navbar />

      <main className="page-container product-analyzer-container">
        <div className="page-intro product-analyzer-intro">
          <p className="eyebrow">AI PRODUCT ANALYSIS</p>

          <h1>Understand a product from an image.</h1>

          <p>
            Upload a product image and BISense will identify visible product
            information and search for potentially relevant BIS standards.
          </p>
        </div>

        <div className="analyzer-grid">
          <section className="upload-card">
            {!image ? (
              <div
                className="drop-zone"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="upload-icon">📷</div>

                <h3>Drop a product image here</h3>

                <p>
                  Drag and drop an image or click to browse your device.
                </p>

                <span>PNG, JPG, WEBP</span>
              </div>
            ) : (
              <div className="image-preview-container">
                <img
                  src={image}
                  alt="Uploaded product preview"
                  className="preview-image"
                />

                <div className="image-file-info">
                  <span title={fileName}>{fileName}</span>

                  <button type="button" onClick={removeImage}>
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
                type="button"
                className="secondary-btn large"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                {image ? "Choose Another Image" : "Choose Image"}
              </button>

              <button
                type="button"
                className="primary-btn large"
                onClick={analyzeProduct}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Product →"}
              </button>
            </div>

            {isAnalyzing && (
              <LoadingSpinner text="Analyzing product image..." />
            )}

            {error && (
              <div className="warning-box large-warning" role="alert">
                {error}
              </div>
            )}
          </section>

          <section className="analysis-card">
            {!result ? (
              <>
                <p className="eyebrow">WHAT WE ANALYZE</p>

                <h2>AI-assisted product insights.</h2>

                <div className="analysis-item">
                  <span>01</span>

                  <div>
                    <strong>Product identification</strong>

                    <p>
                      Gemini analyzes the visible product and estimates its
                      type and category.
                    </p>
                  </div>
                </div>

                <div className="analysis-item">
                  <span>02</span>

                  <div>
                    <strong>BIS relevance</strong>

                    <p>
                      BISense searches its standards database using the
                      identified product information.
                    </p>
                  </div>
                </div>

                <div className="analysis-item">
                  <span>03</span>

                  <div>
                    <strong>Verification guidance</strong>

                    <p>
                      Potentially relevant standards are shown with their BIS
                      source information.
                    </p>
                  </div>
                </div>

                <div className="warning-box">
                  An image alone cannot prove that a product is BIS-certified
                  or that a BIS mark is genuine.
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
                      {result.product?.confidence || "Low"}
                    </p>
                  </div>
                </div>

                <p className="eyebrow">IDENTIFIED PRODUCT</p>

                <h2>
                  {result.product?.name || "Unknown product"}
                </h2>

                <div className="result-highlight">
                  <span>CATEGORY</span>

                  <strong>
                    {result.product?.category || "Unknown category"}
                  </strong>

                  <p>
                    {result.product?.description ||
                      "No additional visible description was returned."}
                  </p>
                </div>

                <div className="analysis-result-list">
                  <div>
                    <span>Product</span>

                    <strong>
                      {result.product?.name || "Unknown"}
                    </strong>
                  </div>

                  <div>
                    <span>Category</span>

                    <strong>
                      {result.product?.category || "Unknown"}
                    </strong>
                  </div>

                  <div>
                    <span>Potential BIS matches</span>

                    <strong>
                      {result.standards?.length || 0}
                    </strong>
                  </div>
                </div>

                <div className="next-steps-card">
                  <p className="eyebrow">
                    POTENTIALLY RELEVANT STANDARDS
                  </p>

                  {result.standards?.length > 0 ? (
                    result.standards.map((standard, index) => {
                      const standardNumber =
                        standard?.number || standard?.standard_number;

                      const standardTitle =
                        standard?.title ||
                        standard?.name ||
                        "Standard details unavailable";

                      const standardCategory =
                        standard?.category || "Uncategorized";

                      const editionYear =
                        standard?.edition_year || standard?.year;

                      return (
                        <div
                          className="next-step"
                          key={
                            standardNumber ||
                            `${standardTitle}-${index}`
                          }
                        >
                          <span>•</span>

                          <div>
                            <strong>
                              {standardNumber || "Standard"}
                            </strong>

                            <p>{standardTitle}</p>

                            <p>
                              {standardCategory}
                              {editionYear
                                ? ` · ${editionYear}`
                                : ""}
                            </p>

                            {standardNumber && (
                              <a
                                href={`/standard/${encodeURIComponent(
                                  standardNumber
                                )}`}
                                className="text-btn"
                              >
                                View Standard Details →
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="result-intro">
                      No strong match was found in the current BISense
                      database.
                    </p>
                  )}
                </div>

                <div className="result-actions">
                  <a
                    href="/standards"
                    className="primary-btn"
                  >
                    Search Standards →
                  </a>

                  <a
                    href="/copilot"
                    className="secondary-btn"
                  >
                    Ask BIS AI
                  </a>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => window.print()}
                  >
                    🖨 Print
                  </button>

                  <button
                    type="button"
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
              <p>Provide a clear product image.</p>
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
                Check important information against official BIS sources.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .product-analyzer-page {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .product-analyzer-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .product-analyzer-intro h1,
        .product-analyzer-intro p,
        .upload-card h3,
        .upload-card p,
        .analysis-card h2,
        .analysis-card p,
        .product-analyzer-info h2,
        .workflow p,
        .workflow strong,
        .analysis-item strong,
        .image-file-info span,
        .next-step strong,
        .next-step p,
        .result-highlight strong,
        .analysis-result-list strong,
        .analysis-result-list span {
          color: #111827;
        }

        .product-analyzer-intro h1,
        .analysis-card h2,
        .product-analyzer-info h2 {
          color: #111827 !important;
        }

        .upload-card,
        .analysis-card,
        .product-analyzer-info {
          box-sizing: border-box;
        }

        .drop-zone {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
        }

        .drop-zone:focus {
          outline: 2px solid #111827;
          outline-offset: 4px;
        }

        .image-preview-container {
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .preview-image {
          display: block;
          width: 100%;
          max-width: 100%;
          max-height: 480px;
          object-fit: contain;
          border-radius: 14px;
        }

        .image-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
        }

        .image-file-info span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .image-file-info button {
          flex-shrink: 0;
          cursor: pointer;
        }

        .upload-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }

        .upload-actions button,
        .result-actions a,
        .result-actions button {
          box-sizing: border-box;
        }

        .result-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .result-actions a {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .next-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .next-step > div {
          min-width: 0;
          flex: 1;
        }

        .next-step p {
          overflow-wrap: anywhere;
        }

        .text-btn {
          display: inline-block;
          margin-top: 6px;
          word-break: break-word;
        }

        @media (max-width: 900px) {
          .analyzer-grid {
            grid-template-columns: 1fr !important;
          }

          .upload-actions,
          .result-actions {
            width: 100%;
          }

          .upload-actions > *,
          .result-actions > * {
            flex: 1 1 100%;
            width: 100%;
          }

          .workflow {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 600px) {
          .page-container {
            width: 100% !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            box-sizing: border-box;
          }

          .product-analyzer-intro h1 {
            font-size: clamp(28px, 8vw, 38px) !important;
            line-height: 1.12 !important;
          }

          .product-analyzer-intro > p:last-child {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .upload-card,
          .analysis-card,
          .product-analyzer-info {
            width: 100% !important;
            box-sizing: border-box;
          }

          .drop-zone {
            min-height: 240px;
            padding: 24px 14px;
            box-sizing: border-box;
          }

          .preview-image {
            max-height: 300px;
          }

          .upload-actions {
            flex-direction: column;
          }

          .upload-actions > button,
          .result-actions > *,
          .result-actions button {
            width: 100% !important;
            min-width: 0;
          }

          .workflow {
            grid-template-columns: 1fr !important;
          }

          .analysis-item {
            display: flex !important;
            gap: 12px;
          }

          .analysis-item > div {
            min-width: 0;
          }

          .analysis-item p,
          .next-step p,
          .warning-box {
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .analysis-result-list {
            width: 100%;
          }

          .analysis-result-list > div {
            min-width: 0;
          }

          .image-file-info {
            align-items: flex-start;
          }

          .image-file-info button {
            padding: 8px 10px;
          }
        }

        @media print {
          .product-analyzer-page nav,
          .product-analyzer-page footer,
          .upload-card,
          .product-analyzer-info,
          .result-actions {
            display: none !important;
          }

          .product-analyzer-page {
            background: #fff !important;
          }

          .product-analyzer-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .analysis-card {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ProductAnalyzer;