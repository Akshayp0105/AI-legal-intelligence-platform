# Feedback schemas v1.0.1 - Enhanced validation
from pydantic import BaseModel, Field
from typing import Optional

class FeedbackRequest(BaseModel):
    session_id: str
    message_index: int
    rating: str = Field(pattern="^(good|bad)$")
    comment: Optional[str] = ""

class FeedbackResponse(BaseModel):
    status: str
    message: str
