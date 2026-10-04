import os
import sys
import subprocess
import tempfile
import logging
from typing import Any, Dict
from jinja2 import Environment, FileSystemLoader

from app.config.exceptions import AIServiceException
from app.services.report_charts import (
    generate_themes_bar_chart,
    generate_sentiment_donut_chart,
    generate_trend_chart,
)

logger = logging.getLogger(__name__)

# Register DLL directory for WeasyPrint on Windows
DLL_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "bin",
        "weasyprint",
        "onedir",
        "weasyprint",
        "_internal",
    )
)
WEASYPRINT_EXE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "bin",
        "weasyprint",
        "onedir",
        "weasyprint",
        "weasyprint.exe",
    )
)

if os.path.exists(DLL_DIR):
    try:
        os.add_dll_directory(DLL_DIR)
        os.environ["PATH"] = DLL_DIR + os.pathsep + os.environ.get("PATH", "")
    except Exception as e:
        logger.warning(f"Could not add DLL directory {DLL_DIR}: {e}")

_WEASYPRINT_AVAILABLE = False
try:
    import weasyprint
    _WEASYPRINT_AVAILABLE = True
except Exception as e:
    logger.warning(f"Native weasyprint import failed: {e}. Will use standalone binary if available.")


TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


def _render_pdf_with_executable(html_content: str) -> bytes:
    """Fallback to running the portable weasyprint.exe binary."""
    if not os.path.exists(WEASYPRINT_EXE):
        raise AIServiceException(
            f"WeasyPrint binary not found at {WEASYPRINT_EXE}", status_code=500
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        html_path = os.path.join(tmpdir, "report.html")
        pdf_path = os.path.join(tmpdir, "report.pdf")

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        cmd = [WEASYPRINT_EXE, html_path, pdf_path]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            logger.error(f"WeasyPrint process error: {proc.stderr}")
            raise AIServiceException(f"PDF generation failed: {proc.stderr}", status_code=500)

        with open(pdf_path, "rb") as f:
            return f.read()


def generate_report_html_and_pdf(report_data: Dict[str, Any]) -> tuple[str, bytes]:
    """
    Renders deterministic Matplotlib charts, Jinja2 template, and compiles PDF via WeasyPrint.
    """
    try:
        # 1. Compute Sentiment percentages
        sentiment = report_data.get("sentiment", {})
        total_sentiment = sentiment.get("total", 0) or 1
        pos = sentiment.get("positive", 0)
        neu = sentiment.get("neutral", 0)
        neg = sentiment.get("negative", 0)

        sentiment_with_pct = {
            **sentiment,
            "positive_pct": round(pos / total_sentiment * 100),
            "neutral_pct": round(neu / total_sentiment * 100),
            "negative_pct": round(neg / total_sentiment * 100),
        }

        # 2. Generate Matplotlib Charts
        themes = report_data.get("themes", [])
        trends = report_data.get("trends", [])

        themes_bar_chart = generate_themes_bar_chart(themes)
        sentiment_donut_chart = generate_sentiment_donut_chart(sentiment)
        trend_chart = generate_trend_chart(trends)

        charts_data = {
            "themes_bar": themes_bar_chart,
            "sentiment_donut": sentiment_donut_chart,
            "trend_chart": trend_chart,
        }

        # 3. Assemble full template context
        context = {
            "report": {
                **report_data,
                "sentiment": sentiment_with_pct,
                "charts": charts_data,
            }
        }

        # 4. Render Jinja2 Template
        template = jinja_env.get_template("report_template.html")
        html_content = template.render(context)

        # 5. Render PDF with WeasyPrint
        pdf_bytes: bytes
        if _WEASYPRINT_AVAILABLE:
            try:
                pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
            except Exception as weasy_err:
                logger.warning(f"Native weasyprint failed: {weasy_err}, falling back to CLI binary")
                pdf_bytes = _render_pdf_with_executable(html_content)
        else:
            pdf_bytes = _render_pdf_with_executable(html_content)

        return html_content, pdf_bytes

    except AIServiceException:
        raise
    except Exception as exc:
        logger.error(f"Error compiling report PDF: {exc}", exc_info=True)
        raise AIServiceException(f"Failed to compile report PDF: {str(exc)}", status_code=500) from exc
