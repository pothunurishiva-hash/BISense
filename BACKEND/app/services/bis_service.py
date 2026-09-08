import re
from typing import Optional

from sqlalchemy import or_

from app.database.connection import SessionLocal
from app.database.models import Standard


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "about",
    "what",
    "which",
    "does",
    "this",
    "that",
    "are",
    "is",
    "of",
    "to",
    "a",
    "an",
    "in",
    "on",
    "my",
    "product",
    "used",
    "use",
}


SYNONYMS = {
    "pipe": ["pipe", "pipes", "piping"],
    "pipes": ["pipe", "pipes", "piping"],
    "pvc": ["pvc", "polyvinyl chloride"],
    "plastic": ["plastic", "plastics"],
    "fitting": ["fitting", "fittings"],
    "fittings": ["fitting", "fittings"],
    "cable": ["cable", "cables", "wire", "wires"],
    "cables": ["cable", "cables", "wire", "wires"],
    "wire": ["wire", "wires", "cable", "cables"],
    "wires": ["wire", "wires", "cable", "cables"],
    "cement": ["cement"],
    "concrete": ["concrete"],
    "steel": ["steel"],
    "water": ["water", "drinking water"],
    "appliance": ["appliance", "appliances"],
    "lamp": ["lamp", "lamps", "light", "lighting"],
    "led": ["led", "lamp", "lighting"],
}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())

    return [
        word
        for word in words
        if len(word) >= 2 and word not in STOP_WORDS
    ]


def standard_to_dict(standard: Standard) -> dict:
    return {
        "id": standard.id,
        "number": standard.number,
        "title": standard.title,
        "category": standard.category,
        "scope": standard.scope,
        "status": standard.status,
        "edition_year": standard.edition_year,
        "certification_scheme": standard.certification_scheme,
        "certification_status": standard.certification_status,
        "qco_information": standard.qco_information,
        "source_name": standard.source_name,
        "source_url": standard.source_url,
    }


def get_search_terms(query: str) -> list[str]:
    terms = set()

    for word in tokenize(query):
        terms.add(word)

        for synonym in SYNONYMS.get(word, []):
            terms.add(synonym)

    return sorted(terms)


def score_standard(
    standard: Standard,
    search_terms: list[str],
    original_query: str,
) -> int:
    searchable_parts = [
        standard.number or "",
        standard.title or "",
        standard.category or "",
        standard.scope or "",
    ]

    searchable_text = " ".join(searchable_parts).lower()

    normalized_query = normalize(original_query)
    normalized_standard_number = normalize(standard.number or "")

    score = 0

    # Exact IS-number match gets the highest priority.
    if normalized_query and normalized_query in normalized_standard_number:
        score += 100

    # Match important product terms.
    for term in search_terms:
        if term.lower() in searchable_text:
            score += 10

    # Title matches are more important than category matches.
    title_text = (standard.title or "").lower()

    for term in search_terms:
        if term.lower() in title_text:
            score += 15

    # Category match.
    category_text = (standard.category or "").lower()

    for term in search_terms:
        if term.lower() in category_text:
            score += 5

    return score


def search_bis_knowledge(query: Optional[str] = None) -> list:
    db = SessionLocal()

    try:
        # -----------------------------------------------------
        # NO QUERY → RETURN ALL STANDARDS
        # -----------------------------------------------------

        if not query or not query.strip():
            standards = (
                db.query(Standard)
                .order_by(Standard.number)
                .all()
            )

            return [
                standard_to_dict(item)
                for item in standards
            ]

        query = query.strip()

        # -----------------------------------------------------
        # EXPLICIT IS NUMBER SEARCH
        # -----------------------------------------------------

        is_matches = re.findall(
            r"\bis\s*(\d+)\s*(?::?\s*(\d{4}))?\b",
            query.lower(),
        )

        explicit_results = []

        if is_matches:
            candidates = db.query(Standard).all()

            for standard_number, year in is_matches:
                target = normalize(
                    f"IS {standard_number}"
                )

                for candidate in candidates:
                    candidate_number = normalize(
                        candidate.number
                    )

                    if target not in candidate_number:
                        continue

                    if year:
                        candidate_year = str(
                            candidate.edition_year or ""
                        )

                        if candidate_year != year:
                            continue

                    if candidate not in explicit_results:
                        explicit_results.append(candidate)

        # -----------------------------------------------------
        # TOKEN-BASED PRODUCT SEARCH
        # -----------------------------------------------------

        search_terms = get_search_terms(query)

        if search_terms:
            filters = []

            for term in search_terms:
                pattern = f"%{term}%"

                filters.extend(
                    [
                        Standard.number.ilike(pattern),
                        Standard.title.ilike(pattern),
                        Standard.category.ilike(pattern),
                        Standard.scope.ilike(pattern),
                    ]
                )

            candidates = (
                db.query(Standard)
                .filter(or_(*filters))
                .all()
            )

        else:
            candidates = []

        # -----------------------------------------------------
        # MERGE EXPLICIT + KEYWORD RESULTS
        # -----------------------------------------------------

        all_candidates = []
        seen_ids = set()

        for standard in explicit_results + candidates:
            if standard.id not in seen_ids:
                all_candidates.append(standard)
                seen_ids.add(standard.id)

        # -----------------------------------------------------
        # SCORE RESULTS
        # -----------------------------------------------------

        scored_results = []

        for standard in all_candidates:
            score = score_standard(
                standard=standard,
                search_terms=search_terms,
                original_query=query,
            )

            if score > 0:
                scored_results.append(
                    (
                        score,
                        standard,
                    )
                )

        scored_results.sort(
            key=lambda item: (
                -item[0],
                item[1].number or "",
            )
        )

        return [
            standard_to_dict(standard)
            for _, standard in scored_results
        ]

    finally:
        db.close()