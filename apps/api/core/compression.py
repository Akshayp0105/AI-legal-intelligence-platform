"""GZip response compression middleware for the FastAPI application."""

import gzip
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

MIN_SIZE_FOR_COMPRESSION = 500  # bytes


class GZipMiddleware(BaseHTTPMiddleware):
    """Middleware to compress responses using gzip when client supports it."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return response

        content_type = response.headers.get("content-type", "")
        skip_types = {"image/", "video/", "audio/", "application/octet-stream"}
        if any(content_type.startswith(t) for t in skip_types):
            return response

        body = b""
        async for chunk in response.body_iterator:
            if isinstance(chunk, str):
                body += chunk.encode("utf-8")
            else:
                body += chunk

        if len(body) < MIN_SIZE_FOR_COMPRESSION:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type,
            )

        compressed = gzip.compress(body, compresslevel=6)

        headers = dict(response.headers)
        headers["content-encoding"] = "gzip"
        headers["content-length"] = str(len(compressed))
        headers["vary"] = "Accept-Encoding"

        return Response(
            content=compressed,
            status_code=response.status_code,
            headers=headers,
            media_type=content_type,
        )
