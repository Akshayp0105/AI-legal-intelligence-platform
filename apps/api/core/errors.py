from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Custom application exception with status code and detail."""

    def __init__(self, status_code: int = 500, detail: str = "Internal server error"):
        self.status_code = status_code
        self.detail = detail


def register_error_handlers(app: FastAPI):
    """Register custom error handlers on the FastAPI app.

    Handles AppException, 404 Not Found, and 500 Internal Server Error
    responses with structured JSON error bodies.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "status_code": exc.status_code},
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={"error": "Resource not found", "status_code": 404},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc):
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "status_code": 500},
        )
