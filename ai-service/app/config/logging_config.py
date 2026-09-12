import logging
import sys

from app.config.settings import settings


def setup_logging() -> None:
    """Configure centralized logging for the AI service."""
    handlers: list[logging.Handler] = [
        logging.StreamHandler(sys.stdout),
    ]

    if settings.LOG_FILE:
        handlers.append(logging.FileHandler(settings.LOG_FILE, encoding="utf-8"))

    logging.basicConfig(
        level=settings.LOG_LEVEL.upper(),
        format=settings.LOG_FORMAT,
        handlers=handlers,
        force=True,
    )

    for name in ("uvicorn.access", "httpcore", "httpx"):
        logging.getLogger(name).setLevel(logging.WARNING)

    logger = logging.getLogger(__name__)
    logger.info(
        "Logging initialized — level=%s file=%s",
        settings.LOG_LEVEL.upper(),
        settings.LOG_FILE or "stdout",
    )
