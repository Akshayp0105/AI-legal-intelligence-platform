import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class UserRole(str, enum.Enum):
    advocate = "advocate"
    student = "student"
    public = "public"
    firm = "firm"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    role = Column(Enum(UserRole, name="userrole_enum"), default=UserRole.public, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    draft_count = Column(String, default="0", nullable=False)
    subscription_tier = Column(String, default="free", nullable=False)
