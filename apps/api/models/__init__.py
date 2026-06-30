"""SQLAlchemy models for the LexAI database schema."""

from .user import User, UserRole
from .document import Document, DocType
from .knowledge import LegalKnowledge
from .precedent import CaseJudgment
from .prediction import CasePrediction
from .draft import Draft
from .feedback import ResponseFeedback, FlaggedResponse

__all__ = ["User", "UserRole", "Document", "DocType", "LegalKnowledge", "CaseJudgment", "CasePrediction", "Draft", "ResponseFeedback", "FlaggedResponse"]
