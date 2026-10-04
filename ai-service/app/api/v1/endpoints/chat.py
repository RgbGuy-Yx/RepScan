import logging
from typing import Any

from fastapi import APIRouter

from app.config.exceptions import AIServiceException
from app.config.settings import settings
from app.services.cache import (
    PROMPT_VERSION_RAG,
    ai_cache,
    compute_data_fingerprint,
    generate_cache_key,
)
from app.services.rag.graph import rag_chat_graph
from app.services.rag.state import RagChatRequest, RagChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["RAG Chat"])


@router.post("", response_model=RagChatResponse)
async def chat_rag_query(payload: RagChatRequest) -> RagChatResponse:
    """Execute LangGraph-orchestrated hybrid RAG chat with strict grounding and Show Proof evidence, with AI caching."""
    # RAG caching is applicable for standalone queries without multi-turn conversation history
    is_cacheable = len(payload.conversation_history) == 0

    filters_dict = payload.filters.model_dump() if payload.filters else None
    data_ver = payload.data_version or compute_data_fingerprint({
        "structured_context": payload.structured_context.model_dump() if payload.structured_context else None,
    })

    date_range = None
    if payload.structured_context and payload.structured_context.date_range:
        date_range = {
            "start": payload.structured_context.date_range.get("min_date"),
            "end": payload.structured_context.date_range.get("max_date"),
        }

    cache_key = generate_cache_key(
        business_id=payload.business_id,
        analysis_type="rag_chat",
        date_range=date_range,
        data_version=data_ver,
        prompt_version=payload.prompt_version or PROMPT_VERSION_RAG,
        model=settings.MISTRAL_MODEL,
        language=payload.language,
        relevant_filters=filters_dict,
        extra={"query": payload.query.strip().lower()},
    )

    async def _compute_rag() -> RagChatResponse:
        try:
            initial_state = {
                "business_id": payload.business_id,
                "query": payload.query,
                "filters": filters_dict,
                "conversation_history": [msg.model_dump() for msg in payload.conversation_history],
                "thread_id": payload.thread_id,
                "structured_context": payload.structured_context.model_dump() if payload.structured_context else {},
            }

            # Multi-turn checkpointer configuration
            thread_key = payload.thread_id or f"biz-{payload.business_id}"
            config = {"configurable": {"thread_id": thread_key}}

            result_state: dict[str, Any] = await rag_chat_graph.ainvoke(initial_state, config=config)

            final_response_dict = result_state.get("final_response")
            if not final_response_dict:
                raise AIServiceException("LangGraph execution produced an empty response", status_code=502)

            return RagChatResponse(**final_response_dict)

        except AIServiceException:
            raise
        except Exception as err:
            logger.error("RAG chat orchestration error: %s", err, exc_info=True)
            raise AIServiceException(
                "The AI service is currently undergoing maintenance. Please try again shortly.",
                status_code=503,
            ) from err

    def _validate_rag(res: RagChatResponse) -> bool:
        return bool(res and res.answer and res.answer.strip())

    if is_cacheable and not payload.force_refresh:
        cached_res, was_hit = await ai_cache.get_or_compute(
            key=cache_key,
            compute_func=_compute_rag,
            validator=_validate_rag,
            business_id=payload.business_id,
            analysis_type="rag_chat",
            metadata={"query": payload.query},
            bypass_cache=payload.force_refresh,
        )
        return cached_res.model_copy(update={"cached": was_hit, "cache_key": cache_key})

    # Non-cacheable multi-turn or force_refresh
    fresh_res = await _compute_rag()
    return fresh_res.model_copy(update={"cached": False, "cache_key": cache_key})

