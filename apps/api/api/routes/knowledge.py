from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Any, Dict, List

from core.database import get_db_session
from services.rag.hybrid_search import hybrid_search

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

class SearchFilters(BaseModel):
    act: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    court: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    filters: Optional[SearchFilters] = None
    top_k: int = 10

class SearchResult(BaseModel):
    id: str
    score: Optional[float] = None
    hybrid_score: Optional[float] = None
    gemini_score: Optional[float] = None
    payload: Dict[str, Any]

class SearchResponse(BaseModel):
    results: List[SearchResult]

@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Search the legal knowledge base using hybrid vector + full-text search."""
    try:
        filters_dict = request.filters.model_dump(exclude_none=True) if request.filters else {}
        
        results = await hybrid_search(
            db=db,
            query=request.query,
            top_k=request.top_k,
            filters=filters_dict
        )
        
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
