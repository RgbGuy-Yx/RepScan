import logging
import re
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
from app.services.rag.retriever import hybrid_retriever, retriever_runnable
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
            author = rev.get("author") or "Verified Customer"
            content = rev.get("content") or rev.get("text") or ""
            reviews_str += f"[Review {i}] (Reference ID: {raw_id}) | Platform: {plat} | Rating: {rating}/5 | Date: {dt} | Author: {author}\n"
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
    """Performs hybrid retrieval using ChromaDB and PostgreSQL structured context via LangChain Runnable."""
    all_docs = await retriever_runnable.ainvoke({
        "query": state.get("query", ""),
        "business_id": state.get("business_id", ""),
        "filters": state.get("filters"),
        "structured_context": state.get("structured_context") or {},
        "k": 8,
    })
    return {"retrieved_docs": all_docs}


# ── Node 3: Generate Grounded Answer ──────────────────────────────
async def generate_grounded_answer_node(state: RagChatState) -> dict[str, Any]:
    """Calls Mistral LLM with strict grounding constraints and structured formatting."""
    query = state.get("query", "").strip()
    filters = state.get("filters")
    structured = state.get("structured_context") or {}
    retrieved_docs = state.get("retrieved_docs") or []
    history = state.get("conversation_history") or []

    # 1. Zero-Review Guardrail Fast Path
    total_reviews = structured.get("total_reviews", 0)
    if not retrieved_docs and total_reviews == 0:
        logger.info("Zero reviews available for query '%s' - returning friendly grounded empty-state response", query)
        return {
            "draft_answer": (
                "Hello! It looks like no customer reviews or feedback entries have been synced yet for this business.\n\n"
                "I'd love to help you analyze customer sentiment, ratings, and common themes once your feedback is connected! "
                "You can link your Google Maps or other review profiles anytime in **Settings** to get started."
            ),
            "sources": [],
            "confidence": "Low",
            "limitation_note": "No customer reviews currently synced for this business.",
        }

    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("AI chat service is currently undergoing maintenance. Please try again shortly.", status_code=503)

    context_text = _format_context_for_prompt(structured, retrieved_docs, filters)

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        temperature=0.1,
        mistral_api_key=settings.MISTRAL_API_KEY,
        timeout=90,
        max_retries=3,
    )
    structured_llm = llm.with_structured_output(LLMRagOutput)

    system_prompt = (
        "You are RepScan Assistant, a warm, executive-grade AI intelligence partner dedicated to helping "
        "business owners, clinic teams, and executives understand and delight their customers.\n\n"
        "YOUR PERSONALITY & TONE:\n"
        "- Professional, warm, respectful, and constructive. Greet the user naturally when they say hi or hello.\n"
        "- Objective, data-driven, and supportive: celebrate positive customer praise enthusiastically, and frame critical "
        "feedback constructively as clear, actionable opportunities for operational excellence.\n"
        "- Clear, structured, and easy to read: avoid robotic or messy stream-of-consciousness text.\n"
        "- End with a warm, open-ended offer to help further (e.g. 'Let me know if you would like me to check any specific treatment, doctor, or timeframe!').\n\n"
        "RESPONSE STRUCTURE & FORMATTING (EXECUTIVE BRIEFING STYLE):\n"
        "- Format answers like an executive intelligence brief: structured, clear, and high-impact.\n"
        "- When analyzing feedback, complaints, or themes, structure your answer into clean sections:\n"
        "  1. **Executive Overview**: 1-2 sentences summarizing overall sentiment, volume, and date range.\n"
        "  2. **Core Themes / Issues**: Group feedback into distinct numbered themes (e.g. `### 1. Wait Times & Scheduling (2 mentions)`).\n"
        "     - **The Issue**: A concise explanation of the patient/customer friction point.\n"
        "     - **Evidence**: Direct quotes using clean markdown blockquotes: `> \"...\"` followed on the next line by `— Verified Customer (2.0★, Google)`.\n"
        "     - **Impact**: Brief note on how this affects patient satisfaction or repeat visits.\n"
        "  3. **Recommended Action Steps**: 2-3 specific, actionable operational improvements the business can take immediately.\n"
        "- BANNED CONTENT: NEVER print raw database UUIDs or strings like `(RAW_ITEM_ID: ...)` in the text of `answer`. Review IDs belong exclusively in the `sources` field. User-facing text must remain completely human-readable, executive-grade, and free of technical database artifacts.\n\n"
        "CRITICAL GROUNDING RULES:\n"
        "1. STRICT GROUNDING: Answer ONLY using the provided PostgreSQL structured metrics and customer reviews.\n"
        "2. NO HALLUCINATION: Never invent reviews, fake statistics, fake ratings, or nonexistent customer quotes.\n"
        "3. NO FAKE QUOTES: When quoting evidence, use EXACT short excerpts from the real reviews.\n"
        "4. SOURCE CITATIONS: In `sources`, include the real `raw_item_id` and the exact `excerpt` for each review referenced.\n"
        "5. INSUFFICIENT DATA: If there are no reviews or insufficient data for a specific question, kindly and honestly explain this limitation in `limitation_note` and lower your confidence.\n"
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
        logger.error("Mistral generation error: %s", err, exc_info=True)
        raise AIServiceException(
            "The AI service is currently undergoing maintenance. Please try again shortly.",
            status_code=503,
        ) from err


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

    # 0. Clean and sanitize any leaked raw IDs or technical artifacts from user-facing answer
    cleaned_answer = re.sub(
        r'\(?\s*RAW_ITEM_ID:\s*[a-f0-9\-]+(?:,\s*Rating:[^)]*)?\s*\)?',
        '',
        draft_answer,
        flags=re.IGNORECASE,
    )
    cleaned_answer = re.sub(
        r'\(\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*(?:,\s*Rating:[^)]*)?\)',
        '',
        cleaned_answer,
        flags=re.IGNORECASE,
    )
    cleaned_answer = re.sub(r'\(\s*Rating:\s*[\d\.\*\/]+\s*\)', '', cleaned_answer, flags=re.IGNORECASE)
    cleaned_answer = re.sub(r'\n{3,}', '\n\n', cleaned_answer).strip()

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
        answer=cleaned_answer,
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
