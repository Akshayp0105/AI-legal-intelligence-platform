from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import os
from core.qdrant import init_qdrant
from core.logging import setup_logging
from core.database import health_check as get_db_health, detailed_health_check, get_pool_status
from core.middleware import RequestIDMiddleware, APIVersionMiddleware
from core.slow_request import SlowRequestMiddleware
from core.cache import CacheControlMiddleware
from core.compression import GZipMiddleware
from core.errors import register_error_handlers
from core.logging import get_logger

logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/hour"])
setup_logging()

# Configuration constants
REQUEST_TIMEOUT = 30  # seconds

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    logger.info("Starting up LexAI API...")
    init_qdrant()
    yield
    # Shutdown: Clean up resources
    logger.info("Shutting down LexAI API...")

tags_metadata = [
    {"name": "documents", "description": "Upload, manage, and retrieve legal documents."},
    {"name": "knowledge", "description": "Search and manage the legal knowledge base."},
    {"name": "analysis", "description": "AI-powered legal document analysis."},
    {"name": "precedents", "description": "Find and reference case precedents."},
    {"name": "strategy", "description": "Legal strategy recommendations."},
    {"name": "analytics", "description": "Usage analytics and insights."},
    {"name": "drafting", "description": "AI-assisted legal document drafting."},
    {"name": "feedback", "description": "User feedback and ratings."},
    {"name": "cases", "description": "Case management and tracking."},
]

app = FastAPI(
    title="LexAI API",
    description="Backend API for LexAI Legal Intelligence Platform",
    version="1.2.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

register_error_handlers(app)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins_str = os.getenv("CORS_ORIGINS", "")
origins = [
    frontend_url,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]
if allowed_origins_str:
    origins.extend([o.strip() for o in allowed_origins_str.split(",") if o.strip()])
# Deduplicate while preserving order
seen = set()
origins = [o for o in origins if o not in seen and not seen.add(o)]

app.add_middleware(APIVersionMiddleware)
app.add_middleware(GZipMiddleware)
app.add_middleware(CacheControlMiddleware)
app.add_middleware(SlowRequestMiddleware)
app.add_middleware(RequestIDMiddleware)
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
    deps = await detailed_health_check()
    overall = all(d["status"] == "healthy" for d in deps.values() if isinstance(d, dict) and "status" in d)
    return {
        "status": "ok" if overall else "degraded",
        "message": "LexAI API is running",
        "version": "1.2.0",
        "dependencies": deps,
    }

@app.get("/api/info")
async def api_info():
    return {
        "name": "LexAI",
        "version": "1.2.0",
        "updated": "2026-06-30",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }

@app.get("/api/discovery")
async def api_discovery():
    return {
        "service": "LexAI API",
        "version": "1.2.0",
        "endpoints": {
            "health": {"method": "GET", "path": "/health", "description": "Health check with dependencies"},
            "pool": {"method": "GET", "path": "/api/pool", "description": "Database pool status"},
            "info": {"method": "GET", "path": "/api/info", "description": "API version info"},
            "docs": {"method": "GET", "path": "/docs", "description": "Interactive API documentation"},
            "openapi": {"method": "GET", "path": "/openapi.json", "description": "OpenAPI specification"},
            "analyze": {"method": "POST", "path": "/api/v1/analysis/analyze", "description": "Analyze a legal query"},
            "analyze_stream": {"method": "POST", "path": "/api/v1/analysis/analyze/stream", "description": "Stream analysis via SSE"},
            "upload": {"method": "POST", "path": "/api/v1/documents/upload", "description": "Upload legal documents"},
            "search_knowledge": {"method": "POST", "path": "/api/v1/knowledge/search", "description": "Search legal knowledge base"},
            "search_precedents": {"method": "GET", "path": "/api/v1/precedents/search", "description": "Search court precedents"},
            "generate_arguments": {"method": "POST", "path": "/api/v1/arguments/generate", "description": "Generate legal arguments"},
            "analyze_gaps": {"method": "POST", "path": "/api/v1/gaps/analyze", "description": "Analyze legal gaps"},
            "predict": {"method": "POST", "path": "/api/v1/analytics/predict", "description": "Predict case strength"},
            "dashboard": {"method": "GET", "path": "/api/v1/analytics/dashboard", "description": "Dashboard analytics"},
            "draft": {"method": "POST", "path": "/api/v1/drafting/generate", "description": "Generate legal document"},
            "improve_draft": {"method": "POST", "path": "/api/v1/drafting/improve", "description": "Improve existing draft"},
            "translate_draft": {"method": "POST", "path": "/api/v1/drafting/translate", "description": "Translate legal document"},
            "feedback": {"method": "POST", "path": "/api/v1/feedback", "description": "Submit feedback"},
            "cases": {"method": "GET", "path": "/api/v1/cases", "description": "List cases"},
        },
        "rate_limits": {
            "default": "100/hour",
            "analysis": "30/minute",
            "drafting": "5/minute",
        },
    }

@app.get("/api/status")
async def system_status():
    environment = os.getenv("ENVIRONMENT", "development")
    return {"uptime": "active", "services": ["api", "database", "storage", "ai"], "environment": environment}

@app.get("/api/pool")
async def pool_status():
    return {"pool": get_pool_status()}
