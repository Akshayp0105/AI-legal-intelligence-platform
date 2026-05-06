from pydantic import BaseModel, Field
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    case_description: str
    documents: List[str] = Field(default_factory=list)
    language: str = "en"
    user_role: str = "public"
