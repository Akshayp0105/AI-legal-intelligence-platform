"""Middleware for logging slow HTTP requests."""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.logging import get_logger

logger = get_logger("slow_requests")
SLOW_REQUEST_THRESHOLD_MS = 1000  # 1 second
VERY_SLOW_REQUEST_THRESHOLD_MS = 5000  # 5 seconds


class SlowRequestMiddleware(BaseHTTPMiddleware):
    """Log requests that exceed the slow request threshold.

    Logs warnings for requests exceeding SLOW_REQUEST_THRESHOLD_MS (1s)
    and errors for requests exceeding VERY_SLOW_REQUEST_THRESHOLD_MS (5s).
    """

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed_ms = round((time.time() - start) * 1000, 2)

        if elapsed_ms > VERY_SLOW_REQUEST_THRESHOLD_MS:
            logger.error(
                f"VERY SLOW REQUEST: {request.method} {request.url.path} "
                f"took {elapsed_ms}ms (threshold: {VERY_SLOW_REQUEST_THRESHOLD_MS}ms)"
            )
        elif elapsed_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(
                f"SLOW REQUEST: {request.method} {request.url.path} "
                f"took {elapsed_ms}ms (threshold: {SLOW_REQUEST_THRESHOLD_MS}ms)"
            )

        return response
