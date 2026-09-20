import type { Request, Response, NextFunction } from "express";
import { handleRagChat } from "../controllers/ragChatController";
import * as ragChatService from "../services/ragChatService";
import * as businessRepo from "../repositories/businessRepository";
import * as ragRepo from "../repositories/ragRepository";
import * as aiService from "../services/aiService";
import type { RagChatResult } from "../schemas/ragSchemas";
import { AppError } from "../middleware/errorHandler";

jest.mock("../repositories/businessRepository");
jest.mock("../repositories/ragRepository");
jest.mock("../services/aiService");

const mockBusinessRepo = businessRepo as jest.Mocked<typeof businessRepo>;
const mockRagRepo = ragRepo as jest.Mocked<typeof ragRepo>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe("Phase 4: RAG Chat & Evidence", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const rawItemId1 = "22222222-2222-2222-2222-222222222222";
  const rawItemId2 = "33333333-3333-3333-3333-333333333333";

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

  describe("ragChatService.processRagChat", () => {
    it("throws 404 when business does not exist", async () => {
      mockBusinessRepo.findById.mockResolvedValue(null);

      await expect(
        ragChatService.processRagChat({
          businessId: "nonexistent-biz",
          query: "What is customer sentiment?",
        })
      ).rejects.toThrow(new AppError("Business not found", 404));
    });

    it("successfully orchestrates hybrid retrieval, LangGraph AI service, and verifies source proof", async () => {
      mockBusinessRepo.findById.mockResolvedValue({
        id: businessId,
        name: "Acme Dining",
        description: "Fine dining restaurant",
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRagRepo.getStructuredMetricsForFilters.mockResolvedValue({
        total_reviews: 12,
        average_rating: 4.6,
        positive_count: 10,
        neutral_count: 1,
        negative_count: 1,
        min_date: new Date("2026-08-01"),
        max_date: new Date("2026-09-15"),
      });

      mockRagRepo.getSampleReviewsForFilters.mockResolvedValue([
        {
          id: rawItemId1,
          business_id: businessId,
          platform: "google",
          author: "Alice",
          content: "The artisan sourdough and pasta were extraordinary!",
          rating: 5,
          published_at: new Date("2026-09-10T12:00:00Z"),
          created_at: new Date("2026-09-10T12:00:00Z"),
          source_url: "https://maps.google.com/review1",
          sentiment_label: "positive",
          sentiment_score: 0.95,
          themes: ["Food Quality"],
          evidence: ["pasta were extraordinary"],
        },
      ]);

      mockAiService.executeRagChat.mockResolvedValue({
        answer: "Customers frequently praise the pasta and artisan sourdough.",
        confidence: "High",
        limitation_note: null,
        sources: [
          {
            raw_item_id: rawItemId1,
            platform: "google",
            author: "Alice",
            rating: 5,
            date: "2026-09-10T12:00:00Z",
            source_url: "https://maps.google.com/review1",
            excerpt: "artisan sourdough and pasta were extraordinary",
          },
          {
            raw_item_id: "fake-hallucinated-id-999",
            platform: "google",
            author: "Fake Author",
            rating: 1,
            date: "2026-09-10T12:00:00Z",
            source_url: "https://fake.url",
            excerpt: "Fake review content",
          },
        ],
      });

      mockRagRepo.getRawItemsByIds.mockResolvedValue([
        {
          id: rawItemId1,
          business_id: businessId,
          platform: "google",
          author: "Alice",
          content: "The artisan sourdough and pasta were extraordinary!",
          rating: 5,
          published_at: new Date("2026-09-10T12:00:00Z"),
          created_at: new Date("2026-09-10T12:00:00Z"),
          source_url: "https://maps.google.com/review1",
          sentiment_label: "positive",
          sentiment_score: 0.95,
          themes: ["Food Quality"],
          evidence: ["pasta were extraordinary"],
        },
      ]);

      const result = await ragChatService.processRagChat({
        businessId,
        query: "What do customers say about sourdough?",
        filters: { platform: "google", min_rating: 4 },
      });

      expect(result.answer).toContain("pasta and artisan sourdough");
      expect(result.confidence).toBe("High");
      expect(result.limitation_note).toBeNull();
      // Verifies that fake source was filtered out and authentic source was retained
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].raw_item_id).toBe(rawItemId1);
      expect(result.sources[0].platform).toBe("google");
      expect(result.sources[0].author).toBe("Alice");
      expect(result.sources[0].rating).toBe(5);
      expect(result.sources[0].excerpt).toBe("artisan sourdough and pasta were extraordinary");
    });

    it("returns limitation notes and low confidence when review volume is insufficient", async () => {
      mockBusinessRepo.findById.mockResolvedValue({
        id: businessId,
        name: "New Startup",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRagRepo.getStructuredMetricsForFilters.mockResolvedValue({
        total_reviews: 0,
        average_rating: null,
        positive_count: 0,
        neutral_count: 0,
        negative_count: 0,
        min_date: null,
        max_date: null,
      });

      mockRagRepo.getSampleReviewsForFilters.mockResolvedValue([]);

      mockAiService.executeRagChat.mockResolvedValue({
        answer: "No customer reviews exist for this business yet.",
        confidence: "Low",
        limitation_note: "No reviews found matching the specified criteria.",
        sources: [],
      });

      mockRagRepo.getRawItemsByIds.mockResolvedValue([]);

      const result = await ragChatService.processRagChat({
        businessId,
        query: "What are the common complaints?",
      });

      expect(result.confidence).toBe("Low");
      expect(result.limitation_note).toContain("No reviews found");
      expect(result.sources).toHaveLength(0);
    });
  });

  describe("ragChatController.handleRagChat", () => {
    it("returns 200 with RAG chat response payload", async () => {
      mockReq = {
        params: { id: businessId },
        body: {
          query: "How is the customer service?",
          filters: { sentiment: "positive" },
          conversation_history: [{ role: "user", content: "Hello" }],
          session_id: "sess-123",
        },
      };

      const expectedResponse: ragChatService.RagChatResult = {
        answer: "Customer service is highly praised with friendly staff.",
        confidence: "High",
        limitation_note: null,
        sources: [
          {
            raw_item_id: rawItemId1,
            platform: "google",
            author: "Bob",
            rating: 5,
            date: "2026-09-12T10:00:00Z",
            source_url: "https://maps.google.com/review2",
            excerpt: "friendly staff and quick turnaround",
          },
        ],
      };

      jest.spyOn(ragChatService, "processRagChat").mockResolvedValue(expectedResponse);

      await handleRagChat(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        status: "success",
        data: expectedResponse,
      });
    });

    it("forwards errors to next middleware", async () => {
      mockReq = {
        params: { id: businessId },
        body: { query: "Tell me more." },
      };

      const error = new AppError("AI chat service is currently unavailable", 503);
      jest.spyOn(ragChatService, "processRagChat").mockRejectedValue(error);

      await handleRagChat(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
