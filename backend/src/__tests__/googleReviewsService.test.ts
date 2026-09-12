import { normalizeGoogleReview } from "../services/googleReviewsService";

describe("normalizeGoogleReview", () => {
  it("normalizes common Apify review fields and creates a stable fallback hash", () => {
    const review = {
      reviewText: "Helpful staff and fast service",
      authorName: "Ada",
      stars: 5,
      publishedAt: "2026-09-01T10:00:00.000Z",
    };

    const first = normalizeGoogleReview(review, "https://maps.google.com/example");
    const second = normalizeGoogleReview(review, "https://maps.google.com/example");

    expect(first).toMatchObject({
      content: "Helpful staff and fast service",
      author: "Ada",
      rating: 5,
      externalId: null,
      source: "https://maps.google.com/example",
    });
    expect(first?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first?.hash).toBe(second?.hash);
  });

  it("skips dataset records without review text", () => {
    expect(normalizeGoogleReview({ rating: 5 }, "https://maps.google.com/example")).toBeNull();
  });
});
