import { config } from "../config";
import { logger } from "../config/logger";
import { AppError } from "../middleware/errorHandler";
import type { PendingRawItem, ProcessedFeedback } from "../repositories/feedbackRepository";
import type { MeaningfulChange, ThemeMetric } from "../schemas/analyticsSchemas";
import type { GroundedThemeHighlight } from "../schemas/briefSchemas";
import type { ChatFilters, ChatMessage, RagChatResult } from "../schemas/ragSchemas";

export interface RagChatServicePayload {
  business_id: string;
  query: string;
  filters?: ChatFilters;
  conversation_history?: ChatMessage[];
  structured_context?: {
    total_reviews: number;
    average_rating: number | null;
    sentiment_distribution: Record<string, number>;
    top_themes: Array<{ theme: string; count?: number }>;
    date_range: { min_date: string | null; max_date: string | null };
    sample_reviews: Array<Record<string, unknown>>;
  };
  thread_id?: string;
}

export interface GenerateBriefSummaryPayload {
  business_name: string;
  period_start: string;
  period_end: string;
  total_reviews: number;
  previous_total_reviews: number;
  average_rating: number | null;
  previous_average_rating: number | null;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_praises: Array<{
    theme: string;
    count: number;
    sentiment: string;
    evidence_snippets: string[];
  }>;
  top_complaints: Array<{
    theme: string;
    count: number;
    sentiment: string;
    evidence_snippets: string[];
  }>;
  meaningful_changes: MeaningfulChange[];
  confidence: "High" | "Medium" | "Low";
  limitations: string[];
  sample_reviews: string[];
}

export interface BriefSummaryResult {
  summary_text: string;
  top_complaints: GroundedThemeHighlight[];
  top_praises: GroundedThemeHighlight[];
  model?: string;
}

export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${config.aiServiceUrl}/api/v1/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (err) {
    logger.warn("AI service health check failed:", err);
    return false;
  }
}

export async function processFeedback(items: PendingRawItem[]): Promise<ProcessedFeedback[]> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/api/v1/feedback/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new AppError("AI processing service is currently unavailable", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`AI processing failed (${response.status}): ${errorText}`, response.status >= 500 ? response.status : 502);
  }

  const body = (await response.json()) as { items?: ProcessedFeedback[] };
  if (!body.items || body.items.length !== items.length) {
    throw new AppError("AI processing service returned an incomplete response", 502);
  }
  return body.items;
}

export async function generateBriefSummary(
  payload: GenerateBriefSummaryPayload
): Promise<BriefSummaryResult> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/api/v1/briefs/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new AppError("AI service is currently unavailable", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`AI brief generation failed (${response.status}): ${errorText}`, response.status >= 500 ? response.status : 502);
  }

  const data = (await response.json()) as BriefSummaryResult;
  if (!data || !data.summary_text || typeof data.summary_text !== "string" || !data.summary_text.trim()) {
    throw new AppError("AI service returned an invalid brief summary structure", 502);
  }

  return data;
}

export async function executeRagChat(payload: RagChatServicePayload): Promise<RagChatResult> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new AppError("AI chat service is currently unavailable", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`AI chat failed (${response.status}): ${errorText}`, response.status >= 500 ? response.status : 502);
  }

  const data = (await response.json()) as RagChatResult;
  if (!data || typeof data.answer !== "string") {
    throw new AppError("AI service returned an invalid chat response structure", 502);
  }

  return data;
}

