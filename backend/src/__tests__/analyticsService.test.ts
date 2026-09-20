import {
  aggregateWeeklyMetrics,
  classifyThemeChange,
  detectMeaningfulChanges,
  calculateConfidenceAndLimitations,
} from "../services/analyticsService";
import type { AnalyzedReviewRow, PlatformStatusRow } from "../repositories/analyticsRepository";
import type { WeeklyMetrics } from "../schemas/analyticsSchemas";

describe("Phase 3: Analytics Service & Trust Layer", () => {
  const periodStart = new Date("2026-09-08T00:00:00.000Z");
  const periodEnd = new Date("2026-09-15T00:00:00.000Z");

  const mockConnectedPlatforms: PlatformStatusRow[] = [
    { platform: "google", is_active: true, last_scraped_at: new Date("2026-09-14T10:00:00Z") },
    { platform: "instagram", is_active: true, last_scraped_at: new Date("2026-09-14T10:00:00Z") },
  ];

  describe("1. Weekly Aggregation of Sentiment, Ratings, Themes, and Counts", () => {
    it("aggregates review sentiment, star ratings, and theme metrics correctly", () => {
      const reviews: AnalyzedReviewRow[] = [
        {
          id: "11111111-1111-1111-1111-111111111111",
          business_id: "biz-1",
          platform: "google",
          rating: 5,
          effective_date: new Date("2026-09-10T12:00:00Z"),
          published_at: new Date("2026-09-10T12:00:00Z"),
          created_at: new Date("2026-09-10T12:00:00Z"),
          content: "Excellent coffee and friendly staff!",
          author: "Alice",
          source_url: null,
          sentiment_label: "positive",
          sentiment_score: 0.9,
          themes: ["Coffee Quality", "Customer Service"],
          evidence: ["Excellent coffee", "friendly staff"],
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          business_id: "biz-1",
          platform: "google",
          rating: 4,
          effective_date: new Date("2026-09-11T12:00:00Z"),
          published_at: new Date("2026-09-11T12:00:00Z"),
          created_at: new Date("2026-09-11T12:00:00Z"),
          content: "Great coffee but staff was slow.",
          author: "Bob",
          source_url: null,
          sentiment_label: "neutral",
          sentiment_score: 0.1,
          themes: ["Coffee Quality", "Wait Time"],
          evidence: ["Great coffee", "staff was slow"],
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          business_id: "biz-1",
          platform: "google",
          rating: 1,
          effective_date: new Date("2026-09-12T12:00:00Z"),
          published_at: new Date("2026-09-12T12:00:00Z"),
          created_at: new Date("2026-09-12T12:00:00Z"),
          content: "Terrible wait time and cold coffee.",
          author: "Charlie",
          source_url: null,
          sentiment_label: "negative",
          sentiment_score: -0.85,
          themes: ["Wait Time", "Coffee Quality"],
          evidence: ["Terrible wait time", "cold coffee"],
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          business_id: "biz-1",
          platform: "instagram",
          rating: 2,
          effective_date: new Date("2026-09-13T12:00:00Z"),
          published_at: new Date("2026-09-13T12:00:00Z"),
          created_at: new Date("2026-09-13T12:00:00Z"),
          content: "Wait time was over 30 mins!",
          author: "Dave",
          source_url: null,
          sentiment_label: "negative",
          sentiment_score: -0.7,
          themes: ["Wait Time"],
          evidence: ["over 30 mins"],
        },
      ];

      const result = aggregateWeeklyMetrics(reviews, {
        periodStart,
        periodEnd,
        connectedPlatforms: mockConnectedPlatforms,
      });

      expect(result.totalReviews).toBe(4);

      // Sentiment distribution
      expect(result.sentimentDistribution).toEqual({
        positive: 1,
        neutral: 1,
        negative: 2,
        total: 4,
        averageScore: -0.137, // (-0.85 - 0.7 + 0.9 + 0.1) / 4 = -0.1375 -> -0.137
      });

      // Rating stats: (5 + 4 + 1 + 2) / 4 = 3.0
      expect(result.ratingStats.totalRated).toBe(4);
      expect(result.ratingStats.averageRating).toBe(3);
      expect(result.ratingStats.distribution).toEqual({
        "1": 1,
        "2": 1,
        "3": 0,
        "4": 1,
        "5": 1,
      });

      // Themes check
      // "Wait Time" occurs in 3 of 4 reviews (75% prevalence), 2 negative reviews, 1 neutral
      const waitTimeTheme = result.themes.find((t) => t.theme === "Wait Time");
      expect(waitTimeTheme).toBeDefined();
      expect(waitTimeTheme?.count).toBe(3);
      expect(waitTimeTheme?.prevalence).toBe(75);
      expect(waitTimeTheme?.negativeCount).toBe(2);
      expect(waitTimeTheme?.neutralCount).toBe(1);
      expect(waitTimeTheme?.positiveCount).toBe(0);
      expect(waitTimeTheme?.averageRating).toBe(2.33); // (4 + 1 + 2) / 3 = 2.33
      expect(waitTimeTheme?.evidenceRawItemIds).toEqual([
        "22222222-2222-2222-2222-222222222222",
        "33333333-3333-3333-3333-333333333333",
        "44444444-4444-4444-4444-444444444444",
      ]);
      expect(waitTimeTheme?.evidenceSnippets).toContain("Terrible wait time");

      // Platform coverage check
      expect(result.platformCoverage).toEqual([
        { platform: "google", count: 3, isActive: true },
        { platform: "instagram", count: 1, isActive: true },
      ]);
    });

    it("handles empty reviews cleanly", () => {
      const result = aggregateWeeklyMetrics([], {
        periodStart,
        periodEnd,
        connectedPlatforms: mockConnectedPlatforms,
      });

      expect(result.totalReviews).toBe(0);
      expect(result.ratingStats.averageRating).toBeNull();
      expect(result.ratingStats.totalRated).toBe(0);
      expect(result.sentimentDistribution.averageScore).toBeNull();
      expect(result.themes).toEqual([]);
    });
  });

  describe("2. Theme Classification and Change Labeling", () => {
    it("labels new emerging themes as 'new'", () => {
      const currentMetric = {
        theme: "Parking",
        count: 3,
        prevalence: 30,
        negativeCount: 2,
        positiveCount: 1,
        neutralCount: 0,
        averageRating: 2.5,
        evidenceRawItemIds: ["uuid-1", "uuid-2", "uuid-3"],
        evidenceSnippets: [],
      };

      const result = classifyThemeChange(currentMetric, undefined, 10, 10);
      expect(result.changeType).toBe("new");
      expect(result.deltaPrevalence).toBe(30);
    });

    it("labels surging negative themes as 'increasing'", () => {
      const currentMetric = {
        theme: "Food Temperature",
        count: 5,
        prevalence: 50,
        negativeCount: 4,
        positiveCount: 0,
        neutralCount: 1,
        averageRating: 1.5,
        evidenceRawItemIds: ["u1", "u2", "u3", "u4", "u5"],
        evidenceSnippets: [],
      };

      const prevMetric = {
        theme: "Food Temperature",
        count: 1,
        prevalence: 10,
        negativeCount: 1,
        positiveCount: 0,
        neutralCount: 0,
        averageRating: 2.0,
        evidenceRawItemIds: ["prev-1"],
        evidenceSnippets: [],
      };

      const result = classifyThemeChange(currentMetric, prevMetric, 10, 10);
      expect(result.changeType).toBe("increasing");
      expect(result.deltaNegative).toBe(3);
      expect(result.deltaPrevalence).toBe(40);
    });

    it("labels resolved negative themes as 'decreasing'", () => {
      const currentMetric = {
        theme: "Cleanliness",
        count: 1,
        prevalence: 10,
        negativeCount: 0,
        positiveCount: 1,
        neutralCount: 0,
        averageRating: 4.5,
        evidenceRawItemIds: ["u1"],
        evidenceSnippets: [],
      };

      const prevMetric = {
        theme: "Cleanliness",
        count: 5,
        prevalence: 50,
        negativeCount: 4,
        positiveCount: 0,
        neutralCount: 1,
        averageRating: 2.0,
        evidenceRawItemIds: ["p1", "p2", "p3", "p4", "p5"],
        evidenceSnippets: [],
      };

      const result = classifyThemeChange(currentMetric, prevMetric, 10, 10);
      expect(result.changeType).toBe("decreasing");
      expect(result.deltaNegative).toBe(-4);
      expect(result.deltaPrevalence).toBe(-40);
    });

    it("labels minimal shifts as 'stable'", () => {
      const currentMetric = {
        theme: "Ambiance",
        count: 4,
        prevalence: 40,
        negativeCount: 0,
        positiveCount: 4,
        neutralCount: 0,
        averageRating: 4.8,
        evidenceRawItemIds: ["u1", "u2", "u3", "u4"],
        evidenceSnippets: [],
      };

      const prevMetric = {
        theme: "Ambiance",
        count: 4,
        prevalence: 40,
        negativeCount: 0,
        positiveCount: 4,
        neutralCount: 0,
        averageRating: 4.7,
        evidenceRawItemIds: ["p1", "p2", "p3", "p4"],
        evidenceSnippets: [],
      };

      const result = classifyThemeChange(currentMetric, prevMetric, 10, 10);
      expect(result.changeType).toBe("stable");
    });
  });

  describe("3. Meaningful Change Detection with Minimum Data Thresholds", () => {
    it("returns top 2-3 ranked changes with exact raw_item_id evidence", () => {
      const currentWeek: WeeklyMetrics = {
        periodStart: "2026-09-08T00:00:00.000Z",
        periodEnd: "2026-09-15T00:00:00.000Z",
        totalReviews: 20,
        ratingStats: {
          averageRating: 3.2,
          totalRated: 20,
          distribution: { "1": 5, "2": 3, "3": 4, "4": 4, "5": 4 },
        },
        sentimentDistribution: { positive: 8, neutral: 4, negative: 8, total: 20, averageScore: -0.1 },
        themes: [
          {
            theme: "Slow Service",
            count: 7,
            prevalence: 35,
            negativeCount: 6,
            positiveCount: 0,
            neutralCount: 1,
            averageRating: 1.8,
            evidenceRawItemIds: [
              "11111111-1111-1111-1111-111111111111",
              "22222222-2222-2222-2222-222222222222",
              "33333333-3333-3333-3333-333333333333",
            ],
            evidenceSnippets: ["Waited 45 mins"],
          },
          {
            theme: "App Crash",
            count: 3,
            prevalence: 15,
            negativeCount: 3,
            positiveCount: 0,
            neutralCount: 0,
            averageRating: 1.0,
            evidenceRawItemIds: [
              "44444444-4444-4444-4444-444444444444",
              "55555555-5555-5555-5555-555555555555",
            ],
            evidenceSnippets: ["App crashed at checkout"],
          },
          {
            theme: "Food Taste",
            count: 6,
            prevalence: 30,
            negativeCount: 1,
            positiveCount: 5,
            neutralCount: 0,
            averageRating: 4.5,
            evidenceRawItemIds: ["66666666-6666-6666-6666-666666666666"],
            evidenceSnippets: ["Delicious food"],
          },
        ],
        platformCoverage: [{ platform: "google", count: 20, isActive: true }],
      };

      const previousWeek: WeeklyMetrics = {
        periodStart: "2026-09-01T00:00:00.000Z",
        periodEnd: "2026-09-08T00:00:00.000Z",
        totalReviews: 20,
        ratingStats: {
          averageRating: 4.1,
          totalRated: 20,
          distribution: { "1": 1, "2": 1, "3": 2, "4": 6, "5": 10 },
        },
        sentimentDistribution: { positive: 16, neutral: 2, negative: 2, total: 20, averageScore: 0.6 },
        themes: [
          {
            theme: "Slow Service",
            count: 2,
            prevalence: 10,
            negativeCount: 1,
            positiveCount: 0,
            neutralCount: 1,
            averageRating: 3.0,
            evidenceRawItemIds: ["prev-id-1"],
            evidenceSnippets: [],
          },
          // App Crash was not present
          {
            theme: "Food Taste",
            count: 8,
            prevalence: 40,
            negativeCount: 0,
            positiveCount: 8,
            neutralCount: 0,
            averageRating: 4.8,
            evidenceRawItemIds: ["prev-id-2"],
            evidenceSnippets: [],
          },
        ],
        platformCoverage: [{ platform: "google", count: 20, isActive: true }],
      };

      const changes = detectMeaningfulChanges(currentWeek, previousWeek);

      // Must return at most 3 changes
      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes.length).toBeLessThanOrEqual(3);

      // Top change should be the surge in Slow Service complaints (+5 negative)
      const slowServiceChange = changes.find((c) => c.theme === "Slow Service");
      expect(slowServiceChange).toBeDefined();
      expect(slowServiceChange?.change_type).toBe("increasing");
      expect(slowServiceChange?.current_value).toBe(6);
      expect(slowServiceChange?.previous_value).toBe(1);
      expect(slowServiceChange?.delta).toBe(5);
      expect(slowServiceChange?.evidence_raw_item_ids).toEqual([
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "33333333-3333-3333-3333-333333333333",
      ]);

      // Emerging "App Crash" theme
      const appCrashChange = changes.find((c) => c.theme === "App Crash");
      expect(appCrashChange).toBeDefined();
      expect(appCrashChange?.change_type).toBe("new");
      expect(appCrashChange?.evidence_raw_item_ids).toEqual([
        "44444444-4444-4444-4444-444444444444",
        "55555555-5555-5555-5555-555555555555",
      ]);

      // Rating drop change: 4.1 to 3.2 (-0.9)
      const ratingChange = changes.find((c) => c.theme === "Overall Rating");
      expect(ratingChange).toBeDefined();
      expect(ratingChange?.change_type).toBe("decreasing");
      expect(ratingChange?.delta).toBe(-0.9);
    });

    it("does not report noise when data is below minimum threshold", () => {
      const currentWeek: WeeklyMetrics = {
        periodStart: "2026-09-08T00:00:00.000Z",
        periodEnd: "2026-09-15T00:00:00.000Z",
        totalReviews: 1,
        ratingStats: {
          averageRating: 5.0,
          totalRated: 1,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
        },
        sentimentDistribution: { positive: 1, neutral: 0, negative: 0, total: 1, averageScore: 0.9 },
        themes: [
          {
            theme: "Music",
            count: 1,
            prevalence: 100,
            negativeCount: 0,
            positiveCount: 1,
            neutralCount: 0,
            averageRating: 5.0,
            evidenceRawItemIds: ["11111111-1111-1111-1111-111111111111"],
            evidenceSnippets: ["Nice music"],
          },
        ],
        platformCoverage: [{ platform: "google", count: 1, isActive: true }],
      };

      const previousWeek: WeeklyMetrics = {
        periodStart: "2026-09-01T00:00:00.000Z",
        periodEnd: "2026-09-08T00:00:00.000Z",
        totalReviews: 0,
        ratingStats: {
          averageRating: null,
          totalRated: 0,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        },
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0, total: 0, averageScore: null },
        themes: [],
        platformCoverage: [{ platform: "google", count: 0, isActive: true }],
      };

      const changes = detectMeaningfulChanges(currentWeek, previousWeek);
      // Single review should not trigger false alarm meaningful change
      expect(changes).toEqual([]);
    });
  });

  describe("4. Deterministic Confidence Scoring & Limitations", () => {
    it("returns 'High' confidence when sample size is large, multi-platform, and data is fresh", () => {
      const currentWeek: WeeklyMetrics = {
        periodStart: "2026-09-08T00:00:00.000Z",
        periodEnd: "2026-09-15T00:00:00.000Z",
        totalReviews: 35,
        ratingStats: {
          averageRating: 4.6,
          totalRated: 35,
          distribution: { "1": 0, "2": 1, "3": 2, "4": 12, "5": 20 },
        },
        sentimentDistribution: { positive: 30, neutral: 3, negative: 2, total: 35, averageScore: 0.8 },
        themes: [],
        platformCoverage: [
          { platform: "google", count: 25, isActive: true },
          { platform: "instagram", count: 10, isActive: true },
        ],
      };

      const latestReviewDate = new Date("2026-09-14T20:00:00Z");
      const refDate = new Date("2026-09-15T00:00:00Z");

      const result = calculateConfidenceAndLimitations(
        currentWeek,
        mockConnectedPlatforms,
        latestReviewDate,
        refDate
      );

      expect(result.level).toBe("High");
      expect(result.score).toBeGreaterThanOrEqual(0.75);
      expect(result.limitations).toHaveLength(0);
    });

    it("returns 'Medium' or 'Low' confidence and limitations for small sample size or missing platform", () => {
      const currentWeek: WeeklyMetrics = {
        periodStart: "2026-09-08T00:00:00.000Z",
        periodEnd: "2026-09-15T00:00:00.000Z",
        totalReviews: 3,
        ratingStats: {
          averageRating: 4.0,
          totalRated: 3,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 3, "5": 0 },
        },
        sentimentDistribution: { positive: 3, neutral: 0, negative: 0, total: 3, averageScore: 0.8 },
        themes: [],
        platformCoverage: [
          { platform: "google", count: 3, isActive: true },
          { platform: "instagram", count: 0, isActive: true },
        ],
      };

      const latestReviewDate = new Date("2026-09-14T00:00:00Z");
      const refDate = new Date("2026-09-15T00:00:00Z");

      const result = calculateConfidenceAndLimitations(
        currentWeek,
        mockConnectedPlatforms,
        latestReviewDate,
        refDate
      );

      expect(["Medium", "Low"]).toContain(result.level);
      expect(result.limitations.some((l) => l.includes("Sample size is small"))).toBe(true);
      expect(result.limitations.some((l) => l.includes("Missing feedback from instagram"))).toBe(true);
    });

    it("generates limitation for stale data", () => {
      const currentWeek: WeeklyMetrics = {
        periodStart: "2026-09-08T00:00:00.000Z",
        periodEnd: "2026-09-15T00:00:00.000Z",
        totalReviews: 8,
        ratingStats: {
          averageRating: 4.0,
          totalRated: 8,
          distribution: { "1": 0, "2": 0, "3": 2, "4": 4, "5": 2 },
        },
        sentimentDistribution: { positive: 6, neutral: 2, negative: 0, total: 8, averageScore: 0.6 },
        themes: [],
        platformCoverage: [
          { platform: "google", count: 5, isActive: true },
          { platform: "instagram", count: 3, isActive: true },
        ],
      };

      const staleDate = new Date("2026-08-20T00:00:00Z"); // 26 days old
      const refDate = new Date("2026-09-15T00:00:00Z");

      const result = calculateConfidenceAndLimitations(
        currentWeek,
        mockConnectedPlatforms,
        staleDate,
        refDate
      );

      expect(result.limitations.some((l) => l.includes("Data may be stale"))).toBe(true);
    });
  });
});
