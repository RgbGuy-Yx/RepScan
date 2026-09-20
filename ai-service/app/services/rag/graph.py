import logging
from typing import Any, Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from app.config.exceptions import AIServiceException
from app.config.settings import settings
from app.services.rag.guardrails import (
    assess_confidence_and_limitations,
    validate_and_format_sources,
)
from app.services.rag.retriever import hybrid_retriever
from app.services.rag.state import RagChatResponse, RagChatState, SourceProof

logger = logging.getLogger(__name__)


class LLMRagOutput(BaseModel):
    """Pydantic schema for structured output from Mistral."""
    answer: str = Field(description="Comprehensive, objective, strictly grounded answer to the user query based ONLY on the provided context")
    claimed_confidence: Literal["High", "Medium", "Low"] = Field(description="Initial confidence level based on data completeness")
    limitation_note: str | None = Field(default=None, description="Notes on data gaps, filter constraints, or low review volume if applicable")
    sources: list[dict[str, Any]] = Field(default_factory=list, description="List of referenced raw_item_ids and exact excerpts")


def _format_context_for_prompt(
    structured: dict[str, Any],
    reviews: list[dict[str, Any]],
    filters: dict[str, Any] | None,
) -> str:
    """Formats structured PostgreSQL metrics and retrieved review snippets for the LLM prompt."""
    sections = []

    # Filter section
    if filters:
        active = {k: v for k, v in filters.items() if v is not None}
        if active:
            sections.append(f"### ACTIVE FILTERS:\n{active}")

    # Structured Metrics section
    if structured:
        total = structured.get("total_reviews", 0)
        avg_rating = structured.get("average_rating")
        sentiment = structured.get("sentiment_distribution", {})
        themes = structured.get("top_themes", [])
        date_range = structured.get("date_range", {})

        metrics_str = (
            f"### POSTGRESQL STRUCTURED METRICS (SOURCE OF TRUTH):\n"
            f"- Total Reviews in scope: {total}\n"
            f"- Average Rating: {avg_rating if avg_rating is not None else 'N/A'}\n"
            f"- Sentiment Distribution: {sentiment}\n"
            f"- Top Themes: {themes}\n"
            f"- Date Range: {date_range}\n"
        )
        sections.append(metrics_str)

    # Reviews section
    if reviews:
        reviews_str = "### RETRIEVED CUSTOMER REVIEWS (SHOW PROOF EVIDENCE CANDIDATES):\n"
        for i, rev in enumerate(reviews, 1):
            raw_id = rev.get("raw_item_id", "unknown")
            plat = rev.get("platform", "unknown")
            rating = rev.get("rating", "N/A")
            dt = rev.get("date", "N/A")
            author = rev.get("author", "Anonymous")
            content = rev.get("content", "").replace("\n", " ")
            reviews_str += f"[{i}] RAW_ITEM_ID: {raw_id} | Platform: {plat} | Rating: {rating} | Date: {dt} | Author: {author}\n"
            reviews_str += f"    Content: \"{content}\"\n\n"
        sections.append(reviews_str)
    else:
        sections.append("### RETRIEVED CUSTOMER REVIEWS:\nNo matching customer reviews found.")

    return "\n\n".join(sections)


# ── Node 1: Prepare Query ─────────────────────────────────────────
async def prepare_query_node(state: RagChatState) -> dict[str, Any]:
    """Prepares and validates incoming state parameters."""
    query = state.get("query", "").strip()
    filters = state.get("filters") or {}
    structured = state.get("structured_context") or {}
    history = state.get("conversation_history") or []

    return {
        "query": query,
        "filters": filters,
        "structured_context": structured,
        "conversation_history": history,
    }


# ── Node 2: Retrieve Context ──────────────────────────────────────
async def retrieve_context_node(state: RagChatState) -> dict[str, Any]:
    """Performs hybrid retrieval using ChromaDB and PostgreSQL structured context."""
    business_id = state.get("business_id", "")
    query = state.get("query", "")
    filters = state.get("filters")
    structured = state.get("structured_context") or {}

    # Semantic vector retrieval from ChromaDB with metadata filters
    semantic_docs = hybrid_retriever.retrieve_semantic_docs(
        query=query,
        business_id=business_id,
        filters=filters,
        k=8,
    )

    # Combine with structured PostgreSQL sample reviews if any
    all_docs = hybrid_retriever.combine_with_structured(semantic_docs, structured)

    return {"retrieved_docs": all_docs}


# ── Node 3: Generate Grounded Answer ──────────────────────────────
async def generate_grounded_answer_node(state: RagChatState) -> dict[str, Any]:
    """Calls Mistral LLM with strict grounding constraints."""
    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("MISTRAL_API_KEY is not configured", status_code=503)

    query = state.get("query", "")
    filters = state.get("filters")
    structured = state.get("structured_context") or {}
    retrieved_docs = state.get("retrieved_docs") or []
    history = state.get("conversation_history") or []

    context_text = _format_context_for_prompt(structured, retrieved_docs, filters)

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        temperature=0,
        mistral_api_key=settings.MISTRAL_API_KEY,
        timeout=90,
    )
    structured_llm = llm.with_structured_output(LLMRagOutput)

    system_prompt = (
        "You are RepScan's intelligence & RAG evidence engine. Your role is to answer user queries "
        "about business reputation, customer reviews, ratings, sentiment, and themes with strict grounding.\n\n"
        "CRITICAL RULES:\n"
        "1. STRICT GROUNDING: Answer ONLY using the provided PostgreSQL structured metrics and customer reviews.\n"
        "2. NO HALLUCINATION: Never invent reviews, fake statistics, fake ratings, or nonexistent themes.\n"
        "3. NO FAKE QUOTES: When quoting evidence, use EXACT short excerpts from the provided reviews.\n"
        "4. SOURCE CITATIONS: In `sources`, include the real `raw_item_id` and the exact `excerpt` for each review referenced.\n"
        "5. INSUFFICIENT DATA: If there are no reviews or insufficient data to answer with certainty, clearly explain this limitation in `limitation_note` and lower your confidence.\n"
        "6. Return the required structured output schema."
    )

    messages = [SystemMessage(content=system_prompt)]

    # Add conversation history
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    # Add current context and user query
    user_prompt = f"EVIDENCE CONTEXT:\n{context_text}\n\nUSER QUESTION: {query}"
    messages.append(HumanMessage(content=user_prompt))

    prompt_template = ChatPromptTemplate.from_messages(messages)
    chain = prompt_template | structured_llm

    try:
        output: LLMRagOutput = await chain.ainvoke({})
        return {
            "draft_answer": output.answer,
            "sources": output.sources,
            "confidence": output.claimed_confidence,
            "limitation_note": output.limitation_note,
        }
    except Exception as err:
        logger.error("Mistral generation failed: %s", err)
        raise AIServiceException(f"Mistral generation failed: {str(err)}", status_code=502) from err


# ── Node 4: Verify and Format Proof ───────────────────────────────
async def verify_and_format_proof_node(state: RagChatState) -> dict[str, Any]:
    """Applies strict guardrails: verifies raw_item_ids, verifies exact excerpts, and computes final confidence."""
    draft_answer = state.get("draft_answer", "")
    raw_sources = state.get("sources") or []
    retrieved_docs = state.get("retrieved_docs") or []
    filters = state.get("filters")
    structured = state.get("structured_context") or {}
    total_in_context = structured.get("total_reviews", len(retrieved_docs))
    explicit_limitation = state.get("limitation_note")

    # 1. Validate sources (authentic raw_item_ids and exact excerpts)
    validated_sources: list[SourceProof] = validate_and_format_sources(
        raw_sources=raw_sources,
        retrieved_docs=retrieved_docs,
    )

    # 2. Assess confidence and limitation note
    final_confidence, final_limitation = assess_confidence_and_limitations(
        retrieved_count=len(retrieved_docs),
        total_reviews_in_context=total_in_context,
        filters=filters,
        explicit_limitation=explicit_limitation,
    )

    final_response = RagChatResponse(
        answer=draft_answer,
        confidence=final_confidence,  # type: ignore
        limitation_note=final_limitation,
        sources=validated_sources,
    )

    return {
        "final_response": final_response.model_dump(),
        "confidence": final_confidence,
        "limitation_note": final_limitation,
    }


# ── Build LangGraph ───────────────────────────────────────────────
def build_rag_chat_graph(checkpointer: MemorySaver | None = None):
    """Builds and compiles the LangGraph StateGraph for RAG Chat & Evidence."""
    workflow = StateGraph(RagChatState)

    workflow.add_node("prepare_query", prepare_query_node)
    workflow.add_node("retrieve_context", retrieve_context_node)
    workflow.add_node("generate_grounded_answer", generate_grounded_answer_node)
    workflow.add_node("verify_and_format_proof", verify_and_format_proof_node)

    workflow.add_edge(START, "prepare_query")
    workflow.add_edge("prepare_query", "retrieve_context")
    workflow.add_edge("retrieve_context", "generate_grounded_answer")
    workflow.add_edge("generate_grounded_answer", "verify_and_format_proof")
    workflow.add_edge("verify_and_format_proof", END)

    return workflow.compile(checkpointer=checkpointer)


# Global in-memory checkpointer for conversation state persistence
memory_checkpointer = MemorySaver()
rag_chat_graph = build_rag_chat_graph(checkpointer=memory_checkpointer)
