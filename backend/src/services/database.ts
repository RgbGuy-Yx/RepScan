import pg from "pg";
import { config } from "../config";
import { logger } from "../config/logger";

const poolConfig: pg.PoolConfig = {
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
};

if (config.databaseSsl) {
  poolConfig.ssl = config.databaseSsl;
}

const pool = new pg.Pool(poolConfig);

pool.on("error", (err) => {
  logger.error("Unexpected database pool error:", err);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (err) {
    logger.error("Database connection check failed:", err);
    return false;
  }
}

export default pool;
