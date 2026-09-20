import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_voyageai import VoyageAIEmbeddings

from app.config.settings import settings

logger = logging.getLogger(__name__)


class ChromaService:
    """Persistent ChromaDB client wrapper backed by LangChain VectorStore and Voyage embeddings."""

    def __init__(self) -> None:
        self._client: chromadb.ClientAPI | None = None
        self._collection: chromadb.Collection | None = None
        self._vector_store: Chroma | None = None
        self._embeddings: VoyageAIEmbeddings | None = None

    def initialize(self) -> None:
        """Create the persistent client and initialize LangChain Chroma vector store."""
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="reviews",
            metadata={"hnsw:space": "cosine"},
        )

        if settings.VOYAGE_API_KEY:
            self._embeddings = VoyageAIEmbeddings(
                model=settings.VOYAGE_MODEL,
                voyage_api_key=settings.VOYAGE_API_KEY,
            )
            self._vector_store = Chroma(
                client=self._client,
                collection_name="reviews",
                embedding_function=self._embeddings,
            )

        logger.info("ChromaDB & LangChain vector store initialized at %s", settings.CHROMA_PATH)

    @property
    def collection(self) -> chromadb.Collection:
        if self._collection is None:
            raise RuntimeError("ChromaDB not initialized. Call initialize() first.")
        return self._collection

    @property
    def vector_store(self) -> Chroma | None:
        return self._vector_store

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        embeddings: list[list[float]] | None = None,
    ) -> None:
        self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    def add_langchain_documents(self, docs: list[Document], ids: list[str]) -> None:
        """Add documents using LangChain vector store."""
        if self._vector_store is not None:
            self._vector_store.add_documents(documents=docs, ids=ids)
        else:
            self.add_documents(
                ids=ids,
                documents=[d.page_content for d in docs],
                metadatas=[d.metadata for d in docs],
            )

    def query(
        self,
        query_texts: list[str],
        n_results: int = 5,
    ) -> dict[str, Any]:
        return self.collection.query(query_texts=query_texts, n_results=n_results)

    def similarity_search(self, query: str, k: int = 5, filter: dict[str, Any] | None = None) -> list[Document]:
        """LangChain semantic similarity search."""
        if self._vector_store is None:
            raise RuntimeError("LangChain vector store not initialized with embeddings.")
        return self._vector_store.similarity_search(query=query, k=k, filter=filter)

    def health_check(self) -> bool:
        """Return True if ChromaDB is initialized and responsive."""
        try:
            _ = self.collection.count()
            return True
        except Exception:
            return False


chroma_service = ChromaService()
