from typing import Any, Literal, TypedDict
from pydantic import BaseModel, Field


class ChatFilter(BaseModel):
    """Filters that can be applied to the RAG retrieval."""
    platform: Literal["google", "instagram", "linkedin"] | None = None
    start_date: str | None = None
    end_date: str | None = None
    min_rating: float | None = Field(default=None, ge=1.0, le=5.0)
    max_rating: float | None = Field(default=None, ge=1.0, le=5.0)
    sentiment: Literal["positive", "neutral", "negative"] | None = None
    theme: str | None = None


class SourceProof(BaseModel):
    """Show Proof evidence item referencing an authentic raw item."""
    raw_item_id: str = Field(description="Unique raw item UUID from the source database")
    platform: str = Field(description="Platform source (e.g. google, instagram, linkedin)")
    author: str | None = Field(default=None, description="Review author name")
    rating: float | None = Field(default=None, description="Rating score (1.0 to 5.0)")
    date: str | None = Field(default=None, description="Published or created date")
    source_url: str | None = Field(default=None, description="Source URL link")
    excerpt: str = Field(description="Exact short excerpt from the original review text")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class StructuredContext(BaseModel):
    """Structured metrics from PostgreSQL for hybrid context."""
    total_reviews: int = 0
    average_rating: float | None = None
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    top_themes: list[dict[str, Any]] = Field(default_factory=list)
    date_range: dict[str, Any] = Field(default_factory=dict)
    sample_reviews: list[dict[str, Any]] = Field(default_factory=list)


class RagChatRequest(BaseModel):
    business_id: str
    query: str = Field(min_length=1)
    filters: ChatFilter | None = None
    conversation_history: list[ChatMessage] = Field(default_factory=list)
    structured_context: StructuredContext | None = None
    thread_id: str | None = None


class RagChatResponse(BaseModel):
    """Strict response schema for RepScan RAG Chat & Evidence."""
    answer: str
    confidence: Literal["High", "Medium", "Low"]
    limitation_note: str | None = None
    sources: list[SourceProof] = Field(default_factory=list)


class RagChatState(TypedDict, total=False):
    """LangGraph conversation & orchestration state."""
    business_id: str
    query: str
    filters: dict[str, Any] | None
    conversation_history: list[dict[str, str]]
    thread_id: str | None
    structured_context: dict[str, Any]
    retrieved_docs: list[dict[str, Any]]
    draft_answer: str
    sources: list[dict[str, Any]]
    confidence: str
    limitation_note: str | None
    final_response: dict[str, Any] | None
