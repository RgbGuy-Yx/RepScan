import pool from "../services/database";

export type Platform = "google" | "instagram" | "linkedin";

export interface PlatformConnection {
  id: string;
  business_id: string;
  platform: Platform;
  source_url: string;
  external_id: string | null;
  is_active: boolean;
  last_scraped_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlatformConnectionData {
  business_id: string;
  platform: Platform;
  source_url: string;
  external_id?: string;
}

export interface UpdatePlatformConnectionData {
  is_active?: boolean;
  source_url?: string;
  external_id?: string;
}

export async function findByBusinessId(
  businessId: string
): Promise<PlatformConnection[]> {
  const result = await pool.query<PlatformConnection>(
    `SELECT id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at
     FROM platform_connections
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId]
  );
  return result.rows;
}

export async function findById(id: string): Promise<PlatformConnection | null> {
  const result = await pool.query<PlatformConnection>(
    `SELECT id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at
     FROM platform_connections
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findByBusinessAndPlatform(
  businessId: string,
  platform: Platform
): Promise<PlatformConnection | null> {
  const result = await pool.query<PlatformConnection>(
    `SELECT id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at
     FROM platform_connections
     WHERE business_id = $1 AND platform = $2`,
    [businessId, platform]
  );
  return result.rows[0] || null;
}

export async function create(
  data: CreatePlatformConnectionData
): Promise<PlatformConnection> {
  const result = await pool.query<PlatformConnection>(
    `INSERT INTO platform_connections (business_id, platform, source_url, external_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at`,
    [data.business_id, data.platform, data.source_url, data.external_id || null]
  );
  return result.rows[0];
}

export async function update(
  id: string,
  data: UpdatePlatformConnectionData
): Promise<PlatformConnection | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  if (data.source_url !== undefined) {
    fields.push(`source_url = $${paramIndex++}`);
    values.push(data.source_url);
  }
  if (data.external_id !== undefined) {
    fields.push(`external_id = $${paramIndex++}`);
    values.push(data.external_id);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await pool.query<PlatformConnection>(
    `UPDATE platform_connections SET ${fields.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at`,
    values
  );
  return result.rows[0] || null;
}

export async function markScraped(id: string): Promise<void> {
  await pool.query("UPDATE platform_connections SET last_scraped_at = NOW() WHERE id = $1", [id]);
}

export async function findAllActiveByPlatform(platform: Platform): Promise<PlatformConnection[]> {
  const result = await pool.query<PlatformConnection>(
    `SELECT id, business_id, platform, source_url, external_id, is_active, last_scraped_at, created_at, updated_at
     FROM platform_connections
     WHERE platform = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [platform]
  );
  return result.rows;
}

