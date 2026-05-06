import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from core.database import Base

class CasePrediction(Base):
    __tablename__ = "case_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    case_description_hash = Column(String, index=True, nullable=False)
    case_type = Column(String, nullable=True) # e.g. criminal, civil
    court_level = Column(String, nullable=True) # e.g. supreme, high, district
    score_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
