import pool from "../services/database";
import type { Platform } from "./platformConnectionRepository";

export interface ScrapeRun {
  id: string;
  business_id: string;
  platform_connection_id: string;
  platform: Platform;
  status: "running" | "succeeded" | "failed";
  apify_run_id: string | null;
  records_fetched: number;
  records_inserted: number;
  records_skipped: number;
  error_message: string | null;
  started_at: Date;
  finished_at: Date | null;
  created_at: Date;
}

export interface IngestionStats {
  total: number;
  pending: number;
  processed: number;
  failed: number;
}

export async function create(data: { businessId: string; connectionId: string; platform: Platform }): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO scrape_runs (business_id, platform_connection_id, platform, status)
     VALUES ($1, $2, $3, 'running') RETURNING id`,
    [data.businessId, data.connectionId, data.platform]
  );
  return result.rows[0].id;
}

export async function findActiveByConnectionId(connectionId: string): Promise<ScrapeRun | null> {
  // Mark stale runs (> 30 mins) as failed so they don't permanently block scraping
  await pool.query(
    `UPDATE scrape_runs
     SET status = 'failed', error_message = 'Scrape job timed out after 30 minutes', finished_at = NOW()
     WHERE platform_connection_id = $1 AND status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'`,
    [connectionId]
  );

  const result = await pool.query<ScrapeRun>(
    `SELECT id, business_id, platform_connection_id, platform, status, apify_run_id,
            records_fetched, records_inserted, records_skipped, error_message,
            started_at, finished_at, created_at
     FROM scrape_runs
     WHERE platform_connection_id = $1 AND status = 'running'
     ORDER BY created_at DESC
     LIMIT 1`,
    [connectionId]
  );
  return result.rows[0] || null;
}

export async function findById(id: string): Promise<ScrapeRun | null> {
  const result = await pool.query<ScrapeRun>(
    `SELECT id, business_id, platform_connection_id, platform, status, apify_run_id,
            records_fetched, records_inserted, records_skipped, error_message,
            started_at, finished_at, created_at
     FROM scrape_runs
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findByConnectionId(connectionId: string, limit = 20): Promise<ScrapeRun[]> {
  const result = await pool.query<ScrapeRun>(
    `SELECT id, business_id, platform_connection_id, platform, status, apify_run_id,
            records_fetched, records_inserted, records_skipped, error_message,
            started_at, finished_at, created_at
     FROM scrape_runs
     WHERE platform_connection_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [connectionId, limit]
  );
  return result.rows;
}

export async function getIngestionStats(connectionId: string): Promise<IngestionStats> {
  const result = await pool.query<{
    total: string;
    pending: string;
    processed: string;
    failed: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE processing_status = 'pending')::text AS pending,
       COUNT(*) FILTER (WHERE processing_status = 'processed')::text AS processed,
       COUNT(*) FILTER (WHERE processing_status = 'failed')::text AS failed
     FROM raw_items
     WHERE platform_connection_id = $1`,
    [connectionId]
  );

  const row = result.rows[0];
  return {
    total: parseInt(row?.total || "0", 10),
    pending: parseInt(row?.pending || "0", 10),
    processed: parseInt(row?.processed || "0", 10),
    failed: parseInt(row?.failed || "0", 10),
  };
}

export async function succeed(id: string, counts: { fetched: number; inserted: number; skipped: number }): Promise<void> {
  await pool.query(
    `UPDATE scrape_runs SET status = 'succeeded', records_fetched = $2, records_inserted = $3,
     records_skipped = $4, finished_at = NOW() WHERE id = $1`,
    [id, counts.fetched, counts.inserted, counts.skipped]
  );
}

export async function fail(
  id: string,
  message: string,
  counts?: { fetched?: number; inserted?: number; skipped?: number }
): Promise<void> {
  await pool.query(
    `UPDATE scrape_runs
     SET status = 'failed',
         error_message = $2,
         records_fetched = COALESCE($3, records_fetched),
         records_inserted = COALESCE($4, records_inserted),
         records_skipped = COALESCE($5, records_skipped),
         finished_at = NOW()
     WHERE id = $1`,
    [id, message.slice(0, 4000), counts?.fetched ?? null, counts?.inserted ?? null, counts?.skipped ?? null]
  );
}

