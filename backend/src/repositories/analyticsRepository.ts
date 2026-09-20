import pool from "../services/database";
import type { Platform } from "./platformConnectionRepository";

export interface AnalyzedReviewRow {
  id: string;
  business_id: string;
  platform: Platform;
  rating: number | null;
  effective_date: Date;
  published_at: Date | null;
  created_at: Date;
  content: string;
  author: string | null;
  source_url: string | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  themes: string[] | null;
  evidence: string[] | null;
}

export interface PlatformStatusRow {
  platform: Platform;
  is_active: boolean;
  last_scraped_at: Date | null;
}

export async function getAnalyzedReviewsForPeriod(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyzedReviewRow[]> {
  const query = `
    SELECT
      r.id,
      r.business_id,
      r.platform,
      r.rating::float AS rating,
      COALESCE(r.published_at, r.created_at) AS effective_date,
      r.published_at,
      r.created_at,
      r.content,
      r.author,
      r.source_url,
      fa.sentiment_label,
      fa.sentiment_score::float AS sentiment_score,
      fa.themes,
      fa.evidence
    FROM raw_items r
    LEFT JOIN feedback_analyses fa ON r.id = fa.raw_item_id
    WHERE r.business_id = $1
      AND COALESCE(r.published_at, r.created_at) >= $2
      AND COALESCE(r.published_at, r.created_at) <= $3
    ORDER BY COALESCE(r.published_at, r.created_at) DESC
  `;

  const result = await pool.query<AnalyzedReviewRow>(query, [businessId, startDate, endDate]);
  return result.rows.map((row) => ({
    ...row,
    themes: Array.isArray(row.themes) ? row.themes : [],
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
  }));
}

export async function getConnectedPlatformsForBusiness(
  businessId: string
): Promise<PlatformStatusRow[]> {
  const query = `
    SELECT platform, is_active, last_scraped_at
    FROM platform_connections
    WHERE business_id = $1
  `;
  const result = await pool.query<PlatformStatusRow>(query, [businessId]);
  return result.rows;
}

export async function getLatestReviewDateForBusiness(
  businessId: string
): Promise<Date | null> {
  const query = `
    SELECT MAX(COALESCE(published_at, created_at)) AS latest_date
    FROM raw_items
    WHERE business_id = $1
  `;
  const result = await pool.query<{ latest_date: Date | null }>(query, [businessId]);
  return result.rows[0]?.latest_date || null;
}
