import sys
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/testdb")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("QDRANT_URL", "http://localhost:6333")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("ENVIRONMENT", "test")


@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def mock_redis():
    with patch("redis.asyncio.from_url") as mock:
        client = AsyncMock()
        client.get = AsyncMock(return_value=None)
        client.setex = AsyncMock(return_value=True)
        mock.return_value = client
        yield client


@pytest.fixture
def mock_qdrant():
    with patch("core.qdrant.qdrant_client") as mock:
        mock.search = MagicMock(return_value=[])
        mock.upsert = MagicMock()
        yield mock
