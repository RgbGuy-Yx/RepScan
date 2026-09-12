from fastapi import APIRouter

from app.config.settings import settings
from app.services.chroma import chroma_service

router = APIRouter()


@router.get(
    "/health",
    summary="Health check",
    response_description="AI service health status",
    tags=["Health"],
)
async def health_check() -> dict[str, str | bool]:
    """
    Return the health status of the RepScan AI Service.

    Verifies ChromaDB initialization and reports AI key configuration status.
    """
    chroma_ok = False
    mistral_configured = bool(settings.MISTRAL_API_KEY)
    voyage_configured = bool(settings.VOYAGE_API_KEY)

    try:
        chroma_ok = chroma_service.health_check()
    except Exception:
        pass

    return {
        "status": "healthy" if chroma_ok else "degraded",
        "chromadb": chroma_ok,
        "mistral_configured": mistral_configured,
        "voyage_configured": voyage_configured,
    }
