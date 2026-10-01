import {
  authenticate,
  requireWorkspaceMember,
  requireRole,
  requireBusinessAccess,
} from "../middleware/auth";
import * as userRepo from "../repositories/userRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import * as businessRepo from "../repositories/businessRepository";
import * as businessService from "../services/businessService";
import { AppError } from "../middleware/errorHandler";

// Mock the database pool and transaction client
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock("../services/database", () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { __esModule: true, default: mockPool };
});

import pool from "../services/database";

const mockPool = pool as unknown as {
  query: jest.Mock;
  connect: jest.Mock;
};

function mockQuery(rows: unknown[], rowCount?: number) {
  mockPool.query.mockResolvedValueOnce({ rows, rowCount: rowCount ?? rows.length });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.connect.mockResolvedValue(mockClient);
});

describe("Multi-Tenant Authentication & Authorization System", () => {
  const testUserId = "user-uuid-1111";
  const testClerkId = "user_clerk_12345";
  const testWorkspaceId = "ws-uuid-2222";
  const testBusinessId = "biz-uuid-3333";

  // ── 1. Unauthenticated Requests (401) ──────────────────────────────────
  describe("1. Unauthenticated Requests", () => {
    it("should return 401 when no authorization token is provided", async () => {
      const authMiddleware = authenticate();
      const req: any = { headers: {} };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          message: expect.stringContaining("Authentication required"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── 2. User Synchronization with PostgreSQL ────────────────────────────
  describe("2. User Synchronization & Authentication", () => {
    it("should synchronize and upsert a new Clerk user into PostgreSQL", async () => {
      const authMiddleware = authenticate();
      const req: any = {
        headers: {
          "x-test-auth-provider-id": testClerkId,
          "x-test-user-email": "alex@repscan.dev",
          "x-test-user-name": "Alex Mercer",
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      // First query: findByAuthProviderId -> null (user does not exist yet)
      mockQuery([]);

      // Second query: upsertFromClerk -> returns created user
      const createdUser = {
        id: testUserId,
        auth_provider_id: testClerkId,
        email: "alex@repscan.dev",
        name: "Alex Mercer",
        created_at: new Date(),
      };
      mockQuery([createdUser]);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(createdUser);
      expect(req.clerkAuth.userId).toBe(testClerkId);
      expect(next).toHaveBeenCalled();
    });

    it("should reuse an existing user without re-inserting if already synchronized", async () => {
      const authMiddleware = authenticate();
      const req: any = {
        headers: {
          "x-test-auth-provider-id": testClerkId,
          "x-test-user-email": "alex@repscan.dev",
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const existingUser = {
        id: testUserId,
        auth_provider_id: testClerkId,
        email: "alex@repscan.dev",
        name: "Alex Mercer",
        created_at: new Date(),
      };
      mockQuery([existingUser]);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(existingUser);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── 3. Workspace Creation & Owner Role ──────────────────────────────────
  describe("3. Workspace Creation & Membership Assignment", () => {
    it("should create workspace and automatically assign creator the 'owner' role", async () => {
      const wsRow = {
        id: testWorkspaceId,
        name: "Acme Group",
        created_by: testUserId,
        created_at: new Date(),
      };

      // Mock client queries for transaction
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [wsRow] }) // INSERT INTO workspaces
        .mockResolvedValueOnce({ rows: [] }) // INSERT INTO workspace_members
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const created = await workspaceRepo.create("Acme Group", testUserId);

      expect(created.id).toBe(testWorkspaceId);
      expect(created.name).toBe("Acme Group");
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO workspace_members"),
        [testWorkspaceId, testUserId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ── 4. Role Permissions (owner, admin, analyst) ────────────────────────
  describe("4. Role Permissions Enforcement", () => {
    it("should allow 'owner' and 'admin' through requireRole(['owner', 'admin'])", () => {
      const roleMiddleware = requireRole(["owner", "admin"]);
      const req: any = {
        workspaceMember: { role: "owner" },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      roleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should deny 'analyst' (403) from administrative actions", () => {
      const roleMiddleware = requireRole(["owner", "admin"]);
      const req: any = {
        workspaceMember: { role: "analyst" },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      roleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          message: expect.stringContaining("Requires owner or admin role"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── 5. Own-Business Access vs Cross-Business Access Denial (403) ───────
  describe("5. Business Access Chain (User -> Workspace -> Business)", () => {
    it("should grant access (200) when user is a verified member of the business workspace", async () => {
      const accessMiddleware = requireBusinessAccess();
      const req: any = {
        user: { id: testUserId },
        params: { id: testBusinessId },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const businessRow = {
        id: testBusinessId,
        name: "Luminary Kitchen",
        workspace_id: testWorkspaceId,
      };
      mockQuery([businessRow]); // findById

      const memberRow = {
        id: "mem-uuid-1",
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: "admin",
      };
      mockQuery([memberRow]); // getMember

      await accessMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.business).toEqual(businessRow);
      expect(req.businessRole).toBe("admin");
    });

    it("should strictly return 403 Forbidden when user attempts to access a business outside their workspace", async () => {
      const accessMiddleware = requireBusinessAccess();
      const otherBusinessId = "biz-other-9999";
      const otherWorkspaceId = "ws-other-8888";

      const req: any = {
        user: { id: testUserId },
        params: { id: otherBusinessId },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      // 1. businessRepo.findById returns business from another workspace
      mockQuery([
        {
          id: otherBusinessId,
          name: "Competitor Cafe",
          workspace_id: otherWorkspaceId,
        },
      ]);

      // 2. workspaceRepo.getMember returns null
      mockQuery([]);

      await accessMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          message: "Forbidden: You do not have access to this business",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── 6. Business Creation Within Workspace ──────────────────────────────
  describe("6. Business Creation & Multi-Business Support", () => {
    it("should allow an owner to create multiple businesses within their workspace", async () => {
      const memberRow = {
        id: "mem-1",
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: "owner",
      };
      mockQuery([memberRow]); // workspaceRepo.getMember

      const createdBiz = {
        id: testBusinessId,
        name: "Luminary Bar & Lounge",
        workspace_id: testWorkspaceId,
        industry: "Hospitality & Dining",
        location: "Austin, TX",
      };
      mockQuery([createdBiz]); // businessRepo.create

      const result = await businessService.createBusiness(
        {
          name: "Luminary Bar & Lounge",
          workspace_id: testWorkspaceId,
          industry: "Hospitality & Dining",
          location: "Austin, TX",
        },
        testUserId
      );

      expect(result).toEqual(createdBiz);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO businesses"),
        ["Luminary Bar & Lounge", null, testWorkspaceId, "Hospitality & Dining", null, "Austin, TX"]
      );
    });

    it("should prevent an analyst from creating a business (403)", async () => {
      const memberRow = {
        id: "mem-1",
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: "analyst",
      };
      mockQuery([memberRow]);

      await expect(
        businessService.createBusiness(
          {
            name: "Unauthorized Business",
            workspace_id: testWorkspaceId,
          },
          testUserId
        )
      ).rejects.toThrow("Forbidden: Insufficient role permissions to create a business");
    });
  });
});
