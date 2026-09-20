import logging
from typing import Any

from app.config.settings import settings
from app.services.chroma import chroma_service

logger = logging.getLogger(__name__)


def build_chroma_filter(business_id: str, filters: dict[str, Any] | None) -> dict[str, Any]:
    """Constructs a ChromaDB-compatible `where` metadata filter dict."""
    conditions: list[dict[str, Any]] = [{"business_id": business_id}]

    if not filters:
        return conditions[0]

    if filters.get("platform"):
        conditions.append({"platform": str(filters["platform"]).lower()})

    if filters.get("sentiment"):
        conditions.append({"sentiment": str(filters["sentiment"]).lower()})

    if filters.get("min_rating") is not None and filters.get("max_rating") is not None:
        if filters["min_rating"] == filters["max_rating"]:
            conditions.append({"rating": float(filters["min_rating"])})
        else:
            conditions.append({"rating": {"$gte": float(filters["min_rating"])}})
            conditions.append({"rating": {"$lte": float(filters["max_rating"])}})
    elif filters.get("min_rating") is not None:
        conditions.append({"rating": {"$gte": float(filters["min_rating"])}})
    elif filters.get("max_rating") is not None:
        conditions.append({"rating": {"$lte": float(filters["max_rating"])}})

    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


class HybridRetriever:
    """Combines ChromaDB vector retrieval with structured PostgreSQL samples and filters."""

    def __init__(self, chroma=None) -> None:
        self.chroma = chroma or chroma_service

    def retrieve_semantic_docs(
        self,
        query: str,
        business_id: str,
        filters: dict[str, Any] | None = None,
        k: int = 8,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant review documents from ChromaDB with metadata filtering."""
        results: list[dict[str, Any]] = []

        try:
            where_filter = build_chroma_filter(business_id, filters)
            logger.debug("Executing ChromaDB query with filter: %s", where_filter)

            # Query ChromaDB collection directly using query_texts
            query_res = self.chroma.collection.query(
                query_texts=[query],
                n_results=k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            if query_res and query_res.get("ids") and len(query_res["ids"][0]) > 0:
                ids = query_res["ids"][0]
                docs = query_res["documents"][0] if query_res.get("documents") else []
                metas = query_res["metadatas"][0] if query_res.get("metadatas") else []
                distances = query_res["distances"][0] if query_res.get("distances") else []

                for idx, doc_id in enumerate(ids):
                    meta = metas[idx] if idx < len(metas) else {}
                    content = docs[idx] if idx < len(docs) else ""
                    dist = distances[idx] if idx < len(distances) else None

                    raw_item_id = meta.get("raw_item_id") or doc_id
                    results.append({
                        "raw_item_id": str(raw_item_id),
                        "content": content,
                        "platform": meta.get("platform", "google"),
                        "author": meta.get("author"),
                        "rating": float(meta["rating"]) if meta.get("rating") is not None and meta.get("rating") != -1 else None,
                        "date": meta.get("date") or meta.get("published_at"),
                        "sentiment": meta.get("sentiment"),
                        "themes": meta.get("themes", "").split(", ") if meta.get("themes") else [],
                        "source_url": meta.get("source_url"),
                        "distance": dist,
                        "similarity_score": round(1.0 - dist, 4) if dist is not None else None,
                    })

        except Exception as err:
            logger.warning("ChromaDB retrieval encountered an issue (falling back to structured context): %s", err)

        return results

    def combine_with_structured(
        self,
        semantic_docs: list[dict[str, Any]],
        structured_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Deduplicates and merges ChromaDB semantic documents with PostgreSQL sample reviews."""
        seen_ids = {doc["raw_item_id"] for doc in semantic_docs}
        combined = list(semantic_docs)

        sample_reviews = structured_context.get("sample_reviews", [])
        for sample in sample_reviews:
            raw_id = str(sample.get("id") or sample.get("raw_item_id", ""))
            if raw_id and raw_id not in seen_ids:
                combined.append({
                    "raw_item_id": raw_id,
                    "content": sample.get("content", ""),
                    "platform": sample.get("platform", "google"),
                    "author": sample.get("author"),
                    "rating": float(sample["rating"]) if sample.get("rating") is not None else None,
                    "date": sample.get("date") or sample.get("published_at") or sample.get("effective_date"),
                    "sentiment": sample.get("sentiment") or sample.get("sentiment_label"),
                    "themes": sample.get("themes", []),
                    "source_url": sample.get("source_url"),
                    "similarity_score": None,
                })
                seen_ids.add(raw_id)

        return combined


hybrid_retriever = HybridRetriever()
