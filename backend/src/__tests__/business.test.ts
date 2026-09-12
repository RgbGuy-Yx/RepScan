import { Pool } from "pg";
import {
  createBusiness,
  getBusiness,
  getAllBusinesses,
  updateBusiness,
} from "../services/businessService";
import {
  connectPlatform,
  listPlatforms,
  updatePlatformConnection,
} from "../services/platformConnectionService";
import { AppError } from "../middleware/errorHandler";

// Mock the database pool
jest.mock("../services/database", () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { __esModule: true, default: mockPool };
});

import pool from "../services/database";

const mockPool = pool as unknown as { query: jest.Mock };

function mockQuery(rows: unknown[], rowCount?: number) {
  mockPool.query.mockResolvedValueOnce({ rows, rowCount: rowCount ?? rows.length });
}

function mockQueryError(message: string) {
  mockPool.query.mockRejectedValueOnce(new Error(message));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Business Service", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";

  describe("createBusiness", () => {
    it("should create a business", async () => {
      const input = { name: "Acme Corp", description: "A test company" };
      const row = {
        id: businessId,
        name: "Acme Corp",
        description: "A test company",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([row]);
      const result = await createBusiness(input);

      expect(result).toEqual(row);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO businesses"),
        ["Acme Corp", "A test company"]
      );
    });
  });

  describe("getBusiness", () => {
    it("should return a business by id", async () => {
      const row = {
        id: businessId,
        name: "Acme Corp",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([row]);
      const result = await getBusiness(businessId);

      expect(result).toEqual(row);
    });

    it("should throw 404 for nonexistent business", async () => {
      mockQuery([]);
      await expect(getBusiness(businessId)).rejects.toThrow("Business not found");
    });
  });

  describe("getAllBusinesses", () => {
    it("should return all businesses", async () => {
      const rows = [
        { id: businessId, name: "Acme", description: null, created_at: new Date(), updated_at: new Date() },
      ];
      mockQuery(rows);
      const result = await getAllBusinesses();

      expect(result).toEqual(rows);
    });
  });

  describe("updateBusiness", () => {
    it("should update a business", async () => {
      const row = {
        id: businessId,
        name: "Updated Corp",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([row]);
      const result = await updateBusiness(businessId, { name: "Updated Corp" });

      expect(result).toEqual(row);
    });

    it("should throw 404 for nonexistent business", async () => {
      mockQuery([]);
      await expect(
        updateBusiness(businessId, { name: "X" })
      ).rejects.toThrow("Business not found");
    });
  });
});

describe("Platform Connection Service", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const platformId = "22222222-2222-2222-2222-222222222222";

  describe("connectPlatform", () => {
    it("should connect a platform to a business", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const connectionRow = {
        id: platformId,
        business_id: businessId,
        platform: "google",
        source_url: "https://maps.google.com/acme",
        external_id: null,
        is_active: true,
        last_scraped_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // First query: find business
      mockQuery([businessRow]);
      // Second query: check duplicate
      mockQuery([]);
      // Third query: insert
      mockQuery([connectionRow]);

      const result = await connectPlatform(businessId, {
        business_id: businessId,
        platform: "google",
        source_url: "https://maps.google.com/acme",
      });

      expect(result).toEqual(connectionRow);
    });

    it("should throw 404 for nonexistent business", async () => {
      mockQuery([]);
      await expect(
        connectPlatform(businessId, {
          business_id: businessId,
          platform: "google",
          source_url: "https://example.com",
        })
      ).rejects.toThrow("Business not found");
    });

    it("should throw 409 for duplicate platform", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const existing = {
        id: platformId,
        business_id: businessId,
        platform: "google",
        source_url: "https://existing.com",
        external_id: null,
        is_active: true,
        last_scraped_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([businessRow]);
      mockQuery([existing]);

      await expect(
        connectPlatform(businessId, {
          business_id: businessId,
          platform: "google",
          source_url: "https://new.com",
        })
      ).rejects.toThrow("already connected");
    });
  });

  describe("listPlatforms", () => {
    it("should list platforms for a business", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const platforms = [
        {
          id: platformId,
          business_id: businessId,
          platform: "google",
          source_url: "https://maps.google.com/acme",
          external_id: null,
          is_active: true,
          last_scraped_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery([businessRow]);
      mockQuery(platforms);

      const result = await listPlatforms(businessId);
      expect(result).toEqual(platforms);
    });

    it("should throw 404 for nonexistent business", async () => {
      mockQuery([]);
      await expect(listPlatforms(businessId)).rejects.toThrow("Business not found");
    });
  });

  describe("updatePlatformConnection", () => {
    it("should update platform connection status", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const connection = {
        id: platformId,
        business_id: businessId,
        platform: "google",
        source_url: "https://maps.google.com/acme",
        external_id: null,
        is_active: true,
        last_scraped_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updated = { ...connection, is_active: false };

      mockQuery([businessRow]);
      mockQuery([connection]);
      mockQuery([updated]);

      const result = await updatePlatformConnection(businessId, platformId, {
        is_active: false,
      });

      expect(result).toEqual(updated);
    });

    it("should throw 404 for nonexistent business", async () => {
      mockQuery([]);
      await expect(
        updatePlatformConnection(businessId, platformId, { is_active: false })
      ).rejects.toThrow("Business not found");
    });

    it("should throw 404 for nonexistent platform", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([businessRow]);
      mockQuery([]);

      await expect(
        updatePlatformConnection(businessId, platformId, { is_active: false })
      ).rejects.toThrow("Platform connection not found");
    });

    it("should throw 403 when platform belongs to different business", async () => {
      const businessRow = {
        id: businessId,
        name: "Acme",
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const connection = {
        id: platformId,
        business_id: "other-business-id",
        platform: "google",
        source_url: "https://maps.google.com/acme",
        external_id: null,
        is_active: true,
        last_scraped_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery([businessRow]);
      mockQuery([connection]);

      await expect(
        updatePlatformConnection(businessId, platformId, { is_active: false })
      ).rejects.toThrow("does not belong");
    });
  });
});
