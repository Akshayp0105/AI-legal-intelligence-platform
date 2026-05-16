from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from services.analysis_service import analyze, analyze_stream

router = APIRouter(tags=["Analysis"])

class AnalyzeRequest(BaseModel):
    message: str = Field(..., description="User message to analyze")
    session_id: str = Field(default="default", description="Session ID")
    chat_history: List[Dict[str, Any]] = Field(default=[], description="Previous chat history")
    language: str = Field(default="en", description="Language code")
    user_role: str = Field(default="public", description="User role")

@router.post("/analysis/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    return await analyze(
        message=request.message,
        session_id=request.session_id,
        history=request.chat_history,
        language=request.language,
        user_role=request.user_role
    )

@router.post("/analysis/analyze/stream")
async def analyze_stream_endpoint(request: AnalyzeRequest):
    return StreamingResponse(
        analyze_stream(
            message=request.message,
            session_id=request.session_id,
            history=request.chat_history,
            language=request.language,
            user_role=request.user_role
        ),
        media_type="text/event-stream"
    )
