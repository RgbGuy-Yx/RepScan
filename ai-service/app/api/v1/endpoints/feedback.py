import asyncio
import json
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config.exceptions import AIServiceException
from app.config.settings import settings
from app.services.chroma import chroma_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])


class FeedbackInput(BaseModel):
    id: str
    business_id: str
    platform: str
    content: str = Field(min_length=1)
    rating: float | None = None
    published_at: str | None = None
    source_url: str | None = None


class ProcessedFeedback(BaseModel):
    raw_item_id: str
    language: str
    translated_content: str | None = None
    sentiment_label: Literal["positive", "neutral", "negative"]
    sentiment_score: float | None = Field(default=None, ge=-1, le=1)
    themes: list[str] = []
    evidence: list[str] = []
    model: str | None = None


class ProcessFeedbackRequest(BaseModel):
    items: list[FeedbackInput] = Field(min_length=1, max_length=100)


class ProcessFeedbackResponse(BaseModel):
    items: list[ProcessedFeedback]


def _post_json(url: str, api_key: str, body: dict) -> dict:
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise AIServiceException(f"AI provider returned {error.code}", status_code=502) from error
    except (URLError, TimeoutError) as error:
        raise AIServiceException("AI provider is unavailable", status_code=503) from error


async def _analyze(item: FeedbackInput) -> ProcessedFeedback:
    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("MISTRAL_API_KEY must be configured", status_code=503)
    prompt = (
        "Return JSON only with language (ISO 639-1 or 'mixed'), translated_content (English or null), "
        "sentiment_label (positive, neutral, or negative), sentiment_score (-1 to 1), "
        "themes (up to 5 short strings), and evidence (up to 3 exact short excerpts from the review). "
        "Preserve the review as evidence; do not invent excerpts. Review:\n" + item.content
    )
    response = await asyncio.to_thread(
        _post_json,
        "https://api.mistral.ai/v1/chat/completions",
        settings.MISTRAL_API_KEY,
        {
            "model": settings.MISTRAL_MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You analyze customer feedback and must return the requested JSON object."},
                {"role": "user", "content": prompt},
            ],
        },
    )
    try:
        content = response["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        analysis = json.loads(content)
        return ProcessedFeedback(
            raw_item_id=item.id,
            language=analysis["language"],
            translated_content=analysis.get("translated_content"),
            sentiment_label=analysis["sentiment_label"],
            sentiment_score=analysis.get("sentiment_score"),
            themes=analysis.get("themes", []),
            evidence=analysis.get("evidence", []),
            model=settings.MISTRAL_MODEL,
        )
    except (KeyError, TypeError, ValueError) as error:
        raise AIServiceException("Mistral returned an invalid analysis", status_code=502) from error


async def _embed(documents: list[str]) -> list[list[float]]:
    if not settings.VOYAGE_API_KEY:
        raise AIServiceException("VOYAGE_API_KEY must be configured", status_code=503)
    response = await asyncio.to_thread(
        _post_json,
        "https://api.voyageai.com/v1/embeddings",
        settings.VOYAGE_API_KEY,
        {"input": documents, "model": settings.VOYAGE_MODEL, "input_type": "document"},
    )
    try:
        return [entry["embedding"] for entry in response["data"]]
    except (KeyError, TypeError) as error:
        raise AIServiceException("Voyage returned invalid embeddings", status_code=502) from error


@router.post("/process", response_model=ProcessFeedbackResponse)
async def process_feedback(payload: ProcessFeedbackRequest) -> ProcessFeedbackResponse:
    """Analyze new feedback and index its original text with Voyage embeddings."""
    processed = [await _analyze(item) for item in payload.items]
    embeddings = await _embed([item.content for item in payload.items])
    if len(embeddings) != len(payload.items):
        raise AIServiceException("Voyage returned an incomplete embedding batch", status_code=502)

    chroma_service.add_documents(
        ids=[item.id for item in payload.items],
        documents=[item.content for item in payload.items],
        embeddings=embeddings,
        metadatas=[
            {
                "business_id": item.business_id,
                "raw_item_id": item.id,
                "platform": item.platform,
                "date": item.published_at or "",
                "rating": item.rating if item.rating is not None else -1,
                "language": result.language,
                "sentiment": result.sentiment_label,
                "themes": ", ".join(result.themes),
                "source_url": item.source_url or "",
            }
            for item, result in zip(payload.items, processed, strict=True)
        ],
    )
    return ProcessFeedbackResponse(items=processed)
