import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db_session
from core.auth import get_current_user
from models.user import User
from models.draft import Draft
from schemas.drafting import DraftingRequest, DraftingImproveRequest, DraftingTranslateRequest, DraftResponse
from services.drafting_service import drafting_service

router = APIRouter(prefix="/drafting", tags=["Drafting"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/generate", response_model=DraftResponse)
@limiter.limit("5/minute")
async def generate_draft_endpoint(
    request: DraftingRequest,
    req: Request,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await drafting_service.generate_draft(
            document_type=request.document_type,
            case_details=request.case_details,
            party_details=request.party_details,
            language=request.language,
            tone=request.tone
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {e}")

    draft_text = result["draft_text"]
    
    docx_filename = f"{uuid.uuid4()}.docx"
    docx_filepath = drafting_service.generate_docx(draft_text, docx_filename)
    
    # If a static mount is used in main.py for /static
    docx_url = f"{req.base_url}static/drafts/{docx_filename}"
    
    draft = Draft(
        user_id=current_user.id,
        document_type=request.document_type,
        content_json={
            "draft_text": draft_text,
            "extracted_fields": result["extracted_fields"],
            "generated_sections": result["generated_sections"]
        },
        docx_url=docx_url
    )
    
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    
    return draft

@router.post("/improve")
async def improve_draft_endpoint(
    request: DraftingImproveRequest,
    current_user: User = Depends(get_current_user)
):
    """Improve an existing draft based on user feedback via Gemini."""
    improved_text = await drafting_service.improve_draft(request.draft_text, request.feedback)
    return {"improved_text": improved_text}

@router.post("/translate")
async def translate_draft_endpoint(
    request: DraftingTranslateRequest,
    current_user: User = Depends(get_current_user)
):
    translated_text = await drafting_service.translate_draft(request.draft_text, request.target_language)
    return {"translated_text": translated_text}
