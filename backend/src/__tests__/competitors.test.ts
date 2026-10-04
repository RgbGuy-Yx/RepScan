import {
  normalizeGooglePlace,
  searchNearbyPlaces,
  getPlaceDetails,
  clearPlacesCache,
} from "../services/googlePlacesService";
import { calculateDistanceKm } from "../utils/geo";
import * as competitorService from "../services/competitorService";
import * as businessRepo from "../repositories/businessRepository";
import * as competitorRepo from "../repositories/competitorRepository";
import * as platformConnectionRepo from "../repositories/platformConnectionRepository";
import * as ragRepo from "../repositories/ragRepository";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config";

jest.mock("../repositories/businessRepository");
jest.mock("../repositories/competitorRepository");
jest.mock("../repositories/platformConnectionRepository");
jest.mock("../repositories/ragRepository");

const mockBusinessRepo = businessRepo as jest.Mocked<typeof businessRepo>;
const mockCompetitorRepo = competitorRepo as jest.Mocked<typeof competitorRepo>;
const mockPlatformConnectionRepo = platformConnectionRepo as jest.Mocked<typeof platformConnectionRepo>;
const mockRagRepo = ragRepo as jest.Mocked<typeof ragRepo>;

describe("Competitor Intelligence System", () => {
  const originalFetch = global.fetch;
  const businessId = "11111111-1111-1111-1111-111111111111";
  const competitorId = "22222222-2222-2222-2222-222222222222";

  const sampleBusiness: businessRepo.Business = {
    id: businessId,
    workspace_id: "ws-1",
    name: "Glow Skin & Laser Clinic",
    description: "Premium dermatology and laser clinic",
    industry: "Skin Care Clinic",
    website: "https://glowskin.com",
    location: "17.4485, 78.3742",
    latitude: 17.4485,
    longitude: 78.3742,
    google_place_id: "ChIJ_GLOW_CLINIC_OWN",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleCompetitorRow: competitorRepo.CompetitorRow = {
    id: competitorId,
    business_id: businessId,
    google_place_id: "ChIJ_COMPETITOR_A",
    name: "DermaElite Skin Hospital",
    address: "Road 36, Jubilee Hills, Hyderabad",
    latitude: 17.4350,
    longitude: 78.4080,
    primary_type: "skin_care_clinic",
    website: "https://dermaelite.com",
    google_maps_url: "https://maps.google.com/?cid=123",
    rating: 4.6,
    review_count: 850,
    tracked: true,
    last_synced_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearPlacesCache();
    // Default config apiKey present
    config.googleMapsApiKey = "AIzaSyTestApiKeyMock123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ── 1. Distance Calculation Tests ──────────────────────────────────────────
  describe("Haversine Distance Calculation (geo.ts)", () => {
    it("calculates 0 distance for identical coordinates", () => {
      const dist = calculateDistanceKm(17.4485, 78.3742, 17.4485, 78.3742);
      expect(dist).toBe(0);
    });

    it("calculates correct geographic distance between known coordinates", () => {
      // Hyderabad Hitec City (17.4485, 78.3742) to Jubilee Hills (17.4350, 78.4080) ~ 3.8 km
      const dist = calculateDistanceKm(17.4485, 78.3742, 17.4350, 78.4080);
      expect(dist).toBeGreaterThan(3.5);
      expect(dist).toBeLessThan(4.2);
    });
  });

  // ── 2. Google Places API Response Normalization ────────────────────────────
  describe("Google Places API Response Normalization", () => {
    it("normalizes a raw Google Places API (New) object correctly", () => {
      const rawGooglePlace = {
        id: "ChIJ_TEST_PLACE_1",
        displayName: {
          text: "Elite Derma Care",
          languageCode: "en",
        },
        formattedAddress: "Plot 12, Hitec City, Hyderabad",
        location: {
          latitude: 17.4512,
          longitude: 78.3811,
        },
        rating: 4.54,
        userRatingCount: 1420,
        primaryType: "skin_care_clinic",
        types: ["skin_care_clinic", "health", "spa"],
        websiteUri: "https://elitederma.com",
        googleMapsUri: "https://maps.google.com/?cid=999",
      };

      const normalized = normalizeGooglePlace(rawGooglePlace);
      expect(normalized.place_id).toBe("ChIJ_TEST_PLACE_1");
      expect(normalized.name).toBe("Elite Derma Care");
      expect(normalized.address).toBe("Plot 12, Hitec City, Hyderabad");
      expect(normalized.latitude).toBe(17.4512);
      expect(normalized.longitude).toBe(78.3811);
      expect(normalized.rating).toBe(4.5);
      expect(normalized.review_count).toBe(1420);
      expect(normalized.primary_type).toBe("skin_care_clinic");
      expect(normalized.website).toBe("https://elitederma.com");
      expect(normalized.google_maps_url).toBe("https://maps.google.com/?cid=999");
    });

    it("handles places with missing optional fields safely", () => {
      const rawMinimal = {
        id: "ChIJ_MINIMAL",
        name: "Minimal Clinic",
      };

      const normalized = normalizeGooglePlace(rawMinimal);
      expect(normalized.place_id).toBe("ChIJ_MINIMAL");
      expect(normalized.name).toBe("Minimal Clinic");
      expect(normalized.rating).toBeNull();
      expect(normalized.review_count).toBe(0);
      expect(normalized.latitude).toBeNull();
      expect(normalized.longitude).toBeNull();
      expect(normalized.website).toBeNull();
    });
  });

  // ── 3. Google Places API Service (Nearby Search & Details) ─────────────────
  describe("Google Places Service (googlePlacesService.ts)", () => {
    it("sends explicit field masks in Nearby Search without wildcards", async () => {
      const mockPlacesResponse = {
        places: [
          {
            id: "ChIJ_P1",
            displayName: { text: "Clinic One" },
            location: { latitude: 17.45, longitude: 78.38 },
            rating: 4.4,
            userRatingCount: 300,
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPlacesResponse),
      } as any);

      const places = await searchNearbyPlaces({
        latitude: 17.4485,
        longitude: 78.3742,
        radius: 3000,
        category: "skin_care_clinic",
        bypassCache: true,
      });

      expect(places).toHaveLength(1);
      expect(places[0].name).toBe("Clinic One");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:searchNearby",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Goog-Api-Key": config.googleMapsApiKey,
            "X-Goog-FieldMask": expect.stringContaining("places.displayName"),
          }),
        })
      );

      // Verify no wildcard in field mask
      const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(callHeaders["X-Goog-FieldMask"]).not.toContain("*");
    });

    it("handles Google Places rate limit 429 gracefully", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue("Resource exhausted"),
      } as any);

      await expect(
        searchNearbyPlaces({
          latitude: 17.45,
          longitude: 78.38,
          bypassCache: true,
        })
      ).rejects.toThrow(new AppError("Google Places quota or rate limit exceeded. Please try again shortly.", 429));
    });

    it("fetches place details with explicit field masks", async () => {
      const mockDetails = {
        id: "ChIJ_DETAIL_1",
        displayName: { text: "Aura Aesthetic Clinic" },
        formattedAddress: "Plot 55, Jubilee Hills",
        location: { latitude: 17.43, longitude: 78.40 },
        rating: 4.8,
        userRatingCount: 520,
        websiteUri: "https://auraclinic.com",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDetails),
      } as any);

      const details = await getPlaceDetails("ChIJ_DETAIL_1", true);
      expect(details.name).toBe("Aura Aesthetic Clinic");
      expect(details.rating).toBe(4.8);
      expect(details.website).toBe("https://auraclinic.com");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places/ChIJ_DETAIL_1",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Goog-Api-Key": config.googleMapsApiKey,
            "X-Goog-FieldMask": expect.stringContaining("displayName"),
          }),
        })
      );
    });
  });

  // ── 4. Nearby Competitor Discovery & Filtering ─────────────────────────────
  describe("competitorService.discoverNearbyCompetitors", () => {
    it("filters out own business, removes duplicates, and marks tracked status", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      mockPlatformConnectionRepo.findByBusinessAndPlatform.mockResolvedValue({
        id: "conn-1",
        business_id: businessId,
        platform: "google",
        source_url: "https://maps.google.com",
        external_id: "ChIJ_GLOW_CLINIC_OWN",
        is_active: true,
        last_scraped_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockCompetitorRepo.findByBusinessId.mockResolvedValue([sampleCompetitorRow]);

      const mockPlaces = [
        // 1. Own business -> must be filtered out by place_id
        {
          id: "ChIJ_GLOW_CLINIC_OWN",
          displayName: { text: "Glow Skin & Laser Clinic" },
          location: { latitude: 17.4485, longitude: 78.3742 },
          rating: 4.5,
          userRatingCount: 200,
        },
        // 2. Tracked competitor -> should remain and be marked tracked: true
        {
          id: "ChIJ_COMPETITOR_A",
          displayName: { text: "DermaElite Skin Hospital" },
          location: { latitude: 17.4350, longitude: 78.4080 },
          rating: 4.6,
          userRatingCount: 850,
        },
        // 3. Duplicate of competitor A -> must be deduplicated
        {
          id: "ChIJ_COMPETITOR_A",
          displayName: { text: "DermaElite Skin Hospital Duplicate" },
          location: { latitude: 17.4350, longitude: 78.4080 },
          rating: 4.6,
          userRatingCount: 850,
        },
        // 4. Untracked nearby competitor -> should remain and be marked tracked: false
        {
          id: "ChIJ_COMPETITOR_B",
          displayName: { text: "Radiance Cosmetology" },
          location: { latitude: 17.4520, longitude: 78.3800 },
          rating: 4.3,
          userRatingCount: 410,
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ places: mockPlaces }),
      } as any);

      const result = await competitorService.discoverNearbyCompetitors(businessId, {
        radius: 5000,
        limit: 20,
        bypass_cache: true,
      });

      expect(result.business_location).toEqual({ latitude: 17.4485, longitude: 78.3742 });
      expect(result.competitors).toHaveLength(2); // Own business filtered, duplicate removed

      const compA = result.competitors.find((c) => c.place_id === "ChIJ_COMPETITOR_A");
      expect(compA).toBeDefined();
      expect(compA?.tracked).toBe(true);
      expect(compA?.distance_km).toBeGreaterThan(0);

      const compB = result.competitors.find((c) => c.place_id === "ChIJ_COMPETITOR_B");
      expect(compB).toBeDefined();
      expect(compB?.tracked).toBe(false);
      expect(compB?.distance_km).toBeGreaterThan(0);
    });

    it("throws 400 when business coordinates are missing and cannot be resolved", async () => {
      mockBusinessRepo.findById.mockResolvedValue({
        ...sampleBusiness,
        latitude: null,
        longitude: null,
        location: null,
      });

      await expect(
        competitorService.discoverNearbyCompetitors(businessId, {
          radius: 5000,
        })
      ).rejects.toThrow(
        new AppError(
          "Business coordinates are missing. Please configure latitude and longitude for this business.",
          400
        )
      );
    });
  });

  // ── 5. Tracking and Untracking Competitors ──────────────────────────────────
  describe("Track & Untrack Competitors", () => {
    it("fetches Place Details and stores new competitor in PostgreSQL", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      mockCompetitorRepo.findByPlaceId.mockResolvedValue(null); // not currently tracked

      const mockGooglePlace = {
        id: "ChIJ_NEW_COMP",
        displayName: { text: "SkinSense Clinic" },
        formattedAddress: "Road 10, Banjara Hills",
        location: { latitude: 17.4200, longitude: 78.4400 },
        rating: 4.7,
        userRatingCount: 630,
        primaryType: "skin_care_clinic",
        websiteUri: "https://skinsense.com",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGooglePlace),
      } as any);

      const savedRow: competitorRepo.CompetitorRow = {
        id: "comp-new-id",
        business_id: businessId,
        google_place_id: "ChIJ_NEW_COMP",
        name: "SkinSense Clinic",
        address: "Road 10, Banjara Hills",
        latitude: 17.4200,
        longitude: 78.4400,
        primary_type: "skin_care_clinic",
        website: "https://skinsense.com",
        google_maps_url: null,
        rating: 4.7,
        review_count: 630,
        tracked: true,
        last_synced_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockCompetitorRepo.create.mockResolvedValue(savedRow);

      const result = await competitorService.trackCompetitor(businessId, "ChIJ_NEW_COMP");
      expect(result.already_tracked).toBe(false);
      expect(result.competitor.name).toBe("SkinSense Clinic");
      expect(result.competitor.rating).toBe(4.7);
      expect(mockCompetitorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: businessId,
          google_place_id: "ChIJ_NEW_COMP",
          name: "SkinSense Clinic",
        })
      );
    });

    it("returns existing competitor without creating duplicate when already tracked", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      mockCompetitorRepo.findByPlaceId.mockResolvedValue(sampleCompetitorRow);

      const result = await competitorService.trackCompetitor(businessId, "ChIJ_COMPETITOR_A");
      expect(result.already_tracked).toBe(true);
      expect(result.competitor.id).toBe(competitorId);
      expect(mockCompetitorRepo.create).not.toHaveBeenCalled();
    });

    it("untracks and deletes competitor successfully", async () => {
      mockCompetitorRepo.findById.mockResolvedValue(sampleCompetitorRow);
      mockCompetitorRepo.deleteCompetitor.mockResolvedValue(true);

      const success = await competitorService.untrackCompetitor(businessId, competitorId);
      expect(success).toBe(true);
      expect(mockCompetitorRepo.deleteCompetitor).toHaveBeenCalledWith(competitorId, businessId);
    });

    it("throws 404 when attempting to untrack nonexistent competitor", async () => {
      mockCompetitorRepo.findById.mockResolvedValue(null);

      await expect(
        competitorService.untrackCompetitor(businessId, "nonexistent-id")
      ).rejects.toThrow(new AppError("Competitor not found", 404));
    });
  });

  // ── 6. Competitor Sync ─────────────────────────────────────────────────────
  describe("Competitor Sync", () => {
    it("calls Google Place Details and updates competitor record", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      mockCompetitorRepo.findById.mockResolvedValue(sampleCompetitorRow);

      const freshGoogleDetails = {
        id: "ChIJ_COMPETITOR_A",
        displayName: { text: "DermaElite Skin Hospital & Research" },
        formattedAddress: "Road 36, Jubilee Hills, Hyderabad",
        location: { latitude: 17.4350, longitude: 78.4080 },
        rating: 4.7,
        userRatingCount: 920, // Updated rating and count
        primaryType: "skin_care_clinic",
        websiteUri: "https://dermaelite.com/updated",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(freshGoogleDetails),
      } as any);

      const updatedRow: competitorRepo.CompetitorRow = {
        ...sampleCompetitorRow,
        name: "DermaElite Skin Hospital & Research",
        rating: 4.7,
        review_count: 920,
        website: "https://dermaelite.com/updated",
        last_synced_at: new Date(),
      };
      mockCompetitorRepo.update.mockResolvedValue(updatedRow);

      const result = await competitorService.syncCompetitor(businessId, competitorId);
      expect(result.name).toBe("DermaElite Skin Hospital & Research");
      expect(result.rating).toBe(4.7);
      expect(result.review_count).toBe(920);

      expect(mockCompetitorRepo.update).toHaveBeenCalledWith(
        competitorId,
        businessId,
        expect.objectContaining({
          rating: 4.7,
          review_count: 920,
        })
      );
    });
  });

  // ── 7. Competitor Comparison ───────────────────────────────────────────────
  describe("Competitor Comparison", () => {
    it("returns normalized comparison with differences and analysis_available: false", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      mockCompetitorRepo.findById.mockResolvedValue(sampleCompetitorRow);

      mockRagRepo.getStructuredMetricsForFilters.mockResolvedValue({
        total_reviews: 126,
        average_rating: 4.3,
        positive_count: 100,
        neutral_count: 16,
        negative_count: 10,
        min_date: null,
        max_date: null,
      });

      const comparison = await competitorService.getCompetitorComparison(businessId, competitorId);

      expect(comparison.business.name).toBe("Glow Skin & Laser Clinic");
      expect(comparison.business.rating).toBe(4.3);
      expect(comparison.business.review_count).toBe(126);

      expect(comparison.competitor.name).toBe("DermaElite Skin Hospital");
      expect(comparison.competitor.rating).toBe(4.6);
      expect(comparison.competitor.review_count).toBe(850);

      expect(comparison.comparison.rating_difference).toBe(0.3); // 4.6 - 4.3
      expect(comparison.comparison.review_count_difference).toBe(724); // 850 - 126
      expect(comparison.comparison.distance_km).toBeGreaterThan(0);

      // Verifies that competitor review analysis is not fabricated
      expect(comparison.analysis_available).toBe(false);
      expect(comparison.sentiment).toBeUndefined();
      expect(comparison.top_themes).toBeUndefined();
    });

    it("throws 404 if competitor belongs to another business (multi-tenant boundary)", async () => {
      mockBusinessRepo.findById.mockResolvedValue(sampleBusiness);
      // Repository query with businessId filter returns null if competitor belongs to other business
      mockCompetitorRepo.findById.mockResolvedValue(null);

      await expect(
        competitorService.getCompetitorComparison(businessId, "competitor-of-another-biz")
      ).rejects.toThrow(new AppError("Competitor not found", 404));
    });
  });
});
