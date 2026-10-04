from fastapi import APIRouter

from app.api.v1.endpoints import briefs, cache, chat, feedback, health, reports

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health.router)
v1_router.include_router(feedback.router)
v1_router.include_router(briefs.router)
v1_router.include_router(chat.router)
v1_router.include_router(reports.router)
v1_router.include_router(cache.router)
