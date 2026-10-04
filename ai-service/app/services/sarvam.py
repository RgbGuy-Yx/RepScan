import asyncio
import logging
from typing import Any
import httpx
from pydantic import BaseModel, Field

from app.config.settings import settings

logger = logging.getLogger(__name__)


class SarvamLIDResult(BaseModel):
    language_code: str = Field(description="Detected language code (e.g. 'hi-IN', 'te-IN', 'en-IN')")
    script_code: str | None = Field(default=None, description="Detected script code (e.g. 'Deva', 'Telu', 'Latn')")
    confidence: float | None = None
    raw_response: dict[str, Any] = Field(default_factory=dict)


class SarvamTranslationResult(BaseModel):
    translated_text: str | None = None
    source_language_code: str | None = None
    target_language_code: str = "en-IN"
    mode: str = "formal"
    error: str | None = None
    raw_response: dict[str, Any] = Field(default_factory=dict)


class SarvamReviewResult(BaseModel):
    language: str
    script: str | None = None
    translated_content: str | None = None
    is_translated: bool = False
    is_code_mixed: bool = False
    confidence: float | None = None
    sarvam_metadata: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


# Language mapping helper
SARVAM_LANG_MAP: dict[str, str] = {
    "hi": "hi-IN",
    "hindi": "hi-IN",
    "hi-in": "hi-IN",
    "te": "te-IN",
    "telugu": "te-IN",
    "te-in": "te-IN",
    "en": "en-IN",
    "english": "en-IN",
    "en-in": "en-IN",
    "ta": "ta-IN",
    "tamil": "ta-IN",
    "kn": "kn-IN",
    "kannada": "kn-IN",
    "bn": "bn-IN",
    "bengali": "bn-IN",
    "mr": "mr-IN",
    "marathi": "mr-IN",
    "gu": "gu-IN",
    "gujarati": "gu-IN",
    "pa": "pa-IN",
    "punjabi": "pa-IN",
    "ml": "ml-IN",
    "malayalam": "ml-IN",
    "od": "od-IN",
    "oriya": "od-IN",
}


def is_english_language(lang_code: str, script_code: str | None = None) -> bool:
    """Returns True if the language is standard English and no translation is needed."""
    clean_lang = lang_code.lower().strip()
    if clean_lang in ["en", "en-in", "en-us", "en-gb", "english"]:
        return True
    return False


def is_code_mixed_content(lang_code: str, script_code: str | None) -> bool:
    """Detects if content is code-mixed (e.g. Hinglish or Telugu-English in Latin script)."""
    clean_lang = lang_code.lower().strip()
    clean_script = (script_code or "").lower().strip()

    # If Hindi or Telugu is written in Latin script, it's code-mixed (Hinglish / Tenglish)
    if clean_script == "latn" and clean_lang not in ["en", "en-in", "en-us", "en-gb", "english"]:
        return True

    if "mixed" in clean_lang or "hinglish" in clean_lang:
        return True

    return False


class SarvamService:
    """Client for Sarvam AI Language Identification (/text-lid) and Translation (/translate) APIs."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        max_retries: int = 3,
        timeout: float = 15.0,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self.max_retries = max_retries
        self.timeout = timeout

    @property
    def api_key(self) -> str:
        return self._api_key or settings.SARVAM_API_KEY

    @property
    def base_url(self) -> str:
        return (self._base_url or settings.SARVAM_BASE_URL).rstrip("/")

    def _get_headers(self) -> dict[str, str]:
        return {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def _post_with_retry(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Executes a POST request to Sarvam API with bounded retry logic and exponential backoff."""
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY is not configured")

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers()
        last_exception: Exception | None = None

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(1, self.max_retries + 1):
                try:
                    logger.debug("Sarvam POST %s (attempt %d/%d)", url, attempt, self.max_retries)
                    response = await client.post(url, json=payload, headers=headers)

                    if response.status_code == 200:
                        return response.json()

                    # Handle 429 rate limit or 5xx server errors with backoff
                    if response.status_code in [429, 500, 502, 503, 504]:
                        error_text = response.text
                        logger.warning(
                            "Sarvam API temporary error (%d) on attempt %d: %s",
                            response.status_code,
                            attempt,
                            error_text,
                        )
                        if attempt < self.max_retries:
                            backoff = 0.5 * (2 ** (attempt - 1))
                            await asyncio.sleep(backoff)
                            continue

                    response.raise_for_status()

                except (httpx.TimeoutException, httpx.NetworkError) as err:
                    last_exception = err
                    logger.warning("Sarvam API network/timeout error on attempt %d: %s", attempt, err)
                    if attempt < self.max_retries:
                        backoff = 0.5 * (2 ** (attempt - 1))
                        await asyncio.sleep(backoff)
                        continue
                except Exception as err:
                    last_exception = err
                    logger.error("Sarvam API request failed on attempt %d: %s", attempt, err)
                    if attempt < self.max_retries:
                        backoff = 0.5 * (2 ** (attempt - 1))
                        await asyncio.sleep(backoff)
                        continue

        if last_exception:
            raise last_exception
        raise RuntimeError(f"Sarvam API request to {endpoint} failed after {self.max_retries} attempts")

    async def detect_language(self, text: str) -> SarvamLIDResult:
        """Identifies language and script using Sarvam `/text-lid` API."""
        clean_text = text.strip()
        if not clean_text:
            return SarvamLIDResult(language_code="en-IN", script_code="Latn", confidence=1.0)

        try:
            payload = {"input": clean_text}
            data = await self._post_with_retry("text-lid", payload)

            lang_code = data.get("language_code") or data.get("language") or "en-IN"
            script_code = data.get("script_code") or data.get("script") or "Latn"
            confidence = data.get("confidence")

            return SarvamLIDResult(
                language_code=lang_code,
                script_code=script_code,
                confidence=float(confidence) if confidence is not None else None,
                raw_response=data,
            )
        except Exception as err:
            logger.warning("Sarvam language detection failed (falling back to en-IN): %s", err)
            return SarvamLIDResult(
                language_code="en-IN",
                script_code="Latn",
                confidence=0.5,
                raw_response={"error": str(err)},
            )

    async def translate_to_english(
        self,
        text: str,
        source_language_code: str,
        script_code: str | None = None,
    ) -> SarvamTranslationResult:
        """Translates non-English or code-mixed text into English using Sarvam Translation API."""
        clean_text = text.strip()
        if not clean_text:
            return SarvamTranslationResult(translated_text="")

        # Check if already English
        if is_english_language(source_language_code, script_code):
            return SarvamTranslationResult(translated_text=clean_text, source_language_code=source_language_code)

        # Map to standard Sarvam language code (e.g. 'hi' -> 'hi-IN')
        norm_source_lang = SARVAM_LANG_MAP.get(source_language_code.lower().strip(), source_language_code)

        is_code_mixed = is_code_mixed_content(source_language_code, script_code)
        mode = "code-mixed" if is_code_mixed else "formal"

        payload = {
            "input": clean_text,
            "source_language_code": norm_source_lang,
            "target_language_code": "en-IN",
            "mode": mode,
            "model": settings.SARVAM_TRANSLATION_MODEL,
            "enable_preprocessing": True,
        }

        try:
            data = await self._post_with_retry("translate", payload)
            translated = data.get("translated_text") or data.get("translation")

            if translated and translated.strip():
                return SarvamTranslationResult(
                    translated_text=translated.strip(),
                    source_language_code=norm_source_lang,
                    target_language_code="en-IN",
                    mode=mode,
                    raw_response=data,
                )

            return SarvamTranslationResult(
                translated_text=None,
                source_language_code=norm_source_lang,
                error="Sarvam translation returned empty text",
                raw_response=data,
            )
        except Exception as err:
            logger.error("Sarvam translation failed for text '%s...': %s", clean_text[:40], err)
            return SarvamTranslationResult(
                translated_text=None,
                source_language_code=norm_source_lang,
                error=str(err),
            )

    async def process_review(self, text: str) -> SarvamReviewResult:
        """Full pipeline: Sarvam LID -> Sarvam Translation (if non-English/code-mixed)."""
        lid_result = await self.detect_language(text)
        lang = lid_result.language_code
        script = lid_result.script_code
        is_code_mixed = is_code_mixed_content(lang, script)

        # Case 1: English review -> no translation needed
        if is_english_language(lang, script):
            return SarvamReviewResult(
                language=lang,
                script=script,
                translated_content=None,
                is_translated=False,
                is_code_mixed=False,
                confidence=lid_result.confidence,
                sarvam_metadata={"lid": lid_result.raw_response},
            )

        # Case 2: Non-English or code-mixed -> Translate to English
        trans_result = await self.translate_to_english(
            text=text,
            source_language_code=lang,
            script_code=script,
        )

        translated_text = trans_result.translated_text

        return SarvamReviewResult(
            language=lang,
            script=script,
            translated_content=translated_text,
            is_translated=bool(translated_text),
            is_code_mixed=is_code_mixed,
            confidence=lid_result.confidence,
            sarvam_metadata={
                "lid": lid_result.raw_response,
                "translation": trans_result.raw_response,
            },
            error=trans_result.error,
        )


sarvam_service = SarvamService()


# ── LangChain Tools & Runnables ──────────────────────────────────────────────
from langchain_core.runnables import RunnableLambda
from langchain_core.tools import tool


@tool
async def detect_language_tool(text: str) -> dict[str, Any]:
    """Identify the language and script of customer review text using Sarvam AI."""
    res = await sarvam_service.detect_language(text)
    return {
        "language_code": res.language_code,
        "script_code": res.script_code,
        "confidence": res.confidence,
    }


@tool
async def translate_review_tool(
    text: str,
    source_language_code: str,
    script_code: str | None = None,
) -> str:
    """Translate regional Indian languages or code-mixed reviews (Hinglish/Tenglish) into English."""
    res = await sarvam_service.translate_to_english(
        text=text,
        source_language_code=source_language_code,
        script_code=script_code,
    )
    return res.translated_text or text


# Declarative LangChain Runnable for the complete multilingual review pipeline
sarvam_process_review_runnable = RunnableLambda(sarvam_service.process_review)

