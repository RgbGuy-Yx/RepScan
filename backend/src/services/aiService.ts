import { config } from "../config";
import { logger } from "../config/logger";
import type { PendingRawItem, ProcessedFeedback } from "../repositories/feedbackRepository";

export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${config.aiServiceUrl}/api/v1/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (err) {
    logger.warn("AI service health check failed:", err);
    return false;
  }
}

export async function processFeedback(items: PendingRawItem[]): Promise<ProcessedFeedback[]> {
  const response = await fetch(`${config.aiServiceUrl}/api/v1/feedback/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`AI processing failed (${response.status}): ${await response.text()}`);
  }
  const body = await response.json() as { items?: ProcessedFeedback[] };
  if (!body.items || body.items.length !== items.length) {
    throw new Error("AI processing returned an incomplete result");
  }
  return body.items;
}
