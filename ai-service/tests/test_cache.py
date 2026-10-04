import pytest
import time
from unittest.mock import AsyncMock, patch

from app.services.cache import (
    AICacheService,
    compute_data_fingerprint,
    generate_cache_key,
)
from app.services.report_ai import (
    ReportAIBriefOutput,
    ReportAIBriefRequest,
    generate_report_ai_brief,
    get_what_changed_explanations,
    get_theme_summaries,
    get_recommendations,
    get_dashboard_insights,
)
from app.api.v1.endpoints.briefs import (
    GenerateBriefSummaryRequest,
    GenerateBriefSummaryResponse,
    BriefSummaryOutput,
    GroundedThemeItem,
    summarize_weekly_brief,
)
from app.services.rag.state import (
    RagChatRequest,
    RagChatResponse,
    SourceProof,
)
from app.api.v1.endpoints.chat import chat_rag_query


# ── 1. Deterministic Cache Key Tests ──────────────────────────────────────────

def test_deterministic_cache_key_generation():
    key1 = generate_cache_key(
        business_id="biz-123",
        analysis_type="report_brief",
        date_range={"start": "2026-09-01", "end": "2026-09-08"},
        data_version="ver-abc",
        prompt_version="1.0.0",
        model="open-mistral-nemo",
        language="en",
        relevant_filters={"sentiment": "negative", "platform": "google"},
    )

    # Identical inputs but different dict ordering
    key2 = generate_cache_key(
        business_id="biz-123",
        analysis_type="report_brief",
        date_range={"end": "2026-09-08", "start": "2026-09-01"},
        data_version="ver-abc",
        prompt_version="1.0.0",
        model="open-mistral-nemo",
        language="en",
        relevant_filters={"platform": "google", "sentiment": "negative"},
    )

    assert key1 == key2
    assert key1.startswith("report_brief:biz-123:")


def test_cache_key_sensitivity_to_inputs():
    base_kwargs = {
        "business_id": "biz-123",
        "analysis_type": "report_brief",
        "date_range": {"start": "2026-09-01", "end": "2026-09-08"},
        "data_version": "v1",
        "prompt_version": "1.0.0",
        "model": "open-mistral-nemo",
        "language": "en",
        "relevant_filters": {"platform": "google"},
    }
    base_key = generate_cache_key(**base_kwargs)

    # Different business_id
    assert generate_cache_key(**{**base_kwargs, "business_id": "biz-456"}) != base_key

    # Different analysis_type
    assert generate_cache_key(**{**base_kwargs, "analysis_type": "weekly_brief"}) != base_key

    # Different date_range
    assert generate_cache_key(**{**base_kwargs, "date_range": {"start": "2026-09-02", "end": "2026-09-08"}}) != base_key

    # Different data_version
    assert generate_cache_key(**{**base_kwargs, "data_version": "v2"}) != base_key

    # Different prompt_version
    assert generate_cache_key(**{**base_kwargs, "prompt_version": "2.0.0"}) != base_key

    # Different model
    assert generate_cache_key(**{**base_kwargs, "model": "mistral-large-latest"}) != base_key

    # Different language
    assert generate_cache_key(**{**base_kwargs, "language": "es"}) != base_key

    # Different filters
    assert generate_cache_key(**{**base_kwargs, "relevant_filters": {"platform": "yelp"}}) != base_key


def test_compute_data_fingerprint():
    data1 = {"total_reviews": 50, "average_rating": 4.5, "sentiment": {"positive": 40, "negative": 10}}
    data2 = {"sentiment": {"negative": 10, "positive": 40}, "average_rating": 4.5, "total_reviews": 50}
    data3 = {"total_reviews": 51, "average_rating": 4.5, "sentiment": {"positive": 40, "negative": 10}}

    fp1 = compute_data_fingerprint(data1)
    fp2 = compute_data_fingerprint(data2)
    fp3 = compute_data_fingerprint(data3)

    assert fp1 == fp2
    assert fp1 != fp3


# ── 2. Cache HIT / MISS & Lifecycle Tests ─────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_lifecycle_and_telemetry():
    cache = AICacheService(max_entries=10, default_ttl=60)

    compute_call_count = 0

    async def mock_compute():
        nonlocal compute_call_count
        compute_call_count += 1
        return {"result": "val_123"}

    def mock_validator(res):
        return bool(res and "result" in res)

    key = "test_type:biz-1:key1"

    # First access -> MISS
    res1, was_hit1 = await cache.get_or_compute(
        key=key,
        compute_func=mock_compute,
        validator=mock_validator,
        business_id="biz-1",
        analysis_type="report_brief",
    )

    assert was_hit1 is False
    assert res1 == {"result": "val_123"}
    assert compute_call_count == 1

    # Second access -> HIT
    res2, was_hit2 = await cache.get_or_compute(
        key=key,
        compute_func=mock_compute,
        validator=mock_validator,
        business_id="biz-1",
        analysis_type="report_brief",
    )

    assert was_hit2 is True
    assert res2 == {"result": "val_123"}
    assert compute_call_count == 1  # Not called again!

    # Telemetry check
    stats = await cache.get_stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["active_entries"] == 1
    assert stats["hit_ratio"] == 0.5
    assert stats["estimated_tokens_saved"] > 0
    assert stats["estimated_latency_saved_ms"] > 0


@pytest.mark.asyncio
async def test_cache_validation_failure_not_cached():
    cache = AICacheService()

    async def mock_invalid_compute():
        return {"error": "empty"}

    def mock_validator(res):
        return "valid_data" in res

    key = "test_type:biz-1:fail_key"

    res, was_hit = await cache.get_or_compute(
        key=key,
        compute_func=mock_invalid_compute,
        validator=mock_validator,
        business_id="biz-1",
        analysis_type="report_brief",
    )

    assert was_hit is False
    entry = await cache.get(key)
    assert entry is None  # Not stored in cache because validation failed


# ── 3. Invalidation & Eviction Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_cache_invalidation():
    cache = AICacheService()

    await cache.set("k1", "data1", "biz-1", "report_brief")
    await cache.set("k2", "data2", "biz-1", "weekly_brief")
    await cache.set("k3", "data3", "biz-2", "report_brief")

    assert (await cache.get_stats())["active_entries"] == 3

    # Invalidate by specific key
    assert await cache.invalidate("k1") is True
    assert await cache.get("k1") is None
    assert (await cache.get_stats())["active_entries"] == 2

    # Invalidate by business
    count = await cache.invalidate_business("biz-1")
    assert count == 1  # Only k2 left for biz-1
    assert await cache.get("k2") is None
    assert await cache.get("k3") is not None  # biz-2 intact

    # Clear
    await cache.clear()
    assert (await cache.get_stats())["active_entries"] == 0


@pytest.mark.asyncio
async def test_cache_ttl_expiration():
    cache = AICacheService(default_ttl=1)

    await cache.set("ttl_key", "val", "biz-1", "report_brief", ttl_seconds=1)
    entry = await cache.get("ttl_key")
    assert entry is not None

    # Simulate expiration by modifying expires_at
    entry.expires_at = time.time() - 10
    expired = await cache.get("ttl_key")
    assert expired is None


@pytest.mark.asyncio
async def test_cache_lru_eviction():
    cache = AICacheService(max_entries=2)

    await cache.set("k1", "d1", "biz-1", "type1")
    await cache.set("k2", "d2", "biz-1", "type1")

    # Access k1 to make k2 the least recently used
    await cache.get("k1")

    # Insert k3 -> should evict k2
    await cache.set("k3", "d3", "biz-1", "type1")

    assert await cache.get("k1") is not None
    assert await cache.get("k2") is None  # Evicted!
    assert await cache.get("k3") is not None


# ── 4. End-to-End Service Integration Tests ───────────────────────────────────

@pytest.mark.asyncio
async def test_report_ai_brief_caching():
    sample_request = ReportAIBriefRequest(
        business_name="Dental Clinic",
        report_type="weekly",
        period_start="2026-09-01",
        period_end="2026-09-08",
        total_reviews=15,
        previous_total_reviews=12,
        average_rating=4.8,
        previous_average_rating=4.6,
        business_id="biz-dental-1",
    )

    mock_brief_output = ReportAIBriefOutput(
        summary="Consistent high satisfaction driven by gentle care.",
        key_changes=[],
        strengths=[],
        areas_to_improve=[],
        recommendations=[],
        sentiment_observation="Very positive",
    )

    with patch("app.services.report_ai.build_report_ai_chain") as mock_chain_builder:
        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = mock_brief_output
        mock_chain_builder.return_value = mock_chain

        # First invocation -> MISS (calls Mistral chain)
        res1 = await generate_report_ai_brief(sample_request)
        assert res1.cached is False
        assert res1.cache_key is not None
        assert mock_chain.ainvoke.call_count == 1

        # Second invocation -> HIT (skips Mistral chain)
        res2 = await generate_report_ai_brief(sample_request)
        assert res2.cached is True
        assert res2.cache_key == res1.cache_key
        assert mock_chain.ainvoke.call_count == 1  # Unchanged!

        # Sub-analysis helpers reuse cached brief
        what_changed = await get_what_changed_explanations(sample_request)
        assert isinstance(what_changed, list)
        assert mock_chain.ainvoke.call_count == 1  # Still 1!

        theme_summaries = await get_theme_summaries(sample_request)
        assert theme_summaries["cached"] is True
        assert mock_chain.ainvoke.call_count == 1

        recs = await get_recommendations(sample_request)
        assert isinstance(recs, list)
        assert mock_chain.ainvoke.call_count == 1

        insights = await get_dashboard_insights(sample_request)
        assert insights["cached"] is True
        assert mock_chain.ainvoke.call_count == 1


@pytest.mark.asyncio
async def test_weekly_brief_caching():
    sample_request = GenerateBriefSummaryRequest(
        business_name="Urban Coffee",
        period_start="2026-09-01",
        period_end="2026-09-08",
        total_reviews=20,
        previous_total_reviews=18,
        confidence="High",
        business_id="biz-coffee-1",
    )

    mock_output = BriefSummaryOutput(
        summary_text="Weekly performance is steady with excellent coffee praise.",
        top_complaints=[],
        top_praises=[GroundedThemeItem(theme="Espresso", summary="Best espresso in town.")],
    )

    with patch("app.api.v1.endpoints.briefs._build_brief_runnable") as mock_builder:
        mock_pipeline = AsyncMock()
        mock_pipeline.ainvoke.return_value = mock_output
        mock_builder.return_value = mock_pipeline

        # First call -> MISS
        res1 = await summarize_weekly_brief(sample_request)
        assert res1.cached is False
        assert mock_pipeline.ainvoke.call_count == 1

        # Second call -> HIT
        res2 = await summarize_weekly_brief(sample_request)
        assert res2.cached is True
        assert res2.cache_key == res1.cache_key
        assert mock_pipeline.ainvoke.call_count == 1


@pytest.mark.asyncio
async def test_rag_chat_caching():
    sample_request = RagChatRequest(
        business_id="biz-rag-1",
        query="What are the top customer complaints?",
        conversation_history=[],  # Standalone query -> cacheable
    )

    mock_rag_state = {
        "final_response": {
            "answer": "The primary complaint is wait times during peak hours.",
            "confidence": "High",
            "limitation_note": None,
            "sources": [],
        }
    }

    with patch("app.api.v1.endpoints.chat.rag_chat_graph.ainvoke", new_callable=AsyncMock) as mock_graph_invoke:
        mock_graph_invoke.return_value = mock_rag_state

        # First call -> MISS
        res1 = await chat_rag_query(sample_request)
        assert res1.cached is False
        assert mock_graph_invoke.call_count == 1

        # Second call -> HIT
        res2 = await chat_rag_query(sample_request)
        assert res2.cached is True
        assert res2.cache_key == res1.cache_key
        assert mock_graph_invoke.call_count == 1


@pytest.mark.asyncio
async def test_cache_api_endpoints():
    from httpx import ASGITransport, AsyncClient
    from app.main import create_app
    from app.services.cache import ai_cache

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Populate an entry
        await ai_cache.set("api_test_key", {"data": "ok"}, "biz-api-1", "report_brief")

        # 2. GET /api/v1/cache/stats
        stats_resp = await client.get("/api/v1/cache/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["active_entries"] >= 1

        # 3. POST /api/v1/cache/invalidate by business_id
        inv_resp = await client.post("/api/v1/cache/invalidate", json={"business_id": "biz-api-1"})
        assert inv_resp.status_code == 200
        inv_data = inv_resp.json()
        assert inv_data["success"] is True
        assert inv_data["invalidated_count"] >= 1

        # 4. POST /api/v1/cache/clear
        clear_resp = await client.post("/api/v1/cache/clear")
        assert clear_resp.status_code == 200
        assert clear_resp.json()["success"] is True

