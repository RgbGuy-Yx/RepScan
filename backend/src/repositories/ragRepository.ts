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

function buildFilterConditions(filters?: ChatFilters, startParamIdx: number = 2): { whereClause: string; values: unknown[]; nextParamIdx: number } {
  const conditions: string[] = ["1=1"];
  const values: unknown[] = [];
  let paramIdx = startParamIdx;

  if (filters?.platform) {
    conditions.push(`u.platform = $${paramIdx++}`);
    values.push(filters.platform);
  }

  if (filters?.start_date) {
    conditions.push(`COALESCE(u.published_at, u.created_at) >= $${paramIdx++}`);
    values.push(new Date(filters.start_date));
  }

  if (filters?.end_date) {
    conditions.push(`COALESCE(u.published_at, u.created_at) <= $${paramIdx++}`);
    values.push(new Date(filters.end_date));
  }

  if (filters?.min_rating !== undefined && filters?.min_rating !== null) {
    conditions.push(`u.rating >= $${paramIdx++}`);
    values.push(filters.min_rating);
  }

  if (filters?.max_rating !== undefined && filters?.max_rating !== null) {
    conditions.push(`u.rating <= $${paramIdx++}`);
    values.push(filters.max_rating);
  }

  if (filters?.sentiment) {
    conditions.push(`u.sentiment_label = $${paramIdx++}`);
    values.push(filters.sentiment);
  }

  if (filters?.theme) {
    conditions.push(`u.themes::text ILIKE $${paramIdx++}`);
    values.push(`%${filters.theme}%`);
  }

  return {
    whereClause: conditions.join(" AND "),
    values,
    nextParamIdx: paramIdx,
  };
}

const UNIFIED_CTE = `
  WITH unified_items AS (
    SELECT r.id, r.business_id, r.platform, r.author, r.content, r.rating::float AS rating,
           r.published_at, r.created_at, r.source_url,
           fa.sentiment_label, fa.sentiment_score::float AS sentiment_score,
           COALESCE(fa.themes, '[]'::jsonb) AS themes,
           COALESCE(fa.evidence, '[]'::jsonb) AS evidence
    FROM raw_items r
    LEFT JOIN feedback_analyses fa ON r.id = fa.raw_item_id
    WHERE r.business_id = $1

    UNION ALL

    SELECT ic.id, ic.business_id, 'instagram'::platform_type AS platform,
           ic.author_username AS author, ic.content,
           NULL::float AS rating,
           ic.published_at, ic.created_at,
           p.post_url AS source_url,
           (ic.ai_analysis->>'sentiment_label')::varchar AS sentiment_label,
           (ic.ai_analysis->>'sentiment_score')::float AS sentiment_score,
           COALESCE(ic.ai_analysis->'themes', '[]'::jsonb) AS themes,
           COALESCE(ic.ai_analysis->'evidence', '[]'::jsonb) AS evidence
    FROM instagram_comments ic
    LEFT JOIN instagram_posts p ON ic.instagram_post_id = p.id
    WHERE ic.business_id = $1
  )
`;

export async function getStructuredMetricsForFilters(
  businessId: string,
  filters?: ChatFilters
): Promise<StructuredMetricsRow> {
  const { whereClause, values } = buildFilterConditions(filters, 2);

  const query = `
    ${UNIFIED_CTE}
    SELECT
      COUNT(u.id)::int AS total_reviews,
      ROUND(AVG(u.rating)::numeric, 2)::float AS average_rating,
      COUNT(CASE WHEN u.sentiment_label = 'positive' THEN 1 END)::int AS positive_count,
      COUNT(CASE WHEN u.sentiment_label = 'neutral' THEN 1 END)::int AS neutral_count,
      COUNT(CASE WHEN u.sentiment_label = 'negative' THEN 1 END)::int AS negative_count,
      MIN(COALESCE(u.published_at, u.created_at)) AS min_date,
      MAX(COALESCE(u.published_at, u.created_at)) AS max_date
    FROM unified_items u
    WHERE ${whereClause}
  `;

  const result = await pool.query<StructuredMetricsRow>(query, [businessId, ...values]);
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
  const { whereClause, values, nextParamIdx } = buildFilterConditions(filters, 2);
  values.push(limit);

  const query = `
    ${UNIFIED_CTE}
    SELECT
      u.id,
      u.business_id,
      u.platform,
      u.author,
      u.content,
      u.rating::float AS rating,
      u.published_at,
      u.created_at,
      u.source_url,
      u.sentiment_label,
      u.sentiment_score::float AS sentiment_score,
      u.themes,
      u.evidence
    FROM unified_items u
    WHERE ${whereClause}
    ORDER BY COALESCE(u.published_at, u.created_at) DESC
    LIMIT $${nextParamIdx}
  `;

  const result = await pool.query<VerifiedRawItemRow>(query, [businessId, ...values]);
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
    ${UNIFIED_CTE}
    SELECT
      u.id,
      u.business_id,
      u.platform,
      u.author,
      u.content,
      u.rating::float AS rating,
      u.published_at,
      u.created_at,
      u.source_url,
      u.sentiment_label,
      u.sentiment_score::float AS sentiment_score,
      u.themes,
      u.evidence
    FROM unified_items u
    WHERE u.id = ANY($2::uuid[])
  `;

  const result = await pool.query<VerifiedRawItemRow>(query, [businessId, rawItemIds]);
  return result.rows.map((row) => ({
    ...row,
    themes: Array.isArray(row.themes) ? row.themes : [],
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
  }));
}
