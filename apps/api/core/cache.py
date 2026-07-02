"""Cache-Control middleware for setting HTTP caching headers based on endpoint type."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Paths that should not be cached (AI endpoints, mutations)
NO_CACHE_PATHS = {
    "/api/v1/analysis",
    "/api/v1/precedents",
    "/api/v1/arguments",
    "/api/v1/gaps",
    "/api/v1/analytics/predict",
    "/api/v1/drafting",
    "/api/v1/feedback",
    "/api/v1/documents",
}

# Paths that can be cached for a short time (read-only data)
SHORT_CACHE_PATHS = {
    "/api/v1/cases",
    "/api/v1/analytics/dashboard",
    "/api/v1/knowledge",
}

# Static assets get long cache
STATIC_CACHE_PATHS = {"/static"}


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Middleware to set appropriate Cache-Control headers based on endpoint type."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path

        if any(path.startswith(p) for p in STATIC_CACHE_PATHS):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif any(path.startswith(p) for p in NO_CACHE_PATHS):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        elif any(path.startswith(p) for p in SHORT_CACHE_PATHS):
            response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=30"
        else:
            response.headers["Cache-Control"] = "private, max-age=300"

        return response
