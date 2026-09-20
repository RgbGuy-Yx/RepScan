import type { Request, Response, NextFunction } from "express";
import { getWeeklyAnalytics } from "../controllers/analyticsController";
import {
  createWeeklyBrief,
  getLatestBriefHandler,
  getBriefByIdHandler,
  listBriefsHandler,
} from "../controllers/briefController";
import * as briefService from "../services/briefService";

jest.mock("../services/briefService");

const mockBriefService = briefService as jest.Mocked<typeof briefService>;

describe("Phase 3: Analytics & Briefs Controllers", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const briefId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let responseData: unknown;
  let responseStatus: number;

  beforeEach(() => {
    jest.clearAllMocks();
    responseStatus = 200;
    responseData = null;
    mockNext = jest.fn();

    mockRes = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatus = code;
        return mockRes;
      }),
      json: jest.fn().mockImplementation((body: unknown) => {
        responseData = body;
        return mockRes;
      }),
    };
  });

  describe("GET /api/v1/businesses/:id/analytics/weekly", () => {
    it("returns 200 with weekly analytics data", async () => {
      mockReq = {
        params: { id: businessId },
        query: { startDate: "2026-09-08T00:00:00.000Z", endDate: "2026-09-15T00:00:00.000Z" },
      };

      const mockAnalyticsResult = {
        business_id: businessId,
        current_week: {
          periodStart: "2026-09-08T00:00:00.000Z",
          periodEnd: "2026-09-15T00:00:00.000Z",
          totalReviews: 5,
          ratingStats: { averageRating: 4.2, totalRated: 5, distribution: { "1": 0, "2": 0, "3": 1, "4": 2, "5": 2 } },
          sentimentDistribution: { positive: 4, neutral: 1, negative: 0, total: 5, averageScore: 0.7 },
          themes: [],
          platformCoverage: [{ platform: "google", count: 5, isActive: true }],
        },
        previous_week: {
          periodStart: "2026-09-01T00:00:00.000Z",
          periodEnd: "2026-09-08T00:00:00.000Z",
          totalReviews: 3,
          ratingStats: { averageRating: 4.0, totalRated: 3, distribution: { "1": 0, "2": 0, "3": 1, "4": 1, "5": 1 } },
          sentimentDistribution: { positive: 2, neutral: 1, negative: 0, total: 3, averageScore: 0.6 },
          themes: [],
          platformCoverage: [{ platform: "google", count: 3, isActive: true }],
        },
        meaningful_changes: [],
        confidence: {
          level: "Medium" as const,
          score: 0.72,
          signals: { evidenceCount: 5, sourceCoverageRatio: 1, freshnessDays: 1, consistencyScore: 0.95 },
          limitations: [],
        },
        limitations: [],
      };

      mockBriefService.getWeeklyComparison.mockResolvedValue(mockAnalyticsResult);

      await getWeeklyAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        status: "success",
        data: mockAnalyticsResult,
      });
    });
  });

  describe("POST /api/v1/businesses/:id/briefs/generate", () => {
    it("returns 201 with generated brief", async () => {
      mockReq = {
        params: { id: businessId },
        body: { startDate: "2026-09-08T00:00:00.000Z", endDate: "2026-09-15T00:00:00.000Z", forceRefresh: true },
      };

      const mockBriefResponse = {
        id: briefId,
        business_id: businessId,
        period_start: "2026-09-08T00:00:00.000Z",
        period_end: "2026-09-15T00:00:00.000Z",
        summary_text: "Weekly executive brief",
        top_complaints: [],
        top_praises: [],
        meaningful_changes: [],
        confidence: "High" as const,
        confidence_score: 0.85,
        limitations: [],
        metrics: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockBriefService.generateWeeklyBrief.mockResolvedValue(mockBriefResponse);

      await createWeeklyBrief(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(201);
      expect(responseData).toEqual({
        status: "success",
        data: mockBriefResponse,
      });
    });
  });

  describe("GET /api/v1/businesses/:id/briefs/latest", () => {
    it("returns 200 with latest brief when found", async () => {
      mockReq = {
        params: { id: businessId },
      };

      const mockBriefResponse = {
        id: briefId,
        business_id: businessId,
        period_start: "2026-09-08T00:00:00.000Z",
        period_end: "2026-09-15T00:00:00.000Z",
        summary_text: "Latest brief",
        top_complaints: [],
        top_praises: [],
        meaningful_changes: [],
        confidence: "High" as const,
        confidence_score: 0.9,
        limitations: [],
        metrics: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockBriefService.getLatestBrief.mockResolvedValue(mockBriefResponse);

      await getLatestBriefHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        status: "success",
        data: mockBriefResponse,
      });
    });

    it("returns 404 when no brief exists for business", async () => {
      mockReq = {
        params: { id: businessId },
      };

      mockBriefService.getLatestBrief.mockResolvedValue(null);

      await getLatestBriefHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(404);
    });
  });

  describe("GET /api/v1/businesses/:id/briefs/:briefId", () => {
    it("returns 200 with requested brief", async () => {
      mockReq = {
        params: { id: businessId, briefId },
      };

      const mockBriefResponse = {
        id: briefId,
        business_id: businessId,
        period_start: "2026-09-08T00:00:00.000Z",
        period_end: "2026-09-15T00:00:00.000Z",
        summary_text: "Specific brief",
        top_complaints: [],
        top_praises: [],
        meaningful_changes: [],
        confidence: "Medium" as const,
        confidence_score: 0.65,
        limitations: [],
        metrics: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockBriefService.getBriefById.mockResolvedValue(mockBriefResponse);

      await getBriefByIdHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        status: "success",
        data: mockBriefResponse,
      });
    });
  });

  describe("GET /api/v1/businesses/:id/briefs", () => {
    it("returns 200 with paginated brief list", async () => {
      mockReq = {
        params: { id: businessId },
        query: { limit: "5", offset: "0" },
      };

      mockBriefService.listBriefs.mockResolvedValue({
        data: [],
        total: 0,
        limit: 5,
        offset: 0,
      });

      await listBriefsHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        status: "success",
        data: [],
        total: 0,
        limit: 5,
        offset: 0,
      });
    });
  });
});
