import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime


class TestConversationSession:
    def test_session_creation(self):
        from core.memory import ConversationSession
        session = ConversationSession(session_id="s1", user_id="u1")
        assert session.session_id == "s1"
        assert session.user_id == "u1"
        assert session.messages == []
        assert session.detected_domain == ""

    def test_session_defaults(self):
        from core.memory import ConversationSession
        session = ConversationSession(session_id="s1", user_id="u1")
        assert session.current_case_context == {}
        assert session.last_classified_intent is None
        assert isinstance(session.created_at, datetime)


class TestMemoryManager:
    @pytest.mark.asyncio
    @patch("core.memory.redis_client", None)
    async def test_get_or_create_session_no_redis(self):
        from core.memory import ConversationMemoryManager
        manager = ConversationMemoryManager()
        session = await manager.get_or_create_session("s1", "u1")
        assert session.session_id == "s1"
        assert session.user_id == "u1"

    @pytest.mark.asyncio
    @patch("core.memory.redis_client", None)
    async def test_add_message(self):
        from core.memory import ConversationMemoryManager
        manager = ConversationMemoryManager()
        await manager.add_message("s1", "user", "Hello")
        session = await manager.get_or_create_session("s1", "unknown")
        assert len(session.messages) == 1
        assert session.messages[0]["role"] == "user"
        assert session.messages[0]["content"] == "Hello"

    @pytest.mark.asyncio
    @patch("core.memory.redis_client", None)
    async def test_message_limit(self):
        from core.memory import ConversationMemoryManager
        manager = ConversationMemoryManager()
        for i in range(25):
            await manager.add_message("s1", "user", f"Message {i}")
        session = await manager.get_or_create_session("s1", "unknown")
        assert len(session.messages) == 20
        assert session.messages[-1]["content"] == "Message 24"
