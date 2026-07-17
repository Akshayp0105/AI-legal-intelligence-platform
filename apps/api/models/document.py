import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum, func, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class DocType(str, enum.Enum):
    """Document type classification: fir, notice, petition, contract, judgment, or other."""
    fir = "fir"
    notice = "notice"
    petition = "petition"
    contract = "contract"
    judgment = "judgment"
    other = "other"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    raw_text = Column(Text, nullable=True)
    doc_type = Column(Enum(DocType, name="doctype_enum"), default=DocType.other, nullable=False)
    language = Column(String, nullable=True)
    page_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
