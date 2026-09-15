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
import { schedulerService } from "./services/schedulerService";

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
    const server = app.listen(config.port, () => {
      logger.info(`RepScan Backend v1.0.0 started on port ${config.port} (${config.nodeEnv})`);
      if (config.enableScheduler) {
        schedulerService.start();
      }
    });

    const shutdown = () => {
      logger.info("Shutting down gracefully...");
      schedulerService.stop();
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

export default app;

