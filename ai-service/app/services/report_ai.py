import logging
from typing import Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_mistralai import ChatMistralAI
from pydantic import BaseModel, Field

from app.config.exceptions import AIServiceException
from app.config.settings import settings
from app.services.cache import (
    PROMPT_VERSION_REPORT,
    ai_cache,
    compute_data_fingerprint,
    generate_cache_key,
)

logger = logging.getLogger(__name__)


class KeyChange(BaseModel):
    theme: str = Field(description="Name of the theme or metric that changed")
    change_type: str = Field(default="shifted", description="Direction: 'new', 'increasing', 'decreasing', or 'shifted'")
    description: str = Field(description="Clear explanation of the change and what drove it")


class StrengthItem(BaseModel):
    theme: str = Field(description="Name of the strength theme")
    description: str = Field(description="Context on why customers praise this area")
    evidence_quote: Optional[str] = Field(default=None, description="Direct customer excerpt from evidence snippets")


class AreaToImproveItem(BaseModel):
    theme: str = Field(description="Name of the friction or complaint theme")
    description: str = Field(description="Context on what customers complained about")
    evidence_quote: Optional[str] = Field(default=None, description="Direct customer excerpt from evidence snippets")


class RecommendationItem(BaseModel):
    title: str = Field(description="Concise recommendation title")
    action: str = Field(description="Specific actionable operational or service step")
    priority: str = Field(default="Medium", description="'High', 'Medium', or 'Low'")
    related_theme: str = Field(description="The theme or operational area this addresses")
    rationale: str = Field(description="Brief explanation of why this should be prioritized based on feedback")


class ReportAIBriefOutput(BaseModel):
    summary: str = Field(description="Professional executive summary (2-3 paragraphs) analyzing customer sentiment, rating shifts, and top drivers")
    key_changes: list[KeyChange] = Field(default_factory=list, description="2-3 key changes in customer perception or complaints")
    strengths: list[StrengthItem] = Field(default_factory=list, description="Key customer praised strengths")
    areas_to_improve: list[AreaToImproveItem] = Field(default_factory=list, description="Priority areas needing operational improvement")
    recommendations: list[RecommendationItem] = Field(default_factory=list, description="3-5 actionable recommendations with priorities")
    sentiment_observation: Optional[str] = Field(default=None, description="Analytical observation on customer sentiment distribution and rating movement")
    cached: bool = Field(default=False, description="Whether this response was served from the AI cache")
    cache_key: Optional[str] = Field(default=None, description="Deterministic cache key for this analysis")


class ReportAIBriefRequest(BaseModel):
    business_name: str
    report_type: str
    period_start: str
    period_end: str
    total_reviews: int
    previous_total_reviews: int
    average_rating: Optional[float] = None
    previous_average_rating: Optional[float] = None
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    top_themes: list[dict] = Field(default_factory=list)
    meaningful_changes: list[dict] = Field(default_factory=list)
    confidence: str = "Medium"
    limitations: list[str] = Field(default_factory=list)
    sample_evidence: list[dict] = Field(default_factory=list)
    business_id: Optional[str] = Field(default=None, description="Business ID for cache isolation and key generation")
    data_version: Optional[str] = Field(default=None, description="Deterministic version hash of underlying data")
    prompt_version: Optional[str] = Field(default=None, description="Prompt version override")
    force_refresh: bool = Field(default=False, description="Bypass cache and force recalculation")
    language: str = Field(default="en", description="Target response language")


def _format_prompt_context(payload: ReportAIBriefRequest) -> dict:
    evidence_lines = []
    for ev in payload.sample_evidence[:10]:
        text = ev.get("content") or ev.get("excerpt") or ev.get("evidence") or ""
        rating = ev.get("rating")
        author = ev.get("author") or "Verified Customer"
        evidence_lines.append(f"- [{author}, {rating} stars]: \"{text.strip()}\"")

    context = {
        "business_name": payload.business_name,
        "report_type": payload.report_type.capitalize(),
        "period": f"{payload.period_start} to {payload.period_end}",
        "kpis": {
            "total_reviews": payload.total_reviews,
            "previous_total_reviews": payload.previous_total_reviews,
            "average_rating": payload.average_rating,
            "previous_average_rating": payload.previous_average_rating,
            "sentiment": payload.sentiment_distribution,
            "confidence": payload.confidence,
            "limitations": payload.limitations,
        },
        "top_themes": payload.top_themes[:7],
        "important_changes": payload.meaningful_changes[:5],
        "evidence_snippets": "\n".join(evidence_lines) if evidence_lines else "No direct evidence snippets provided.",
    }

    return {
        "business_name": payload.business_name,
        "report_type": payload.report_type.capitalize(),
        "period": f"{payload.period_start} to {payload.period_end}",
        "metrics_context": str(context),
    }


def build_report_ai_chain():
    if not settings.MISTRAL_API_KEY:
        raise AIServiceException("MISTRAL_API_KEY is not configured", status_code=503)

    llm = ChatMistralAI(
        model=settings.MISTRAL_MODEL,
        temperature=0,
        mistral_api_key=settings.MISTRAL_API_KEY,
        timeout=90,
        max_retries=3,
    )
    structured_llm = llm.with_structured_output(ReportAIBriefOutput)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are RepScan's Executive Intelligence Analyst. Your role is strictly to write concise, direct, "
            "and high-impact executive insights based strictly on the provided calculated metrics and review evidence.\n\n"
            "CRITICAL STYLE RULES:\n"
            "1. NO FLUFF, NO AI SLOP, NO RUN-ON WALLS OF TEXT. Keep the 'summary' strictly under 50-70 words (2 to 3 concise, direct sentences).\n"
            "2. DO NOT clutter text with heavy markdown bolding on every date, number, or phrase.\n"
            "3. State the core customer sentiment trajectory, the single most praised driver, and the primary friction/complaint directly.\n"
            "4. NEVER invent or hallucinate any numbers, statistics, ratings, or facts.\n"
            "5. Keep recommendations crisp: 1-sentence action, 1-sentence rationale.\n"
            "6. Return structured JSON matching the output schema.",
        ),
        (
            "user",
            "Synthesize a concise executive intelligence brief for:\n"
            "Business: {business_name}\n"
            "Report Type: {report_type}\n"
            "Reporting Window: {period}\n\n"
            "Calculated Metrics & Evidence Context:\n{metrics_context}",
        ),
    ])

    return RunnableLambda(_format_prompt_context) | prompt | structured_llm


async def generate_report_ai_brief(payload: ReportAIBriefRequest) -> ReportAIBriefOutput:
    """
    Synthesize executive explanations, key changes, strengths, areas to improve,
    and actionable recommendations using Mistral, guarded by the centralized AI cache.
    """
    biz_id = payload.business_id or payload.business_name.lower().replace(" ", "-")
    data_ver = payload.data_version or compute_data_fingerprint({
        "total_reviews": payload.total_reviews,
        "previous_total_reviews": payload.previous_total_reviews,
        "average_rating": payload.average_rating,
        "previous_average_rating": payload.previous_average_rating,
        "sentiment": payload.sentiment_distribution,
        "sample_evidence": payload.sample_evidence[:10],
        "top_themes": payload.top_themes[:7],
    })

    key = generate_cache_key(
        business_id=biz_id,
        analysis_type="report_brief",
        date_range={"start": payload.period_start, "end": payload.period_end},
        data_version=data_ver,
        prompt_version=payload.prompt_version or PROMPT_VERSION_REPORT,
        model=settings.MISTRAL_MODEL,
        language=payload.language,
        relevant_filters={"report_type": payload.report_type},
    )

    async def _compute() -> ReportAIBriefOutput:
        try:
            chain = build_report_ai_chain()
            result: ReportAIBriefOutput = await chain.ainvoke(payload)

            if not result.summary or not result.summary.strip():
                raise AIServiceException("Mistral brief generation returned empty summary", status_code=502)

            return result
        except AIServiceException:
            raise
        except Exception as exc:
            logger.error(f"Report AI brief generation failed: {exc}", exc_info=True)
            raise AIServiceException(f"AI brief generation failed: {str(exc)}", status_code=502) from exc

    def _validate(res: ReportAIBriefOutput) -> bool:
        return bool(res and res.summary and res.summary.strip())

    cached_res, was_hit = await ai_cache.get_or_compute(
        key=key,
        compute_func=_compute,
        validator=_validate,
        business_id=biz_id,
        analysis_type="report_brief",
        metadata={
            "business_name": payload.business_name,
            "report_type": payload.report_type,
            "period": f"{payload.period_start} to {payload.period_end}",
            "total_reviews": payload.total_reviews,
        },
        bypass_cache=payload.force_refresh,
    )

    return cached_res.model_copy(update={"cached": was_hit, "cache_key": key})


async def get_what_changed_explanations(payload: ReportAIBriefRequest) -> list[KeyChange]:
    """Retrieve grounded What Changed explanations reusing the centralized AI cache."""
    brief = await generate_report_ai_brief(payload)
    return brief.key_changes


async def get_theme_summaries(payload: ReportAIBriefRequest) -> dict[str, Any]:
    """Retrieve theme praise and complaint summaries reusing the centralized AI cache."""
    brief = await generate_report_ai_brief(payload)
    return {
        "strengths": brief.strengths,
        "areas_to_improve": brief.areas_to_improve,
        "cached": brief.cached,
        "cache_key": brief.cache_key,
    }


async def get_recommendations(payload: ReportAIBriefRequest) -> list[RecommendationItem]:
    """Retrieve actionable recommendations reusing the centralized AI cache."""
    brief = await generate_report_ai_brief(payload)
    return brief.recommendations


async def get_dashboard_insights(payload: ReportAIBriefRequest) -> dict[str, Any]:
    """Retrieve executive dashboard insights reusing the centralized AI cache."""
    brief = await generate_report_ai_brief(payload)
    return {
        "summary": brief.summary,
        "sentiment_observation": brief.sentiment_observation,
        "key_changes": brief.key_changes,
        "cached": brief.cached,
        "cache_key": brief.cache_key,
    }

