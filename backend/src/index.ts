import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import { v1Router } from "./routes/v1";
import { runMigrations } from "./services/migrations";

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(morgan("combined", { stream: { write: (msg: string) => logger.info(msg.trim()) } }));

// ── Routes ───────────────────────────────────────────────────
app.use("/api", v1Router);

// ── Error handling ───────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    app.listen(config.port, () => {
      logger.info(`RepScan Backend v1.0.0 started on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

export default app;
