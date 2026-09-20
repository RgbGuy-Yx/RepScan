from fastapi import APIRouter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_mistralai import ChatMistralAI
from pydantic import BaseModel, Field

from app.config.exceptions import AIServiceException
from app.config.settings import settings

router = APIRouter(prefix="/briefs", tags=["Briefs"])


class ThemeHighlight(BaseModel):
    theme: str
    count: int
    sentiment: str
    evidence_snippets: list[str] = []


class MeaningfulChangeSummary(BaseModel):
    theme: str
    change_type: str
    metric: str
    current_value: float | int
    previous_value: float | int
    delta: float | int
    evidence_raw_item_ids: list[str] = []


class GenerateBriefSummaryRequest(BaseModel):
    business_name: str
    period_start: str
    period_end: str
    total_reviews: int
    previous_total_reviews: int
    average_rating: float | None = None
    previous_average_rating: float | None = None
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    top_praises: list[ThemeHighlight] = Field(default_factory=list)
    top_complaints: list[ThemeHighlight] = Field(default_factory=list)
    meaningful_changes: list[MeaningfulChangeSummary] = Field(default_factory=list)
    confidence: str
    limitations: list[str] = Field(default_factory=list)
    sample_reviews: list[str] = Field(default_factory=list)


class GroundedThemeItem(BaseModel):
    theme: str = Field(description="Theme name")
    summary: str = Field(description="One-sentence grounded summary of customer mentions for this theme")
    evidence_quote: str | None = Field(default=None, description="Exact excerpt or snippet from customer review supporting this theme")


class BriefSummaryOutput(BaseModel):
    summary_text: str = Field(description="Clear, professional 2-3 paragraph weekly executive summary explaining review volume, rating shifts, sentiment movements, and top drivers")
    top_complaints: list[GroundedThemeItem] = Field(default_factory=list, description="Structured summary of top customer complaints grounded in provided evidence")
    top_praises: list[GroundedThemeItem] = Field(default_factory=list, description="Structured summary of top positive customer praises grounded in provided evidence")


class GenerateBriefSummaryResponse(BaseModel):
    summary_text: str
    top_complaints: list[GroundedThemeItem] = Field(default_factory=list)
    top_praises: list[GroundedThemeItem] = Field(default_factory=list)
    model: str | None = None


def _format_brief_input(payload: GenerateBriefSummaryRequest) -> dict:
    """Formats the incoming request into structured context for the prompt."""
    metrics_context = {
        "total_reviews": payload.total_reviews,
        "previous_total_reviews": payload.previous_total_reviews,
        "average_rating": payload.average_rating,
        "previous_average_rating": payload.previous_average_rating,
        "sentiment_distribution": payload.sentiment_distribution,
        "top_praises": [p.model_dump() for p in payload.top_praises],
        "top_complaints": [c.model_dump() for c in payload.top_complaints],
        "meaningful_changes": [ch.model_dump() for ch in payload.meaningful_changes],
        "confidence": payload.confidence,
        "limitations": payload.limitations,
        "sample_reviews": payload.sample_reviews[:10],
    }

    return {
        "business_name": payload.business_name,
        "period_start": payload.period_start,
        "period_end": payload.period_end,
        "metrics_context": str(metrics_context),
    }


def _build_brief_runnable():
    """Builds a declarative LCEL Runnable pipeline using RunnableLambda."""
    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("MISTRAL_API_KEY must be configured", status_code=503)

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        temperature=0,
        mistral_api_key=settings.MISTRAL_API_KEY,
        timeout=90,
    )
    structured_llm = llm.with_structured_output(BriefSummaryOutput)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an AI business intelligence analyst. Your role is strictly to explain the provided calculated metrics "
            "and customer feedback. CRITICAL RULES:\n"
            "1. NEVER invent, hallucinate, or alter any numbers, statistics, ratings, counts, or dates.\n"
            "2. All claims in your summary MUST be strictly grounded in the provided metrics, changes, and sample reviews.\n"
            "3. Explicitly state the data confidence level and any active limitation notes if present.\n"
            "4. Return structured JSON matching the output schema.",
        ),
        (
            "user",
            "Generate a grounded weekly intelligence brief based strictly on these calculated metrics:\n"
            "Business: {business_name}\n"
            "Period: {period_start} to {period_end}\n"
            "Metrics & Evidence Context:\n{metrics_context}",
        ),
    ])

    return RunnableLambda(_format_brief_input) | prompt | structured_llm


@router.post("/summarize", response_model=GenerateBriefSummaryResponse)
async def summarize_weekly_brief(payload: GenerateBriefSummaryRequest) -> GenerateBriefSummaryResponse:
    """Generate a strictly grounded weekly brief summary using LangChain Runnable pipeline."""
    try:
        pipeline = _build_brief_runnable()
        result: BriefSummaryOutput = await pipeline.ainvoke(payload)

        if not result.summary_text or not result.summary_text.strip():
            raise AIServiceException("Mistral response missing valid 'summary_text'", status_code=502)

        return GenerateBriefSummaryResponse(
            summary_text=result.summary_text.strip(),
            top_complaints=result.top_complaints,
            top_praises=result.top_praises,
            model=settings.MISTRAL_MODEL,
        )
    except AIServiceException:
        raise
    except Exception as error:
        raise AIServiceException(f"Mistral brief generation failed: {str(error)}", status_code=502) from error
