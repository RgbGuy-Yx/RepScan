import logging
from typing import Any, Dict
from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.services.report_ai import (
    ReportAIBriefRequest,
    ReportAIBriefOutput,
    generate_report_ai_brief,
    get_what_changed_explanations,
    get_theme_summaries,
    get_recommendations,
    get_dashboard_insights,
)
from app.services.report_pdf import generate_report_html_and_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


class RenderReportPdfRequest(BaseModel):
    report_data: Dict[str, Any]


@router.post("/ai-brief", response_model=ReportAIBriefOutput)
async def generate_ai_brief_endpoint(payload: ReportAIBriefRequest) -> ReportAIBriefOutput:
    """
    Synthesize executive explanations, key changes, strengths, areas to improve,
    and actionable recommendations using Mistral strictly grounded on calculated metrics, guarded by AI cache.
    """
    return await generate_report_ai_brief(payload)


@router.post("/what-changed")
async def get_what_changed_endpoint(payload: ReportAIBriefRequest):
    """Retrieve grounded What Changed explanations reusing the centralized AI cache."""
    return await get_what_changed_explanations(payload)


@router.post("/theme-summaries")
async def get_theme_summaries_endpoint(payload: ReportAIBriefRequest):
    """Retrieve theme praise and complaint summaries reusing the centralized AI cache."""
    return await get_theme_summaries(payload)


@router.post("/recommendations")
async def get_recommendations_endpoint(payload: ReportAIBriefRequest):
    """Retrieve actionable recommendations reusing the centralized AI cache."""
    return await get_recommendations(payload)


@router.post("/dashboard-insights")
async def get_dashboard_insights_endpoint(payload: ReportAIBriefRequest):
    """Retrieve executive dashboard insights reusing the centralized AI cache."""
    return await get_dashboard_insights(payload)



@router.post("/render-pdf")
async def render_report_pdf_endpoint(payload: RenderReportPdfRequest):
    """
    Compiles deterministic Matplotlib charts, Jinja2 executive template,
    and generates the PDF binary using WeasyPrint.
    """
    _, pdf_bytes = generate_report_html_and_pdf(payload.report_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="repscan-intelligence-report.pdf"'
        },
    )
