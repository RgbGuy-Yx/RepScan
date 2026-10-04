import logging
import re
from typing import Any

from app.services.rag.state import SourceProof

logger = logging.getLogger(__name__)


def extract_exact_excerpt(claimed_excerpt: str, full_content: str, max_chars: int = 250) -> str:
    """Ensures that the excerpt is an exact substring from the authentic review content.
    If the claimed excerpt is not found verbatim (due to LLM paraphrasing), extracts the closest
    authentic matching sentence or substring to guarantee 100% quotation fidelity.
    """
    if not full_content:
        return ""

    claimed_clean = claimed_excerpt.strip().strip('"\'')
    if claimed_clean and claimed_clean in full_content:
        return claimed_clean[:max_chars]

    # Try case-insensitive substring search
    idx = full_content.lower().find(claimed_clean.lower())
    if idx != -1 and claimed_clean:
        return full_content[idx : idx + len(claimed_clean)][:max_chars]

    # Sentence-level best matching fallback
    sentences = re.split(r"(?<=[.!?])\s+", full_content)
    if sentences:
        words = set(re.findall(r"\w+", claimed_clean.lower()))
        if words:
            best_sentence = max(
                sentences,
                key=lambda s: len(set(re.findall(r"\w+", s.lower())).intersection(words)),
            )
            return best_sentence.strip()[:max_chars]

    # Fallback to leading characters of the genuine review
    return full_content[:max_chars].strip()


def validate_and_format_sources(
    raw_sources: list[dict[str, Any]],
    retrieved_docs: list[dict[str, Any]],
) -> list[SourceProof]:
    """Validates that all sources cite real retrieved raw_item_ids and have authentic excerpts."""
    doc_map: dict[str, dict[str, Any]] = {
        str(doc["raw_item_id"]): doc for doc in retrieved_docs if doc.get("raw_item_id")
    }
    index_map: dict[str, dict[str, Any]] = {
        str(i + 1): doc for i, doc in enumerate(retrieved_docs) if doc.get("raw_item_id")
    }

    validated: list[SourceProof] = []
    seen_ids: set[str] = set()

    for src in raw_sources:
        candidate_id = str(src.get("raw_item_id") or src.get("id") or src.get("doc_id") or "").strip()
        candidate_clean = re.sub(r"[^\w-]", "", candidate_id)

        doc = None
        if candidate_id in doc_map:
            doc = doc_map[candidate_id]
        elif candidate_clean in doc_map:
            doc = doc_map[candidate_clean]
        elif candidate_clean in index_map:
            doc = index_map[candidate_clean]

        if not doc:
            continue

        real_raw_id = str(doc.get("raw_item_id", ""))
        if not real_raw_id or real_raw_id in seen_ids:
            continue

        content = doc.get("content", "")
        claimed_excerpt = src.get("excerpt") or src.get("quote") or src.get("content") or ""

        exact_excerpt = extract_exact_excerpt(claimed_excerpt, content)
        if not exact_excerpt:
            continue

        validated.append(
            SourceProof(
                raw_item_id=real_raw_id,
                platform=doc.get("platform") or src.get("platform") or "google",
                author=doc.get("author") or src.get("author"),
                rating=doc.get("rating") if doc.get("rating") is not None else src.get("rating"),
                date=str(doc.get("date") or doc.get("published_at") or src.get("date") or ""),
                source_url=doc.get("source_url") or src.get("source_url"),
                excerpt=exact_excerpt,
            )
        )
        seen_ids.add(real_raw_id)

    # If no valid sources were formatted by the LLM output but we have retrieved docs, populate with top docs
    if not validated and retrieved_docs:
        for doc in retrieved_docs[:3]:
            raw_id = str(doc.get("raw_item_id", ""))
            content = doc.get("content", "")
            if raw_id and raw_id not in seen_ids and content:
                validated.append(
                    SourceProof(
                        raw_item_id=raw_id,
                        platform=doc.get("platform", "google"),
                        author=doc.get("author"),
                        rating=doc.get("rating"),
                        date=str(doc.get("date") or ""),
                        source_url=doc.get("source_url"),
                        excerpt=content[:200].strip(),
                    )
                )
                seen_ids.add(raw_id)

    return validated


def assess_confidence_and_limitations(
    retrieved_count: int,
    total_reviews_in_context: int,
    filters: dict[str, Any] | None = None,
    explicit_limitation: str | None = None,
) -> tuple[str, str | None]:
    """Calculates grounded confidence ('High', 'Medium', 'Low') and limitation note."""
    limitations: list[str] = []

    if explicit_limitation and isinstance(explicit_limitation, str) and explicit_limitation.strip():
        limitations.append(explicit_limitation.strip())

    if retrieved_count == 0 and total_reviews_in_context == 0:
        limitations.append("No reviews found matching the specified criteria. Answers are based on lack of recorded feedback.")
        return "Low", " ".join(limitations)

    if retrieved_count < 3:
        limitations.append(f"Sample size is limited ({retrieved_count} review{'s' if retrieved_count != 1 else ''}); conclusions may not generalize to overall customer perception.")
        return "Low", " ".join(limitations)

    if retrieved_count < 6:
        if filters:
            active_filters = [f"{k}={v}" for k, v in filters.items() if v is not None]
            if active_filters:
                limitations.append(f"Analysis constrained by active filters: {', '.join(active_filters)}.")
        return "Medium", " ".join(limitations) if limitations else None

    # Abundant evidence
    return "High", " ".join(limitations) if limitations else None
