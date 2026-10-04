import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AIServiceException(Exception):
    """Base exception for AI service errors."""

    def __init__(self, message: str = "An unexpected error occurred", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ChromaDBError(AIServiceException):
    def __init__(self, message: str = "ChromaDB operation failed"):
        super().__init__(message=message, status_code=503)


class NotFoundError(AIServiceException):
    def __init__(self, resource: str = "Resource", resource_id: Any = None):
        detail = f"{resource} not found"
        if resource_id is not None:
            detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(message=detail, status_code=status.HTTP_404_NOT_FOUND)


def _error_response(status_code: int, message: str, errors: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"status": "error", "message": message}
    if errors is not None:
        body["errors"] = errors
    return body


from fastapi.encoders import jsonable_encoder


def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI app."""

    @app.exception_handler(AIServiceException)
    async def ai_service_exception_handler(request: Request, exc: AIServiceException) -> JSONResponse:
        logger.warning("AIServiceException: %s — %s %s", exc.message, request.method, request.url.path)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_response(exc.status_code, exc.message),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = jsonable_encoder(exc.errors())
        logger.warning("Validation error: %s — %s %s", errors, request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_response(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Validation error",
                errors=errors,
            ),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_response(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Internal server error",
            ),
        )
