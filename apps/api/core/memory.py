"""Redis-backed conversation memory manager for chat sessions."""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import redis.asyncio as aioredis

from core.intent_classifier import ClassifiedIntent
from core.logging import get_logger

logger = get_logger(__name__)

import os

try:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
except Exception as e:
    redis_client = None
    logger.warning(f"Failed to initialize Redis in memory: {e}")

class ConversationSession(BaseModel):
    """A single conversation session storing chat history and case context.

    Tracks messages, detected legal domain, and case entities for
    context-aware AI responses across a conversation.
    """
    session_id: str
    user_id: str
    messages: List[Dict[str, str]] = Field(default_factory=list)
    current_case_context: Dict[str, Any] = Field(default_factory=dict)
    detected_domain: str = ""
    last_classified_intent: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConversationMemoryManager:
    """Manages conversation sessions with Redis-backed persistence.

    Handles session creation, message history, case context updates,
    and domain inheritance for follow-up queries.
    """
    async def get_or_create_session(self, session_id: str, user_id: str) -> ConversationSession:
        if redis_client:
            try:
                data = await redis_client.get(f"session:{session_id}")
                if data:
                    return ConversationSession.model_validate_json(data)
            except Exception as e:
                logger.warning(f"Redis get failed in get_or_create_session: {e}")
        
        session = ConversationSession(session_id=session_id, user_id=user_id)
        await self._save_session(session)
        return session

    async def _save_session(self, session: ConversationSession) -> None:
        if redis_client:
            try:
                await redis_client.setex(f"session:{session.session_id}", 3600, session.model_dump_json())
            except Exception as e:
                logger.warning(f"Redis set failed in _save_session: {e}")

    async def add_message(self, session_id: str, role: str, content: str) -> None:
        """Append a message to the session history, keeping only the last 20 messages."""
        session = await self.get_or_create_session(session_id, "unknown")
        session.messages.append({
            "role": role, 
            "content": content, 
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        if len(session.messages) > 20:
            session.messages = session.messages[-20:]
        session.last_active = datetime.now(timezone.utc)
        await self._save_session(session)

    async def update_case_context(self, session_id: str, new_entities: Dict[str, Any]) -> None:
        session = await self.get_or_create_session(session_id, "unknown")
        for key, new_val in new_entities.items():
            if not new_val:
                continue
            if isinstance(new_val, list):
                existing = session.current_case_context.get(key, [])
                if isinstance(existing, list):
                    # merge lists and remove duplicates
                    merged = []
                    for item in existing + new_val:
                        if item not in merged:
                            merged.append(item)
                    session.current_case_context[key] = merged
            elif isinstance(new_val, dict):
                existing = session.current_case_context.get(key, {})
                if isinstance(existing, dict):
                    existing.update(new_val)
                    session.current_case_context[key] = existing
                else:
                    session.current_case_context[key] = new_val
            else:
                session.current_case_context[key] = new_val
        session.last_active = datetime.now(timezone.utc)
        await self._save_session(session)

    async def get_context_for_prompt(self, session_id: str) -> Dict[str, Any]:
        session = await self.get_or_create_session(session_id, "unknown")
        recent_messages = session.messages[-5:] if session.messages else []
        return {
            "chat_history": recent_messages,
            "current_case_context": session.current_case_context,
            "detected_domain": session.detected_domain
        }

    async def inherit_domain_if_followup(self, session_id: str, new_intent: ClassifiedIntent, user_message: str) -> ClassifiedIntent:
        session = await self.get_or_create_session(session_id, "unknown")
        
        word_count = len(user_message.split())
        
        # If new message is short and doesn't introduce a new domain keyword
        if session.detected_domain and (word_count < 15 and new_intent.legal_domain == "general"):
            new_intent.legal_domain = session.detected_domain
            
        # Ensure detected_domain is stored for future inheritances
        if new_intent.legal_domain != "general" and not session.detected_domain:
            session.detected_domain = new_intent.legal_domain
        elif new_intent.legal_domain != "general" and session.detected_domain != new_intent.legal_domain:
            # Overwrite if domain clearly shifted
            session.detected_domain = new_intent.legal_domain
            
        session.last_classified_intent = new_intent.model_dump()
        session.last_active = datetime.now(timezone.utc)
        await self._save_session(session)
        
        return new_intent
