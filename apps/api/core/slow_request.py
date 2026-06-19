import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("slow_requests")
SLOW_REQUEST_THRESHOLD_MS = 1000  # 1 second


class SlowRequestMiddleware(BaseHTTPMiddleware):
    """Log requests that exceed the slow request threshold."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed_ms = round((time.time() - start) * 1000, 2)

        if elapsed_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(
                f"SLOW REQUEST: {request.method} {request.url.path} "
                f"took {elapsed_ms}ms (threshold: {SLOW_REQUEST_THRESHOLD_MS}ms)"
            )

        return response
