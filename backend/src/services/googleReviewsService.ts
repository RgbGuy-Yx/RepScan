import crypto from "crypto";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import * as feedbackRepo from "../repositories/feedbackRepository";
import * as businessRepo from "../repositories/businessRepository";
import * as platformRepo from "../repositories/platformConnectionRepository";
import * as scrapeRunRepo from "../repositories/scrapeRunRepository";
import { processFeedback } from "./aiService";

type ApifyReview = Record<string, unknown>;

// In-memory mutex per connectionId to prevent concurrent scrape calls in the same process
const activeConnectionScrapes = new Set<string>();

function firstString(item: ApifyReview, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseRating(item: ApifyReview, keys: string[]): number | null {
  for (const key of keys) {
    const value = item[key];
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number >= 0 && number <= 5) {
      return Math.round(number * 10) / 10;
    }
  }
  return null;
}

function parseDate(item: ApifyReview, keys: string[]): string | null {
  const rawDate = firstString(item, keys);
  if (!rawDate) return null;
  const timestamp = Date.parse(rawDate);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function normalizeGoogleReview(item: ApifyReview, sourceUrl: string) {
  const content = firstString(item, ["text", "reviewText", "review", "content", "comment"]);
  if (!content) return null;
  const author = firstString(item, ["authorName", "reviewerName", "author", "name"]);
  const publishedAt = parseDate(item, ["publishedAt", "published_at", "date", "reviewDate", "dateOfReview"]);
  const externalId = firstString(item, ["reviewId", "review_id", "id"]);
  const source = firstString(item, ["reviewUrl", "url", "sourceUrl"]) || sourceUrl;
  const rating = parseRating(item, ["rating", "stars", "score"]);
  const hash = crypto.createHash("sha256")
    .update([author || "", publishedAt || "", content].join("\u0000"))
    .digest("hex");
  return { content, author, publishedAt, externalId, source, rating, hash };
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

  // Prevent overlapping scrapes: in-memory check
  if (activeConnectionScrapes.has(connectionId)) {
    throw new AppError("A scrape job is already in progress for this platform connection", 409);
  }

  // Prevent overlapping scrapes: database check (and timeout cleanup)
  const activeRun = await scrapeRunRepo.findActiveByConnectionId(connectionId);
  if (activeRun) {
    throw new AppError("A scrape job is already in progress for this platform connection", 409);
  }

  activeConnectionScrapes.add(connectionId);

  const runId = await scrapeRunRepo.create({ businessId, connectionId, platform: connection.platform });
  let fetchedCount = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    const records = await fetchApifyReviews(connection.source_url);
    fetchedCount = records.length;

    for (const record of records) {
      const review = normalizeGoogleReview(record, connection.source_url);
      if (!review) {
        skipped++;
        continue;
      }
      const id = await feedbackRepo.insertIfNew({
        business_id: businessId,
        platform_connection_id: connectionId,
        platform: "google",
        external_id: review.externalId,
        author: review.author,
        content: review.content,
        content_hash: review.hash,
        rating: review.rating,
        published_at: review.publishedAt,
        source_url: review.source,
        raw_payload: record,
      });
      if (id) inserted++;
      else skipped++;
    }

    const pending = await feedbackRepo.findPendingByConnection(connectionId);
    if (pending.length) {
      const processed = await processFeedback(pending);
      for (const item of processed) await feedbackRepo.saveProcessed(item);
    }

    await scrapeRunRepo.succeed(runId, { fetched: fetchedCount, inserted, skipped });
    await platformRepo.markScraped(connectionId);
    return { run_id: runId, records_fetched: fetchedCount, records_inserted: inserted, records_skipped: skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    await scrapeRunRepo.fail(runId, message, { fetched: fetchedCount, inserted, skipped });
    throw error;
  } finally {
    activeConnectionScrapes.delete(connectionId);
  }
}

export async function getScrapeRunsForConnection(businessId: string, connectionId: string, limit?: number) {
  const business = await businessRepo.findById(businessId);
  if (!business) throw new AppError("Business not found", 404);
  const connection = await platformRepo.findById(connectionId);
  if (!connection || connection.business_id !== businessId) throw new AppError("Platform connection not found", 404);

  return scrapeRunRepo.findByConnectionId(connectionId, limit);
}

export async function getScrapeRunById(businessId: string, connectionId: string, runId: string) {
  const business = await businessRepo.findById(businessId);
  if (!business) throw new AppError("Business not found", 404);
  const connection = await platformRepo.findById(connectionId);
  if (!connection || connection.business_id !== businessId) throw new AppError("Platform connection not found", 404);

  const run = await scrapeRunRepo.findById(runId);
  if (!run || run.platform_connection_id !== connectionId) {
    throw new AppError("Scrape run not found", 404);
  }
  return run;
}

export async function getIngestionStatusForConnection(businessId: string, connectionId: string) {
  const business = await businessRepo.findById(businessId);
  if (!business) throw new AppError("Business not found", 404);
  const connection = await platformRepo.findById(connectionId);
  if (!connection || connection.business_id !== businessId) throw new AppError("Platform connection not found", 404);

  const [stats, recentRuns, activeRun] = await Promise.all([
    scrapeRunRepo.getIngestionStats(connectionId),
    scrapeRunRepo.findByConnectionId(connectionId, 1),
    scrapeRunRepo.findActiveByConnectionId(connectionId),
  ]);

  return {
    connection: {
      id: connection.id,
      platform: connection.platform,
      source_url: connection.source_url,
      is_active: connection.is_active,
      last_scraped_at: connection.last_scraped_at,
    },
    is_running: Boolean(activeRun || activeConnectionScrapes.has(connectionId)),
    items_count: stats,
    latest_scrape: recentRuns[0] || null,
  };
}

