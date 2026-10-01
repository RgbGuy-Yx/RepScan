import pool from "../services/database";

export interface User {
  id: string;
  auth_provider_id: string;
  email: string;
  name: string | null;
  created_at: Date;
}

export async function findById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT id, auth_provider_id, email, name, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findByAuthProviderId(authProviderId: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT id, auth_provider_id, email, name, created_at FROM users WHERE auth_provider_id = $1",
    [authProviderId]
  );
  return result.rows[0] || null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT id, auth_provider_id, email, name, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
}

export async function upsertFromClerk(
  authProviderId: string,
  email: string,
  name?: string | null
): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (auth_provider_id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (auth_provider_id)
     DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name)
     RETURNING id, auth_provider_id, email, name, created_at`,
    [authProviderId, email, name || null]
  );
  return result.rows[0];
}

export async function create(data: {
  auth_provider_id: string;
  email: string;
  name?: string | null;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (auth_provider_id, email, name)
     VALUES ($1, $2, $3)
     RETURNING id, auth_provider_id, email, name, created_at`,
    [data.auth_provider_id, data.email, data.name || null]
  );
  return result.rows[0];
}
