import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found. Check BACKEND/.env."
    )

client = genai.Client(api_key=API_KEY)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768


def generate_document_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a BIS document chunk.
    Used when storing document chunks for RAG retrieval.
    """

    text = str(text or "").strip()

    if not text:
        return []

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIMENSION,
        ),
    )

    if not result.embeddings:
        return []

    values = result.embeddings[0].values

    if not values:
        return []

    return [float(value) for value in values]


def generate_query_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a user's search/question.
    Used when searching the document collection.
    """

    text = str(text or "").strip()

    if not text:
        return []

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMENSION,
        ),
    )

    if not result.embeddings:
        return []

    values = result.embeddings[0].values

    if not values:
        return []

    return [float(value) for value in values]