"""SQLAlchemy model for scraped court judgment precedents."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM
from sqlalchemy import func
from core.database import Base


class CaseJudgment(Base):
    """Stores scraped case data from Indian Kanoon with Qdrant embedding links.

    Tracks case metadata, full text, summary, outcome classification,
    and key legal sections referenced.
    """
    __tablename__ = "case_judgments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    case_number = Column(String, index=True)
    case_name = Column(String, index=True)
    court = Column(String, index=True)
    state = Column(String)
    year = Column(Integer, index=True)
    
    full_text = Column(Text, nullable=False)
    summary = Column(Text)
    
    outcome = Column(String) # favour_plaintiff / favour_defendant / mixed / dismissed
    key_sections = Column(ARRAY(String))
    
    # Links to Qdrant embedding ID
    embedding_id = Column(String, index=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
