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
  data_version?: string;
  prompt_version?: string;
  force_refresh?: boolean;
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
  business_id?: string;
  data_version?: string;
  prompt_version?: string;
  force_refresh?: boolean;
  language?: string;
}

export interface BriefSummaryResult {
  summary_text: string;
  top_complaints: GroundedThemeHighlight[];
  top_praises: GroundedThemeHighlight[];
  model?: string;
  cached?: boolean;
  cache_key?: string;
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
  if (!items.length) return [];

  const BATCH_SIZE = 50;
  const allProcessed: ProcessedFeedback[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);

    let response: globalThis.Response;
    try {
      response = await fetch(`${config.aiServiceUrl}/api/v1/feedback/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: chunk }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (err) {
      logger.error(`AI processing connection error for batch of ${chunk.length} items:`, err);
      throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", 503);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`AI processing failed (${response.status}): ${errorText}`);
      throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", response.status >= 500 ? response.status : 502);
    }

    const body = (await response.json()) as { items?: ProcessedFeedback[] };
    if (!body.items || body.items.length !== chunk.length) {
      throw new AppError("AI processing service returned an incomplete response", 502);
    }

    allProcessed.push(...body.items);
  }

  return allProcessed;
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
    throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", response.status >= 500 ? response.status : 502);
  }

  const data = (await response.json()) as BriefSummaryResult;
  if (!data || !data.summary_text || typeof data.summary_text !== "string" || !data.summary_text.trim()) {
    throw new AppError("AI service returned an invalid brief summary structure", 502);
  }

  if (data.cached) {
    logger.info(`[AI Cache HIT] brief_summary for business: ${payload.business_id || payload.business_name}`);
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
    throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(`AI chat service returned status ${response.status}: ${errorText}`);
    let cleanMessage = "The AI service is currently undergoing maintenance. Please try again shortly.";
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message && typeof parsed.message === "string" && !parsed.message.includes("{") && !parsed.message.includes("failed:")) {
        cleanMessage = parsed.message;
      }
    } catch {
      // Use clean message
    }
    throw new AppError(cleanMessage, response.status >= 500 ? response.status : 502);
  }

  const data = (await response.json()) as RagChatResult;
  if (!data || typeof data.answer !== "string") {
    throw new AppError("AI service returned an invalid chat response structure", 502);
  }

  if (data.cached) {
    logger.info(`[AI Cache HIT] rag_chat for business: ${payload.business_id}`);
  }

  return data;
}

export interface ReportAIBriefPayload {
  business_name: string;
  report_type: string;
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
  top_themes: Array<{ theme: string; count: number; sentiment?: string }>;
  meaningful_changes: MeaningfulChange[];
  confidence: "High" | "Medium" | "Low";
  limitations: string[];
  sample_evidence: Array<{
    content: string;
    rating?: number | null;
    author?: string | null;
    platform?: string;
  }>;
  business_id?: string;
  data_version?: string;
  prompt_version?: string;
  force_refresh?: boolean;
  language?: string;
}

export interface ReportAIBriefResult {
  summary: string;
  key_changes: Array<{
    theme: string;
    change_type: string;
    description: string;
  }>;
  strengths: Array<{
    theme: string;
    description: string;
    evidence_quote?: string | null;
  }>;
  areas_to_improve: Array<{
    theme: string;
    description: string;
    evidence_quote?: string | null;
  }>;
  recommendations: Array<{
    title: string;
    action: string;
    priority: "High" | "Medium" | "Low";
    related_theme: string;
    rationale: string;
  }>;
  sentiment_observation?: string | null;
  cached?: boolean;
  cache_key?: string;
}

export async function generateReportAIBrief(
  payload: ReportAIBriefPayload
): Promise<ReportAIBriefResult> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/api/v1/reports/ai-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    logger.error("AI service connection failed during report brief generation:", err);
    throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`AI service reports/ai-brief returned ${response.status}: ${errorText}`);
    throw new AppError("Failed to generate AI report brief. Please try again shortly.", response.status >= 500 ? response.status : 502);
  }

  const data = (await response.json()) as ReportAIBriefResult;
  if (!data || !data.summary || typeof data.summary !== "string") {
    throw new AppError("AI service returned an invalid report brief structure", 502);
  }

  if (data.cached) {
    logger.info(`[AI Cache HIT] report_brief for business: ${payload.business_id || payload.business_name}`);
  }

  return data;
}

export async function getAICacheStats(): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${config.aiServiceUrl}/api/v1/cache/stats`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return {};
    return (await response.json()) as Record<string, unknown>;
  } catch (err) {
    logger.warn("Failed to retrieve AI cache stats:", err);
    return {};
  }
}

export async function invalidateAICache(options: {
  key?: string;
  businessId?: string;
  analysisType?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${config.aiServiceUrl}/api/v1/cache/invalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: options.key,
        business_id: options.businessId,
        analysis_type: options.analysisType,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (err) {
    logger.warn("Failed to invalidate AI cache:", err);
    return false;
  }
}

export async function clearAICache(): Promise<boolean> {
  try {
    const response = await fetch(`${config.aiServiceUrl}/api/v1/cache/clear`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (err) {
    logger.warn("Failed to clear AI cache:", err);
    return false;
  }
}

export async function renderReportPdf(reportData: any): Promise<Buffer> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/api/v1/reports/render-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_data: reportData }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    logger.error("AI service connection failed during report PDF generation:", err);
    throw new AppError("The AI service is currently undergoing maintenance. Please try again shortly.", 503);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`AI service reports/render-pdf returned ${response.status}: ${errorText}`);
    throw new AppError("Failed to render report PDF. Please try again shortly.", response.status >= 500 ? response.status : 502);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

