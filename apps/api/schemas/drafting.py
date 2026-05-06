from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, Literal
from uuid import UUID
from datetime import datetime

class DraftingRequest(BaseModel):
    document_type: str = Field(..., description="Type of document, e.g., legal_notice, fir, bail_application, consumer_complaint, rti, vakalatnama, petition")
    case_details: Dict[str, Any] = Field(..., description="Details of the case relevant to the document type")
    party_details: Dict[str, Dict[str, Any]] = Field(..., description="Details of sender, recipient, or relevant parties")
    language: str = Field("en", description="Language for the document")
    tone: Literal["formal", "urgent"] = Field("formal", description="Tone of the document")

class DraftingImproveRequest(BaseModel):
    draft_text: str = Field(..., description="The current text of the drafted document")
    feedback: str = Field(..., description="User's feedback on what to improve or change")

class DraftingTranslateRequest(BaseModel):
    draft_text: str = Field(..., description="The text of the document to translate")
    target_language: str = Field(..., description="Target language, e.g., Malayalam")

class DraftResponse(BaseModel):
    id: UUID
    user_id: UUID
    document_type: str
    content_json: Dict[str, Any]
    docx_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
