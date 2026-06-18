from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import os
from core.qdrant import init_qdrant
from core.logging import setup_logging
from core.database import health_check as get_db_health

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/hour"])
setup_logging()

# Configuration constants
REQUEST_TIMEOUT = 30  # seconds

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    print("Starting up LexAI API...")
    init_qdrant()
    yield
    # Shutdown: Clean up resources
    print("Shutting down LexAI API...")

app = FastAPI(
    title="LexAI API",
    description="Backend API for LexAI Legal Intelligence Platform",
    version="1.2.0",
    lifespan=lifespan,
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://lexai.app",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from api.routes.documents import router as documents_router
from api.routes.knowledge import router as knowledge_router
from api.routes.analysis import router as analysis_router
from api.routes.precedents import router as precedents_router
from api.routes.strategy import router as strategy_router
from api.routes.analytics import router as analytics_router
from api.routes.drafting import router as drafting_router
from api.routes.feedback import router as feedback_router
from api.routes.cases import router as cases_router

app.include_router(documents_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(precedents_router, prefix="/api/v1/precedents", tags=["precedents"])
app.include_router(strategy_router, prefix="/api/v1", tags=["strategy"])
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(drafting_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(cases_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    db_healthy = await get_db_health()
    return {
        "status": "ok",
        "message": "LexAI API is running",
        "database": "healthy" if db_healthy else "unhealthy",
        "version": "1.2.0"
    }

@app.get("/api/info")
async def api_info():
    return {"name": "LexAI", "version": "1.2.0", "updated": "2026-06-18"}

@app.get("/api/status")
async def system_status():
    return {"uptime": "active", "services": ["api", "database", "storage", "ai"], "environment": "production"}
