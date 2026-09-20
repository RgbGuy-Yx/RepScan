import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.services.rag.guardrails import (
    assess_confidence_and_limitations,
    extract_exact_excerpt,
    validate_and_format_sources,
)
from app.services.rag.retriever import HybridRetriever, build_chroma_filter
from app.services.rag.state import (
    ChatFilter,
    RagChatRequest,
    RagChatResponse,
    SourceProof,
    StructuredContext,
)
from app.services.rag.graph import (
    LLMRagOutput,
    build_rag_chat_graph,
    prepare_query_node,
    verify_and_format_proof_node,
)


# ── Filter Construction Tests ──────────────────────────────────────
def test_build_chroma_filter_business_only():
    f = build_chroma_filter("biz-123", None)
    assert f == {"business_id": "biz-123"}


def test_build_chroma_filter_with_platform_and_sentiment():
    filters = {"platform": "Google", "sentiment": "Negative"}
    f = build_chroma_filter("biz-123", filters)
    assert f == {
        "$and": [
            {"business_id": "biz-123"},
            {"platform": "google"},
            {"sentiment": "negative"},
        ]
    }


def test_build_chroma_filter_with_rating_range():
    filters = {"min_rating": 2.0, "max_rating": 4.0}
    f = build_chroma_filter("biz-123", filters)
    assert f == {
        "$and": [
            {"business_id": "biz-123"},
            {"rating": {"$gte": 2.0}},
            {"rating": {"$lte": 4.0}},
        ]
    }


def test_build_chroma_filter_exact_rating():
    filters = {"min_rating": 5.0, "max_rating": 5.0}
    f = build_chroma_filter("biz-123", filters)
    assert f == {
        "$and": [
            {"business_id": "biz-123"},
            {"rating": 5.0},
        ]
    }


# ── Show Proof & Excerpt Verification Tests ────────────────────────
def test_extract_exact_excerpt_direct_match():
    content = "The spicy chicken ramen was incredible, but the billing queue was too long."
    claimed = "The spicy chicken ramen was incredible"
    result = extract_exact_excerpt(claimed, content)
    assert result == "The spicy chicken ramen was incredible"
    assert result in content


def test_extract_exact_excerpt_paraphrase_grounding():
    content = "Staff was extremely rude and we waited forty minutes for drinks."
    claimed = "staff was rude and drinks took forty minutes"
    result = extract_exact_excerpt(claimed, content)
    # Excerpt returned MUST be an authentic substring/sentence of the original review
    assert result in content
    assert "Staff was extremely rude" in result


def test_validate_and_format_sources_authenticity():
    retrieved = [
        {
            "raw_item_id": "item-real-1",
            "content": "Authentic review text about fast delivery and good packaging.",
            "platform": "google",
            "author": "Alice",
            "rating": 5.0,
            "date": "2026-09-01",
            "source_url": "https://maps.google.com/review1",
        }
    ]

    raw_sources = [
        {"raw_item_id": "item-real-1", "excerpt": "fast delivery and good packaging"},
        {"raw_item_id": "item-fake-fabricated-id", "excerpt": "This was fabricated"},
    ]

    validated = validate_and_format_sources(raw_sources, retrieved)

    # Must reject fabricated raw_item_id
    assert len(validated) == 1
    assert validated[0].raw_item_id == "item-real-1"
    assert validated[0].platform == "google"
    assert validated[0].author == "Alice"
    assert validated[0].rating == 5.0
    assert validated[0].excerpt in retrieved[0]["content"]


def test_validate_and_format_sources_fallback_when_sources_empty():
    retrieved = [
        {
            "raw_item_id": "item-real-1",
            "content": "Authentic review text about speedy customer support.",
            "platform": "google",
            "author": "Bob",
            "rating": 4.0,
            "date": "2026-09-02",
            "source_url": "https://maps.google.com/review2",
        }
    ]

    validated = validate_and_format_sources([], retrieved)
    assert len(validated) == 1
    assert validated[0].raw_item_id == "item-real-1"
    assert "Authentic review text" in validated[0].excerpt


# ── Confidence & Limitation Tests ──────────────────────────────────
def test_assess_confidence_and_limitations_zero_reviews():
    conf, lim = assess_confidence_and_limitations(0, 0)
    assert conf == "Low"
    assert lim is not None
    assert "No reviews found" in lim


def test_assess_confidence_and_limitations_low_data():
    conf, lim = assess_confidence_and_limitations(2, 2)
    assert conf == "Low"
    assert lim is not None
    assert "Sample size is limited" in lim


def test_assess_confidence_and_limitations_moderate_data():
    conf, lim = assess_confidence_and_limitations(4, 10, filters={"platform": "google"})
    assert conf == "Medium"
    assert lim is not None
    assert "platform=google" in lim


def test_assess_confidence_and_limitations_abundant_data():
    conf, lim = assess_confidence_and_limitations(8, 20)
    assert conf == "High"


# ── Hybrid Retriever Merging Tests ─────────────────────────────────
def test_hybrid_retriever_deduplicates_and_combines():
    mock_chroma = MagicMock()
    mock_chroma.collection.query.return_value = {
        "ids": [["item-1"]],
        "documents": [["Semantic match content"]],
        "metadatas": [[{"raw_item_id": "item-1", "platform": "google", "rating": 5.0}]],
        "distances": [[0.1]],
    }

    retriever = HybridRetriever(chroma=mock_chroma)
    semantic_docs = retriever.retrieve_semantic_docs("query", "biz-1")
    assert len(semantic_docs) == 1

    structured = {
        "sample_reviews": [
            {"id": "item-1", "content": "Semantic match content"},
            {"id": "item-2", "content": "Postgres structured sample", "rating": 4.0, "platform": "instagram"},
        ]
    }

    combined = retriever.combine_with_structured(semantic_docs, structured)
    assert len(combined) == 2
    assert {c["raw_item_id"] for c in combined} == {"item-1", "item-2"}


# ── LangGraph Node Tests ───────────────────────────────────────────
@pytest.mark.asyncio
async def test_prepare_query_node():
    state = {
        "query": "  How is the food quality?  ",
        "business_id": "biz-1",
        "filters": {"platform": "google"},
    }
    result = await prepare_query_node(state)
    assert result["query"] == "How is the food quality?"
    assert result["filters"]["platform"] == "google"


@pytest.mark.asyncio
async def test_verify_and_format_proof_node_guardrails():
    state = {
        "draft_answer": "Customers frequently praise the dessert quality.",
        "sources": [{"raw_item_id": "item-1", "excerpt": "dessert quality was fantastic"}],
        "retrieved_docs": [
            {
                "raw_item_id": "item-1",
                "content": "The dinner was okay, but the dessert quality was fantastic!",
                "platform": "google",
                "author": "Carol",
                "rating": 5.0,
                "date": "2026-09-10",
                "source_url": "https://maps.google.com/review10",
            }
        ],
        "structured_context": {"total_reviews": 1},
    }

    result = await verify_and_format_proof_node(state)
    final = result["final_response"]
    assert final["answer"] == "Customers frequently praise the dessert quality."
    assert final["confidence"] == "Low"  # 1 review
    assert final["limitation_note"] is not None
    assert len(final["sources"]) == 1
    assert final["sources"][0]["raw_item_id"] == "item-1"
    assert "dessert quality was fantastic" in final["sources"][0]["excerpt"]


# ── FastAPI Endpoint Integration Test ──────────────────────────────
@pytest.mark.asyncio
async def test_chat_endpoint_success():
    from langchain_core.runnables import RunnableLambda

    app = create_app()

    mock_llm_output = LLMRagOutput(
        answer="The overall food rating is positive with 4.5 stars.",
        claimed_confidence="High",
        limitation_note=None,
        sources=[{"raw_item_id": "item-100", "excerpt": "great taste and prompt service"}],
    )

    with (
        patch("app.services.rag.retriever.hybrid_retriever.retrieve_semantic_docs") as mock_retrieve,
        patch("app.services.rag.graph.ChatMistralAI") as mock_chat_mistral,
    ):
        mock_retrieve.return_value = [
            {
                "raw_item_id": "item-100",
                "content": "We had a wonderful dinner with great taste and prompt service.",
                "platform": "google",
                "author": "Dave",
                "rating": 5.0,
                "date": "2026-09-12",
                "source_url": "https://maps.google.com/item100",
            }
        ]

        mock_instance = MagicMock()
        mock_instance.with_structured_output.return_value = RunnableLambda(lambda _: mock_llm_output)
        mock_chat_mistral.return_value = mock_instance

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "business_id": "b0e1f2a4-1234-5678-90ab-cdef12345678",
                "query": "What do customers say about dinner?",
                "filters": {"platform": "google"},
                "structured_context": {
                    "total_reviews": 10,
                    "average_rating": 4.5,
                    "sentiment_distribution": {"positive": 8, "neutral": 1, "negative": 1},
                },
            }

            with patch("app.config.settings.settings.MISTRAL_API_KEY", "mock-mistral-key"):
                response = await client.post("/api/v1/chat", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
            assert data["answer"] == "The overall food rating is positive with 4.5 stars."
            assert data["confidence"] in ["High", "Medium", "Low"]
            assert "sources" in data
            assert len(data["sources"]) == 1
            assert data["sources"][0]["raw_item_id"] == "item-100"
            assert "great taste and prompt service" in data["sources"][0]["excerpt"]


@pytest.mark.asyncio
async def test_langgraph_multi_turn_conversation_state():
    from langchain_core.runnables import RunnableLambda

    app = create_app()

    mock_llm_output = LLMRagOutput(
        answer="Customers love the breakfast waffles.",
        claimed_confidence="High",
        limitation_note=None,
        sources=[{"raw_item_id": "item-200", "excerpt": "Breakfast waffles are the best in town!"}],
    )

    with (
        patch("app.services.rag.retriever.hybrid_retriever.retrieve_semantic_docs") as mock_retrieve,
        patch("app.services.rag.graph.ChatMistralAI") as mock_chat_mistral,
    ):
        mock_retrieve.return_value = [
            {
                "raw_item_id": "item-200",
                "content": "Breakfast waffles are the best in town!",
                "platform": "google",
                "author": "Eve",
                "rating": 5.0,
                "date": "2026-09-15",
                "source_url": "https://maps.google.com/item200",
            }
        ]

        mock_instance = MagicMock()
        mock_instance.with_structured_output.return_value = RunnableLambda(lambda _: mock_llm_output)
        mock_chat_mistral.return_value = mock_instance

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "business_id": "b0e1f2a4-1234-5678-90ab-cdef12345678",
                "query": "What about breakfast?",
                "conversation_history": [
                    {"role": "user", "content": "Tell me about your food."},
                    {"role": "assistant", "content": "Our dinner options are popular."},
                ],
                "thread_id": "session-xyz-123",
            }

            with patch("app.config.settings.settings.MISTRAL_API_KEY", "mock-mistral-key"):
                response = await client.post("/api/v1/chat", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert data["answer"] == "Customers love the breakfast waffles."
            assert len(data["sources"]) == 1
            assert data["sources"][0]["raw_item_id"] == "item-200"


