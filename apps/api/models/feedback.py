from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from core.database import Base

class ResponseFeedback(Base):
    __tablename__ = "response_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    message_index = Column(Integer)
    rating = Column(String)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FlaggedResponse(Base):
    __tablename__ = "flagged_responses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    full_request = Column(JSON)
    full_response = Column(JSON)
    issue_category = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
