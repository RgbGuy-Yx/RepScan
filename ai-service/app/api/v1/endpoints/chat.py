import logging
from typing import Any

from fastapi import APIRouter

from app.config.exceptions import AIServiceException
from app.services.rag.graph import rag_chat_graph
from app.services.rag.state import RagChatRequest, RagChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["RAG Chat"])


@router.post("", response_model=RagChatResponse)
async def chat_rag_query(payload: RagChatRequest) -> RagChatResponse:
    """Execute LangGraph-orchestrated hybrid RAG chat with strict grounding and Show Proof evidence."""
    try:
        initial_state = {
            "business_id": payload.business_id,
            "query": payload.query,
            "filters": payload.filters.model_dump() if payload.filters else None,
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
        raise AIServiceException(f"RAG chat orchestration failed: {str(err)}", status_code=502) from err
