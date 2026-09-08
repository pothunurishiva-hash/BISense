import json
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.services.bis_service import search_bis_knowledge


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found. Check BACKEND/.env."
    )

client = genai.Client(api_key=API_KEY)

MODEL_NAME = "gemini-3.6-flash"

router = APIRouter(
    prefix="/api/product",
    tags=["Product Analyzer"],
)


def normalize_text(text: str) -> str:
    return " ".join(str(text or "").lower().strip().split())


def find_relevant_standards(
    product_name: str,
    category: str,
) -> list[dict]:
    query_parts = [product_name, category]

    query = " ".join(
        part for part in query_parts if part
    ).strip()

    results = search_bis_knowledge(query)

    if not results and product_name:
        results = search_bis_knowledge(product_name)

    return results[:5]


def is_quota_error(error: Exception) -> bool:
    """
    Gemini may expose quota exhaustion through different exception
    types/messages depending on the SDK version.

    We detect the actual 429 / RESOURCE_EXHAUSTED / quota indicators
    without depending on one specific SDK exception class.
    """

    error_text = str(error).upper()

    quota_indicators = [
        "429",
        "RESOURCE_EXHAUSTED",
        "QUOTA_EXCEEDED",
        "GENERATE_CONTENT_FREEST_TIER_REQUESTS",
        "REQUESTS_PER_DAY",
        "DAILY QUOTA",
        "EXCEEDED YOUR CURRENT QUOTA",
    ]

    return any(
        indicator in error_text
        for indicator in quota_indicators
    )


@router.post("/analyze")
async def analyze_product(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No image was provided.",
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only JPG, PNG, and WEBP images are supported."
            ),
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=(
                "Image is too large. "
                "Please upload an image smaller than 20 MB."
            ),
        )

    prompt = """
Analyze this product image for BISense.

Identify only what can reasonably be inferred from the visible image.

Return JSON with exactly these fields:

{
  "product_name": "best concise product identification",
  "category": "best product category",
  "description": "short description of what is visible",
  "confidence": "High | Medium | Low"
}

Do not identify a manufacturer unless it is clearly visible.
Do not invent model numbers, certifications, licence numbers, standards,
or regulatory claims.
Do not claim that a BIS mark is genuine based on the image.
"""

    try:
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=file.content_type,
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                image_part,
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        raw_text = response.text or "{}"

        analysis = json.loads(raw_text)

        product_name = str(
            analysis.get("product_name", "")
        ).strip()

        category = str(
            analysis.get("category", "")
        ).strip()

        description = str(
            analysis.get("description", "")
        ).strip()

        confidence = str(
            analysis.get("confidence", "Low")
        ).strip()

        if confidence not in {"High", "Medium", "Low"}:
            confidence = "Low"

        relevant_standards = find_relevant_standards(
            product_name,
            category,
        )

        standards = []

        for standard in relevant_standards:
            standards.append(
                {
                    "number": standard.get("number", ""),
                    "title": standard.get("title", ""),
                    "category": standard.get("category", ""),
                    "status": standard.get("status", ""),
                    "edition_year": standard.get(
                        "edition_year"
                    ),
                    "source_name": standard.get(
                        "source_name",
                        "",
                    ),
                    "source_url": standard.get(
                        "source_url",
                        "",
                    ),
                }
            )

        return {
            "product": {
                "name": (
                    product_name
                    or "Product could not be identified"
                ),
                "category": category or "Unknown",
                "description": description,
                "confidence": confidence,
            },
            "standards": standards,
            "disclaimer": (
                "This is preliminary AI-assisted "
                "identification. An image alone cannot "
                "establish BIS certification, compliance, "
                "or authenticity of a BIS mark."
            ),
        }

    except json.JSONDecodeError:
        print(
            "Product analysis error: "
            "Gemini returned invalid JSON."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The AI returned an invalid analysis format."
            ),
        )

    except Exception as error:

        print(
            f"Product analysis error: {error}"
        )

        # ---------------------------------------------------------
        # GEMINI DAILY QUOTA EXHAUSTED
        # ---------------------------------------------------------
        if is_quota_error(error):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Daily AI quota reached. "
                    "Please try again later."
                ),
            )

        # ---------------------------------------------------------
        # OTHER GEMINI / SERVER ERRORS
        # ---------------------------------------------------------
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to analyze the product image "
                "right now."
            ),
        )