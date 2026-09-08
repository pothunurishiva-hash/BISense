from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.document_service import (
    ingest_pdf,
    search_document_chunks,
)


router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)


UPLOAD_DIR = Path("documents")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    source_name: str = Form(...),
    source_url: str = Form(...),
    standard_number: Optional[str] = Form(default=None),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    safe_name = Path(file.filename).name
    destination = UPLOAD_DIR / safe_name

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    destination.write_bytes(content)

    try:
        result = ingest_pdf(
            file_path=destination,
            title=title,
            source_name=source_name,
            source_url=source_url,
            standard_number=standard_number,
        )

        return {
            "message": "Document ingested successfully.",
            "result": result,
        }

    except Exception as error:
        if destination.exists():
            destination.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {error}",
        )


@router.get("/search")
def search_documents(
    q: str,
    standard_number: Optional[str] = None,
    limit: int = 5,
):
    results = search_document_chunks(
        query=q,
        standard_number=standard_number,
        limit=limit,
    )

    return {
        "count": len(results),
        "results": results,
    }
