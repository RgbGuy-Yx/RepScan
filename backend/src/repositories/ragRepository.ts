import pool from "../services/database";
import type { ChatFilters } from "../schemas/ragSchemas";
import type { Platform } from "./platformConnectionRepository";

export interface StructuredMetricsRow {
  total_reviews: number;
  average_rating: number | null;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  min_date: Date | null;
  max_date: Date | null;
}

export interface VerifiedRawItemRow {
  id: string;
  business_id: string;
  platform: Platform;
  author: string | null;
  content: string;
  rating: number | null;
  published_at: Date | null;
  created_at: Date;
  source_url: string | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  themes: string[];
  evidence: string[];
}

function buildFilterConditions(businessId: string, filters?: ChatFilters): { whereClause: string; values: unknown[] } {
  const conditions: string[] = ["r.business_id = $1"];
  const values: unknown[] = [businessId];
  let paramIdx = 2;

  if (filters?.platform) {
    conditions.push(`r.platform = $${paramIdx++}`);
    values.push(filters.platform);
  }

  if (filters?.start_date) {
    conditions.push(`COALESCE(r.published_at, r.created_at) >= $${paramIdx++}`);
    values.push(new Date(filters.start_date));
  }

  if (filters?.end_date) {
    conditions.push(`COALESCE(r.published_at, r.created_at) <= $${paramIdx++}`);
    values.push(new Date(filters.end_date));
  }

  if (filters?.min_rating !== undefined && filters?.min_rating !== null) {
    conditions.push(`r.rating >= $${paramIdx++}`);
    values.push(filters.min_rating);
  }

  if (filters?.max_rating !== undefined && filters?.max_rating !== null) {
    conditions.push(`r.rating <= $${paramIdx++}`);
    values.push(filters.max_rating);
  }

  if (filters?.sentiment) {
    conditions.push(`fa.sentiment_label = $${paramIdx++}`);
    values.push(filters.sentiment);
  }

  if (filters?.theme) {
    conditions.push(`fa.themes::text ILIKE $${paramIdx++}`);
    values.push(`%${filters.theme}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    values,
  };
}

export async function getStructuredMetricsForFilters(
  businessId: string,
  filters?: ChatFilters
): Promise<StructuredMetricsRow> {
  const { whereClause, values } = buildFilterConditions(businessId, filters);

  const query = `
    SELECT
      COUNT(r.id)::int AS total_reviews,
      ROUND(AVG(r.rating)::numeric, 2)::float AS average_rating,
      COUNT(CASE WHEN fa.sentiment_label = 'positive' THEN 1 END)::int AS positive_count,
      COUNT(CASE WHEN fa.sentiment_label = 'neutral' THEN 1 END)::int AS neutral_count,
      COUNT(CASE WHEN fa.sentiment_label = 'negative' THEN 1 END)::int AS negative_count,
      MIN(COALESCE(r.published_at, r.created_at)) AS min_date,
      MAX(COALESCE(r.published_at, r.created_at)) AS max_date
    FROM raw_items r
    LEFT JOIN feedback_analyses fa ON r.id = fa.raw_item_id
    WHERE ${whereClause}
  `;

  const result = await pool.query<StructuredMetricsRow>(query, values);
  return (
    result.rows[0] || {
      total_reviews: 0,
      average_rating: null,
      positive_count: 0,
      neutral_count: 0,
      negative_count: 0,
      min_date: null,
      max_date: null,
    }
  );
}

export async function getSampleReviewsForFilters(
  businessId: string,
  filters?: ChatFilters,
  limit: number = 10
): Promise<VerifiedRawItemRow[]> {
  const { whereClause, values } = buildFilterConditions(businessId, filters);
  const paramIdx = values.length + 1;
  values.push(limit);

  const query = `
    SELECT
      r.id,
      r.business_id,
      r.platform,
      r.author,
      r.content,
      r.rating::float AS rating,
      r.published_at,
      r.created_at,
      r.source_url,
      fa.sentiment_label,
      fa.sentiment_score::float AS sentiment_score,
      COALESCE(fa.themes, '[]'::jsonb) AS themes,
      COALESCE(fa.evidence, '[]'::jsonb) AS evidence
    FROM raw_items r
    LEFT JOIN feedback_analyses fa ON r.id = fa.raw_item_id
    WHERE ${whereClause}
    ORDER BY COALESCE(r.published_at, r.created_at) DESC
    LIMIT $${paramIdx}
  `;

  const result = await pool.query<VerifiedRawItemRow>(query, values);
  return result.rows.map((row) => ({
    ...row,
    themes: Array.isArray(row.themes) ? row.themes : [],
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
  }));
}

export async function getRawItemsByIds(
  businessId: string,
  rawItemIds: string[]
): Promise<VerifiedRawItemRow[]> {
  if (!rawItemIds.length) return [];

  const query = `
    SELECT
      r.id,
      r.business_id,
      r.platform,
      r.author,
      r.content,
      r.rating::float AS rating,
      r.published_at,
      r.created_at,
      r.source_url,
      fa.sentiment_label,
      fa.sentiment_score::float AS sentiment_score,
      COALESCE(fa.themes, '[]'::jsonb) AS themes,
      COALESCE(fa.evidence, '[]'::jsonb) AS evidence
    FROM raw_items r
    LEFT JOIN feedback_analyses fa ON r.id = fa.raw_item_id
    WHERE r.business_id = $1 AND r.id = ANY($2::uuid[])
  `;

  const result = await pool.query<VerifiedRawItemRow>(query, [businessId, rawItemIds]);
  return result.rows.map((row) => ({
    ...row,
    themes: Array.isArray(row.themes) ? row.themes : [],
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
  }));
}
