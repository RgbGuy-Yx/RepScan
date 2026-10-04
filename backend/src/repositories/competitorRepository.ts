import pool from "../services/database";

export interface CompetitorRow {
  id: string;
  business_id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
  website: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number;
  tracked: boolean;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCompetitorData {
  business_id: string;
  google_place_id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  primary_type?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  review_count?: number;
  tracked?: boolean;
}

export interface UpdateCompetitorData {
  name?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  primary_type?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  review_count?: number;
  tracked?: boolean;
  last_synced_at?: Date;
}

const SELECT_COLS = `
  id,
  business_id,
  google_place_id,
  name,
  address,
  latitude,
  longitude,
  primary_type,
  website,
  google_maps_url,
  rating::float AS rating,
  review_count,
  tracked,
  last_synced_at,
  created_at,
  updated_at
`;

export async function create(data: CreateCompetitorData): Promise<CompetitorRow> {
  const result = await pool.query<CompetitorRow>(
    `INSERT INTO competitors (
      business_id,
      google_place_id,
      name,
      address,
      latitude,
      longitude,
      primary_type,
      website,
      google_maps_url,
      rating,
      review_count,
      tracked,
      last_synced_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (business_id, google_place_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      primary_type = EXCLUDED.primary_type,
      website = EXCLUDED.website,
      google_maps_url = EXCLUDED.google_maps_url,
      rating = EXCLUDED.rating,
      review_count = EXCLUDED.review_count,
      tracked = true,
      last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING ${SELECT_COLS}`,
    [
      data.business_id,
      data.google_place_id,
      data.name,
      data.address || null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.primary_type || null,
      data.website || null,
      data.google_maps_url || null,
      data.rating ?? null,
      data.review_count ?? 0,
      data.tracked ?? true,
    ]
  );

  return result.rows[0];
}

export async function findByBusinessId(businessId: string): Promise<CompetitorRow[]> {
  const result = await pool.query<CompetitorRow>(
    `SELECT ${SELECT_COLS}
     FROM competitors
     WHERE business_id = $1 AND tracked = true
     ORDER BY created_at DESC`,
    [businessId]
  );
  return result.rows;
}

export async function findById(
  id: string,
  businessId?: string
): Promise<CompetitorRow | null> {
  let query = `SELECT ${SELECT_COLS} FROM competitors WHERE id = $1`;
  const values: unknown[] = [id];

  if (businessId) {
    query += ` AND business_id = $2`;
    values.push(businessId);
  }

  const result = await pool.query<CompetitorRow>(query, values);
  return result.rows[0] || null;
}

export async function findByPlaceId(
  businessId: string,
  googlePlaceId: string
): Promise<CompetitorRow | null> {
  const result = await pool.query<CompetitorRow>(
    `SELECT ${SELECT_COLS}
     FROM competitors
     WHERE business_id = $1 AND google_place_id = $2`,
    [businessId, googlePlaceId]
  );
  return result.rows[0] || null;
}

export async function update(
  id: string,
  businessId: string,
  data: UpdateCompetitorData
): Promise<CompetitorRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(data.address);
  }
  if (data.latitude !== undefined) {
    fields.push(`latitude = $${paramIndex++}`);
    values.push(data.latitude);
  }
  if (data.longitude !== undefined) {
    fields.push(`longitude = $${paramIndex++}`);
    values.push(data.longitude);
  }
  if (data.primary_type !== undefined) {
    fields.push(`primary_type = $${paramIndex++}`);
    values.push(data.primary_type);
  }
  if (data.website !== undefined) {
    fields.push(`website = $${paramIndex++}`);
    values.push(data.website);
  }
  if (data.google_maps_url !== undefined) {
    fields.push(`google_maps_url = $${paramIndex++}`);
    values.push(data.google_maps_url);
  }
  if (data.rating !== undefined) {
    fields.push(`rating = $${paramIndex++}`);
    values.push(data.rating);
  }
  if (data.review_count !== undefined) {
    fields.push(`review_count = $${paramIndex++}`);
    values.push(data.review_count);
  }
  if (data.tracked !== undefined) {
    fields.push(`tracked = $${paramIndex++}`);
    values.push(data.tracked);
  }
  if (data.last_synced_at !== undefined) {
    fields.push(`last_synced_at = $${paramIndex++}`);
    values.push(data.last_synced_at);
  }

  if (fields.length === 0) {
    return findById(id, businessId);
  }

  fields.push(`updated_at = NOW()`);

  values.push(id, businessId);
  const result = await pool.query<CompetitorRow>(
    `UPDATE competitors
     SET ${fields.join(", ")}
     WHERE id = $${paramIndex++} AND business_id = $${paramIndex}
     RETURNING ${SELECT_COLS}`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteCompetitor(id: string, businessId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM competitors WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  );
  return (result.rowCount ?? 0) > 0;
}
