import { AppError } from "../middleware/errorHandler";
import * as businessRepo from "../repositories/businessRepository";
import * as analyticsRepo from "../repositories/analyticsRepository";
import * as briefRepo from "../repositories/briefRepository";
import {
  aggregateWeeklyMetrics,
  calculateConfidenceAndLimitations,
  detectMeaningfulChanges,
} from "./analyticsService";
import { generateBriefSummary } from "./aiService";
import { logger } from "../config/logger";
import type {
  WeeklyAnalyticsResponse,
  WeeklyMetrics,
} from "../schemas/analyticsSchemas";
import type {
  BriefResponse,
  GenerateBriefInput,
  GroundedThemeHighlight,
} from "../schemas/briefSchemas";

function parseDateRange(
  startDateStr?: string,
  endDateStr?: string
): { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date } {
  let currentEnd = new Date();
  if (endDateStr) {
    currentEnd = new Date(endDateStr);
    if (isNaN(currentEnd.getTime())) {
      throw new AppError("Invalid endDate format", 400);
    }
  }

  let currentStart = new Date(currentEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (startDateStr) {
    currentStart = new Date(startDateStr);
    if (isNaN(currentStart.getTime())) {
      throw new AppError("Invalid startDate format", 400);
    }
  }

  if (currentStart >= currentEnd) {
    throw new AppError("startDate must be before endDate", 400);
  }

  const durationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Calculates weekly comparison, meaningful changes, confidence, and limitations.
 */
export async function getWeeklyComparison(
  businessId: string,
  startDateStr?: string,
  endDateStr?: string
): Promise<WeeklyAnalyticsResponse> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const { currentStart, currentEnd, previousStart, previousEnd } = parseDateRange(
    startDateStr,
    endDateStr
  );

  const [currentReviews, previousReviews, connectedPlatforms, latestReviewDate] =
    await Promise.all([
      analyticsRepo.getAnalyzedReviewsForPeriod(businessId, currentStart, currentEnd),
      analyticsRepo.getAnalyzedReviewsForPeriod(businessId, previousStart, previousEnd),
      analyticsRepo.getConnectedPlatformsForBusiness(businessId),
      analyticsRepo.getLatestReviewDateForBusiness(businessId),
    ]);

  const currentMetrics: WeeklyMetrics = aggregateWeeklyMetrics(currentReviews, {
    periodStart: currentStart,
    periodEnd: currentEnd,
    connectedPlatforms,
  });

  const previousMetrics: WeeklyMetrics = aggregateWeeklyMetrics(previousReviews, {
    periodStart: previousStart,
    periodEnd: previousEnd,
    connectedPlatforms,
  });

  const meaningfulChanges = detectMeaningfulChanges(currentMetrics, previousMetrics);
  const confidence = calculateConfidenceAndLimitations(
    currentMetrics,
    connectedPlatforms,
    latestReviewDate,
    currentEnd
  );

  return {
    business_id: businessId,
    current_week: currentMetrics,
    previous_week: previousMetrics,
    meaningful_changes: meaningfulChanges,
    confidence,
    limitations: confidence.limitations,
  };
}

/**
 * Generates and saves a grounded weekly brief.
 */
export async function generateWeeklyBrief(
  businessId: string,
  input: GenerateBriefInput
): Promise<BriefResponse> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const analytics = await getWeeklyComparison(businessId, input.startDate, input.endDate);
  const { current_week, previous_week, meaningful_changes, confidence, limitations } = analytics;

  // Prepare top praise & complaint candidates with evidence snippets
  const topPraises = current_week.themes
    .filter((t) => t.positiveCount > 0)
    .sort((a, b) => b.positiveCount - a.positiveCount)
    .slice(0, 3)
    .map((t) => ({
      theme: t.theme,
      count: t.positiveCount,
      sentiment: "positive",
      evidence_snippets: t.evidenceSnippets,
    }));

  const topComplaints = current_week.themes
    .filter((t) => t.negativeCount > 0)
    .sort((a, b) => b.negativeCount - a.negativeCount)
    .slice(0, 3)
    .map((t) => ({
      theme: t.theme,
      count: t.negativeCount,
      sentiment: "negative",
      evidence_snippets: t.evidenceSnippets,
    }));

  // Fetch actual sample reviews for context
  const currentReviews = await analyticsRepo.getAnalyzedReviewsForPeriod(
    businessId,
    new Date(current_week.periodStart),
    new Date(current_week.periodEnd)
  );
  const sampleReviews = currentReviews.slice(0, 10).map((r) => r.content);

  const aiResult = await generateBriefSummary({
    business_name: business.name,
    period_start: current_week.periodStart.slice(0, 10),
    period_end: current_week.periodEnd.slice(0, 10),
    total_reviews: current_week.totalReviews,
    previous_total_reviews: previous_week.totalReviews,
    average_rating: current_week.ratingStats.averageRating,
    previous_average_rating: previous_week.ratingStats.averageRating,
    sentiment_distribution: {
      positive: current_week.sentimentDistribution.positive,
      neutral: current_week.sentimentDistribution.neutral,
      negative: current_week.sentimentDistribution.negative,
    },
    top_praises: topPraises,
    top_complaints: topComplaints,
    meaningful_changes,
    confidence: confidence.level,
    limitations,
    sample_reviews: sampleReviews,
  });

  const savedBrief = await briefRepo.insertBrief({
    business_id: businessId,
    period_start: new Date(current_week.periodStart),
    period_end: new Date(current_week.periodEnd),
    summary_text: aiResult.summary_text,
    top_complaints: aiResult.top_complaints,
    top_praises: aiResult.top_praises,
    meaningful_changes,
    confidence: confidence.level,
    confidence_score: confidence.score,
    limitations,
    metrics: {
      current_week,
      previous_week,
    },
  });

  return {
    id: savedBrief.id,
    business_id: savedBrief.business_id,
    period_start: savedBrief.period_start.toISOString(),
    period_end: savedBrief.period_end.toISOString(),
    summary_text: savedBrief.summary_text,
    top_complaints: savedBrief.top_complaints,
    top_praises: savedBrief.top_praises,
    meaningful_changes: savedBrief.meaningful_changes,
    confidence: savedBrief.confidence,
    confidence_score: savedBrief.confidence_score,
    limitations: savedBrief.limitations,
    metrics: {
      current_week,
      previous_week,
    },
    created_at: savedBrief.created_at.toISOString(),
    updated_at: savedBrief.updated_at.toISOString(),
  };
}

export async function getLatestBrief(businessId: string): Promise<BriefResponse | null> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const brief = await briefRepo.getLatestBriefForBusiness(businessId);
  if (!brief) return null;

  return {
    id: brief.id,
    business_id: brief.business_id,
    period_start: brief.period_start.toISOString(),
    period_end: brief.period_end.toISOString(),
    summary_text: brief.summary_text,
    top_complaints: brief.top_complaints,
    top_praises: brief.top_praises,
    meaningful_changes: brief.meaningful_changes,
    confidence: brief.confidence,
    confidence_score: brief.confidence_score,
    limitations: brief.limitations,
    metrics: brief.metrics as unknown as BriefResponse["metrics"],
    created_at: brief.created_at.toISOString(),
    updated_at: brief.updated_at.toISOString(),
  };
}

export async function getBriefById(businessId: string, briefId: string): Promise<BriefResponse> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const brief = await briefRepo.getBriefById(businessId, briefId);
  if (!brief) {
    throw new AppError("Brief not found", 404);
  }

  return {
    id: brief.id,
    business_id: brief.business_id,
    period_start: brief.period_start.toISOString(),
    period_end: brief.period_end.toISOString(),
    summary_text: brief.summary_text,
    top_complaints: brief.top_complaints,
    top_praises: brief.top_praises,
    meaningful_changes: brief.meaningful_changes,
    confidence: brief.confidence,
    confidence_score: brief.confidence_score,
    limitations: brief.limitations,
    metrics: brief.metrics as unknown as BriefResponse["metrics"],
    created_at: brief.created_at.toISOString(),
    updated_at: brief.updated_at.toISOString(),
  };
}

export async function listBriefs(
  businessId: string,
  limit = 10,
  offset = 0
): Promise<{ data: BriefResponse[]; total: number; limit: number; offset: number }> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const { briefs, total } = await briefRepo.listBriefsForBusiness(businessId, limit, offset);

  return {
    data: briefs.map((b) => ({
      id: b.id,
      business_id: b.business_id,
      period_start: b.period_start.toISOString(),
      period_end: b.period_end.toISOString(),
      summary_text: b.summary_text,
      top_complaints: b.top_complaints,
      top_praises: b.top_praises,
      meaningful_changes: b.meaningful_changes,
      confidence: b.confidence,
      confidence_score: b.confidence_score,
      limitations: b.limitations,
      metrics: b.metrics as unknown as BriefResponse["metrics"],
      created_at: b.created_at.toISOString(),
      updated_at: b.updated_at.toISOString(),
    })),
    total,
    limit,
    offset,
  };
}
