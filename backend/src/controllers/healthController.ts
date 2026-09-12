import type { Request, Response } from "express";
import { checkDatabaseConnection } from "../services/database";
import { checkAIServiceHealth } from "../services/aiService";

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const [postgres, aiService] = await Promise.all([
    checkDatabaseConnection(),
    checkAIServiceHealth(),
  ]);

  const status = postgres && aiService ? "healthy" : "degraded";

  res.json({ status, postgres, aiService });
}
