"""SQLAlchemy model for storing generated legal document drafts."""

import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class Draft(Base):
    """Stores generated legal document drafts linked to a user.

    Contains the document type, content as JSON, and an optional
    DOCX download URL.
    """
    __tablename__ = "drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    document_type = Column(String, index=True, nullable=False)
    content_json = Column(JSON, nullable=False)
    docx_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
