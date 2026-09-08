from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.bis_service import search_bis_knowledge


router = APIRouter(
    prefix="/api/standards",
    tags=["Standards"],
)


def normalize_standard_number(value: str) -> str:
    return " ".join(value.strip().upper().split())


@router.get("/search")
def search_standards(
    q: Optional[str] = Query(
        default=None,
        description="Search by IS number, title, keyword, or category",
    ),
    category: Optional[str] = Query(
        default=None,
        description="Filter by category",
    ),
    status: Optional[str] = Query(
        default=None,
        description="Filter by status",
    ),
):
    results = search_bis_knowledge(q)

    if category:
        results = [
            item
            for item in results
            if item.get("category")
            and item["category"].lower() == category.lower()
        ]

    if status:
        results = [
            item
            for item in results
            if item.get("status")
            and item["status"].lower() == status.lower()
        ]

    return {
        "count": len(results),
        "results": results,
    }


@router.get("/knowledge")
def search_knowledge(
    q: Optional[str] = Query(
        default=None,
        description="Search the BIS knowledge base",
    ),
):
    results = search_bis_knowledge(q)

    return {
        "count": len(results),
        "results": results,
    }


@router.get("/{standard_number}")
def get_standard_details(standard_number: str):
    """
    Get complete details for a specific BIS standard.
    Example:
    /api/standards/IS%20456%3A2000
    """

    requested_number = normalize_standard_number(standard_number)

    results = search_bis_knowledge(requested_number)

    for item in results:
        stored_number = normalize_standard_number(item["number"])

        if stored_number == requested_number:
            return item

    if results:
        return results[0]

    raise HTTPException(
        status_code=404,
        detail=f"Standard '{standard_number}' was not found.",
    )