from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.logging import get_logger
from core.rate_limits import RATE_LIMITS

from core.database import get_db_session
from services.case_service import get_or_create_case, save_message
from services.analysis_service import analyze, analyze_stream

router = APIRouter(tags=["Analysis"])
logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)

class AnalyzeRequest(BaseModel):
    """Request schema for the legal analysis endpoint."""
    message: str = Field(..., description="User message to analyze", min_length=1, max_length=2000)
    session_id: str = Field(default="default", description="Session ID")
    chat_history: List[Dict[str, Any]] = Field(default=[], description="Previous chat history")
    language: str = Field(default="en", description="Language code")
    user_role: str = Field(default="public", description="User role")

@router.post("/analysis/analyze")
@limiter.limit(RATE_LIMITS["analysis"])
async def analyze_endpoint(request: AnalyzeRequest, req: Request, db: AsyncSession = Depends(get_db_session)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    result = await analyze(
        message=request.message,
        session_id=request.session_id,
        history=request.chat_history,
        language=request.language,
        user_role=request.user_role
    )
    
    domain = result.get("domain", "general")
    
    # ── SAVE TO DATABASE ─────────────────────────────────────
    try:
        case = await get_or_create_case(
            db=db,
            session_id=request.session_id,
            user_message=request.message,
            domain=domain,
        )

        # Save user message
        await save_message(
            db=db, case=case, session_id=request.session_id,
            role="user", content=request.message, domain=domain,
        )

        # Save assistant response with full analysis JSON
        await save_message(
            db=db, case=case, session_id=request.session_id,
            role="assistant",
            content=result.get("conversational_reply", ""),
            analysis=result,
            domain=domain,
        )

        await db.commit()
        result["case_id"] = str(case.id)   # Return case_id to frontend

    except Exception as e:
        # Never let DB errors break the chat response
        logger.error(f"DB save failed: {e}")
        await db.rollback()
    # ── END SAVE ─────────────────────────────────────────────

    return result

@router.post("/analysis/analyze/stream")
@limiter.limit(RATE_LIMITS["analysis_stream"])
async def analyze_stream_endpoint(request: AnalyzeRequest, req: Request, db: AsyncSession = Depends(get_db_session)):
    return StreamingResponse(
        analyze_stream(
            message=request.message,
            session_id=request.session_id,
            history=request.chat_history,
            language=request.language,
            user_role=request.user_role,
            db=db
        ),
        media_type="text/event-stream"
    )
