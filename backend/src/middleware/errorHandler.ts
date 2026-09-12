import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message} — ${req.method} ${req.path}`);
    res.status(err.statusCode).json({ status: "error", message: err.message });
    return;
  }

  logger.error(`Unhandled error: ${err.message} — ${req.method} ${req.path}`);
  res.status(500).json({ status: "error", message: "Internal server error" });
}
