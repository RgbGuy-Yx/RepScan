import { normalizeInstagramProfile } from "../utils/instagramUtils";
import { instagramService } from "../services/instagramService";
import { apifyInstagramService } from "../services/apifyInstagramService";
import * as instagramRepo from "../repositories/instagramRepository";
import * as businessRepo from "../repositories/businessRepository";
import * as competitorRepo from "../repositories/competitorRepository";

// Mock repositories and services
jest.mock("../services/database", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock("../repositories/businessRepository");
jest.mock("../repositories/competitorRepository");
jest.mock("../repositories/instagramRepository");
jest.mock("../services/apifyInstagramService");

describe("Instagram Integration Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Instagram URL & Username Normalization", () => {
    it("normalizes a full profile URL with trailing slash", () => {
      const res = normalizeInstagramProfile("https://www.instagram.com/humansofny/");
      expect(res.username).toBe("humansofny");
      expect(res.profileUrl).toBe("https://www.instagram.com/humansofny/");
    });

    it("normalizes URL with query parameters", () => {
      const res = normalizeInstagramProfile("https://instagram.com/nike?igshid=123456");
      expect(res.username).toBe("nike");
      expect(res.profileUrl).toBe("https://www.instagram.com/nike/");
    });

    it("normalizes handles starting with @", () => {
      const res = normalizeInstagramProfile("@starbucks");
      expect(res.username).toBe("starbucks");
      expect(res.profileUrl).toBe("https://www.instagram.com/starbucks/");
    });

    it("normalizes plain username strings", () => {
      const res = normalizeInstagramProfile("bluebottle_coffee.us");
      expect(res.username).toBe("bluebottle_coffee.us");
      expect(res.profileUrl).toBe("https://www.instagram.com/bluebottle_coffee.us/");
    });

    it("rejects non-profile URLs like /p/post_id or /explore", () => {
      expect(() => normalizeInstagramProfile("https://www.instagram.com/p/Ct1234/")).toThrow(
        /instead of a public profile page/
      );
      expect(() => normalizeInstagramProfile("https://www.instagram.com/explore/")).toThrow(
        /instead of a public profile page/
      );
    });

    it("rejects non-instagram domains", () => {
      expect(() => normalizeInstagramProfile("https://twitter.com/example")).toThrow(
        /URL must be an instagram\.com link/
      );
    });

    it("rejects invalid usernames with spaces or special characters", () => {
      expect(() => normalizeInstagramProfile("invalid user name!")).toThrow(/Invalid Instagram username/);
      expect(() => normalizeInstagramProfile(".starts_with_period")).toThrow(/cannot start or end with a period/);
      expect(() => normalizeInstagramProfile("has..double_dots")).toThrow(/cannot contain consecutive periods/);
    });
  });

  describe("2. Account Creation and Scoping", () => {
    const businessId = "11111111-1111-1111-1111-111111111111";

    it("adds a valid Instagram account to a business", async () => {
      (businessRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: businessId,
        name: "Acme Corp",
      });
      (instagramRepo.findAccountByUsername as jest.Mock).mockResolvedValueOnce(null);
      (instagramRepo.createAccount as jest.Mock).mockResolvedValueOnce({
        id: "acc-1",
        business_id: businessId,
        username: "acme_official",
        profile_url: "https://www.instagram.com/acme_official/",
        is_active: true,
      });

      const result = await instagramService.addAccount({
        businessId,
        urlOrUsername: "https://www.instagram.com/acme_official",
      });

      expect(result.username).toBe("acme_official");
      expect(instagramRepo.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: businessId,
          username: "acme_official",
          profile_url: "https://www.instagram.com/acme_official/",
        })
      );
    });

    it("prevents duplicate account registration for the same business", async () => {
      (businessRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: businessId,
        name: "Acme Corp",
      });
      (instagramRepo.findAccountByUsername as jest.Mock).mockResolvedValueOnce({
        id: "acc-1",
        business_id: businessId,
        username: "acme_official",
      });

      await expect(
        instagramService.addAccount({
          businessId,
          urlOrUsername: "@acme_official",
        })
      ).rejects.toThrow(/already tracked/);
    });

    it("rejects competitor account if competitor does not belong to business", async () => {
      (businessRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: businessId,
        name: "Acme Corp",
      });
      (competitorRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: "comp-2",
        business_id: "other-business",
      });

      await expect(
        instagramService.addAccount({
          businessId,
          competitorId: "comp-2",
          urlOrUsername: "rival_cafe",
        })
      ).rejects.toThrow(/does not belong to this business/);
    });
  });

  describe("3. Overlapping Sync Protection and Idempotency", () => {
    const businessId = "11111111-1111-1111-1111-111111111111";
    const accountId = "22222222-2222-2222-2222-222222222222";

    it("throws 409 if a synchronization is already in progress in DB", async () => {
      (instagramRepo.findAccountById as jest.Mock).mockResolvedValueOnce({
        id: accountId,
        business_id: businessId,
        username: "acme_official",
        is_active: true,
      });
      (instagramRepo.findActiveSyncRun as jest.Mock).mockResolvedValueOnce({
        id: "run-active",
        status: "running",
      });

      await expect(instagramService.triggerSync(businessId, accountId)).rejects.toThrow(
        /already in progress/
      );
    });
  });

  describe("4. Promotional vs Customer Feedback Classification", () => {
    it("identifies promotional content from caption keywords and hashtags", () => {
      expect(
        instagramService.isBusinessPromotionalCaption(
          "Check out our new summer collection! Link in bio to shop now. #sale #promo"
        )
      ).toBe(true);

      expect(
        instagramService.isBusinessPromotionalCaption(
          "Use code SUMMER20 for 20% off all orders this weekend!"
        )
      ).toBe(true);
    });

    it("classifies user or organic feedback captions as non-promotional", () => {
      expect(
        instagramService.isBusinessPromotionalCaption(
          "Had the most delicious dinner here yesterday with family. Service was amazing!"
        )
      ).toBe(false);
    });
  });

  describe("5. Analytics Calculation & Insufficient Data State", () => {
    const businessId = "11111111-1111-1111-1111-111111111111";
    const accountId = "22222222-2222-2222-2222-222222222222";

    it("returns explicit insufficient_data state when comments count is below threshold", async () => {
      (instagramRepo.findAccountById as jest.Mock).mockResolvedValueOnce({
        id: accountId,
        business_id: businessId,
        username: "acme_official",
        profile_url: "https://www.instagram.com/acme_official/",
        followers_count: 1200,
        following_count: 300,
        posts_count: 45,
        is_verified: false,
        is_business_account: true,
      });

      (instagramRepo.getAccountAggregates as jest.Mock).mockResolvedValueOnce({
        posts: {
          total_posts: "10",
          total_likes: "500",
          total_comments: "2",
          earliest_post: new Date("2026-08-01"),
          latest_post: new Date("2026-09-01"),
        },
        commentSentiment: {
          total_analyzed: "1", // Below threshold of 3
          positive_count: "1",
          neutral_count: "0",
          negative_count: "0",
        },
      });

      (instagramRepo.listSnapshotsByAccount as jest.Mock).mockResolvedValueOnce([]);
      (instagramRepo.listPostsByAccount as jest.Mock).mockResolvedValueOnce({ posts: [], total: 0 });

      const analytics = await instagramService.getAccountAnalytics(businessId, accountId);

      expect(analytics.observed_data.total_posts_collected).toBe(10);
      expect(analytics.observed_data.total_likes_observed).toBe(500);
      expect(analytics.derived_metrics.avg_likes_per_post).toBe(50);
      expect(analytics.ai_insights.insufficient_data).toBe(true);
      expect(analytics.ai_insights.sentiment_distribution).toBeNull();
      expect(analytics.ai_insights.insufficient_data_reason).toMatch(/Insufficient customer comments/);
    });

    it("computes authentic sentiment distribution when sufficient customer comments exist", async () => {
      (instagramRepo.findAccountById as jest.Mock).mockResolvedValueOnce({
        id: accountId,
        business_id: businessId,
        username: "acme_official",
        profile_url: "https://www.instagram.com/acme_official/",
        followers_count: 5000,
        posts_count: 120,
      });

      (instagramRepo.getAccountAggregates as jest.Mock).mockResolvedValueOnce({
        posts: {
          total_posts: "20",
          total_likes: "1200",
          total_comments: "80",
          earliest_post: new Date("2026-08-01"),
          latest_post: new Date("2026-09-01"),
        },
        commentSentiment: {
          total_analyzed: "10",
          positive_count: "7",
          neutral_count: "2",
          negative_count: "1",
        },
      });

      (instagramRepo.listSnapshotsByAccount as jest.Mock).mockResolvedValueOnce([
        {
          snapshot_time: new Date("2026-08-15"),
          total_likes_observed: 600,
          total_comments_observed: 40,
          avg_likes_per_post: 60,
          avg_comments_per_post: 4,
          followers_count: 4900,
        },
      ]);
      (instagramRepo.listPostsByAccount as jest.Mock).mockResolvedValueOnce({
        posts: [
          { ai_analysis: { themes: ["Quality & Craft", "Customer Service"] } },
          { ai_analysis: { themes: ["Quality & Craft"] } },
        ],
        total: 2,
      });

      const analytics = await instagramService.getAccountAnalytics(businessId, accountId);

      expect(analytics.ai_insights.insufficient_data).toBe(false);
      expect(analytics.ai_insights.sentiment_distribution).toEqual({
        positive: 70,
        neutral: 20,
        negative: 10,
        total_analyzed: 10,
      });
      expect(analytics.has_historical_snapshots).toBe(true);
      expect(analytics.historical_snapshots.length).toBe(1);
    });
  });
});
