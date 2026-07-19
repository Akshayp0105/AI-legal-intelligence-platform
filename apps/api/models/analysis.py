"""Pydantic request model for the legal analysis endpoint."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class AnalyzeRequest(BaseModel):
    """Request payload for submitting a legal analysis query."""
    session_id: Optional[str] = None
    case_description: str
    documents: List[str] = Field(default_factory=list)
    language: str = "en"
    user_role: str = "public"
    chat_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
