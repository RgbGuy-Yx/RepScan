import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.config.settings import settings
from app.api.v1.endpoints.feedback import (
    FeedbackInput,
    MistralFeedbackAnalysis,
    ProcessFeedbackRequest,
    _process_single_item,
)
from app.services.sarvam import (
    SarvamLIDResult,
    SarvamReviewResult,
    SarvamService,
    SarvamTranslationResult,
    is_code_mixed_content,
    is_english_language,
)


# ── Language Detection & Helper Tests ──────────────────────────────
def test_is_english_language():
    assert is_english_language("en") is True
    assert is_english_language("en-IN") is True
    assert is_english_language("en-US") is True
    assert is_english_language("English") is True
    assert is_english_language("hi-IN") is False
    assert is_english_language("te-IN") is False


def test_is_code_mixed_content():
    # Hindi or Telugu in Latin script (Hinglish/Tenglish)
    assert is_code_mixed_content("hi-IN", "Latn") is True
    assert is_code_mixed_content("te-IN", "Latn") is True
    assert is_code_mixed_content("hi", "Latn") is True
    # Hindi in Devanagari script is not code-mixed
    assert is_code_mixed_content("hi-IN", "Deva") is False
    # English in Latin script is standard English
    assert is_code_mixed_content("en-IN", "Latn") is False


# ── SarvamService Unit Tests with Mocked HTTP ──────────────────────
@pytest.mark.asyncio
async def test_sarvam_english_review_skips_translation():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "detect_language", new_callable=AsyncMock) as mock_lid:
        mock_lid.return_value = SarvamLIDResult(
            language_code="en-IN",
            script_code="Latn",
            confidence=0.98,
            raw_response={"language_code": "en-IN", "script_code": "Latn"},
        )

        with patch.object(service, "translate_to_english", new_callable=AsyncMock) as mock_trans:
            result: SarvamReviewResult = await service.process_review("Great experience and friendly staff!")

            assert result.language == "en-IN"
            assert result.script == "Latn"
            assert result.translated_content is None
            assert result.is_translated is False
            # Ensure translate_to_english was NOT called for English review
            mock_trans.assert_not_called()


@pytest.mark.asyncio
async def test_sarvam_hindi_translation():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "detect_language", new_callable=AsyncMock) as mock_lid:
        mock_lid.return_value = SarvamLIDResult(
            language_code="hi-IN",
            script_code="Deva",
            confidence=0.99,
            raw_response={"language_code": "hi-IN", "script_code": "Deva"},
        )

        with patch.object(service, "translate_to_english", new_callable=AsyncMock) as mock_trans:
            mock_trans.return_value = SarvamTranslationResult(
                translated_text="The food was very delicious and service was fast.",
                source_language_code="hi-IN",
                target_language_code="en-IN",
                mode="formal",
                raw_response={"translated_text": "The food was very delicious and service was fast."},
            )

            result: SarvamReviewResult = await service.process_review("खाना बहुत स्वादिष्ट था और सेवा तेज थी।")

            assert result.language == "hi-IN"
            assert result.script == "Deva"
            assert result.translated_content == "The food was very delicious and service was fast."
            assert result.is_translated is True
            assert result.is_code_mixed is False
            mock_trans.assert_called_once()


@pytest.mark.asyncio
async def test_sarvam_telugu_translation():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "detect_language", new_callable=AsyncMock) as mock_lid:
        mock_lid.return_value = SarvamLIDResult(
            language_code="te-IN",
            script_code="Telu",
            confidence=0.97,
            raw_response={"language_code": "te-IN", "script_code": "Telu"},
        )

        with patch.object(service, "translate_to_english", new_callable=AsyncMock) as mock_trans:
            mock_trans.return_value = SarvamTranslationResult(
                translated_text="Quality is very good, I liked it a lot.",
                source_language_code="te-IN",
                target_language_code="en-IN",
                mode="formal",
                raw_response={"translated_text": "Quality is very good, I liked it a lot."},
            )

            result: SarvamReviewResult = await service.process_review("నాణ్యత చాలా బాగుంది, నాకు చాలా నచ్చింది.")

            assert result.language == "te-IN"
            assert result.script == "Telu"
            assert result.translated_content == "Quality is very good, I liked it a lot."
            assert result.is_translated is True
            mock_trans.assert_called_once()


@pytest.mark.asyncio
async def test_sarvam_hinglish_code_mixed_translation():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "detect_language", new_callable=AsyncMock) as mock_lid:
        # Hinglish detected as Hindi in Latin script
        mock_lid.return_value = SarvamLIDResult(
            language_code="hi-IN",
            script_code="Latn",
            confidence=0.92,
            raw_response={"language_code": "hi-IN", "script_code": "Latn"},
        )

        with patch.object(service, "translate_to_english", new_callable=AsyncMock) as mock_trans:
            mock_trans.return_value = SarvamTranslationResult(
                translated_text="The ambience is very good but prices are quite high.",
                source_language_code="hi-IN",
                target_language_code="en-IN",
                mode="code-mixed",
                raw_response={"translated_text": "The ambience is very good but prices are quite high."},
            )

            result: SarvamReviewResult = await service.process_review("Ambience bohot achha tha lekin prices kafi high hai.")

            assert result.language == "hi-IN"
            assert result.script == "Latn"
            assert result.is_code_mixed is True
            assert result.translated_content == "The ambience is very good but prices are quite high."
            assert result.is_translated is True


@pytest.mark.asyncio
async def test_sarvam_translation_failure_preserves_original_text():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "detect_language", new_callable=AsyncMock) as mock_lid:
        mock_lid.return_value = SarvamLIDResult(
            language_code="hi-IN",
            script_code="Deva",
            confidence=0.95,
            raw_response={"language_code": "hi-IN"},
        )

        with patch.object(service, "translate_to_english", new_callable=AsyncMock) as mock_trans:
            mock_trans.return_value = SarvamTranslationResult(
                translated_text=None,
                source_language_code="hi-IN",
                error="Rate limit exceeded (429)",
            )

            result: SarvamReviewResult = await service.process_review("खाना अच्छा था।")

            assert result.language == "hi-IN"
            assert result.translated_content is None
            assert result.is_translated is False
            assert result.error == "Rate limit exceeded (429)"


@pytest.mark.asyncio
async def test_sarvam_api_lid_failure_fallback():
    service = SarvamService(api_key="mock-sarvam-key")

    with patch.object(service, "_post_with_retry", side_effect=Exception("Connection timeout")):
        lid = await service.detect_language("Some ambiguous feedback")

        # Graceful fallback to default en-IN rather than crashing
        assert lid.language_code == "en-IN"
        assert lid.script_code == "Latn"


# ── Full Feedback Processing Endpoint Integration Tests ───────────
@pytest.mark.asyncio
async def test_process_feedback_pipeline_end_to_end():
    from langchain_core.runnables import RunnableLambda

    app = create_app()

    mock_mistral_analysis = MistralFeedbackAnalysis(
        sentiment_label="positive",
        sentiment_score=0.9,
        themes=["Food Quality", "Service"],
        evidence=["खाना बहुत स्वादिष्ट था"],
    )

    with (
        patch("app.services.sarvam.sarvam_service.process_review") as mock_sarvam_proc,
        patch("app.api.v1.endpoints.feedback.ChatMistralAI") as mock_mistral_cls,
        patch("app.api.v1.endpoints.feedback.VoyageAIEmbeddings") as mock_voyage_cls,
        patch("app.services.chroma.chroma_service.add_documents") as mock_chroma_add,
    ):
        mock_sarvam_proc.return_value = SarvamReviewResult(
            language="hi-IN",
            script="Deva",
            translated_content="The food was very delicious and service was fast.",
            is_translated=True,
            is_code_mixed=False,
            confidence=0.99,
            sarvam_metadata={"lid": {"language_code": "hi-IN"}},
        )

        mock_mistral_instance = MagicMock()
        mock_mistral_instance.with_structured_output.return_value = RunnableLambda(lambda _: mock_mistral_analysis)
        mock_mistral_cls.return_value = mock_mistral_instance

        mock_voyage_instance = MagicMock()
        mock_voyage_instance.embed_query.return_value = [0.1, 0.2, 0.3]
        mock_voyage_cls.return_value = mock_voyage_instance

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "items": [
                    {
                        "id": "item-hindi-1",
                        "business_id": "biz-123",
                        "platform": "google",
                        "content": "खाना बहुत स्वादिष्ट था और सेवा तेज थी।",
                        "rating": 5.0,
                        "published_at": "2026-09-18T10:00:00Z",
                        "source_url": "https://maps.google.com/review1",
                    }
                ]
            }

            with (
                patch("app.config.settings.settings.MISTRAL_API_KEY", "mock-key"),
                patch("app.config.settings.settings.VOYAGE_API_KEY", "mock-key"),
                patch("app.config.settings.settings.SARVAM_API_KEY", "mock-key"),
            ):
                response = await client.post("/api/v1/feedback/process", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert len(data["items"]) == 1

            item = data["items"][0]
            assert item["raw_item_id"] == "item-hindi-1"
            assert item["language"] == "hi-IN"
            assert item["script"] == "Deva"
            assert item["translated_content"] == "The food was very delicious and service was fast."
            assert item["sentiment_label"] == "positive"
            assert item["sentiment_score"] == 0.9
            assert item["themes"] == ["Food Quality", "Service"]
            assert item["model"] == f"sarvam+{settings.MISTRAL_MODEL}"

            # Verify ChromaDB add_documents was called with correct metadata
            mock_chroma_add.assert_called_once()
            call_kwargs = mock_chroma_add.call_args.kwargs
            assert call_kwargs["ids"] == ["item-hindi-1"]
            assert call_kwargs["documents"] == ["खाना बहुत स्वादिष्ट था और सेवा तेज थी।"]  # Canonical original content preserved
            assert call_kwargs["metadatas"][0]["language"] == "hi-IN"
            assert call_kwargs["metadatas"][0]["script"] == "Deva"
            assert call_kwargs["metadatas"][0]["translated"] is True


# ── LangChain Tool & Runnable Tests ────────────────────────────────
@pytest.mark.asyncio
async def test_sarvam_langchain_tools():
    from app.services.sarvam import detect_language_tool, translate_review_tool, sarvam_process_review_runnable

    with patch("app.services.sarvam.sarvam_service.detect_language", new_callable=AsyncMock) as mock_lid:
        mock_lid.return_value = SarvamLIDResult(
            language_code="hi-IN",
            script_code="Deva",
            confidence=0.99,
        )

        res = await detect_language_tool.ainvoke({"text": "खाना बहुत अच्छा था"})
        assert res["language_code"] == "hi-IN"
        assert res["script_code"] == "Deva"

    with patch("app.services.sarvam.sarvam_service.translate_to_english", new_callable=AsyncMock) as mock_trans:
        mock_trans.return_value = SarvamTranslationResult(
            translated_text="The food was very good",
            source_language_code="hi-IN",
        )

        trans_res = await translate_review_tool.ainvoke({
            "text": "खाना बहुत अच्छा था",
            "source_language_code": "hi-IN",
        })
        assert trans_res == "The food was very good"

    with patch("app.services.sarvam.sarvam_service.process_review", new_callable=AsyncMock) as mock_proc:
        mock_proc.return_value = SarvamReviewResult(
            language="en-IN",
            script="Latn",
            translated_content=None,
            is_translated=False,
        )

        runnable_res = await sarvam_process_review_runnable.ainvoke("Great staff and prompt service!")
        assert runnable_res.language == "en-IN"
        assert runnable_res.is_translated is False

