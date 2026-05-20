from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import io
import os
import json
import pdfplumber
import openai
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

RESUME_PARSE_SYSTEM_PROMPT = """
You are an expert resume parser. Extract structured data from the resume text and return valid JSON only.
The JSON must match this schema exactly:
{
  "name": "string",
  "email": "string",
  "phone": "string or null",
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "startDate": "YYYY-MM or string",
      "endDate": "YYYY-MM or null",
      "description": "string"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "graduationYear": "number or null"
    }
  ],
  "certifications": ["string"],
  "totalYearsExperience": "number"
}
"""

class ParsedResume(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    summary: str
    skills: List[str]
    experience: List[dict]
    education: List[dict]
    certifications: List[str]
    totalYearsExperience: float


@router.post("/parse-resume", response_model=ParsedResume)
async def parse_resume(
    file: UploadFile = File(...),
    candidate_id: Optional[str] = None,
):
    """
    Parse a resume PDF/DOCX using pdfplumber + GPT-4o.
    Returns structured JSON suitable for embedding and scoring.
    """
    if file.content_type not in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or DOCX.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 5 MB.")

    # ─── Extract raw text ────────────────────────────────────────────────────
    raw_text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=422, detail=f"Could not extract text from PDF: {e}")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from resume")

    # ─── GPT-4o structured extraction ────────────────────────────────────────
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": RESUME_PARSE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Parse this resume:\n\n{raw_text[:8000]}",  # limit tokens
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2000,
        )

        parsed = json.loads(response.choices[0].message.content)
        return ParsedResume(**parsed)

    except json.JSONDecodeError as e:
        logger.error(f"GPT-4 returned invalid JSON: {e}")
        raise HTTPException(status_code=500, detail="AI parsing failed — invalid JSON response")
    except Exception as e:
        logger.error(f"GPT-4 resume parsing failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {e}")
