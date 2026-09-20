import { z } from "zod";

export const weeklyAnalyticsQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  }),
});

export const themeMetricSchema = z.object({
  theme: z.string(),
  count: z.number().int().nonnegative(),
  prevalence: z.number().min(0).max(100), // percentage of reviews in period
  negativeCount: z.number().int().nonnegative(),
  positiveCount: z.number().int().nonnegative(),
  neutralCount: z.number().int().nonnegative(),
  averageRating: z.number().min(0).max(5).nullable(),
  evidenceRawItemIds: z.array(z.string().uuid()),
  evidenceSnippets: z.array(z.string()).default([]),
});

export const sentimentDistributionSchema = z.object({
  positive: z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  averageScore: z.number().min(-1).max(1).nullable(),
});

export const ratingStatsSchema = z.object({
  averageRating: z.number().min(0).max(5).nullable(),
  totalRated: z.number().int().nonnegative(),
  distribution: z.record(z.string(), z.number().int().nonnegative()),
});

export const platformCoverageSchema = z.object({
  platform: z.string(),
  count: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

export const weeklyMetricsSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  totalReviews: z.number().int().nonnegative(),
  ratingStats: ratingStatsSchema,
  sentimentDistribution: sentimentDistributionSchema,
  themes: z.array(themeMetricSchema),
  platformCoverage: z.array(platformCoverageSchema),
});

export const changeTypeSchema = z.enum(["new", "increasing", "decreasing", "stable"]);

export const meaningfulChangeSchema = z.object({
  theme: z.string(),
  change_type: changeTypeSchema,
  metric: z.string(),
  current_value: z.number(),
  previous_value: z.number(),
  delta: z.number(),
  evidence_raw_item_ids: z.array(z.string().uuid()),
});

export const confidenceLevelSchema = z.enum(["High", "Medium", "Low"]);

export const confidenceSignalsSchema = z.object({
  evidenceCount: z.number().int().nonnegative(),
  sourceCoverageRatio: z.number().min(0).max(1),
  freshnessDays: z.number().nullable(),
  consistencyScore: z.number().min(0).max(1),
});

export const confidenceResultSchema = z.object({
  level: confidenceLevelSchema,
  score: z.number().min(0).max(1),
  signals: confidenceSignalsSchema,
  limitations: z.array(z.string()),
});

export const weeklyAnalyticsResponseSchema = z.object({
  business_id: z.string().uuid(),
  current_week: weeklyMetricsSchema,
  previous_week: weeklyMetricsSchema,
  meaningful_changes: z.array(meaningfulChangeSchema).max(3),
  confidence: confidenceResultSchema,
  limitations: z.array(z.string()),
});

export type WeeklyAnalyticsQuery = z.infer<typeof weeklyAnalyticsQuerySchema>;
export type ThemeMetric = z.infer<typeof themeMetricSchema>;
export type SentimentDistribution = z.infer<typeof sentimentDistributionSchema>;
export type RatingStats = z.infer<typeof ratingStatsSchema>;
export type PlatformCoverage = z.infer<typeof platformCoverageSchema>;
export type WeeklyMetrics = z.infer<typeof weeklyMetricsSchema>;
export type ChangeType = z.infer<typeof changeTypeSchema>;
export type MeaningfulChange = z.infer<typeof meaningfulChangeSchema>;
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;
export type ConfidenceResult = z.infer<typeof confidenceResultSchema>;
export type WeeklyAnalyticsResponse = z.infer<typeof weeklyAnalyticsResponseSchema>;
