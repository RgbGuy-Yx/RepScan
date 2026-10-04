import { AppError } from "../middleware/errorHandler";
import * as businessRepo from "../repositories/businessRepository";
import * as ragRepo from "../repositories/ragRepository";
import { executeRagChat } from "./aiService";
import type { ChatFilters, ChatMessage, RagChatResult, SourceProof } from "../schemas/ragSchemas";
export type { ChatFilters, ChatMessage, RagChatResult, SourceProof };

export interface RagChatRequestParams {
  businessId: string;
  query: string;
  filters?: ChatFilters;
  conversationHistory?: ChatMessage[];
  sessionId?: string;
  threadId?: string;
}

export async function processRagChat(params: RagChatRequestParams): Promise<RagChatResult> {
  const { businessId, query, filters, conversationHistory, sessionId, threadId } = params;

  // 1. Verify business exists in PostgreSQL
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  // 2. Fetch structured metrics from PostgreSQL (ratings, counts, sentiment, date bounds)
  const metrics = await ragRepo.getStructuredMetricsForFilters(businessId, filters);

  // 3. Fetch sample reviews from PostgreSQL matching filters
  const sampleReviews = await ragRepo.getSampleReviewsForFilters(businessId, filters, 15);

  const structuredContext = {
    total_reviews: metrics.total_reviews,
    average_rating: metrics.average_rating,
    sentiment_distribution: {
      positive: metrics.positive_count,
      neutral: metrics.neutral_count,
      negative: metrics.negative_count,
    },
    top_themes: [],
    date_range: {
      min_date: metrics.min_date ? metrics.min_date.toISOString() : null,
      max_date: metrics.max_date ? metrics.max_date.toISOString() : null,
    },
    sample_reviews: sampleReviews.map((r) => ({
      id: r.id,
      content: r.content,
      platform: r.platform,
      author: r.author,
      rating: r.rating,
      date: r.published_at ? r.published_at.toISOString() : r.created_at.toISOString(),
      source_url: r.source_url,
      sentiment_label: r.sentiment_label,
      themes: r.themes,
    })),
  };

  // 4. Invoke Python AI Service LangGraph RAG execution
  const dataVersion = [
    metrics.total_reviews,
    metrics.max_date ? metrics.max_date.toISOString() : "no-date",
  ].join(":");

  const aiResult = await executeRagChat({
    business_id: businessId,
    query,
    filters,
    conversation_history: conversationHistory,
    structured_context: structuredContext,
    thread_id: threadId || sessionId,
    data_version: dataVersion,
  });

  // 5. Source Traceability & Proof Verification against PostgreSQL (Source of Truth)
  const citedIds = (aiResult.sources || [])
    .map((s) => s.raw_item_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const verifiedDbReviews = await ragRepo.getRawItemsByIds(businessId, citedIds);
  const dbReviewMap = new Map(verifiedDbReviews.map((r) => [r.id, r]));

  const verifiedSources: SourceProof[] = [];

  for (const src of aiResult.sources || []) {
    const dbReview = dbReviewMap.get(src.raw_item_id);
    if (!dbReview) {
      // Discard unsupported or fake raw_item_ids
      continue;
    }

    // Show Proof: exact excerpt preservation
    verifiedSources.push({
      raw_item_id: dbReview.id,
      platform: dbReview.platform,
      author: dbReview.author,
      rating: dbReview.rating,
      date: dbReview.published_at ? dbReview.published_at.toISOString() : dbReview.created_at.toISOString(),
      source_url: dbReview.source_url,
      excerpt: src.excerpt || dbReview.content.slice(0, 200),
    });
  }

  return {
    answer: aiResult.answer,
    confidence: aiResult.confidence,
    limitation_note: aiResult.limitation_note,
    sources: verifiedSources,
  };
}
