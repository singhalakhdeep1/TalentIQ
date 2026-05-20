from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging
import os

from routers import resume, embeddings, screening, whisper, health

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TalentIQ AI Service",
    description="FastAPI microservice for resume parsing, embeddings, Whisper STT, and LangGraph screening",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="", tags=["Health"])
app.include_router(resume.router, prefix="", tags=["Resume"])
app.include_router(embeddings.router, prefix="", tags=["Embeddings"])
app.include_router(screening.router, prefix="", tags=["Screening"])
app.include_router(whisper.router, prefix="", tags=["Whisper"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "production") == "development",
        log_level="info",
    )
