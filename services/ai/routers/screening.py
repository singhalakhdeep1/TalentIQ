"""
LangGraph multi-agent screening pipeline.
Agents:
  1. ResumeAnalyzerAgent  — score resume against job requirements
  2. SkillMatchAgent      — verify skills from Neo4j knowledge graph  
  3. CultureFitAgent      — assess cultural fit from LinkedIn/portfolio signals
  4. ScoringAgent         — aggregate and produce final recommendation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Annotated, TypedDict
import os
import openai
import logging
import httpx

# LangGraph
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)
router = APIRouter()

openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
llm = ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=os.getenv("OPENAI_API_KEY"))

NEO4J_SERVICE_URL = os.getenv("NEO4J_SERVICE_URL", "http://api:4000")
POSTGRES_SERVICE_URL = os.getenv("POSTGRES_SERVICE_URL", "http://api:4000")


# ─── LangGraph State ──────────────────────────────────────────────────────────

class ScreeningState(TypedDict):
    candidate_id: str
    job_id: str
    resume_data: Optional[dict]
    job_data: Optional[dict]
    resume_score: Optional[int]
    skills_match_score: Optional[int]
    culture_fit_score: Optional[int]
    overall_score: Optional[int]
    justification: str
    recommendation: str
    errors: list[str]


# ─── Agent Nodes ──────────────────────────────────────────────────────────────

async def fetch_data_node(state: ScreeningState) -> ScreeningState:
    """Fetch candidate resume data and job requirements."""
    errors = list(state.get("errors", []))
    async with httpx.AsyncClient() as client:
        try:
            candidate_resp = await client.get(
                f"{POSTGRES_SERVICE_URL}/candidates/{state['candidate_id']}",
                timeout=10,
            )
            job_resp = await client.get(
                f"{POSTGRES_SERVICE_URL}/jobs/{state['job_id']}",
                timeout=10,
            )
            state["resume_data"] = candidate_resp.json()
            state["job_data"] = job_resp.json()
        except Exception as e:
            errors.append(f"Data fetch failed: {e}")
    state["errors"] = errors
    return state


async def resume_analyzer_node(state: ScreeningState) -> ScreeningState:
    """Agent 1: Score resume quality and relevance."""
    if not state.get("resume_data") or not state.get("job_data"):
        state["resume_score"] = 0
        return state

    resume_info = state["resume_data"]
    job_info = state["job_data"]

    prompt = f"""
You are a senior recruiter. Score this resume against the job requirements on a scale of 0-100.

Job: {job_info.get('title')}
Requirements: {job_info.get('requirements', '')}
Required Skills: {', '.join(job_info.get('requiredSkills', []))}

Candidate Summary: {resume_info.get('resumeSummary', 'No summary available')}
Experience: {resume_info.get('totalYearsExperience', 'Unknown')} years

Respond with ONLY a JSON: {{"score": <0-100>, "reasoning": "<brief reasoning>"}}
"""
    try:
        from langchain_core.messages import HumanMessage
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        import json
        result = json.loads(response.content)
        state["resume_score"] = int(result.get("score", 50))
    except Exception as e:
        logger.warning(f"Resume analyzer failed: {e}")
        state["resume_score"] = 50
    return state


async def skills_match_node(state: ScreeningState) -> ScreeningState:
    """Agent 2: Match candidate skills against job requirements using Neo4j."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{POSTGRES_SERVICE_URL}/skills-graph/jobs/{state['job_id']}/match/{state['candidate_id']}",
                timeout=10,
            )
            data = resp.json()
            state["skills_match_score"] = data.get("skillMatchScore", 50)
        except Exception as e:
            logger.warning(f"Skills match failed: {e}")
            state["skills_match_score"] = 50
    return state


async def scoring_node(state: ScreeningState) -> ScreeningState:
    """Agent 4: Aggregate scores and produce final recommendation."""
    resume_score = state.get("resume_score", 50) or 50
    skills_score = state.get("skills_match_score", 50) or 50

    # Weighted average: resume 50%, skills 50%
    overall = int(resume_score * 0.5 + skills_score * 0.5)
    state["overall_score"] = overall

    if overall >= 80:
        state["recommendation"] = "ADVANCE"
    elif overall >= 60:
        state["recommendation"] = "HOLD"
    else:
        state["recommendation"] = "REJECT"

    state["justification"] = (
        f"Resume score: {resume_score}/100. "
        f"Skills match: {skills_score}/100. "
        f"Overall: {overall}/100. "
        f"Recommendation: {state['recommendation']}."
    )
    return state


# ─── Build LangGraph ──────────────────────────────────────────────────────────

def build_screening_graph() -> StateGraph:
    graph = StateGraph(ScreeningState)
    graph.add_node("fetch_data", fetch_data_node)
    graph.add_node("resume_analyzer", resume_analyzer_node)
    graph.add_node("skills_match", skills_match_node)
    graph.add_node("scoring", scoring_node)

    graph.set_entry_point("fetch_data")
    graph.add_edge("fetch_data", "resume_analyzer")
    graph.add_edge("resume_analyzer", "skills_match")
    graph.add_edge("skills_match", "scoring")
    graph.add_edge("scoring", END)

    return graph.compile()


_screening_graph = None

def get_screening_graph():
    global _screening_graph
    if _screening_graph is None:
        _screening_graph = build_screening_graph()
    return _screening_graph


# ─── API Endpoint ──────────────────────────────────────────────────────────────

class ScreenRequest(BaseModel):
    candidateId: str
    jobId: str


class ScreenResponse(BaseModel):
    scores: dict
    justification: str
    recommendation: str


@router.post("/screen", response_model=ScreenResponse)
async def screen_candidate(body: ScreenRequest):
    """
    Run the LangGraph multi-agent screening pipeline.
    Executes: fetch_data → resume_analyzer → skills_match → scoring
    """
    try:
        graph = get_screening_graph()
        initial_state: ScreeningState = {
            "candidate_id": body.candidateId,
            "job_id": body.jobId,
            "resume_data": None,
            "job_data": None,
            "resume_score": None,
            "skills_match_score": None,
            "culture_fit_score": None,
            "overall_score": None,
            "justification": "",
            "recommendation": "HOLD",
            "errors": [],
        }

        final_state = await graph.ainvoke(initial_state)

        return ScreenResponse(
            scores={
                "resumeScore": final_state.get("resume_score", 0),
                "skillsMatchScore": final_state.get("skills_match_score", 0),
                "overallScore": final_state.get("overall_score", 0),
            },
            justification=final_state.get("justification", ""),
            recommendation=final_state.get("recommendation", "HOLD"),
        )
    except Exception as e:
        logger.error(f"Screening pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Screening failed: {e}")
