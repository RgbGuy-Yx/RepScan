import logging
from typing import Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.cache import ai_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache", tags=["AI Response Cache"])


class InvalidateCacheRequest(BaseModel):
    key: Optional[str] = Field(default=None, description="Exact cache key to invalidate")
    business_id: Optional[str] = Field(default=None, description="Invalidate all entries for this business")
    analysis_type: Optional[str] = Field(default=None, description="Invalidate all entries for this analysis type")


class CacheOperationResponse(BaseModel):
    success: bool
    invalidated_count: int
    message: str


@router.get("/stats")
async def get_cache_stats() -> dict[str, Any]:
    """Retrieve live statistics, hit ratio, and token savings for the centralized AI cache."""
    return await ai_cache.get_stats()


@router.post("/invalidate", response_model=CacheOperationResponse)
async def invalidate_cache(payload: InvalidateCacheRequest) -> CacheOperationResponse:
    """
    Invalidate cached AI responses by key, business_id, or analysis_type.
    Useful when new reviews are ingested or manual refresh is triggered.
    """
    count = 0
    if payload.key:
        removed = await ai_cache.invalidate(payload.key)
        count = 1 if removed else 0
        return CacheOperationResponse(
            success=True,
            invalidated_count=count,
            message=f"Cache key '{payload.key}' {'invalidated' if removed else 'not found'}",
        )

    if payload.business_id and payload.analysis_type:
        count = await ai_cache.invalidate_analysis_type(
            analysis_type=payload.analysis_type, business_id=payload.business_id
        )
        return CacheOperationResponse(
            success=True,
            invalidated_count=count,
            message=f"Invalidated {count} entries for analysis '{payload.analysis_type}' and business '{payload.business_id}'",
        )

    if payload.business_id:
        count = await ai_cache.invalidate_business(payload.business_id)
        return CacheOperationResponse(
            success=True,
            invalidated_count=count,
            message=f"Invalidated {count} entries for business '{payload.business_id}'",
        )

    if payload.analysis_type:
        count = await ai_cache.invalidate_analysis_type(payload.analysis_type)
        return CacheOperationResponse(
            success=True,
            invalidated_count=count,
            message=f"Invalidated {count} entries for analysis type '{payload.analysis_type}'",
        )

    return CacheOperationResponse(
        success=False,
        invalidated_count=0,
        message="No target key, business_id, or analysis_type specified for invalidation",
    )


@router.post("/clear", response_model=CacheOperationResponse)
async def clear_cache() -> CacheOperationResponse:
    """Clear all active entries in the AI response cache."""
    count = await ai_cache.clear()
    return CacheOperationResponse(
        success=True,
        invalidated_count=count,
        message=f"AI Cache cleared entirely ({count} entries removed)",
    )
