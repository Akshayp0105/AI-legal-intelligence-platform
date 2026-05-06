import hashlib
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db_session
from models.precedent import CaseJudgment
from services.precedents.scraper import scrape_and_index_cases, fetch_cases_from_kanoon
from services.precedents.matcher import analyze_similar_cases

import redis

logger = logging.getLogger(__name__)

router = APIRouter()

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
CACHE_TTL = 86400  # 24 hours

class AnalyzeRequest(BaseModel):
    case_description: str
    top_k: int = 10
    court: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None

class CaseResponse(BaseModel):
    case_name: str
    citation: str
    court: str
    year: Optional[int]
    similarity_score: int
    outcome: str
    key_reasoning: str
    relevance_note: str

class AnalyzeResponse(BaseModel):
    similar_cases: List[CaseResponse]
    cached: bool = False

@router.get("/search")
async def search_precedents(
    background_tasks: BackgroundTasks,
    query: str = Query(..., description="Search query for Indian Kanoon"),
    court: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Search precedents using the scraper.
    """
    # Fetch from Kanoon
    docs = await fetch_cases_from_kanoon(query)
    
    # Trigger background task to fetch full texts and index them in Qdrant
    if docs:
        background_tasks.add_task(scrape_and_index_cases, query, 5)
        
    return {"message": "Search initiated", "results": docs}

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_precedents(request: AnalyzeRequest):
    """
    Analyze a case description to find similar judgments and compare them using Gemini.
    """
    # Create cache key
    # Include search parameters in cache key
    params_str = f"{request.top_k}:{request.court}:{request.year_from}:{request.year_to}"
    cache_string = f"{request.case_description}:{params_str}"
    cache_key = f"analyze_precedents:{hashlib.sha256(cache_string.encode('utf-8')).hexdigest()}"
    
    # Check cache
    try:
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return AnalyzeResponse(
                similar_cases=json.loads(cached_result),
                cached=True
            )
    except Exception as e:
        logger.warning(f"Redis cache access failed: {e}")

    # Not cached, run matcher
    try:
        similar_cases = analyze_similar_cases(
            case_description=request.case_description,
            top_k=request.top_k,
            court=request.court,
            year_from=request.year_from,
            year_to=request.year_to
        )
    except Exception as e:
        logger.error(f"Error analyzing cases: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze cases.")
        
    # Store in cache
    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(similar_cases))
    except Exception as e:
        logger.warning(f"Redis cache set failed: {e}")
        
    return AnalyzeResponse(similar_cases=similar_cases, cached=False)
