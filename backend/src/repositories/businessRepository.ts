import pool from "../services/database";

export interface Business {
  id: string;
  workspace_id?: string | null;
  name: string;
  description: string | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBusinessData {
  name: string;
  description?: string;
  workspace_id?: string;
  industry?: string;
  website?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
  workspace_id?: string;
  industry?: string;
  website?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
}

const SELECT_COLS = "id, workspace_id, name, description, industry, website, location, latitude, longitude, google_place_id, created_at, updated_at";

export async function findAll(): Promise<Business[]> {
  const result = await pool.query<Business>(
    `SELECT ${SELECT_COLS} FROM businesses ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function findByWorkspaceId(workspaceId: string): Promise<Business[]> {
  const result = await pool.query<Business>(
    `SELECT ${SELECT_COLS} FROM businesses WHERE workspace_id = $1 ORDER BY created_at DESC`,
    [workspaceId]
  );
  return result.rows;
}

export async function findBusinessesByUserId(userId: string): Promise<Business[]> {
  const result = await pool.query<Business>(
    `SELECT b.id, b.workspace_id, b.name, b.description, b.industry, b.website, b.location, b.latitude, b.longitude, b.google_place_id, b.created_at, b.updated_at
     FROM businesses b
     INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
     WHERE wm.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function findById(id: string): Promise<Business | null> {
  const result = await pool.query<Business>(
    `SELECT ${SELECT_COLS} FROM businesses WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function create(data: CreateBusinessData): Promise<Business> {
  const cols = ["name", "description", "workspace_id", "industry", "website", "location"];
  const vals: unknown[] = [
    data.name,
    data.description || null,
    data.workspace_id || null,
    data.industry || null,
    data.website || null,
    data.location || null,
  ];

  if (data.latitude !== undefined || data.longitude !== undefined || data.google_place_id !== undefined) {
    cols.push("latitude", "longitude", "google_place_id");
    vals.push(data.latitude ?? null, data.longitude ?? null, data.google_place_id || null);
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const result = await pool.query<Business>(
    `INSERT INTO businesses (${cols.join(", ")})
     VALUES (${placeholders})
     RETURNING ${SELECT_COLS}`,
    vals
  );
  return result.rows[0];
}

export async function update(
  id: string,
  data: UpdateBusinessData
): Promise<Business | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.workspace_id !== undefined) {
    fields.push(`workspace_id = $${paramIndex++}`);
    values.push(data.workspace_id);
  }
  if (data.industry !== undefined) {
    fields.push(`industry = $${paramIndex++}`);
    values.push(data.industry);
  }
  if (data.website !== undefined) {
    fields.push(`website = $${paramIndex++}`);
    values.push(data.website);
  }
  if (data.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(data.location);
  }
  if (data.latitude !== undefined) {
    fields.push(`latitude = $${paramIndex++}`);
    values.push(data.latitude);
  }
  if (data.longitude !== undefined) {
    fields.push(`longitude = $${paramIndex++}`);
    values.push(data.longitude);
  }
  if (data.google_place_id !== undefined) {
    fields.push(`google_place_id = $${paramIndex++}`);
    values.push(data.google_place_id);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await pool.query<Business>(
    `UPDATE businesses SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING ${SELECT_COLS}`,
    values
  );
  return result.rows[0] || null;
}
