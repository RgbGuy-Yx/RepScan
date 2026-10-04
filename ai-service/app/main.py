import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.config.exceptions import register_exception_handlers
from app.config.logging_config import setup_logging
from app.config.settings import settings
from app.services.chroma import chroma_service

setup_logging()
logger = logging.getLogger(__name__)


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for starting and stopping background resources."""
    chroma_service.initialize()
    logger.info(
        "%s v%s started (%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
    )
    try:
        yield
    finally:
        logger.info("%s shutting down", settings.APP_NAME)


def create_app() -> FastAPI:
    """Application factory for the RepScan AI Service."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "RepScan AI Service — handles ChromaDB vector storage, "
            "embeddings, and AI-powered analysis."
        ),
        version=settings.APP_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_url=settings.OPENAPI_URL,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ───────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ──────────────────────────────────────────────────
    app.include_router(v1_router)

    return app


app = create_app()
