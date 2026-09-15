import { normalizeGoogleReview, scrapeGoogleReviews, getIngestionStatusForConnection, getScrapeRunsForConnection } from "../services/googleReviewsService";
import { schedulerService } from "../services/schedulerService";
import { AppError } from "../middleware/errorHandler";

// Mock database pool
jest.mock("../services/database", () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { __esModule: true, default: mockPool };
});

// Mock AI service
jest.mock("../services/aiService", () => ({
  processFeedback: jest.fn(),
  checkAIServiceHealth: jest.fn().mockResolvedValue(true),
}));

// Mock config
jest.mock("../config", () => ({
  config: {
    nodeEnv: "test",
    port: 3000,
    databaseUrl: "postgresql://test",
    aiServiceUrl: "http://localhost:8000",
    corsOrigins: ["*"],
    apifyToken: "test-apify-token",
    googleReviewsActorId: "compass~google-maps-reviews-scraper",
    scrapeIntervalMinutes: 60,
    enableScheduler: false,
  },
}));

import pool from "../services/database";
import { processFeedback } from "../services/aiService";

const mockPool = pool as unknown as { query: jest.Mock; connect: jest.Mock };
const mockProcessFeedback = processFeedback as jest.Mock;

const globalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = globalFetch;
});

describe("Phase 2 Data Ingestion Pipeline", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const connectionId = "22222222-2222-2222-2222-222222222222";
  const runId = "33333333-3333-3333-3333-333333333333";
  const sourceUrl = "https://maps.google.com/test-place";

  const sampleBusiness = { id: businessId, name: "Acme Cafe" };
  const sampleConnection = {
    id: connectionId,
    business_id: businessId,
    platform: "google",
    source_url: sourceUrl,
    external_id: "place-123",
    is_active: true,
    last_scraped_at: null,
  };

  describe("1. Review Normalization & Data Sanitization", () => {
    it("normalizes well-formed reviews and generates stable hash", () => {
      const record = {
        reviewText: "Amazing cappuccino and great atmosphere!",
        authorName: "Maya",
        rating: 5,
        publishedAt: "2026-09-01T12:00:00.000Z",
        reviewId: "rev-001",
      };

      const result = normalizeGoogleReview(record, sourceUrl);
      expect(result).toMatchObject({
        content: "Amazing cappuccino and great atmosphere!",
        author: "Maya",
        rating: 5,
        publishedAt: "2026-09-01T12:00:00.000Z",
        externalId: "rev-001",
        source: sourceUrl,
      });
      expect(result?.hash).toHaveLength(64);
    });

    it("sanitizes out-of-range or malformed ratings to null", () => {
      const highRating = normalizeGoogleReview({ text: "Super", rating: 10 }, sourceUrl);
      const negativeRating = normalizeGoogleReview({ text: "Bad", rating: -2 }, sourceUrl);
      const validStringRating = normalizeGoogleReview({ text: "Good", rating: "4.5" }, sourceUrl);

      expect(highRating?.rating).toBeNull();
      expect(negativeRating?.rating).toBeNull();
      expect(validStringRating?.rating).toBe(4.5);
    });

    it("sanitizes unparseable date strings to null to protect database timestamp integrity", () => {
      const validDate = normalizeGoogleReview({ text: "Test", publishedAt: "2026-08-15T09:30:00Z" }, sourceUrl);
      const invalidDate = normalizeGoogleReview({ text: "Test", publishedAt: "3 days ago" }, sourceUrl);

      expect(validDate?.publishedAt).toBe("2026-08-15T09:30:00.000Z");
      expect(invalidDate?.publishedAt).toBeNull();
    });

    it("skips records without valid review text content", () => {
      expect(normalizeGoogleReview({ authorName: "Ghost", rating: 5 }, sourceUrl)).toBeNull();
      expect(normalizeGoogleReview({ text: "   " }, sourceUrl)).toBeNull();
    });
  });

  describe("2. Concurrency & Overlap Prevention", () => {
    it("rejects scrape when an active scrape run is already in progress in DB (409 Conflict)", async () => {
      // 1. find business
      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      // 2. find connection
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      // 3. findActiveByConnectionId (timeout cleanup query)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 4. findActiveByConnectionId (select active running)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: "existing-run-id", status: "running", started_at: new Date() }],
      });

      await expect(scrapeGoogleReviews(businessId, connectionId)).rejects.toThrow(
        new AppError("A scrape job is already in progress for this platform connection", 409)
      );
    });
  });

  describe("3. Ingestion, Deduplication, and AI Pipeline", () => {
    it("ingests reviews, deduplicates existing items, processes pending through AI, and indexes them", async () => {
      const mockApifyData = [
        { reviewId: "rev-new-1", text: "Great espresso", authorName: "Alice", stars: 5 },
        { reviewId: "rev-existing-2", text: "Slow service", authorName: "Bob", stars: 2 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApifyData,
      });

      // 1. find business
      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      // 2. find connection
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      // 3. findActiveByConnectionId cleanup
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 4. findActiveByConnectionId check
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 5. create scrape_runs
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: runId }] });
      // 6. insertIfNew review 1 (inserted)
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: "raw-item-1" }] });
      // 7. insertIfNew review 2 (conflict/skipped)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 8. findPendingByConnection
      const pendingItems = [
        {
          id: "raw-item-1",
          business_id: businessId,
          platform: "google",
          content: "Great espresso",
          rating: 5,
          published_at: null,
          source_url: sourceUrl,
        },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: pendingItems });

      // Mock AI processing response
      mockProcessFeedback.mockResolvedValueOnce([
        {
          raw_item_id: "raw-item-1",
          language: "en",
          translated_content: null,
          sentiment_label: "positive",
          sentiment_score: 0.9,
          themes: ["coffee quality"],
          evidence: ["Great espresso"],
          model: "mistral-small-latest",
        },
      ]);

      // Mock database client for transaction in saveProcessed
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      // 9. succeed scrape_runs
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 10. markScraped platform_connection
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await scrapeGoogleReviews(businessId, connectionId);

      expect(result).toEqual({
        run_id: runId,
        records_fetched: 2,
        records_inserted: 1,
        records_skipped: 1,
      });

      expect(mockProcessFeedback).toHaveBeenCalledWith(pendingItems);
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("skips calling AI service when no pending reviews exist (idempotent scrape)", async () => {
      const mockApifyData = [
        { reviewId: "rev-existing-1", text: "Already processed review", authorName: "Alice", stars: 5 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApifyData,
      });

      // 1. find business
      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      // 2. find connection
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      // 3. findActive cleanup
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 4. findActive check
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 5. create scrape_runs
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: runId }] });
      // 6. insertIfNew (conflict -> skipped)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 7. findPendingByConnection (empty)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 8. succeed scrape_runs
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // 9. markScraped
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await scrapeGoogleReviews(businessId, connectionId);

      expect(result).toEqual({
        run_id: runId,
        records_fetched: 1,
        records_inserted: 0,
        records_skipped: 1,
      });
      expect(mockProcessFeedback).not.toHaveBeenCalled();
    });
  });

  describe("4. Resilient Failure Handling", () => {
    it("handles Apify network failure by recording failed scrape run with error message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => "Apify Bad Gateway",
      });

      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // cleanup
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // check active
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: runId }] }); // create run
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // fail run

      await expect(scrapeGoogleReviews(businessId, connectionId)).rejects.toThrow("Apify request failed (502)");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE scrape_runs"),
        expect.arrayContaining([runId, expect.stringContaining("Apify request failed (502)")])
      );
    });

    it("handles AI service failure: records scrape_runs as failed, preserves inserted items as pending and partial counts", async () => {
      const mockApifyData = [{ reviewId: "rev-new-1", text: "Tasty food", authorName: "Carol", stars: 5 }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApifyData,
      });

      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // cleanup
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // check active
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: runId }] }); // create run
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: "raw-item-1" }] }); // insert raw item
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: "raw-item-1", business_id: businessId, platform: "google", content: "Tasty food" }],
      }); // find pending

      // AI service fails with 503
      mockProcessFeedback.mockRejectedValueOnce(new Error("AI service unavailable (503)"));
      // fail scrape run
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(scrapeGoogleReviews(businessId, connectionId)).rejects.toThrow("AI service unavailable (503)");

      // Verify scrape run was marked as failed with partial counts preserved
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE scrape_runs"),
        expect.arrayContaining([runId, "AI service unavailable (503)", 1, 1, 0])
      );
    });
  });

  describe("5. Scheduled Scraping Service", () => {
    it("processes all active Google connections and isolates individual connection failures", async () => {
      const activeConnections = [
        { id: "conn-1", business_id: "biz-1", platform: "google", is_active: true },
        { id: "conn-2", business_id: "biz-2", platform: "google", is_active: true },
      ];

      // 1. findAllActiveByPlatform
      mockPool.query.mockResolvedValueOnce({ rows: activeConnections });

      // First connection succeeds
      // find business
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: "biz-1" }] });
      // find connection
      mockPool.query.mockResolvedValueOnce({ rows: [activeConnections[0]] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // cleanup
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // check active
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: "run-1" }] }); // create run
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // find pending
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // succeed run
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // mark scraped

      // Second connection fails at business lookup
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // business not found

      const summary = await schedulerService.runScheduledScrapes();

      expect(summary.attempted).toBe(2);
      expect(summary.succeeded).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.errors[0].connectionId).toBe("conn-2");
    });
  });

  describe("6. Ingestion & Scrape Status Queries", () => {
    it("returns accurate ingestion summary statistics and status", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] }); // find business
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] }); // find connection
      // getIngestionStats
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: "42", pending: "2", processed: "40", failed: "0" }],
      });
      // findByConnectionId (latest 1)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: runId, status: "succeeded", records_fetched: 10, records_inserted: 5 }],
      });
      // findActiveByConnectionId (cleanup + check)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const status = await getIngestionStatusForConnection(businessId, connectionId);

      expect(status).toEqual({
        connection: {
          id: connectionId,
          platform: "google",
          source_url: sourceUrl,
          is_active: true,
          last_scraped_at: null,
        },
        is_running: false,
        items_count: {
          total: 42,
          pending: 2,
          processed: 40,
          failed: 0,
        },
        latest_scrape: {
          id: runId,
          status: "succeeded",
          records_fetched: 10,
          records_inserted: 5,
        },
      });
    });

    it("returns scrape runs list for connection", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [sampleBusiness] });
      mockPool.query.mockResolvedValueOnce({ rows: [sampleConnection] });
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: "run-1", status: "succeeded" },
          { id: "run-2", status: "failed" },
        ],
      });

      const runs = await getScrapeRunsForConnection(businessId, connectionId, 10);
      expect(runs).toHaveLength(2);
      expect(runs[0].id).toBe("run-1");
    });
  });
});
