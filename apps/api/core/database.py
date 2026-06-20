import os
import time
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from core.logging import get_logger

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/lexaidb")
logger = get_logger(__name__)

# Create Async Engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()

# Pool monitoring thresholds
POOL_WARNING_THRESHOLD = 0.8  # Warn when 80% of connections are in use


def get_pool_status() -> dict:
    """Get connection pool statistics."""
    pool = engine.pool
    checked_out = pool.checkedout()
    pool_size = pool.size()
    max_size = pool_size + pool.overflow()
    utilization = round(checked_out / max_size * 100, 1) if max_size > 0 else 0

    status = {
        "pool_size": pool_size,
        "max_overflow": pool.overflow(),
        "checked_in": pool.checkedin(),
        "checked_out": checked_out,
        "overflow": pool.overflow(),
        "utilization_pct": utilization,
    }

    if utilization > POOL_WARNING_THRESHOLD * 100:
        logger.warning(f"High pool utilization: {utilization}% ({checked_out}/{max_size})")

    return status


async def get_db_session() -> AsyncSession:
    """Dependency for getting async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def health_check() -> bool:
    """Check database connectivity."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


async def detailed_health_check() -> dict:
    """Run health checks for all dependencies and return detailed status."""
    start = time.time()
    db_status = await health_check()
    db_latency_ms = round((time.time() - start) * 1000, 2)

    redis_status = False
    qdrant_status = False

    try:
        import redis.asyncio as aioredis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = aioredis.from_url(redis_url, socket_timeout=2)
        await r.ping()
        await r.aclose()
        redis_status = True
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")

    try:
        from qdrant_client import QdrantClient
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qc = QdrantClient(url=qdrant_url, timeout=2)
        qc.get_collections()
        qdrant_status = True
    except Exception as e:
        logger.warning(f"Qdrant health check failed: {e}")

    return {
        "database": {"status": "healthy" if db_status else "unhealthy", "latency_ms": db_latency_ms},
        "redis": {"status": "healthy" if redis_status else "unhealthy"},
        "qdrant": {"status": "healthy" if qdrant_status else "unhealthy"},
        "pool": get_pool_status(),
    }
