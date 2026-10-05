import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = "";
const RENDER_API = "https://bisense-5ozn.onrender.com";

const ANALYSIS_CACHE_PREFIX = "bisense_product_analysis_v2_";
const ANALYSIS_CACHE_TTL = 10 * 60 * 1000;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 40 * 1000;

const SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  return fallback;
}

function getStandardNumber(standard) {
  return normalizeText(
    standard?.number ||
      standard?.standard_number ||
      standard?.is_number ||
      standard?.standard ||
      ""
  );
}

function getStandardTitle(standard) {
  return normalizeText(
    standard?.title ||
      standard?.name ||
      standard?.description ||
      "Standard details unavailable"
  );
}

function getStandardCategory(standard) {
  return normalizeText(
    standard?.category ||
      standard?.sector ||
      ""
  );
}

function getStandardYear(standard) {
  return (
    standard?.edition_year ||
    standard?.year ||
    standard?.edition ||
    ""
  );
}

function getStandardSource(standard) {
  return normalizeText(
    standard?.source_url ||
      standard?.url ||
      ""
  );
}

function getPotentialMatchReason(standard) {
  return normalizeText(
    standard?.reason ||
      standard?.match_reason ||
      standard?.relevance_reason ||
      standard?.why_relevant ||
      ""
  );
}

function getOptionalProductDetails(product) {
  const candidates = [
    ["Visible features", product?.visible_features],
    ["Observed features", product?.observed_features],
    ["Materials", product?.materials],
    ["Material", product?.material],
    ["Intended use", product?.intended_use],
    ["Use case", product?.use_case],
    ["Appearance", product?.appearance],
    ["Key characteristics", product?.key_characteristics],
    ["Identified attributes", product?.attributes],
  ];

  return candidates
    .map(([label, value]) => {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((item) => normalizeText(item))
          .filter(Boolean);

        return cleaned.length
          ? { label, value: cleaned.join(", ") }
          : null;
      }

      const text = normalizeText(value);

      return text ? { label, value: text } : null;
    })
    .filter(Boolean);
}

function makeAnalysisCacheKey(file) {
  if (!file) return "";

  return `${ANALYSIS_CACHE_PREFIX}${[
    file.name,
    file.size,
    file.type,
    file.lastModified,
  ]
    .map((value) => String(value ?? ""))
    .join("_")}`;
}

function readAnalysisCache(file) {
  if (!file) return null;

  try {
    const raw = sessionStorage.getItem(
      makeAnalysisCacheKey(file)
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp);

    if (!Number.isFinite(timestamp)) return null;

    if (
      Date.now() - timestamp >
      ANALYSIS_CACHE_TTL
    ) {
      sessionStorage.removeItem(
        makeAnalysisCacheKey(file)
      );
      return null;
    }

    if (!parsed?.result?.product) return null;

    return parsed.result;
  } catch (error) {
    console.warn(
      "Unable to read product analysis cache:",
      error
    );
    return null;
  }
}

function writeAnalysisCache(file, result) {
  if (!file || !result) return;

  try {
    sessionStorage.setItem(
      makeAnalysisCacheKey(file),
      JSON.stringify({
        timestamp: Date.now(),
        result,
      })
    );
  } catch (error) {
    console.warn(
      "Unable to cache product analysis:",
      error
    );
  }
}

function revokeObjectUrl(url) {
  if (!url) return;

  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore URL cleanup errors.
  }
}

async function fetchJsonWithTimeout(
  url,
  file,
  signal
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    cache: "no-store",
    signal,
  });

  const contentType =
    response.headers.get("content-type") || "";

  let data = {};

  if (
    contentType.includes("application/json")
  ) {
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Product analysis returned invalid JSON (${response.status}).`
      );
    }
  } else {
    const raw = await response.text();

    throw new Error(
      `Product analysis returned a non-JSON response (${response.status})${
        raw ? "." : ""
      }`
    );
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        `Product analysis failed with HTTP ${response.status}.`
      )
    );
  }

  if (data?.error) {
    throw new Error(
      getErrorMessage(
        data,
        "Product analysis failed."
      )
    );
  }

  return data;
}

async function analyzeWithFallback(
  file,
  signal
) {
  const endpoints = [
    `${RENDER_API}/api/product/analyze`,
    `${API_URL}/api/product/analyze`,
  ];

  let lastError = null;

  for (
    const endpoint of endpoints
  ) {
    try {
      return await fetchJsonWithTimeout(
        endpoint,
        file,
        signal
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }

      console.warn(
        "Product analysis endpoint failed:",
        endpoint,
        error
      );

      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Unable to reach the BISense product analysis service."
    )
  );
}

function warmBackend() {
  fetch(RENDER_API, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => {});
}

function normalizeAnalysis(data) {
  if (!data?.product) {
    throw new Error(
      "The backend returned an incomplete product analysis."
    );
  }

  const confidence =
    normalizeText(
      data?.product?.confidence ||
        data?.confidence
    ) || "Low";

  const description =
    normalizeText(
      data?.product?.description ||
        data?.description
    );

  const standards = Array.isArray(
    data?.standards
  )
    ? data.standards.filter(Boolean)
    : [];

  const normalizedProduct = {
    name:
      normalizeText(
        data?.product?.name
      ) || "Unknown product",

    category:
      normalizeText(
        data?.product?.category
      ) || "Unknown category",

    confidence,

    description:
      description ||
      "The AI analysis did not return a detailed visible description.",

    ...data.product,
  };

  return {
    ...data,

    product: normalizedProduct,

    standards,

    disclaimer:
      normalizeText(
        data?.disclaimer
      ) ||
      "This is AI-assisted guidance. An image analysis does not prove BIS certification, licence status, conformity, or authenticity of a BIS mark.",

    source:
      data?.source || null,

    analysis_metadata:
      data?.analysis_metadata ||
      data?.metadata ||
      null,
  };
}

function confidenceClass(value) {
  const text = normalizeText(value).toLowerCase();

  if (text.includes("high")) return "high";
  if (text.includes("medium")) return "medium";

  return "low";
}

function getConfidenceExplanation(value) {
  const text = normalizeText(value).toLowerCase();

  if (text.includes("high")) {
    return "The visible product characteristics gave the model a relatively strong identification signal.";
  }

  if (text.includes("medium")) {
    return "The image provided useful product signals, but some characteristics may remain ambiguous.";
  }

  return "The image did not provide enough reliable visual information for a strong identification. Verify the result before using it for BIS decisions.";
}

function getDetailedDescription(product) {
  const description = normalizeText(
    product?.description
  );

  if (description) return description;

  const name = normalizeText(
    product?.name
  );

  const category = normalizeText(
    product?.category
  );

  if (name && category) {
    return `The product has been identified as ${name} within the ${category} category. The available image-based analysis is preliminary and should be checked against product documentation, labelling and official BIS information.`;
  }

  return "The available image-based analysis is preliminary. Verify the product identity using the product label, model information, technical documentation and official BIS sources.";
}

function ProductAnalyzer() {
  const fileInputRef = useRef(null);

  const [image, setImage] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [dragActive, setDragActive] =
    useState(false);

  const [analysisFromCache, setAnalysisFromCache] =
    useState(false);

  useEffect(() => {
    return () => {
      revokeObjectUrl(image);
    };
  }, [image]);

  const standards = useMemo(() => {
    if (!Array.isArray(result?.standards)) {
      return [];
    }

    return result.standards
      .map((standard, index) => ({
        standard,
        index,
        number: getStandardNumber(
          standard
        ),
        title: getStandardTitle(
          standard
        ),
        reason: getPotentialMatchReason(
          standard
        ),
      }))
      .filter(
        (item) =>
          item.number ||
          item.title
      )
      .sort((a, b) => {
        const aScore = Number(
          a.standard?.match_score ??
            a.standard?.score ??
            a.standard?.relevance_score
        );

        const bScore = Number(
          b.standard?.match_score ??
            b.standard?.score ??
            b.standard?.relevance_score
        );

        if (
          Number.isFinite(aScore) &&
          Number.isFinite(bScore)
        ) {
          return bScore - aScore;
        }

        return (
          a.index - b.index
        );
      });
  }, [result]);

  const productDetails = useMemo(
    () =>
      getOptionalProductDetails(
        result?.product
      ),
    [result]
  );

  const selectedSource =
    normalizeText(
      result?.product?.source_url ||
        result?.source?.source_url
    );

  const detailedDescription =
    getDetailedDescription(
      result?.product
    );

  const handleImage = (
    selectedFile
  ) => {
    if (!selectedFile) return;

    setError("");
    setResult(null);
    setAnalysisFromCache(false);

    if (
      !SUPPORTED_TYPES.has(
        selectedFile.type
      )
    ) {
      setFile(null);
      setFileName("");

      setError(
        "Please choose a PNG, JPG or WEBP image."
      );
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setFile(null);
      setFileName("");

      setError(
        "The image is too large. Please choose an image under 10 MB."
      );
      return;
    }

    revokeObjectUrl(image);

    const imageUrl =
      URL.createObjectURL(
        selectedFile
      );

    setFile(selectedFile);
    setFileName(
      selectedFile.name
    );
    setImage(imageUrl);
  };

  const handleFileChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      handleImage(
        selectedFile
      );
    }

    event.target.value = "";
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleImage(
        droppedFile
      );
    }
  };

  const analyzeProduct = async () => {
    if (
      !file ||
      isAnalyzing
    ) {
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setResult(null);
    setAnalysisFromCache(false);

    const cached =
      readAnalysisCache(file);

    if (cached) {
      setResult(cached);
      setAnalysisFromCache(true);
      setIsAnalyzing(false);
      return;
    }

    try {
      warmBackend();

      const controller =
        new AbortController();

      const timeoutId =
        window.setTimeout(() => {
          controller.abort();
        }, REQUEST_TIMEOUT_MS);

      let data;

      try {
        data =
          await analyzeWithFallback(
            file,
            controller.signal
          );
      } finally {
        window.clearTimeout(
          timeoutId
        );
      }

      const normalized =
        normalizeAnalysis(
          data
        );

      setResult(normalized);

      writeAnalysisCache(
        file,
        normalized
      );
    } catch (err) {
      console.error(
        "Product analysis error:",
        err
      );

      if (
        err?.name ===
        "AbortError"
      ) {
        setError(
          "Product analysis took too long. Please try again with a clear, well-lit image."
        );
      } else {
        setError(
          err?.message ||
            "Unable to analyze the product. Please try again."
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeImage = () => {
    revokeObjectUrl(image);

    setImage("");
    setFile(null);
    setFileName("");
    setResult(null);
    setError("");
    setAnalysisFromCache(false);

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  const viewStandard = (
    standardNumber
  ) => {
    const clean = normalizeText(
      standardNumber
    );

    if (!clean) return;

    window.location.href =
      `/standard/${encodeURIComponent(
        clean
      )}`;
  };

  const printResult = () => {
    window.print();
  };

  return (
    <div className="app-page product-analyzer-page">
      <Navbar />

      <main className="page-container product-analyzer-container">
        <div className="page-intro product-analyzer-intro">
          <div className="product-kicker-row">
            <p className="eyebrow">
              AI PRODUCT INTELLIGENCE
            </p>

            <span className="product-engine-badge">
              GEMINI-ASSISTED
            </span>
          </div>

          <h1>
            Understand a product
            <span> before you act.</span>
          </h1>

          <p>
            Upload a clear product image. BISense identifies
            visible product information, explains what the product
            appears to be in detail, and surfaces potentially
            relevant Indian Standards from the BISense knowledge base.
          </p>

          <div className="product-trust-row">
            <span>✓ Image-assisted identification</span>
            <span>✓ BIS standard matching</span>
            <span>✓ Source-aware verification</span>
          </div>
        </div>

        <div className="product-analyzer-grid">
          <section className="product-upload-card">
            <div className="product-section-top">
              <div>
                <p className="eyebrow">
                  STEP 1
                </p>

                <h2>
                  Upload product image
                </h2>

                <p>
                  A front-facing, well-lit image with visible
                  labels or model information gives the analyzer
                  better evidence to work with.
                </p>
              </div>

              <span className="product-step-marker">
                01
              </span>
            </div>

            {!image ? (
              <div
                className={
                  dragActive
                    ? "product-drop-zone active"
                    : "product-drop-zone"
                }
                onDragOver={(
                  event
                ) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setDragActive(
                    true
                  );
                }}
                onDragLeave={(
                  event
                ) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setDragActive(
                    false
                  );
                }}
                onDrop={
                  handleDrop
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                role="button"
                tabIndex={0}
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key ===
                      " "
                  ) {
                    event.preventDefault();

                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="product-upload-symbol">
                  +
                </div>

                <strong>
                  Drop a product image here
                </strong>

                <p>
                  Drag and drop or click to browse
                </p>

                <span>
                  PNG · JPG · WEBP · Max 10 MB
                </span>
              </div>
            ) : (
              <div className="product-preview-shell">
                <img
                  src={image}
                  alt="Uploaded product preview"
                  className="product-preview-image"
                />

                <div className="product-file-bar">
                  <div>
                    <span>
                      SELECTED IMAGE
                    </span>

                    <strong
                      title={fileName}
                    >
                      {fileName}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={
                      removeImage
                    }
                    disabled={
                      isAnalyzing
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={
                handleFileChange
              }
              hidden
            />

            <div className="product-upload-actions">
              <button
                type="button"
                className="secondary-btn large"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  isAnalyzing
                }
              >
                {image
                  ? "Choose Another"
                  : "Choose Image"}
              </button>

              <button
                type="button"
                className="primary-btn large"
                onClick={
                  analyzeProduct
                }
                disabled={
                  !file ||
                  isAnalyzing
                }
              >
                {isAnalyzing
                  ? "Analyzing..."
                  : "Analyze Product →"}
              </button>
            </div>

            {isAnalyzing && (
              <div className="product-analysis-loader">
                <LoadingSpinner text="Analyzing image and finding potential BIS matches..." />

                <div className="product-analysis-pipeline">
                  <span className="active">
                    Image
                  </span>
                  <i />
                  <span className="active">
                    AI analysis
                  </span>
                  <i />
                  <span>
                    BIS matching
                  </span>
                  <i />
                  <span>
                    Verification
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                className="warning-box large-warning product-error"
                role="alert"
              >
                <strong>
                  Analysis failed
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}

            <div className="product-image-guidance">
              <strong>
                Better image → better signal
              </strong>

              <p>
                Keep the product centered and avoid heavy blur,
                reflections or extreme cropping. Include visible
                brand/model labels when possible.
              </p>
            </div>
          </section>

          <section className="product-analysis-card">
            {!result ? (
              <div className="product-analysis-empty">
                <div className="product-empty-mark">
                  ◈
                </div>

                <p className="eyebrow">
                  STEP 2
                </p>

                <h2>
                  AI-assisted product intelligence
                </h2>

                <p>
                  Your result will combine an image-based product
                  identification with potentially relevant BIS
                  standards. BISense treats these as preliminary
                  matches, not an official BIS determination.
                </p>

                <div className="product-empty-grid">
                  <div>
                    <span>
                      01
                    </span>
                    <strong>
                      Identify
                    </strong>
                    <p>
                      Determine what the product appears to be.
                    </p>
                  </div>

                  <div>
                    <span>
                      02
                    </span>
                    <strong>
                      Describe
                    </strong>
                    <p>
                      Explain the visible product characteristics
                      returned by the AI analysis.
                    </p>
                  </div>

                  <div>
                    <span>
                      03
                    </span>
                    <strong>
                      Match
                    </strong>
                    <p>
                      Surface potentially relevant Indian Standards.
                    </p>
                  </div>

                  <div>
                    <span>
                      04
                    </span>
                    <strong>
                      Verify
                    </strong>
                    <p>
                      Continue to official BIS information before deciding.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="product-result">
                <div className="product-result-topbar">
                  <div>
                    <span className="product-result-status-dot" />
                    ANALYSIS COMPLETE
                  </div>

                  <span className="product-result-source-badge">
                    {analysisFromCache
                      ? "CACHED SESSION RESULT"
                      : "LIVE AI RESULT"}
                  </span>
                </div>

                <div className="product-identification">
                  <div>
                    <p className="eyebrow">
                      IDENTIFIED PRODUCT
                    </p>

                    <h2>
                      {result.product?.name ||
                        "Unknown product"}
                    </h2>

                    <p className="product-category-line">
                      {result.product?.category ||
                        "Unknown category"}
                    </p>
                  </div>

                  <div
                    className={`product-confidence ${confidenceClass(
                      result.product?.confidence
                    )}`}
                  >
                    <span>
                      CONFIDENCE
                    </span>

                    <strong>
                      {result.product?.confidence ||
                        "Low"}
                    </strong>
                  </div>
                </div>

                <section className="product-description-card">
                  <div className="product-card-label-row">
                    <p className="eyebrow">
                      DETAILED DESCRIPTION
                    </p>

                    <span>
                      AI-ASSISTED
                    </span>
                  </div>

                  <p className="product-detailed-description">
                    {detailedDescription}
                  </p>

                  <div className="product-confidence-explanation">
                    <strong>
                      What the confidence means
                    </strong>

                    <p>
                      {getConfidenceExplanation(
                        result.product?.confidence
                      )}
                    </p>
                  </div>
                </section>

                <section className="product-overview-grid">
                  <div className="product-overview-card">
                    <span>
                      PRODUCT
                    </span>

                    <strong>
                      {result.product?.name ||
                        "Unknown"}
                    </strong>
                  </div>

                  <div className="product-overview-card">
                    <span>
                      CATEGORY
                    </span>

                    <strong>
                      {result.product?.category ||
                        "Unknown"}
                    </strong>
                  </div>

                  <div className="product-overview-card">
                    <span>
                      POTENTIAL BIS MATCHES
                    </span>

                    <strong>
                      {standards.length}
                    </strong>
                  </div>

                  <div className="product-overview-card">
                    <span>
                      ANALYSIS SOURCE
                    </span>

                    <strong>
                      {normalizeText(
                        result?.source?.source_name
                      ) ||
                        normalizeText(
                          result?.source
                        ) ||
                        "BISense AI"}
                    </strong>
                  </div>
                </section>

                {productDetails.length > 0 && (
                  <section className="product-attributes-card">
                    <div className="product-card-label-row">
                      <p className="eyebrow">
                        OBSERVED / RETURNED DETAILS
                      </p>

                      <span>
                        AVAILABLE DATA
                      </span>
                    </div>

                    <div className="product-attributes-grid">
                      {productDetails.map(
                        (item) => (
                          <div
                            key={item.label}
                          >
                            <span>
                              {item.label}
                            </span>

                            <strong>
                              {item.value}
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

                <section className="product-standards-card">
                  <div className="product-section-heading">
                    <div>
                      <p className="eyebrow">
                        STEP 3 · BIS RELEVANCE
                      </p>

                      <h3>
                        Potentially relevant Indian Standards
                      </h3>

                      <p>
                        These are preliminary knowledge-base matches
                        surfaced from the product analysis. They are
                        not an official BIS classification.
                      </p>
                    </div>

                    <span className="product-match-count">
                      {standards.length}
                    </span>
                  </div>

                  {standards.length > 0 ? (
                    <div className="product-standard-list">
                      {standards.map(
                        ({
                          standard,
                          index,
                          number,
                          title,
                          reason,
                        }) => {
                          const category =
                            getStandardCategory(
                              standard
                            );

                          const year =
                            getStandardYear(
                              standard
                            );

                          const source =
                            getStandardSource(
                              standard
                            );

                          const scoreValue =
                            Number(
                              standard?.match_score ??
                                standard?.score ??
                                standard?.relevance_score
                            );

                          const hasScore =
                            Number.isFinite(
                              scoreValue
                            );

                          return (
                            <article
                              className="product-standard-item"
                              key={
                                number ||
                                `${title}-${index}`
                              }
                            >
                              <div className="product-standard-rank">
                                {String(
                                  index + 1
                                ).padStart(2, "0")}
                              </div>

                              <div className="product-standard-content">
                                <div className="product-standard-meta">
                                  <span>
                                    {category ||
                                      "BIS STANDARD"}
                                  </span>

                                  {year && (
                                    <span>
                                      {year}
                                    </span>
                                  )}

                                  {hasScore && (
                                    <span>
                                      Match{" "}
                                      {Math.round(
                                        scoreValue
                                      )}
                                    </span>
                                  )}
                                </div>

                                <h4>
                                  {number ||
                                    "Indian Standard"}
                                </h4>

                                <p>
                                  {title}
                                </p>

                                {reason && (
                                  <div className="product-match-reason">
                                    <strong>
                                      Why it appeared
                                    </strong>

                                    <span>
                                      {reason}
                                    </span>
                                  </div>
                                )}

                                <div className="product-standard-actions">
                                  {number && (
                                    <button
                                      type="button"
                                      className="text-btn product-standard-button"
                                      onClick={() =>
                                        viewStandard(
                                          number
                                        )
                                      }
                                    >
                                      View Standard Details →
                                    </button>
                                  )}

                                  {source && (
                                    <a
                                      href={source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-btn"
                                    >
                                      Open Source ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="product-no-match">
                      <strong>
                        No strong match was found
                      </strong>

                      <p>
                        The current BISense knowledge base did not
                        return a strong potential standard for this
                        image. Try a clearer image or continue with
                        a manual Standards Search.
                      </p>
                    </div>
                  )}
                </section>

                <section className="product-result-actions">
                  <div>
                    <p className="eyebrow">
                      CONTINUE THE BIS WORKFLOW
                    </p>

                    <h3>
                      From product identification to action.
                    </h3>
                  </div>

                  <div className="product-result-action-grid">
                    <Link
                      to="/standards"
                      className="product-action-card"
                    >
                      <span>
                        01
                      </span>

                      <strong>
                        Explore Standards
                      </strong>

                      <p>
                        Search the BISense standards database.
                      </p>

                      <b>
                        Open →
                      </b>
                    </Link>

                    <Link
                      to="/certification"
                      className="product-action-card"
                    >
                      <span>
                        02
                      </span>

                      <strong>
                        Certification Advisor
                      </strong>

                      <p>
                        Explore potential certification considerations.
                      </p>

                      <b>
                        Continue →
                      </b>
                    </Link>

                    <Link
                      to="/compliance"
                      className="product-action-card"
                    >
                      <span>
                        03
                      </span>

                      <strong>
                        Compliance
                      </strong>

                      <p>
                        Turn a selected standard into a checklist.
                      </p>

                      <b>
                        Continue →
                      </b>
                    </Link>

                    <Link
                      to="/laboratories"
                      className="product-action-card"
                    >
                      <span>
                        04
                      </span>

                      <strong>
                        Find Laboratory
                      </strong>

                      <p>
                        Find BIS LIMS laboratory records for testing.
                      </p>

                      <b>
                        Open →
                      </b>
                    </Link>
                  </div>
                </section>

                <div className="product-result-buttons">
                  <button
                    type="button"
                    className="primary-btn large"
                    onClick={
                      printResult
                    }
                  >
                    🖨 Print Analysis
                  </button>

                  {selectedSource && (
                    <a
                      href={selectedSource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-btn large"
                    >
                      Verify Source ↗
                    </a>
                  )}

                  <button
                    type="button"
                    className="secondary-btn large"
                    onClick={
                      removeImage
                    }
                  >
                    Analyze Another
                  </button>
                </div>

                <div
                  className="warning-box product-disclaimer"
                >
                  {result.disclaimer}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="product-methodology">
          <div className="product-methodology-heading">
            <div>
              <p className="eyebrow">
                HOW BISENSE ANALYZES
              </p>

              <h2>
                Image → explanation → standards → verification
              </h2>

              <p>
                The analyzer is designed as a discovery workflow:
                visual information is interpreted first, then the
                resulting product context is connected to BISense
                standard records.
              </p>
            </div>

            <div className="product-methodology-note">
              <strong>
                Important
              </strong>

              <span>
                A visual estimate cannot independently establish
                certification status or legal conformity.
              </span>
            </div>
          </div>

          <div className="product-methodology-grid">
            <div>
              <span>
                01
              </span>

              <strong>
                Image evidence
              </strong>

              <p>
                The model works from what is visibly present in the
                uploaded image.
              </p>
            </div>

            <div>
              <span>
                02
              </span>

              <strong>
                Detailed explanation
              </strong>

              <p>
                The product description shown above comes from the
                analysis response, with missing fields explicitly
                identified instead of guessed.
              </p>
            </div>

            <div>
              <span>
                03
              </span>

              <strong>
                BIS matching
              </strong>

              <p>
                Potential standard matches are shown as discovery
                candidates and should be verified.
              </p>
            </div>

            <div>
              <span>
                04
              </span>

              <strong>
                Official verification
              </strong>

              <p>
                Continue to official BIS information before making
                certification or compliance decisions.
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
          color: #111827;
          background: #f7f9fc;
        }

        .product-analyzer-container {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .product-analyzer-page h1,
        .product-analyzer-page h2,
        .product-analyzer-page h3,
        .product-analyzer-page h4,
        .product-analyzer-page p,
        .product-analyzer-page span,
        .product-analyzer-page strong {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .product-analyzer-intro {
          position: relative;
          padding-top: 14px;
        }

        .product-analyzer-intro h1 {
          max-width: 900px;
          margin-bottom: 16px;
          color: #101827 !important;
          font-size: clamp(42px, 6vw, 76px);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .product-analyzer-intro h1 span {
          color: #5666e8 !important;
        }

        .product-analyzer-intro > p:last-of-type {
          max-width: 860px;
          color: #53627b !important;
          font-size: 17px;
          line-height: 1.75;
        }

        .product-kicker-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .product-engine-badge {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border: 1px solid #dbe1ff;
          border-radius: 999px;
          background: #eef1ff;
          color: #4a59c6 !important;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .product-trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 22px;
          color: #60708b;
          font-size: 13px;
          font-weight: 700;
        }

        .product-analyzer-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
          gap: 22px;
          margin-top: 40px;
          align-items: start;
        }

        .product-upload-card,
        .product-analysis-card,
        .product-methodology {
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid #e2e7ef;
          border-radius: 26px;
          background: #ffffff;
          box-shadow: 0 18px 50px rgba(16, 24, 39, 0.07);
        }

        .product-upload-card,
        .product-analysis-card {
          padding: 28px;
        }

        .product-section-top,
        .product-section-heading,
        .product-methodology-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .product-section-top h2,
        .product-methodology h2 {
          margin: 0;
          color: #111827 !important;
          font-size: 28px;
          letter-spacing: -0.02em;
        }

        .product-section-top p:last-child,
        .product-methodology-heading p:last-child {
          margin-top: 8px;
          max-width: 700px;
          color: #65738a !important;
          line-height: 1.65;
        }

        .product-step-marker {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 14px;
          background: #f0f2ff;
          color: #5362db !important;
          font-weight: 800;
        }

        .product-drop-zone {
          min-height: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          margin-top: 24px;
          border: 1.5px dashed #cfd7e5;
          border-radius: 22px;
          background: #fbfcfe;
          text-align: center;
          cursor: pointer;
          transition: 0.2s ease;
          box-sizing: border-box;
        }

        .product-drop-zone:hover,
        .product-drop-zone.active {
          border-color: #6977e7;
          background: #f6f7ff;
          transform: translateY(-1px);
        }

        .product-drop-zone:focus {
          outline: 3px solid rgba(86, 102, 232, 0.18);
          outline-offset: 4px;
        }

        .product-upload-symbol,
        .product-empty-mark {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          margin-bottom: 18px;
          border-radius: 18px;
          background: #eef1ff;
          color: #5967df !important;
          font-size: 30px;
          font-weight: 300;
        }

        .product-drop-zone strong {
          color: #182238 !important;
          font-size: 18px;
        }

        .product-drop-zone p {
          margin: 8px 0 6px;
          color: #66738b !important;
        }

        .product-drop-zone > span {
          color: #8490a5 !important;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .product-preview-shell {
          margin-top: 24px;
          overflow: hidden;
          border: 1px solid #e0e5ee;
          border-radius: 22px;
          background: #f9fafc;
        }

        .product-preview-image {
          display: block;
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          background: #f5f7fb;
        }

        .product-file-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-top: 1px solid #e4e8ef;
          background: #ffffff;
        }

        .product-file-bar > div {
          min-width: 0;
        }

        .product-file-bar span {
          display: block;
          margin-bottom: 4px;
          color: #8994a8 !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .product-file-bar strong {
          display: block;
          overflow: hidden;
          color: #202b40 !important;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .product-file-bar button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: #5c69dc;
          cursor: pointer;
          font-weight: 800;
        }

        .product-file-bar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .product-upload-actions {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 11px;
          margin-top: 18px;
        }

        .product-analysis-loader {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid #e5e9f2;
          border-radius: 16px;
          background: #fafbfe;
        }

        .product-analysis-pipeline {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 11px;
          color: #909aad;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .product-analysis-pipeline span.active {
          color: #5665d9;
        }

        .product-analysis-pipeline i {
          width: 18px;
          height: 1px;
          background: #d9deea;
        }

        .product-error {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 18px;
        }

        .product-image-guidance {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 16px;
          background: #f7f8fc;
          border: 1px solid #eaedf3;
        }

        .product-image-guidance strong {
          color: #2b3549 !important;
          font-size: 13px;
        }

        .product-image-guidance p {
          margin: 5px 0 0;
          color: #748197 !important;
          font-size: 13px;
          line-height: 1.55;
        }

        .product-analysis-empty {
          min-height: 690px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .product-empty-mark {
          margin-bottom: 12px;
        }

        .product-analysis-empty h2 {
          max-width: 560px;
          margin: 0;
          color: #141d30 !important;
          font-size: 40px;
          line-height: 1.06;
          letter-spacing: -0.03em;
        }

        .product-analysis-empty > p:not(.eyebrow) {
          max-width: 650px;
          margin-top: 12px;
          color: #65728a !important;
          line-height: 1.7;
        }

        .product-empty-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
        }

        .product-empty-grid > div {
          padding: 16px;
          border: 1px solid #e6eaf1;
          border-radius: 17px;
          background: #fbfcfe;
        }

        .product-empty-grid span {
          color: #5e6cdf !important;
          font-size: 11px;
          font-weight: 800;
        }

        .product-empty-grid strong {
          display: block;
          margin-top: 6px;
          color: #1c273a !important;
        }

        .product-empty-grid p {
          margin: 5px 0 0;
          color: #78859a !important;
          font-size: 13px;
          line-height: 1.5;
        }

        .product-result-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid #ebedf2;
          color: #5260d2;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .product-result-topbar > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .product-result-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5968e0;
        }

        .product-result-source-badge {
          padding: 6px 9px;
          border-radius: 999px;
          background: #f2f4f9;
          color: #66748a !important;
          font-size: 9px;
          letter-spacing: 0.07em;
        }

        .product-identification {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-top: 22px;
        }

        .product-identification h2 {
          margin: 0;
          color: #141d30 !important;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 1.04;
          letter-spacing: -0.035em;
        }

        .product-category-line {
          margin-top: 7px;
          color: #66758c !important;
          font-size: 15px;
          font-weight: 700;
        }

        .product-confidence {
          min-width: 112px;
          padding: 13px 14px;
          border: 1px solid #e3e7ef;
          border-radius: 15px;
          background: #fafbfc;
          text-align: right;
        }

        .product-confidence span {
          display: block;
          color: #8a95a7 !important;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .product-confidence strong {
          display: block;
          margin-top: 4px;
          color: #2b3547 !important;
          font-size: 15px;
        }

        .product-confidence.high strong {
          color: #2f7d4f !important;
        }

        .product-confidence.medium strong {
          color: #9a6d13 !important;
        }

        .product-confidence.low strong {
          color: #b25252 !important;
        }

        .product-description-card,
        .product-attributes-card,
        .product-standards-card,
        .product-result-actions {
          margin-top: 20px;
          border: 1px solid #e4e8f0;
          border-radius: 20px;
          background: #ffffff;
        }

        .product-description-card {
          padding: 21px;
          background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
        }

        .product-card-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .product-card-label-row > span {
          color: #8c96a8 !important;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .product-detailed-description {
          margin: 11px 0 0;
          color: #344056 !important;
          font-size: 16px;
          line-height: 1.8;
        }

        .product-confidence-explanation {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #e9edf3;
        }

        .product-confidence-explanation strong {
          color: #253047 !important;
          font-size: 12px;
        }

        .product-confidence-explanation p {
          margin: 5px 0 0;
          color: #788499 !important;
          font-size: 12px;
          line-height: 1.6;
        }

        .product-overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
          margin-top: 14px;
        }

        .product-overview-card {
          min-width: 0;
          padding: 14px;
          border: 1px solid #e7ebf1;
          border-radius: 16px;
          background: #fbfcfe;
        }

        .product-overview-card span {
          display: block;
          color: #8a95a7 !important;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .product-overview-card strong {
          display: block;
          margin-top: 5px;
          color: #263145 !important;
          line-height: 1.4;
        }

        .product-attributes-card {
          padding: 20px;
        }

        .product-attributes-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
          margin-top: 14px;
        }

        .product-attributes-grid > div {
          min-width: 0;
          padding: 13px 14px;
          border-radius: 14px;
          background: #f7f9fc;
        }

        .product-attributes-grid span {
          display: block;
          color: #8994a8 !important;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .product-attributes-grid strong {
          display: block;
          margin-top: 6px;
          color: #364157 !important;
          font-size: 13px;
          line-height: 1.5;
        }

        .product-standards-card {
          padding: 21px;
        }

        .product-section-heading h3 {
          margin: 0;
          color: #192338 !important;
          font-size: 23px;
          letter-spacing: -0.02em;
        }

        .product-section-heading p:last-child {
          margin-top: 7px;
          max-width: 650px;
          color: #78849a !important;
          font-size: 13px;
          line-height: 1.55;
        }

        .product-match-count {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 14px;
          background: #eef1ff;
          color: #5261d8 !important;
          font-weight: 900;
        }

        .product-standard-list {
          display: grid;
          gap: 10px;
          margin-top: 17px;
        }

        .product-standard-item {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 13px;
          padding: 15px;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          background: #fcfdff;
        }

        .product-standard-rank {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: #f2f4f9;
          color: #5e6b81 !important;
          font-size: 11px;
          font-weight: 900;
        }

        .product-standard-content {
          min-width: 0;
        }

        .product-standard-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .product-standard-meta span {
          padding: 5px 7px;
          border-radius: 999px;
          background: #f3f5f9;
          color: #7a8598 !important;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .product-standard-content h4 {
          margin: 9px 0 2px;
          color: #1a2438 !important;
          font-size: 16px;
        }

        .product-standard-content > p {
          margin: 0;
          color: #55627a !important;
          font-size: 14px;
          line-height: 1.55;
        }

        .product-match-reason {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #f8f9fc;
        }

        .product-match-reason strong {
          color: #5663cf !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .product-match-reason span {
          color: #6c788d !important;
          font-size: 12px;
          line-height: 1.45;
        }

        .product-standard-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 11px;
        }

        .product-standard-button {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .product-no-match {
          margin-top: 17px;
          padding: 17px;
          border: 1px dashed #d8dee8;
          border-radius: 15px;
          background: #fafbfc;
        }

        .product-no-match strong {
          color: #2b3548 !important;
        }

        .product-no-match p {
          margin: 6px 0 0;
          color: #6f7b8f !important;
          line-height: 1.6;
          font-size: 13px;
        }

        .product-result-actions {
          padding: 21px;
          background: #f9faff;
        }

        .product-result-actions h3 {
          margin: 0;
          color: #1b2538 !important;
          font-size: 22px;
        }

        .product-result-action-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .product-action-card {
          min-width: 0;
          padding: 14px;
          border: 1px solid #e4e8f0;
          border-radius: 15px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
          transition: 0.18s ease;
        }

        .product-action-card:hover {
          transform: translateY(-2px);
          border-color: #cdd4ee;
          box-shadow: 0 10px 25px rgba(16, 24, 39, 0.06);
        }

        .product-action-card > span {
          color: #6673d7 !important;
          font-size: 10px;
          font-weight: 900;
        }

        .product-action-card strong {
          display: block;
          margin-top: 7px;
          color: #283349 !important;
          font-size: 13px;
        }

        .product-action-card p {
          min-height: 52px;
          margin: 5px 0 8px;
          color: #778399 !important;
          font-size: 11px;
          line-height: 1.45;
        }

        .product-action-card b {
          color: #5361cf !important;
          font-size: 11px;
        }

        .product-result-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .product-result-buttons a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .product-disclaimer {
          margin-top: 15px;
          line-height: 1.6;
        }

        .product-methodology {
          margin-top: 24px;
          padding: 26px;
        }

        .product-methodology-note {
          max-width: 330px;
          flex: 0 0 330px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px;
          border: 1px solid #e8ebf2;
          border-radius: 16px;
          background: #fafbfc;
        }

        .product-methodology-note strong {
          color: #4d5b71 !important;
          font-size: 12px;
        }

        .product-methodology-note span {
          color: #77849a !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .product-methodology-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .product-methodology-grid > div {
          min-width: 0;
          padding: 16px;
          border: 1px solid #e7ebf1;
          border-radius: 16px;
          background: #fbfcfe;
        }

        .product-methodology-grid span {
          color: #6572d4 !important;
          font-size: 10px;
          font-weight: 900;
        }

        .product-methodology-grid strong {
          display: block;
          margin-top: 7px;
          color: #2a354a !important;
          font-size: 13px;
        }

        .product-methodology-grid p {
          margin: 5px 0 0;
          color: #778499 !important;
          font-size: 12px;
          line-height: 1.55;
        }

        .product-analyzer-page .text-btn {
          color: #5361d3 !important;
        }

        .product-analyzer-page .eyebrow {
          color: #6571d5 !important;
          font-weight: 900;
          letter-spacing: 0.09em;
        }

        @media (max-width: 1100px) {
          .product-analyzer-grid {
            grid-template-columns: 1fr;
          }

          .product-result-action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .product-methodology-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .product-analysis-empty {
            min-height: auto;
          }
        }

        @media (max-width: 720px) {
          .product-analyzer-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .product-analyzer-intro h1 {
            font-size: clamp(36px, 11vw, 58px);
          }

          .product-trust-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .product-upload-card,
          .product-analysis-card,
          .product-methodology {
            border-radius: 19px;
            padding: 20px;
          }

          .product-section-top,
          .product-section-heading,
          .product-methodology-heading {
            flex-direction: column;
          }

          .product-step-marker {
            order: -1;
          }

          .product-upload-actions {
            grid-template-columns: 1fr;
          }

          .product-drop-zone {
            min-height: 260px;
          }

          .product-identification {
            flex-direction: column;
          }

          .product-confidence {
            width: 100%;
            box-sizing: border-box;
            text-align: left;
          }

          .product-overview-grid,
          .product-attributes-grid,
          .product-empty-grid,
          .product-result-action-grid,
          .product-methodology-grid {
            grid-template-columns: 1fr;
          }

          .product-standard-item {
            grid-template-columns: 38px minmax(0, 1fr);
            gap: 10px;
          }

          .product-standard-rank {
            width: 34px;
            height: 34px;
          }

          .product-result-topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .product-methodology-note {
            width: 100%;
            max-width: none;
            flex: none;
            box-sizing: border-box;
          }

          .product-result-buttons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .product-result-buttons > * {
            width: 100%;
            box-sizing: border-box;
          }
        }

        @media print {
          .product-analyzer-page nav,
          .product-analyzer-page footer,
          .product-upload-card,
          .product-methodology,
          .product-result-buttons,
          .product-result-actions,
          .product-analysis-pipeline {
            display: none !important;
          }

          .product-analyzer-page {
            background: #fff !important;
          }

          .product-analyzer-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .product-analysis-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .product-description-card,
          .product-attributes-card,
          .product-standards-card {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default ProductAnalyzer;
