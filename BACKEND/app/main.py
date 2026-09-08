from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, documents, laboratories, product_router, standards


app = FastAPI(
    title="BISense API",
    description="Backend API for the BISense AI Assistant",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(standards.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(product_router.router)
app.include_router(laboratories.router)


@app.get("/")
def root():
    return {
        "message": "BISense backend is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "BISense API",
    }