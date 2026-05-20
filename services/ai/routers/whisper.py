from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import openai
import logging
import io

logger = logging.getLogger(__name__)
router = APIRouter()

client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration: float


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio using OpenAI Whisper-1.
    Accepts: audio/webm, audio/wav, audio/mp3, audio/m4a
    """
    allowed = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp3", "audio/m4a", "audio/ogg"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {file.content_type}")

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:  # Whisper max 25 MB
        raise HTTPException(status_code=413, detail="Audio file too large. Max 25 MB.")

    ext_map = {
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/m4a": "m4a",
        "audio/ogg": "ogg",
    }
    ext = ext_map.get(file.content_type, "wav")

    try:
        audio_file = (f"audio.{ext}", io.BytesIO(content), file.content_type)
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
        )

        return TranscribeResponse(
            text=transcription.text,
            language=getattr(transcription, "language", "en"),
            duration=getattr(transcription, "duration", 0.0),
        )
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
