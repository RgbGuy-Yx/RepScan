import fs from "fs";
import path from "path";
import pool from "./database";
import { logger } from "../config/logger";

function getMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, "../database/migrations"),
    path.join(__dirname, "../../src/database/migrations"),
    path.join(process.cwd(), "src/database/migrations"),
    path.join(process.cwd(), "backend/src/database/migrations"),
    path.join(process.cwd(), "Repscan/backend/src/database/migrations"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, "../database/migrations");
}

const MIGRATIONS_DIR = getMigrationsDir();

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query("SELECT filename FROM schema_migrations ORDER BY id");
  return new Set(result.rows.map((r: { filename: string }) => r.filename));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    logger.info(`Applying migration: ${file}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      logger.info(`Migration applied: ${file}`);
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        logger.error(`Rollback failed for migration: ${file}`, rollbackErr);
      }
      logger.error(`Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}
