import { Router } from "express";
import {
  authenticate,
  requireWorkspaceMember,
  requireRole,
} from "../../middleware/auth";
import {
  getMyProfile,
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  listWorkspaceBusinesses,
  createWorkspaceBusiness,
  listMembers,
  addMember,
} from "../../controllers/workspaceController";

const router = Router();

// All workspace routes require authentication
router.use(authenticate());

// Current user profile & multi-tenant summary
router.get("/v1/auth/me", getMyProfile);

// Workspaces list and creation
router.get("/v1/workspaces", listWorkspaces);
router.post("/v1/workspaces", createWorkspace);

// Specific workspace routes (requires workspace membership)
router.get("/v1/workspaces/:workspaceId", requireWorkspaceMember(), getWorkspace);
router.get("/v1/workspaces/:workspaceId/members", requireWorkspaceMember(), listMembers);
router.post(
  "/v1/workspaces/:workspaceId/members",
  requireWorkspaceMember(),
  requireRole(["owner", "admin"]),
  addMember
);

// Businesses inside workspace
router.get(
  "/v1/workspaces/:workspaceId/businesses",
  requireWorkspaceMember(),
  listWorkspaceBusinesses
);
router.post(
  "/v1/workspaces/:workspaceId/businesses",
  requireWorkspaceMember(),
  requireRole(["owner", "admin"]),
  createWorkspaceBusiness
);

export { router as workspaceRouter };
