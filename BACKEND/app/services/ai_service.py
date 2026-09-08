import os
import re

from dotenv import load_dotenv
from google import genai

from app.services.bis_service import search_bis_knowledge


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found. Check BACKEND/.env."
    )

client = genai.Client(api_key=API_KEY)

MODEL_NAME = "gemini-3.6-flash"


GENERAL_BIS_KNOWLEDGE = """
BIS is the Bureau of Indian Standards, India's national standards body.

BIS product certification is generally voluntary in nature. However,
the Central Government can make compliance compulsory for specific
products through Quality Control Orders (QCOs).

For products covered by compulsory certification requirements,
manufacturers may need the applicable BIS licence, Certificate of
Conformity, or registration depending on the relevant conformity
assessment scheme and government order.

For a specific product or standard, users should verify the current
requirements directly with official BIS information.
"""


GENERAL_BIS_SOURCE = {
    "standard": "BIS Product Certification",
    "title": "Official BIS Product Certification Information",
    "source_name": "Bureau of Indian Standards",
    "source_url": (
        "https://www.bis.gov.in/product-certification/"
        "products-under-compulsory-certification/?lang=en"
    ),
}


def normalize_text(text: str) -> str:
    return " ".join(str(text or "").lower().strip().split())


def extract_standard_references(message: str) -> list[str]:
    pattern = r"\bIS\s+\d+(?::\d{4})?\b"

    matches = re.findall(
        pattern,
        message,
        flags=re.IGNORECASE,
    )

    cleaned = []

    for match in matches:
        value = " ".join(match.split()).upper()

        if value not in cleaned:
            cleaned.append(value)

    return cleaned


def is_general_bis_question(message: str) -> bool:
    text = normalize_text(message)

    general_terms = [
        "what is bis",
        "what is bis certification",
        "what is bis certificate",
        "what is bis certification mark",
        "what is bis mark",
        "what is isi mark",
        "what is standard mark",
        "what is qco",
        "what are qcos",
        "quality control order",
        "how does bis certification work",
        "how does bis work",
        "how to get bis certification",
        "how to get bis licence",
        "how to get bis license",
        "bis licence",
        "bis license",
        "is bis certification compulsory",
        "is bis compulsory",
        "is bis certification mandatory",
        "is bis mandatory",
        "why is bis certification required",
        "why is bis required",
    ]

    return any(term in text for term in general_terms)


def retrieve_bis_context(message: str) -> list[dict]:
    retrieved = []

    # First: prioritize explicit IS-number references.
    for reference in extract_standard_references(message):
        matches = search_bis_knowledge(reference)

        for item in matches:
            item_number = normalize_text(
                item.get("number", "")
            )

            if not any(
                normalize_text(existing.get("number", "")) == item_number
                for existing in retrieved
            ):
                retrieved.append(item)

    # Second: perform normal BISense database search.
    general_results = search_bis_knowledge(message)

    for item in general_results:
        item_number = normalize_text(
            item.get("number", "")
        )

        if not any(
            normalize_text(existing.get("number", "")) == item_number
            for existing in retrieved
        ):
            retrieved.append(item)

    return retrieved[:8]


def build_bis_context(
    results: list[dict],
    include_general_knowledge: bool = False,
) -> str:

    context_parts = []

    if include_general_knowledge:
        context_parts.append(
            f"""
VERIFIED GENERAL BIS INFORMATION

{GENERAL_BIS_KNOWLEDGE}
"""
        )

    for index, item in enumerate(results, start=1):
        context_parts.append(
            f"""
BIS RECORD {index}

Standard Number: {item.get("number") or "Not available"}
Title: {item.get("title") or "Not available"}
Category: {item.get("category") or "Not available"}
Scope: {item.get("scope") or "Not available"}
Status: {item.get("status") or "Not available"}
Edition Year: {item.get("edition_year") or "Not available"}
Certification Scheme: {item.get("certification_scheme") or "Not available"}
Certification Status: {item.get("certification_status") or "Not available"}
QCO Information: {item.get("qco_information") or "Not available"}
Source Name: {item.get("source_name") or "Not available"}
Source URL: {item.get("source_url") or "Not available"}
"""
        )

    if not context_parts:
        context_parts.append(
            "No specific BIS record was found."
        )

    return "\n".join(context_parts)


def choose_source(
    results: list[dict],
    general_question: bool,
) -> dict:

    if general_question:
        return GENERAL_BIS_SOURCE

    if not results:
        return {
            "standard": "",
            "title": "",
            "source_name": "",
            "source_url": "",
        }

    best = results[0]

    return {
        "standard": best.get("number", ""),
        "title": best.get("title", ""),
        "source_name": best.get("source_name", ""),
        "source_url": best.get("source_url", ""),
    }


def is_quota_error(error: Exception) -> bool:
    error_text = str(error).upper()

    quota_indicators = [
        "RESOURCE_EXHAUSTED",
        "QUOTA_EXCEEDED",
        "DAILY QUOTA",
        "EXCEEDED YOUR CURRENT QUOTA",
        "REQUESTS_PER_DAY",
        "GENERATE_CONTENT_FREE_TIER_REQUESTS",
    ]

    return any(
        indicator in error_text
        for indicator in quota_indicators
    )


def generate_ai_response(
    message: str,
    language: str = "English",
) -> dict:

    message = str(message or "").strip()

    if not message:
        return {
            "answer": "Please enter a question.",
            "language": language,
            "source": {
                "standard": "",
                "title": "",
                "source_name": "",
                "source_url": "",
            },
        }

    bis_results = retrieve_bis_context(message)

    general_question = is_general_bis_question(message)

    bis_context = build_bis_context(
        bis_results,
        include_general_knowledge=general_question,
    )

    source = choose_source(
        bis_results,
        general_question,
    )

    system_instruction = """
You are BISense, a helpful AI assistant for Indian Standards
and Bureau of Indian Standards (BIS) information.

Your responses should feel like a knowledgeable human assistant.

STYLE RULES:

- Answer the user's question directly.
- Be clear, concise, and natural.
- Prefer short paragraphs.
- Normally keep the answer to 2 to 5 short paragraphs.
- Do not use markdown headings.
- Do not use bullet points unless the user explicitly asks for a list.
- Do not use numbered lists unless the user explicitly asks for steps.
- Do not use asterisks for emphasis.
- Do not use markdown tables.
- Do not begin with phrases such as "Based on the records retrieved..."
  or "According to the supplied context..."
- Do not add unnecessary sections.
- Do not repeat source metadata in the answer.
- Do not mention the internal database or retrieval process.
- Do not mention the model.
- Do not say "Gemini says".
- The application displays the source separately.
- Reply in the requested language.

GROUNDING RULES:

1. For general BIS questions, use the verified general BIS information
   provided in the context.

2. For specific Indian Standards, use the supplied BIS records whenever
   available.

3. Never invent standard numbers, clauses, licence numbers, QCO details,
   technical specifications, amendments, or official citations.

4. Never claim that a product requires BIS certification unless the
   supplied information supports that conclusion.

5. BIS certification is generally voluntary, but specific products may
   be subject to compulsory requirements through government orders such
   as Quality Control Orders.

6. Never present preliminary BISense information as an official legal
   or certification decision.

7. If the available information is genuinely insufficient, say so
   briefly instead of guessing.
"""

    user_prompt = f"""
Requested language: {language}

Verified and retrieved BIS information:

{bis_context}

User question:

{message}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            config={
                "system_instruction": system_instruction,
            },
            contents=user_prompt,
        )

        answer = response.text or (
            "I couldn't generate a useful answer from the available "
            "BIS information."
        )

        return {
            "answer": answer.strip(),
            "language": language,
            "source": source,
        }

    except Exception as error:
        print(f"Gemini API error: {error}")

        if is_quota_error(error):
            return {
                "answer": (
                    "Daily AI quota reached. "
                    "Please try again later."
                ),
                "language": language,
                "source": source,
            }

        return {
            "answer": (
                "I couldn't generate an AI response right now. "
                "Please try again."
            ),
            "language": language,
            "source": source,
        }