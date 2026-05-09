from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.feedback import FeedbackRequest, FeedbackResponse
from models.feedback import ResponseFeedback, FlaggedResponse
from core.database import get_db_session
from core.memory import ConversationMemoryManager

router = APIRouter(tags=["Feedback"])
memory_manager = ConversationMemoryManager()

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db_session)
):
    feedback_entry = ResponseFeedback(
        session_id=request.session_id,
        message_index=request.message_index,
        rating=request.rating,
        comment=request.comment
    )
    db.add(feedback_entry)
    
    if request.rating == "bad":
        session = await memory_manager.get_or_create_session(request.session_id, "unknown")
        
        # Determine the offending message (roughly)
        idx = request.message_index
        messages = session.messages
        bad_response = messages[idx] if idx < len(messages) else {}
        
        # Log to flagged_responses
        flagged = FlaggedResponse(
            session_id=request.session_id,
            full_request={"chat_history": messages[:idx] if idx > 0 else []},
            full_response={"bad_response": bad_response, "intent": session.last_classified_intent},
            issue_category=request.comment[:50] if request.comment else "user_flagged"
        )
        db.add(flagged)
        
    await db.commit()
    return FeedbackResponse(status="success", message="Feedback recorded.")
