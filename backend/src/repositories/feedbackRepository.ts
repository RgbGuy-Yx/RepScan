import pool from "../services/database";
import type { Platform } from "./platformConnectionRepository";

export interface NewRawItem {
  business_id: string;
  platform_connection_id: string;
  platform: Platform;
  external_id?: string | null;
  author?: string | null;
  content: string;
  content_hash: string;
  rating?: number | null;
  published_at?: string | null;
  source_url?: string | null;
  raw_payload: unknown;
}

export interface PendingRawItem {
  id: string;
  business_id: string;
  platform: Platform;
  content: string;
  rating: number | null;
  published_at: Date | null;
  source_url: string | null;
}

export interface ProcessedFeedback {
  raw_item_id: string;
  language: string;
  translated_content: string | null;
  sentiment_label: "positive" | "neutral" | "negative";
  sentiment_score: number | null;
  themes: string[];
  evidence: string[];
  model: string | null;
}

export async function insertIfNew(data: NewRawItem): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO raw_items (
      business_id, platform_connection_id, platform, external_id, author, content,
      content_hash, rating, published_at, source_url, raw_payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT DO NOTHING RETURNING id`,
    [data.business_id, data.platform_connection_id, data.platform, data.external_id || null,
      data.author || null, data.content, data.content_hash, data.rating ?? null,
      data.published_at || null, data.source_url || null, data.raw_payload]
  );
  return result.rows[0]?.id || null;
}

export async function findPendingByConnection(connectionId: string): Promise<PendingRawItem[]> {
  const result = await pool.query<PendingRawItem>(
    `SELECT id, business_id, platform, content, rating, published_at, source_url
     FROM raw_items WHERE platform_connection_id = $1 AND processing_status = 'pending'
     ORDER BY created_at ASC`, [connectionId]
  );
  return result.rows;
}

export async function saveProcessed(item: ProcessedFeedback): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE raw_items SET language = $2, translated_content = $3, processing_status = 'processed',
       processing_error = NULL, processed_at = NOW() WHERE id = $1`,
      [item.raw_item_id, item.language, item.translated_content]
    );
    await client.query(
      `INSERT INTO feedback_analyses (raw_item_id, sentiment_label, sentiment_score, themes, evidence, model)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (raw_item_id) DO UPDATE SET sentiment_label = EXCLUDED.sentiment_label,
       sentiment_score = EXCLUDED.sentiment_score, themes = EXCLUDED.themes, evidence = EXCLUDED.evidence,
       model = EXCLUDED.model`,
      [item.raw_item_id, item.sentiment_label, item.sentiment_score, JSON.stringify(item.themes),
        JSON.stringify(item.evidence), item.model]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markProcessingFailed(ids: string[], error: string): Promise<void> {
  if (!ids.length) return;
  await pool.query(
    `UPDATE raw_items SET processing_status = 'failed', processing_error = $2 WHERE id = ANY($1::uuid[])`,
    [ids, error.slice(0, 2000)]
  );
}

export interface ReviewWithAnalysis {
  id: string;
  business_id: string;
  platform: Platform;
  author: string | null;
  content: string;
  rating: number | null;
  published_at: Date | null;
  source_url: string | null;
  language: string | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  themes: string[];
  evidence: string[];
}

export async function findReviewsByBusinessId(
  businessId: string,
  limit = 50,
  offset = 0
): Promise<ReviewWithAnalysis[]> {
  const result = await pool.query<{
    id: string;
    business_id: string;
    platform: Platform;
    author: string | null;
    content: string;
    rating: number | null;
    published_at: Date | null;
    source_url: string | null;
    language: string | null;
    sentiment_label: "positive" | "neutral" | "negative" | null;
    sentiment_score: number | null;
    themes: any;
    evidence: any;
  }>(
    `SELECT r.id, r.business_id, r.platform, r.author, r.content, r.rating,
            r.published_at, r.source_url, r.language,
            fa.sentiment_label, fa.sentiment_score,
            COALESCE(fa.themes, '[]'::jsonb) as themes,
            COALESCE(fa.evidence, '[]'::jsonb) as evidence
     FROM raw_items r
     LEFT JOIN feedback_analyses fa ON fa.raw_item_id = r.id
     WHERE r.business_id = $1
     ORDER BY r.published_at DESC NULLS LAST, r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );

  return result.rows.map((row) => ({
    ...row,
    themes: Array.isArray(row.themes) ? row.themes : typeof row.themes === 'string' ? JSON.parse(row.themes) : [],
    evidence: Array.isArray(row.evidence) ? row.evidence : typeof row.evidence === 'string' ? JSON.parse(row.evidence) : [],
  }));
}

