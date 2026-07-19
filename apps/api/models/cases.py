"""SQLAlchemy models for case and message management."""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from core.database import Base


class Case(Base):
    """Represents a legal case tied to a user session.

    Tracks domain, status, strength score, summary, and applicable laws.
    One session maps to one active case following the conversation model.
    """
    __tablename__ = "cases"

    id:             Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id:     Mapped[str]       = mapped_column(String(100), nullable=False, index=True)
    title:          Mapped[str]       = mapped_column(String(300), nullable=False)
    domain:         Mapped[str]       = mapped_column(String(50),  nullable=False, default="general")
    status:         Mapped[str]       = mapped_column(String(30),  nullable=False, default="active")
    strength_score: Mapped[int | None]= mapped_column(Integer, nullable=True)
    summary:        Mapped[str | None]= mapped_column(Text, nullable=True)
    first_message:  Mapped[str]       = mapped_column(Text, nullable=False)
    message_count:  Mapped[int]       = mapped_column(Integer, nullable=False, default=1)
    applicable_laws: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at:     Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:     Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages: Mapped[list["Message"]] = relationship("Message", back_populates="case",
                                                      cascade="all, delete-orphan",
                                                      order_by="Message.created_at")


class Message(Base):
    """Represents a single message within a case conversation.

    Stores the message role, content, optional analysis JSON,
    and is linked to a parent Case via foreign key.
    """
    __tablename__ = "messages"

    id:         Mapped[uuid.UUID]    = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id:    Mapped[uuid.UUID]    = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[str]          = mapped_column(String(100), nullable=False)
    role:       Mapped[str]          = mapped_column(String(20),  nullable=False)
    content:    Mapped[str]          = mapped_column(Text, nullable=False)
    analysis:   Mapped[dict | None]  = mapped_column(JSONB, nullable=True)
    domain:     Mapped[str | None]   = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="messages")
