import asyncio
import logging
from typing import Any, Literal

from fastapi import APIRouter
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI
from langchain_voyageai import VoyageAIEmbeddings
from pydantic import BaseModel, Field

from app.config.exceptions import AIServiceException
from app.config.settings import settings
from app.services.chroma import chroma_service
from app.services.sarvam import SarvamReviewResult, sarvam_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback"])


class FeedbackInput(BaseModel):
    id: str
    business_id: str
    platform: str
    content: str = Field(min_length=1)
    rating: float | None = None
    published_at: str | None = None
    source_url: str | None = None


class MistralFeedbackAnalysis(BaseModel):
    """Mistral focus: sentiment, polarity score, recurring themes, and exact quote evidence."""
    sentiment_label: Literal["positive", "neutral", "negative"] = Field(description="Overall customer sentiment")
    sentiment_score: float | None = Field(default=None, ge=-1, le=1, description="Sentiment polarity score from -1.0 (very negative) to 1.0 (very positive)")
    themes: list[str] = Field(default_factory=list, max_length=5, description="Up to 5 short recurring theme tags")
    evidence: list[str] = Field(default_factory=list, max_length=3, description="Up to 3 exact short excerpts from the review as evidence")


class ProcessedFeedback(BaseModel):
    raw_item_id: str
    language: str
    script: str | None = None
    translated_content: str | None = None
    sentiment_label: Literal["positive", "neutral", "negative"]
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    themes: list[str] = []
    evidence: list[str] = []
    model: str | None = None
    sarvam_metadata: dict[str, Any] | None = None


class ProcessFeedbackRequest(BaseModel):
    items: list[FeedbackInput] = Field(min_length=1, max_length=100)


class ProcessFeedbackResponse(BaseModel):
    items: list[ProcessedFeedback]


def _build_mistral_analysis_chain():
    """Builds the Mistral structured analysis chain for sentiment, themes, and evidence."""
    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("MISTRAL_API_KEY must be configured", status_code=503)

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        temperature=0,
        mistral_api_key=settings.MISTRAL_API_KEY,
        timeout=90,
        max_retries=3,
    )
    structured_llm = llm.with_structured_output(MistralFeedbackAnalysis)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert customer feedback analyzer. "
            "Analyze the given customer review and determine the sentiment (positive, neutral, negative), "
            "sentiment polarity score (-1.0 to 1.0), key recurring themes, and exact quote evidence. "
            "Preserve exact phrases from the review for evidence; never invent excerpts.",
        ),
        (
            "user",
            "Review Content for Analysis:\n{review_content}\n\n"
            "Original Canonical Text:\n{original_content}",
        ),
    ])

    return prompt | structured_llm


async def _process_single_item(
    item: FeedbackInput,
    mistral_chain: Any,
    embeddings_model: VoyageAIEmbeddings,
) -> dict[str, Any]:
    """Processes a single raw item through Sarvam LID -> Sarvam Translation -> Mistral Analysis -> Voyage Embedding."""
    # Step 1: Sarvam LID and Translation
    sarvam_result: SarvamReviewResult = await sarvam_service.process_review(item.content)

    # Content for Mistral analysis (English translation if available, else original)
    analysis_content = sarvam_result.translated_content or item.content

    # Step 2: Mistral Sentiment and Theme Analysis
    try:
        analysis: MistralFeedbackAnalysis = await mistral_chain.ainvoke({
            "review_content": analysis_content,
            "original_content": item.content,
        })
    except Exception as err:
        logger.error("Mistral analysis failed for item %s: %s", item.id, err)
        raise AIServiceException(
            "The AI service is currently undergoing maintenance. Please try again shortly.",
            status_code=503,
        ) from err

    # Step 3: Voyage Embedding (embed original content or translated content)
    try:
        # Embed translated content if present, else original
        embed_text = sarvam_result.translated_content or item.content
        embedding: list[float] = embeddings_model.embed_query(embed_text)
    except Exception as err:
        logger.error("Voyage embedding failed for item %s: %s", item.id, err)
        raise AIServiceException(f"Voyage embedding failed: {str(err)}", status_code=502) from err

    processed = ProcessedFeedback(
        raw_item_id=item.id,
        language=sarvam_result.language,
        script=sarvam_result.script,
        translated_content=sarvam_result.translated_content,
        sentiment_label=analysis.sentiment_label,
        sentiment_score=analysis.sentiment_score,
        themes=analysis.themes,
        evidence=analysis.evidence,
        model=f"sarvam+{settings.MISTRAL_MODEL}",
        sarvam_metadata=sarvam_result.sarvam_metadata,
    )

    metadata = {
        "business_id": item.business_id,
        "raw_item_id": item.id,
        "platform": item.platform,
        "date": item.published_at or "",
        "rating": item.rating if item.rating is not None else -1,
        "language": sarvam_result.language,
        "script": sarvam_result.script or "",
        "sentiment": analysis.sentiment_label,
        "themes": ", ".join(analysis.themes),
        "source_url": item.source_url or "",
        "translated": bool(sarvam_result.translated_content),
    }

    return {
        "processed": processed,
        "id": item.id,
        "document": item.content,
        "embedding": embedding,
        "metadata": metadata,
    }


@router.post("/process", response_model=ProcessFeedbackResponse)
async def process_feedback(payload: ProcessFeedbackRequest) -> ProcessFeedbackResponse:
    """Analyze new feedback using Sarvam AI (LID & Translation), Mistral (Analysis), and Voyage (Embeddings)."""
    if not settings.VOYAGE_API_KEY:
        raise AIServiceException("VOYAGE_API_KEY must be configured", status_code=503)

    try:
        mistral_chain = _build_mistral_analysis_chain()
        embeddings_model = VoyageAIEmbeddings(
            model=settings.VOYAGE_MODEL,
            voyage_api_key=settings.VOYAGE_API_KEY,
        )

        # Process items with bounded concurrency to protect external APIs from rate limits
        semaphore = asyncio.Semaphore(10)

        async def _bounded_process(item: FeedbackInput):
            async with semaphore:
                return await _process_single_item(item, mistral_chain, embeddings_model)

        tasks = [_bounded_process(item) for item in payload.items]
        results = await asyncio.gather(*tasks)

    except AIServiceException:
        raise
    except Exception as error:
        raise AIServiceException(f"Feedback processing pipeline failed: {str(error)}", status_code=502) from error

    processed_items: list[ProcessedFeedback] = []
    documents: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict[str, Any]] = []
    ids: list[str] = []

    for res in results:
        processed_items.append(res["processed"])
        ids.append(res["id"])
        documents.append(res["document"])
        embeddings.append(res["embedding"])
        metadatas.append(res["metadata"])

    # Batch upsert into ChromaDB
    chroma_service.add_documents(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return ProcessFeedbackResponse(items=processed_items)
