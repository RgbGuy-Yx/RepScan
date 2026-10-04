import {
  getAICacheStats,
  invalidateAICache,
  clearAICache,
  generateBriefSummary,
  generateReportAIBrief,
  executeRagChat,
} from "../services/aiService";
import { config } from "../config";

describe("AI Response Cache Layer (Backend Client Integration)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retrieves cache stats from AI service", async () => {
    const mockStats = {
      active_entries: 5,
      hits: 12,
      misses: 3,
      hit_ratio: 0.8,
      estimated_tokens_saved: 24000,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockStats),
    } as any);

    const stats = await getAICacheStats();
    expect(stats).toEqual(mockStats);
    expect(global.fetch).toHaveBeenCalledWith(
      `${config.aiServiceUrl}/api/v1/cache/stats`,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("invalidates AI cache by business ID", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, invalidated_count: 2 }),
    } as any);

    const success = await invalidateAICache({ businessId: "biz-123" });
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      `${config.aiServiceUrl}/api/v1/cache/invalidate`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          business_id: "biz-123",
        }),
      })
    );
  });

  it("clears entire AI cache", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, invalidated_count: 10 }),
    } as any);

    const success = await clearAICache();
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      `${config.aiServiceUrl}/api/v1/cache/clear`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("forwards cache metadata and parameters in generateReportAIBrief", async () => {
    const mockReportResponse = {
      summary: "High customer satisfaction observed.",
      key_changes: [],
      strengths: [],
      areas_to_improve: [],
      recommendations: [],
      cached: true,
      cache_key: "report_brief:biz-1:key123",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockReportResponse),
    } as any);

    const payload = {
      business_id: "biz-1",
      data_version: "data-v1",
      business_name: "Test Business",
      report_type: "weekly",
      period_start: "2026-09-01",
      period_end: "2026-09-08",
      total_reviews: 10,
      previous_total_reviews: 8,
      average_rating: 4.7,
      previous_average_rating: 4.5,
      sentiment_distribution: { positive: 8, neutral: 1, negative: 1 },
      top_themes: [],
      meaningful_changes: [],
      confidence: "High" as const,
      limitations: [],
      sample_evidence: [],
    };

    const res = await generateReportAIBrief(payload);
    expect(res.cached).toBe(true);
    expect(res.cache_key).toBe("report_brief:biz-1:key123");

    expect(global.fetch).toHaveBeenCalledWith(
      `${config.aiServiceUrl}/api/v1/reports/ai-brief`,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"business_id":"biz-1"'),
      })
    );
  });
});
