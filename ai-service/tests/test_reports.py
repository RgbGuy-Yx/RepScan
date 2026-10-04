import pytest
from app.services.report_ai import ReportAIBriefOutput, KeyChange, StrengthItem, AreaToImproveItem, RecommendationItem
from app.services.report_charts import (
    generate_themes_bar_chart,
    generate_sentiment_donut_chart,
    generate_trend_chart,
)
from app.services.report_pdf import generate_report_html_and_pdf


def test_report_ai_brief_output_schema():
    data = {
        "summary": "Customer sentiment is strong across all metrics.",
        "key_changes": [
            {"theme": "Doctor Consultation", "change_type": "increasing", "description": "Praise increased."}
        ],
        "strengths": [
            {"theme": "Doctor Consultation", "description": "Professional care", "evidence_quote": "Great doctor"}
        ],
        "areas_to_improve": [],
        "recommendations": [
            {
                "title": "Sustain Clinical Excellence",
                "action": "Continue team training",
                "priority": "High",
                "related_theme": "Doctor Consultation",
                "rationale": "Key competitive differentiator",
            }
        ],
        "sentiment_observation": "90% of reviews are positive.",
    }

    output = ReportAIBriefOutput(**data)
    assert output.summary.startswith("Customer sentiment")
    assert len(output.key_changes) == 1
    assert len(output.recommendations) == 1
    assert output.recommendations[0].priority == "High"


def test_report_charts_generation():
    themes = [
        {"theme": "Staff Friendliness", "count": 25, "positiveCount": 20, "neutralCount": 3, "negativeCount": 2},
        {"theme": "Wait Time", "count": 12, "positiveCount": 4, "neutralCount": 2, "negativeCount": 6},
    ]
    bar_chart = generate_themes_bar_chart(themes)
    assert bar_chart is not None
    assert bar_chart.startswith("data:image/png;base64,")

    sentiment = {"positive": 30, "neutral": 5, "negative": 3, "total": 38}
    donut_chart = generate_sentiment_donut_chart(sentiment)
    assert donut_chart is not None
    assert donut_chart.startswith("data:image/png;base64,")

    trends = [
        {"label": "Week 1", "count": 10, "average_rating": 4.5},
        {"label": "Week 2", "count": 15, "average_rating": 4.8},
    ]
    trend_chart = generate_trend_chart(trends)
    assert trend_chart is not None
    assert trend_chart.startswith("data:image/png;base64,")


def test_generate_report_html_and_pdf():
    sample_report = {
        "title": "Unit Test Report",
        "business_name": "Test Clinic",
        "report_type": "weekly",
        "period_start": "Sep 20, 2026",
        "period_end": "Sep 27, 2026",
        "generated_date": "Oct 3, 2026",
        "confidence": "High",
        "confidence_score": 0.95,
        "limitations": [],
        "kpis": {
            "total_reviews": 25,
            "previous_total_reviews": 20,
            "reviews_delta": 5,
            "average_rating": 4.7,
            "previous_average_rating": 4.4,
            "rating_delta": 0.3,
            "total_rated": 25,
        },
        "sentiment": {
            "positive": 22,
            "neutral": 2,
            "negative": 1,
            "total": 25,
            "averageScore": 0.85,
        },
        "ai_summary": "Test clinic showed exemplary performance with strong positive feedback.",
        "ai_sentiment_observation": "Positive sentiment dominated the reporting cycle.",
        "key_changes": [
            {"theme": "Service Quality", "change_type": "increasing", "description": "High praise"}
        ],
        "strengths": [
            {"theme": "Service Quality", "description": "Attentive staff"}
        ],
        "areas_to_improve": [],
        "recommendations": [
            {
                "title": "Maintain High Service Standards",
                "action": "Reward customer-facing personnel",
                "priority": "High",
                "related_theme": "Service Quality",
                "rationale": "Drives retention",
            }
        ],
        "themes": [
            {"theme": "Service Quality", "count": 18, "prevalence": 72, "positiveCount": 17, "neutralCount": 1, "negativeCount": 0, "averageRating": 4.9}
        ],
        "meaningful_changes": [],
        "evidence": [
            {"author": "Jane Doe", "rating": 5, "platform": "google", "published_at_str": "Sep 24, 2026", "content": "Exceptional service!"}
        ],
        "trends": [
            {"label": "Sep 21", "count": 8, "average_rating": 4.6},
            {"label": "Sep 25", "count": 17, "average_rating": 4.8},
        ],
    }

    html, pdf_bytes = generate_report_html_and_pdf(sample_report)
    assert "<!DOCTYPE html>" in html
    assert "Unit Test Report" in html
    assert "Test Clinic" in html
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")
