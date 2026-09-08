import json
import math
from pathlib import Path
from typing import Optional

from pypdf import PdfReader

from app.database.connection import SessionLocal
from app.database.models import BISDocument, BISDocumentChunk
from app.services.embedding_service import (
    generate_document_embedding,
    generate_query_embedding,
)


DOCUMENTS_DIR = Path("documents")
DOCUMENTS_DIR.mkdir(exist_ok=True)


# -------------------------------------------------------------------
# PDF EXTRACTION
# -------------------------------------------------------------------

def extract_pdf_text(file_path: Path) -> list[dict]:
    reader = PdfReader(str(file_path))

    pages = []

    for page_number, page in enumerate(
        reader.pages,
        start=1,
    ):
        text = page.extract_text() or ""

        if text.strip():
            pages.append(
                {
                    "page_number": page_number,
                    "text": text.strip(),
                }
            )

    return pages


# -------------------------------------------------------------------
# CHUNKING
# -------------------------------------------------------------------

def split_text(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 150,
) -> list[str]:
    """
    Split text into overlapping word-based chunks.

    Overlap helps preserve context between neighbouring chunks.
    """

    words = text.split()

    if not words:
        return []

    if overlap >= chunk_size:
        overlap = 0

    chunks = []

    step = chunk_size - overlap

    for start in range(
        0,
        len(words),
        step,
    ):
        chunk_words = words[
            start:start + chunk_size
        ]

        if not chunk_words:
            continue

        chunk = " ".join(chunk_words).strip()

        if chunk:
            chunks.append(chunk)

    return chunks


# -------------------------------------------------------------------
# SIMPLE SECTION DETECTION
# -------------------------------------------------------------------

def detect_section_title(
    text: str,
) -> Optional[str]:
    """
    Best-effort section detection.

    This is intentionally conservative. We don't claim an exact
    section unless the PDF text itself gives us something that looks
    like a heading.
    """

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if not lines:
        return None

    for line in lines[:10]:
        clean = " ".join(line.split())

        if len(clean) > 120:
            continue

        # Typical numbered headings:
        # 1 Introduction
        # 2 Scope
        # 3 Definitions
        if clean[:1].isdigit():
            return clean

        # Typical uppercase headings.
        if (
            len(clean) > 3
            and clean.upper() == clean
            and any(char.isalpha() for char in clean)
        ):
            return clean

    return None


# -------------------------------------------------------------------
# VECTOR HELPERS
# -------------------------------------------------------------------

def cosine_similarity(
    vector_a: list[float],
    vector_b: list[float],
) -> float:
    if not vector_a or not vector_b:
        return 0.0

    if len(vector_a) != len(vector_b):
        return 0.0

    dot_product = 0.0
    magnitude_a = 0.0
    magnitude_b = 0.0

    for a, b in zip(vector_a, vector_b):
        dot_product += a * b
        magnitude_a += a * a
        magnitude_b += b * b

    denominator = math.sqrt(
        magnitude_a * magnitude_b
    )

    if denominator == 0:
        return 0.0

    return dot_product / denominator


def serialize_embedding(
    embedding: list[float],
) -> str:
    return json.dumps(
        embedding,
        separators=(",", ":"),
    )


def deserialize_embedding(
    value: Optional[str],
) -> list[float]:
    if not value:
        return []

    try:
        parsed = json.loads(value)

        if not isinstance(parsed, list):
            return []

        return [
            float(item)
            for item in parsed
        ]

    except (
        json.JSONDecodeError,
        TypeError,
        ValueError,
    ):
        return []


# -------------------------------------------------------------------
# DOCUMENT INGESTION
# -------------------------------------------------------------------

def ingest_pdf(
    file_path: Path,
    title: str,
    source_name: str,
    source_url: str,
    document_type: str = "Indian Standard PDF",
    standard_number: Optional[str] = None,
) -> dict:

    pages = extract_pdf_text(file_path)

    if not pages:
        raise ValueError(
            "No readable text was found in the PDF."
        )

    db = SessionLocal()

    try:
        document = BISDocument(
            title=title,
            document_type=document_type,
            source_name=source_name,
            source_url=source_url,
            standard_number=standard_number,
            local_path=str(file_path),
            status="available",
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        chunk_number = 1
        embeddings_created = 0
        chunks_failed = 0

        for page in pages:
            page_text = page["text"]

            page_chunks = split_text(
                page_text
            )

            section_title = detect_section_title(
                page_text
            )

            for content in page_chunks:

                embedding = []

                try:
                    embedding = (
                        generate_document_embedding(
                            content
                        )
                    )

                    if embedding:
                        embeddings_created += 1

                except Exception as error:
                    print(
                        "Embedding generation failed "
                        f"for chunk {chunk_number}: {error}"
                    )
                    chunks_failed += 1

                chunk = BISDocumentChunk(
                    document_id=document.id,
                    standard_number=standard_number,
                    chunk_number=chunk_number,
                    section_title=section_title,
                    content=content,
                    page_number=page["page_number"],
                    embedding=(
                        serialize_embedding(embedding)
                        if embedding
                        else None
                    ),
                    embedding_model=(
                        "gemini-embedding-001"
                        if embedding
                        else None
                    ),
                )

                db.add(chunk)

                chunk_number += 1

        db.commit()

        return {
            "document_id": document.id,
            "title": document.title,
            "standard_number": document.standard_number,
            "pages_processed": len(pages),
            "chunks_created": chunk_number - 1,
            "embeddings_created": embeddings_created,
            "embedding_failures": chunks_failed,
            "source_name": document.source_name,
            "source_url": document.source_url,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# -------------------------------------------------------------------
# SEMANTIC DOCUMENT SEARCH
# -------------------------------------------------------------------

def search_document_chunks(
    query: str,
    standard_number: Optional[str] = None,
    limit: int = 5,
) -> list:

    query = str(query or "").strip()

    if not query:
        return []

    if limit < 1:
        limit = 5

    query_embedding = generate_query_embedding(
        query
    )

    db = SessionLocal()

    try:
        database_query = db.query(
            BISDocumentChunk
        )

        if standard_number:
            database_query = database_query.filter(
                BISDocumentChunk.standard_number
                == standard_number
            )

        chunks = database_query.all()

        scored_chunks = []

        for chunk in chunks:
            chunk_embedding = deserialize_embedding(
                chunk.embedding
            )

            similarity = cosine_similarity(
                query_embedding,
                chunk_embedding,
            )

            # -------------------------------------------------------
            # FALLBACK FOR OLD CHUNKS
            # -------------------------------------------------------
            #
            # Existing chunks created before the embedding upgrade
            # do not have embeddings. Keep them searchable using a
            # lightweight text fallback.
            #
            lexical_score = 0.0

            query_words = {
                word.lower()
                for word in query.split()
                if len(word) > 2
            }

            content_lower = (
                chunk.content or ""
            ).lower()

            if query_words:
                matched_words = sum(
                    1
                    for word in query_words
                    if word in content_lower
                )

                lexical_score = (
                    matched_words
                    / len(query_words)
                )

            final_score = similarity

            if not chunk_embedding:
                final_score = lexical_score

            scored_chunks.append(
                (
                    final_score,
                    chunk,
                )
            )

        scored_chunks.sort(
            key=lambda item: item[0],
            reverse=True,
        )

        top_chunks = scored_chunks[:limit]

        results = []

        for score, chunk in top_chunks:
            results.append(
                {
                    "id": chunk.id,
                    "document_id": chunk.document_id,
                    "standard_number": chunk.standard_number,
                    "chunk_number": chunk.chunk_number,
                    "section_title": chunk.section_title,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                    "similarity_score": round(
                        float(score),
                        4,
                    ),
                    "embedding_model": (
                        chunk.embedding_model
                    ),
                }
            )

        return results

    finally:
        db.close()