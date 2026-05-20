from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
import openai
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMS = 3072


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]
    model: str
    dimensions: int


class BatchEmbedRequest(BaseModel):
    texts: List[str]


class BatchEmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str


@router.post("/embed", response_model=EmbedResponse)
async def embed_text(body: EmbedRequest):
    """
    Generate a text embedding using text-embedding-3-large (3072 dims).
    Used for resume and job description semantic search via pgvector.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=body.text[:8191],  # model max input
            dimensions=EMBEDDING_DIMS,
        )
        return EmbedResponse(
            embedding=response.data[0].embedding,
            model=EMBEDDING_MODEL,
            dimensions=EMBEDDING_DIMS,
        )
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")


@router.post("/embed/batch", response_model=BatchEmbedResponse)
async def embed_batch(body: BatchEmbedRequest):
    """Batch embed up to 100 texts."""
    if not body.texts:
        raise HTTPException(status_code=400, detail="No texts provided")
    if len(body.texts) > 100:
        raise HTTPException(status_code=400, detail="Max 100 texts per batch")

    try:
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=[t[:8191] for t in body.texts],
            dimensions=EMBEDDING_DIMS,
        )
        return BatchEmbedResponse(
            embeddings=[item.embedding for item in response.data],
            model=EMBEDDING_MODEL,
        )
    except Exception as e:
        logger.error(f"Batch embedding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {e}")
