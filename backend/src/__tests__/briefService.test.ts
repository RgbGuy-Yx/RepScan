import {
  generateWeeklyBrief,
  getWeeklyComparison,
  getLatestBrief,
  getBriefById,
  listBriefs,
} from "../services/briefService";
import * as businessRepo from "../repositories/businessRepository";
import * as analyticsRepo from "../repositories/analyticsRepository";
import * as briefRepo from "../repositories/briefRepository";
import * as aiService from "../services/aiService";
import { AppError } from "../middleware/errorHandler";

jest.mock("../repositories/businessRepository");
jest.mock("../repositories/analyticsRepository");
jest.mock("../repositories/briefRepository");
jest.mock("../services/aiService");

const mockBusinessRepo = businessRepo as jest.Mocked<typeof businessRepo>;
const mockAnalyticsRepo = analyticsRepo as jest.Mocked<typeof analyticsRepo>;
const mockBriefRepo = briefRepo as jest.Mocked<typeof briefRepo>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe("Phase 3: Grounded Brief Service & Storage", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const briefId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  const sampleBusiness = {
    id: businessId,
    name: "Acme Coffee",
    description: "Best beans in town",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleCurrentReviews: analyticsRepo.AnalyzedReviewRow[] = [
    {
      id: "r1111111-1111-1111-1111-111111111111",
      business_id: businessId,
      platform: "google",
      rating: 5,
      effective_date: new Date("2026-09-12T00:00:00Z"),
      published_at: new Date("2026-09-12T00:00:00Z"),
      created_at: new Date("2026-09-12T00:00:00Z"),
      content: "Loved the caramel macchiato and polite baristas!",
      author: "Alice",
      source_url: null,
      sentiment_label: "positive",
      sentiment_score: 0.95,
      themes: ["Coffee Quality", "Customer Service"],
      evidence: ["Loved the caramel macchiato", "polite baristas"],
    },
    {
      id: "r2222222-2222-2222-2222-222222222222",
      business_id: businessId,
      platform: "google",
      rating: 1,
      effective_date: new Date("2026-09-13T00:00:00Z"),
      published_at: new Date("2026-09-13T00:00:00Z"),
      created_at: new Date("2026-09-13T00:00:00Z"),
      content: "Waited 40 minutes in line, awful wait time.",
      author: "Bob",
      source_url: null,
      sentiment_label: "negative",
      sentiment_score: -0.85,
      themes: ["Wait Time"],
      evidence: ["Waited 40 minutes"],
    },
    {
      id: "r3333333-3333-3333-3333-333333333333",
      business_id: businessId,
      platform: "google",
      rating: 1,
      effective_date: new Date("2026-09-14T00:00:00Z"),
      published_at: new Date("2026-09-14T00:00:00Z"),
      created_at: new Date("2026-09-14T00:00:00Z"),
      content: "Excessive wait time again today.",
      author: "Charlie",
      source_url: null,
      sentiment_label: "negative",
      sentiment_score: -0.8,
      themes: ["Wait Time"],
      evidence: ["Excessive wait time"],
    },
  ];

  const samplePreviousReviews: analyticsRepo.AnalyzedReviewRow[] = [
    {
      id: "r0000000-0000-0000-0000-000000000000",
      business_id: businessId,
      platform: "google",
      rating: 5,
      effective_date: new Date("2026-09-05T00:00:00Z"),
      published_at: new Date("2026-09-05T00:00:00Z"),
      created_at: new Date("2026-09-05T00:00:00Z"),
      content: "Great espresso.",
      author: "Dave",
      source_url: null,
      sentiment_label: "positive",
      sentiment_score: 0.9,
      themes: ["Coffee Quality"],
      evidence: ["Great espresso"],
    },
  ];

  const samplePlatforms: analyticsRepo.PlatformStatusRow[] = [
    { platform: "google", is_active: true, last_scraped_at: new Date("2026-09-14T10:00:00Z") },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
    mockAnalyticsRepo.getAnalyzedReviewsForPeriod.mockImplementation(
      async (_bId, start, _end) => {
        // Return current reviews if start is recent, else previous
        if (start.getTime() > new Date("2026-09-06T00:00:00Z").getTime()) {
          return sampleCurrentReviews;
        }
        return samplePreviousReviews;
      }
    );
    mockAnalyticsRepo.getConnectedPlatformsForBusiness.mockResolvedValue(samplePlatforms);
    mockAnalyticsRepo.getLatestReviewDateForBusiness.mockResolvedValue(new Date("2026-09-14T00:00:00Z"));
  });

  describe("getWeeklyComparison", () => {
    it("computes current vs previous week comparison and confidence", async () => {
      const result = await getWeeklyComparison(
        businessId,
        "2026-09-08T00:00:00.000Z",
        "2026-09-15T00:00:00.000Z"
      );

      expect(result.business_id).toBe(businessId);
      expect(result.current_week.totalReviews).toBe(3);
      expect(result.current_week.ratingStats.averageRating).toBe(2.33);
      expect(result.previous_week.totalReviews).toBe(1);

      // Meaningful change should capture surge in Wait Time negative reviews
      expect(result.meaningful_changes).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(["High", "Medium", "Low"]).toContain(result.confidence.level);
    });

    it("throws 404 if business does not exist", async () => {
      mockBusinessRepo.findById.mockResolvedValue(null);
      await expect(
        getWeeklyComparison("99999999-9999-9999-9999-999999999999")
      ).rejects.toThrow(AppError);
    });
  });

  describe("generateWeeklyBrief", () => {
    it("generates grounded weekly brief using AI service and persists it in PostgreSQL", async () => {
      mockAiService.generateBriefSummary.mockResolvedValue({
        summary_text: "Acme Coffee saw 3 reviews this week with 2 complaints regarding wait time and 1 praise for coffee quality.",
        top_complaints: [
          {
            theme: "Wait Time",
            summary: "Customers complained about long lines and delays.",
            evidence_quote: "Waited 40 minutes in line",
          },
        ],
        top_praises: [
          {
            theme: "Coffee Quality",
            summary: "Customers loved the macchiato.",
            evidence_quote: "Loved the caramel macchiato",
          },
        ],
      });

      mockBriefRepo.insertBrief.mockResolvedValue({
        id: briefId,
        business_id: businessId,
        period_start: new Date("2026-09-08T00:00:00.000Z"),
        period_end: new Date("2026-09-15T00:00:00.000Z"),
        summary_text: "Acme Coffee saw 3 reviews this week with 2 complaints regarding wait time and 1 praise for coffee quality.",
        top_complaints: [
          {
            theme: "Wait Time",
            summary: "Customers complained about long lines and delays.",
            evidence_quote: "Waited 40 minutes in line",
          },
        ],
        top_praises: [
          {
            theme: "Coffee Quality",
            summary: "Customers loved the macchiato.",
            evidence_quote: "Loved the caramel macchiato",
          },
        ],
        meaningful_changes: [],
        confidence: "Medium",
        confidence_score: 0.65,
        limitations: ["Sample size is small (3 reviews this week)."],
        metrics: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      const brief = await generateWeeklyBrief(businessId, {
        startDate: "2026-09-08T00:00:00.000Z",
        endDate: "2026-09-15T00:00:00.000Z",
        forceRefresh: false,
      });

      expect(mockAiService.generateBriefSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          business_name: "Acme Coffee",
          total_reviews: 3,
          previous_total_reviews: 1,
          sentiment_distribution: { positive: 1, neutral: 0, negative: 2 },
          top_complaints: expect.arrayContaining([
            expect.objectContaining({ theme: "Wait Time", count: 2 }),
          ]),
          top_praises: expect.arrayContaining([
            expect.objectContaining({ theme: "Coffee Quality", count: 1 }),
          ]),
        })
      );

      expect(mockBriefRepo.insertBrief).toHaveBeenCalled();
      expect(brief.id).toBe(briefId);
      expect(brief.top_complaints[0].evidence_quote).toBe("Waited 40 minutes in line");
    });

    it("throws AppError when AI service fails rather than using fallback", async () => {
      mockAiService.generateBriefSummary.mockRejectedValue(
        new AppError("AI service is currently unavailable", 503)
      );

      await expect(
        generateWeeklyBrief(businessId, {
          startDate: "2026-09-08T00:00:00.000Z",
          endDate: "2026-09-15T00:00:00.000Z",
          forceRefresh: false,
        })
      ).rejects.toThrow("AI service is currently unavailable");

      expect(mockBriefRepo.insertBrief).not.toHaveBeenCalled();
    });
  });

  describe("Brief queries: getLatestBrief, getBriefById, listBriefs", () => {
    it("retrieves latest brief for a business", async () => {
      mockBriefRepo.getLatestBriefForBusiness.mockResolvedValue({
        id: briefId,
        business_id: businessId,
        period_start: new Date("2026-09-08T00:00:00.000Z"),
        period_end: new Date("2026-09-15T00:00:00.000Z"),
        summary_text: "Latest brief",
        top_complaints: [],
        top_praises: [],
        meaningful_changes: [],
        confidence: "High",
        confidence_score: 0.88,
        limitations: [],
        metrics: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      const brief = await getLatestBrief(businessId);
      expect(brief).toBeDefined();
      expect(brief?.id).toBe(briefId);
    });

    it("retrieves brief by ID and throws 404 when missing", async () => {
      mockBriefRepo.getBriefById.mockResolvedValue(null);

      await expect(
        getBriefById(businessId, "non-existent-brief-id")
      ).rejects.toThrow(AppError);
    });

    it("lists briefs with pagination", async () => {
      mockBriefRepo.listBriefsForBusiness.mockResolvedValue({
        briefs: [
          {
            id: briefId,
            business_id: businessId,
            period_start: new Date("2026-09-08T00:00:00.000Z"),
            period_end: new Date("2026-09-15T00:00:00.000Z"),
            summary_text: "Brief 1",
            top_complaints: [],
            top_praises: [],
            meaningful_changes: [],
            confidence: "High",
            confidence_score: 0.9,
            limitations: [],
            metrics: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
      });

      const result = await listBriefs(businessId, 10, 0);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
