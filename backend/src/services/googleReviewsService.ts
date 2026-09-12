import crypto from "crypto";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import * as feedbackRepo from "../repositories/feedbackRepository";
import * as businessRepo from "../repositories/businessRepository";
import * as platformRepo from "../repositories/platformConnectionRepository";
import * as scrapeRunRepo from "../repositories/scrapeRunRepository";
import { processFeedback } from "./aiService";

type ApifyReview = Record<string, unknown>;

function firstString(item: ApifyReview, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberValue(item: ApifyReview, keys: string[]): number | null {
  for (const key of keys) {
    const value = item[key];
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export function normalizeGoogleReview(item: ApifyReview, sourceUrl: string) {
  const content = firstString(item, ["text", "reviewText", "review", "content", "comment"]);
  if (!content) return null;
  const author = firstString(item, ["authorName", "reviewerName", "author", "name"]);
  const publishedAt = firstString(item, ["publishedAt", "published_at", "date", "reviewDate", "dateOfReview"]);
  const externalId = firstString(item, ["reviewId", "review_id", "id"]);
  const source = firstString(item, ["reviewUrl", "url", "sourceUrl"]) || sourceUrl;
  const hash = crypto.createHash("sha256")
    .update([author || "", publishedAt || "", content].join("\u0000"))
    .digest("hex");
  return { content, author, publishedAt, externalId, source, rating: numberValue(item, ["rating", "stars", "score"]), hash };
}

async function fetchApifyReviews(sourceUrl: string): Promise<ApifyReview[]> {
  if (!config.apifyToken || !config.googleReviewsActorId) {
    throw new AppError("APIFY_API_TOKEN and APIFY_GOOGLE_REVIEWS_ACTOR_ID must be configured", 503);
  }
  const actor = encodeURIComponent(config.googleReviewsActorId);
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?clean=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apifyToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: sourceUrl }], maxReviews: 500 }),
      signal: AbortSignal.timeout(300_000),
    }
  );
  if (!response.ok) throw new Error(`Apify request failed (${response.status}): ${await response.text()}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Apify actor did not return dataset items");
  return data.filter((item): item is ApifyReview => Boolean(item) && typeof item === "object");
}

export async function scrapeGoogleReviews(businessId: string, connectionId: string) {
  const business = await businessRepo.findById(businessId);
  if (!business) throw new AppError("Business not found", 404);
  const connection = await platformRepo.findById(connectionId);
  if (!connection || connection.business_id !== businessId) throw new AppError("Platform connection not found", 404);
  if (connection.platform !== "google") throw new AppError("Only Google Reviews ingestion is available", 400);
  if (!connection.is_active) throw new AppError("Platform connection is inactive", 409);

  const runId = await scrapeRunRepo.create({ businessId, connectionId, platform: connection.platform });
  try {
    const records = await fetchApifyReviews(connection.source_url);
    let inserted = 0;
    let skipped = 0;
    for (const record of records) {
      const review = normalizeGoogleReview(record, connection.source_url);
      if (!review) { skipped++; continue; }
      const id = await feedbackRepo.insertIfNew({
        business_id: businessId, platform_connection_id: connectionId, platform: "google",
        external_id: review.externalId, author: review.author, content: review.content,
        content_hash: review.hash, rating: review.rating, published_at: review.publishedAt,
        source_url: review.source, raw_payload: record,
      });
      if (id) inserted++; else skipped++;
    }

    const pending = await feedbackRepo.findPendingByConnection(connectionId);
    if (pending.length) {
      const processed = await processFeedback(pending);
      for (const item of processed) await feedbackRepo.saveProcessed(item);
    }

    await scrapeRunRepo.succeed(runId, { fetched: records.length, inserted, skipped });
    await platformRepo.markScraped(connectionId);
    return { run_id: runId, records_fetched: records.length, records_inserted: inserted, records_skipped: skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    await scrapeRunRepo.fail(runId, message);
    throw error;
  }
}
