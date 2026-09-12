import pool from "../services/database";

export interface Business {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBusinessData {
  name: string;
  description?: string;
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
}

export async function findAll(): Promise<Business[]> {
  const result = await pool.query<Business>(
    "SELECT id, name, description, created_at, updated_at FROM businesses ORDER BY created_at DESC"
  );
  return result.rows;
}

export async function findById(id: string): Promise<Business | null> {
  const result = await pool.query<Business>(
    "SELECT id, name, description, created_at, updated_at FROM businesses WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function create(data: CreateBusinessData): Promise<Business> {
  const result = await pool.query<Business>(
    "INSERT INTO businesses (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at, updated_at",
    [data.name, data.description || null]
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

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await pool.query<Business>(
    `UPDATE businesses SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, description, created_at, updated_at`,
    values
  );
  return result.rows[0] || null;
}
