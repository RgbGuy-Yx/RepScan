import pool from "../services/database";
import type { Platform } from "./platformConnectionRepository";

export async function create(data: { businessId: string; connectionId: string; platform: Platform }): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO scrape_runs (business_id, platform_connection_id, platform, status)
     VALUES ($1, $2, $3, 'running') RETURNING id`, [data.businessId, data.connectionId, data.platform]
  );
  return result.rows[0].id;
}

export async function succeed(id: string, counts: { fetched: number; inserted: number; skipped: number }): Promise<void> {
  await pool.query(
    `UPDATE scrape_runs SET status = 'succeeded', records_fetched = $2, records_inserted = $3,
     records_skipped = $4, finished_at = NOW() WHERE id = $1`,
    [id, counts.fetched, counts.inserted, counts.skipped]
  );
}

export async function fail(id: string, message: string): Promise<void> {
  await pool.query(
    `UPDATE scrape_runs SET status = 'failed', error_message = $2, finished_at = NOW() WHERE id = $1`,
    [id, message.slice(0, 4000)]
  );
}
