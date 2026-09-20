from fastapi import APIRouter

from app.api.v1.endpoints import briefs, chat, feedback, health

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health.router)
v1_router.include_router(feedback.router)
v1_router.include_router(briefs.router)
v1_router.include_router(chat.router)
