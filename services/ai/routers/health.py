from fastapi import APIRouter
from pydantic import BaseModel
import os

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="talentiq-ai", version="1.0.0")
