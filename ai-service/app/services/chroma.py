import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config.settings import settings

logger = logging.getLogger(__name__)


class ChromaService:
    """Persistent ChromaDB client wrapper."""

    def __init__(self) -> None:
        self._client: chromadb.ClientAPI | None = None
        self._collection: chromadb.Collection | None = None

    def initialize(self) -> None:
        """Create the persistent client and get/create the reviews collection."""
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="reviews",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB initialized at %s", settings.CHROMA_PATH)

    @property
    def collection(self) -> chromadb.Collection:
        if self._collection is None:
            raise RuntimeError("ChromaDB not initialized. Call initialize() first.")
        return self._collection

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        embeddings: list[list[float]] | None = None,
    ) -> None:
        self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    def query(
        self,
        query_texts: list[str],
        n_results: int = 5,
    ) -> dict[str, Any]:
        return self.collection.query(query_texts=query_texts, n_results=n_results)

    def health_check(self) -> bool:
        """Return True if ChromaDB is initialized and responsive."""
        try:
            _ = self.collection.count()
            return True
        except Exception:
            return False


chroma_service = ChromaService()
