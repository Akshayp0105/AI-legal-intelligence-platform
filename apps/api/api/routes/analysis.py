from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from models.analysis import AnalyzeRequest
from services.analysis_service import analyze_case_stream

router = APIRouter(tags=["Analysis"])

@router.post("/analysis/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    return StreamingResponse(
        analyze_case_stream(
            request.case_description, 
            request.language, 
            request.chat_history,
            request.session_id
        ),
        media_type="text/event-stream"
    )
