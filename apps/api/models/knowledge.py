"""SQLAlchemy model for the legal knowledge base with full-text search."""

import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from core.database import Base


class LegalKnowledge(Base):
    """Stores chunked legal text with metadata for RAG retrieval.

    Includes a TSVECTOR column with a GIN index for PostgreSQL
    full-text search alongside Qdrant vector search.
    """
    __tablename__ = "legal_knowledge"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    text = Column(Text, nullable=False)
    source = Column(String, nullable=False) # e.g., "statute", "judgment"
    section_number = Column(String, nullable=True)
    act_name = Column(String, nullable=True)
    case_id = Column(String, nullable=True)
    court = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    chunk_index = Column(Integer, nullable=False)
    
    # Store tsvector for full-text search
    search_vector = Column(TSVECTOR)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('ix_legal_knowledge_search_vector', 'search_vector', postgresql_using='gin'),
    )
