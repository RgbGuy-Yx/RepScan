import asyncio
import hashlib
import json
import logging
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional, TypeVar

from app.config.settings import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Standard prompt versions across the AI service
PROMPT_VERSION_REPORT = "1.0.0"
PROMPT_VERSION_BRIEF = "1.0.0"
PROMPT_VERSION_RAG = "1.0.0"
PROMPT_VERSION_SUB_ANALYSIS = "1.0.0"

# Default TTLs (in seconds) per analysis type
DEFAULT_TTLS: dict[str, int] = {
    "report_brief": 48 * 3600,       # 48 hours
    "weekly_brief": 48 * 3600,       # 48 hours
    "monthly_brief": 72 * 3600,      # 72 hours
    "dashboard_insights": 24 * 3600, # 24 hours
    "what_changed": 24 * 3600,       # 24 hours
    "theme_summary": 24 * 3600,      # 24 hours
    "recommendations": 24 * 3600,    # 24 hours
    "rag_chat": 6 * 3600,            # 6 hours
    "default": 24 * 3600,            # 24 hours
}

# Estimated token usage for savings computation
ESTIMATED_TOKENS_PER_CALL: dict[str, int] = {
    "report_brief": 2500,
    "weekly_brief": 2000,
    "monthly_brief": 3000,
    "dashboard_insights": 1000,
    "what_changed": 1200,
    "theme_summary": 1200,
    "recommendations": 1200,
    "rag_chat": 1500,
    "default": 1500,
}


def _normalize_value(val: Any) -> Any:
    """Recursively normalize dicts, lists, and primitives for deterministic JSON hashing."""
    if isinstance(val, dict):
        return {k: _normalize_value(v) for k, v in sorted(val.items()) if v is not None}
    if isinstance(val, (list, tuple, set)):
        return [_normalize_value(v) for v in val]
    if isinstance(val, float):
        # Round floats to 4 decimals to avoid tiny floating point representation variances
        return round(val, 4)
    return val


def compute_data_fingerprint(data: Any) -> str:
    """Generate a compact SHA-256 fingerprint from arbitrary review/metric data."""
    if data is None:
        return "v0"
    normalized = _normalize_value(data)
    serialized = json.dumps(normalized, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]


def generate_cache_key(
    business_id: str,
    analysis_type: str,
    date_range: Optional[dict[str, Any]] = None,
    data_version: Optional[str] = None,
    prompt_version: str = "1.0.0",
    model: Optional[str] = None,
    language: str = "en",
    relevant_filters: Optional[dict[str, Any]] = None,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    """
    Generate a deterministic cache key using the actual inputs that affect the AI response:
    - business_id
    - analysis_type
    - date_range
    - data_version
    - prompt_version
    - model
    - language
    - relevant_filters
    - extra (optional query or task specific parameters)
    """
    resolved_model = model or getattr(settings, "MISTRAL_MODEL", "open-mistral-nemo")

    canonical_payload = {
        "business_id": str(business_id).strip(),
        "analysis_type": str(analysis_type).strip().lower(),
        "date_range": _normalize_value(date_range) if date_range else None,
        "data_version": str(data_version).strip() if data_version else None,
        "prompt_version": str(prompt_version).strip(),
        "model": str(resolved_model).strip(),
        "language": str(language).strip().lower(),
        "relevant_filters": _normalize_value(relevant_filters) if relevant_filters else None,
        "extra": _normalize_value(extra) if extra else None,
    }

    serialized = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":"), default=str)
    hash_hex = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    clean_biz = str(business_id).strip().replace(":", "_")
    clean_type = str(analysis_type).strip().lower()
    return f"{clean_type}:{clean_biz}:{hash_hex[:20]}"


@dataclass
class CacheEntry:
    key: str
    business_id: str
    analysis_type: str
    response_data: Any
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    expires_at: float = 0.0
    hit_count: int = 0
    last_accessed_at: float = field(default_factory=time.time)

    def is_expired(self, now: Optional[float] = None) -> bool:
        current_time = now if now is not None else time.time()
        return self.expires_at > 0 and current_time >= self.expires_at


class AICacheService:
    """
    Centralized, thread-safe, reusable AI response cache service across RepScan.
    Prevents duplicate LLM invocations for reports, weekly/monthly briefs,
    dashboard insights, what-changed explanations, theme summaries,
    recommendations, and RAG/Ask AI queries.
    """

    def __init__(self, max_entries: int = 2000, default_ttl: int = 86400):
        self.max_entries = max_entries
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = asyncio.Lock()

        # Telemetry stats
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "invalidations": 0,
            "total_tokens_saved": 0,
            "total_latency_saved_ms": 0,
            "hits_by_type": {},
            "misses_by_type": {},
        }

    def _resolve_ttl(self, analysis_type: str, custom_ttl: Optional[int] = None) -> int:
        if custom_ttl is not None and custom_ttl >= 0:
            return custom_ttl
        return DEFAULT_TTLS.get(analysis_type, self.default_ttl)

    async def get(self, key: str) -> Optional[CacheEntry]:
        """Retrieve an entry if present and not expired (LRU access update)."""
        async with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None

            now = time.time()
            if entry.is_expired(now):
                # Expired -> prune
                del self._cache[key]
                return None

            # Mark hit and update LRU position
            entry.hit_count += 1
            entry.last_accessed_at = now
            self._cache.move_to_end(key)

            # Telemetry
            self._stats["hits"] += 1
            atype = entry.analysis_type
            self._stats["hits_by_type"][atype] = self._stats["hits_by_type"].get(atype, 0) + 1

            saved_tokens = ESTIMATED_TOKENS_PER_CALL.get(atype, ESTIMATED_TOKENS_PER_CALL["default"])
            self._stats["total_tokens_saved"] += saved_tokens
            self._stats["total_latency_saved_ms"] += 1500  # avg 1.5s saved per LLM turn

            logger.info("AI Cache HIT for key: %s (hits: %d)", key, entry.hit_count)
            return entry

    async def set(
        self,
        key: str,
        response_data: Any,
        business_id: str,
        analysis_type: str,
        metadata: Optional[dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None,
    ) -> CacheEntry:
        """Store an entry in the cache with LRU eviction and expiration."""
        async with self._lock:
            now = time.time()
            ttl = self._resolve_ttl(analysis_type, ttl_seconds)
            expires_at = (now + ttl) if ttl > 0 else 0.0

            # Evict oldest entry if capacity reached
            if len(self._cache) >= self.max_entries and key not in self._cache:
                oldest_key, _ = self._cache.popitem(last=False)
                self._stats["evictions"] += 1
                logger.debug("AI Cache evicted oldest entry: %s", oldest_key)

            entry = CacheEntry(
                key=key,
                business_id=str(business_id),
                analysis_type=analysis_type,
                response_data=response_data,
                metadata=metadata or {},
                created_at=now,
                expires_at=expires_at,
                hit_count=0,
                last_accessed_at=now,
            )

            self._cache[key] = entry
            self._cache.move_to_end(key)
            logger.info("AI Cache STORED for key: %s (ttl: %ds)", key, ttl)
            return entry

    async def get_or_compute(
        self,
        key: str,
        compute_func: Callable[[], Awaitable[T]],
        validator: Callable[[T], bool],
        business_id: str,
        analysis_type: str,
        metadata: Optional[dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None,
        bypass_cache: bool = False,
    ) -> tuple[T, bool]:
        """
        Orchestrates:
        1. Check Cache (if not bypass_cache)
        2. Cache HIT -> return stored response (was_hit=True)
        3. Cache MISS -> run AI compute_func()
        4. Validate response
        5. Store response + metadata
        6. Return response (was_hit=False)
        """
        if not bypass_cache:
            entry = await self.get(key)
            if entry is not None:
                return entry.response_data, True

        # Cache MISS
        async with self._lock:
            self._stats["misses"] += 1
            self._stats["misses_by_type"][analysis_type] = (
                self._stats["misses_by_type"].get(analysis_type, 0) + 1
            )

        logger.info("AI Cache MISS for key: %s — invoking AI analysis pipeline", key)
        start_time = time.time()
        result = await compute_func()
        elapsed_ms = int((time.time() - start_time) * 1000)

        # Validate response structure and content
        if not validator(result):
            logger.warning("AI response validation failed for key: %s — skipping cache store", key)
            return result, False

        meta = dict(metadata or {})
        meta["compute_latency_ms"] = elapsed_ms

        await self.set(
            key=key,
            response_data=result,
            business_id=business_id,
            analysis_type=analysis_type,
            metadata=meta,
            ttl_seconds=ttl_seconds,
        )

        return result, False

    async def invalidate(self, key: str) -> bool:
        """Invalidate a specific cache key."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._stats["invalidations"] += 1
                logger.info("AI Cache invalidated key: %s", key)
                return True
            return False

    async def invalidate_business(self, business_id: str) -> int:
        """Invalidate all cache entries associated with a specific business_id."""
        async with self._lock:
            biz_str = str(business_id).strip()
            keys_to_remove = [k for k, v in self._cache.items() if v.business_id == biz_str]
            for k in keys_to_remove:
                del self._cache[k]
            count = len(keys_to_remove)
            self._stats["invalidations"] += count
            logger.info("AI Cache invalidated %d entries for business_id: %s", count, biz_str)
            return count

    async def invalidate_analysis_type(
        self, analysis_type: str, business_id: Optional[str] = None
    ) -> int:
        """Invalidate entries by analysis type (optionally scoped to a business)."""
        async with self._lock:
            atype = analysis_type.strip().lower()
            biz_str = str(business_id).strip() if business_id else None

            keys_to_remove = [
                k
                for k, v in self._cache.items()
                if v.analysis_type == atype and (biz_str is None or v.business_id == biz_str)
            ]
            for k in keys_to_remove:
                del self._cache[k]
            count = len(keys_to_remove)
            self._stats["invalidations"] += count
            logger.info("AI Cache invalidated %d entries for analysis_type: %s", count, atype)
            return count

    async def clear(self) -> int:
        """Clear all entries in the cache."""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self._stats["invalidations"] += count
            logger.info("AI Cache cleared entirely (%d entries)", count)
            return count

    async def get_stats(self) -> dict[str, Any]:
        """Retrieve live telemetry and metrics for the AI response cache."""
        async with self._lock:
            total_requests = self._stats["hits"] + self._stats["misses"]
            hit_ratio = round(self._stats["hits"] / total_requests, 4) if total_requests > 0 else 0.0

            entries_by_type: dict[str, int] = {}
            for v in self._cache.values():
                entries_by_type[v.analysis_type] = entries_by_type.get(v.analysis_type, 0) + 1

            return {
                "active_entries": len(self._cache),
                "max_entries": self.max_entries,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "total_requests": total_requests,
                "hit_ratio": hit_ratio,
                "evictions": self._stats["evictions"],
                "invalidations": self._stats["invalidations"],
                "estimated_tokens_saved": self._stats["total_tokens_saved"],
                "estimated_latency_saved_ms": self._stats["total_latency_saved_ms"],
                "entries_by_type": entries_by_type,
                "hits_by_type": dict(self._stats["hits_by_type"]),
                "misses_by_type": dict(self._stats["misses_by_type"]),
            }


# Singleton centralized instance
ai_cache = AICacheService()
