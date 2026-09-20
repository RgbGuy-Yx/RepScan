import { z } from "zod";
import {
  confidenceLevelSchema,
  meaningfulChangeSchema,
  weeklyMetricsSchema,
} from "./analyticsSchemas";

export const generateBriefBodySchema = z.object({
  body: z.object({
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    forceRefresh: z.boolean().optional().default(false),
  }),
});

export const listBriefsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

export const groundedThemeHighlightSchema = z.object({
  theme: z.string(),
  summary: z.string(),
  evidence_quote: z.string().nullable().optional(),
});

export const briefMetricsSnapshotSchema = z.object({
  current_week: weeklyMetricsSchema,
  previous_week: weeklyMetricsSchema,
});

export const briefResponseSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  summary_text: z.string(),
  top_complaints: z.array(groundedThemeHighlightSchema),
  top_praises: z.array(groundedThemeHighlightSchema),
  meaningful_changes: z.array(meaningfulChangeSchema).max(3),
  confidence: confidenceLevelSchema,
  confidence_score: z.number().min(0).max(1),
  limitations: z.array(z.string()),
  metrics: briefMetricsSnapshotSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const listBriefsResponseSchema = z.object({
  status: z.literal("success"),
  data: z.array(briefResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type GenerateBriefInput = z.infer<typeof generateBriefBodySchema>["body"];
export type GroundedThemeHighlight = z.infer<typeof groundedThemeHighlightSchema>;
export type BriefResponse = z.infer<typeof briefResponseSchema>;
