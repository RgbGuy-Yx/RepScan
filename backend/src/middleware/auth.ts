import type { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { config } from "../config";
import { logger } from "../config/logger";
import * as userRepo from "../repositories/userRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import * as businessRepo from "../repositories/businessRepository";
import { AppError } from "./errorHandler";

declare global {
  namespace Express {
    interface Request {
      user?: userRepo.User;
      clerkAuth?: {
        userId: string;
        sessionId?: string;
      };
      workspaceMember?: workspaceRepo.WorkspaceMember;
      business?: businessRepo.Business;
      businessRole?: workspaceRepo.WorkspaceRole;
    }
  }
}

const clerkClient = config.clerkSecretKey
  ? createClerkClient({ secretKey: config.clerkSecretKey })
  : null;

/**
 * 1. authenticate()
 * Verifies the Clerk JWT token from the Authorization header and synchronizes
 * the user record into PostgreSQL.
 */
export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const rawToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : null;

      // Test override headers strictly allowed only in automated test suite environment
      const isTestEnv = process.env.NODE_ENV === "test";
      const testAuthProviderId = isTestEnv
        ? (req.headers["x-test-auth-provider-id"] as string | undefined)
        : undefined;
      const testEmail = (req.headers["x-test-user-email"] as string) || "tester@repscan.dev";
      const testName = (req.headers["x-test-user-name"] as string) || "Test User";

      let clerkUserId: string | null = null;
      let emailFromToken: string | null = null;
      let nameFromToken: string | null = null;

      if (testAuthProviderId) {
        clerkUserId = testAuthProviderId;
        emailFromToken = testEmail;
        nameFromToken = testName;
      } else if (rawToken) {
        const isSecretKeyPlaceholder =
          !config.clerkSecretKey ||
          config.clerkSecretKey.includes("•") ||
          !config.clerkSecretKey.startsWith("sk_");

        let verifiedSuccess = false;

        if (!isSecretKeyPlaceholder) {
          try {
            const verified = await verifyToken(rawToken, {
              secretKey: config.clerkSecretKey,
            });
            clerkUserId = verified.sub;
            emailFromToken = (verified as any).email || null;
            nameFromToken = (verified as any).name || null;
            verifiedSuccess = true;
          } catch (verifyErr) {
            logger.warn("Clerk token verification failed with secretKey:", verifyErr);
          }
        } else {
          logger.warn(
            "CLERK_SECRET_KEY in backend/.env is missing or contains masked bullet points (••••). In development mode, falling back to payload decoding."
          );
        }

        // In development mode, fallback to decoding the JWT payload so local development is not blocked
        if (!verifiedSuccess && config.nodeEnv !== "production") {
          try {
            const parts = rawToken.split(".");
            if (parts.length === 3) {
              const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
              const payload = JSON.parse(payloadJson);
              if (payload && payload.sub) {
                clerkUserId = payload.sub;
                emailFromToken = payload.email || payload.primary_email_address || null;
                nameFromToken =
                  [payload.first_name, payload.last_name].filter(Boolean).join(" ") ||
                  payload.name ||
                  null;
                verifiedSuccess = true;
                logger.info(`[Dev Auth Fallback] Authenticated user from token payload: ${clerkUserId}`);
              }
            }
          } catch (decodeErr) {
            logger.warn("Dev token decode failed:", decodeErr);
          }
        }

        if (!verifiedSuccess || !clerkUserId) {
          res.status(401).json({ status: "error", message: "Unauthorized: Invalid or expired token" });
          return;
        }
      } else {
        // No token provided
        res.status(401).json({ status: "error", message: "Unauthorized: Authentication required" });
        return;
      }

      if (!clerkUserId) {
        res.status(401).json({ status: "error", message: "Unauthorized: Missing subject identifier" });
        return;
      }

      // Synchronize Clerk User into PostgreSQL
      let dbUser = await userRepo.findByAuthProviderId(clerkUserId);

      if (!dbUser) {
        let finalEmail = emailFromToken;
        let finalName = nameFromToken;

        // If email not in token claims, attempt to fetch from Clerk API
        if (!finalEmail && clerkClient && !config.clerkSecretKey?.includes("•")) {
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            finalEmail = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@clerk.repscan.dev`;
            finalName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
          } catch (fetchErr) {
            logger.warn("Could not fetch user details from Clerk API:", fetchErr);
            finalEmail = `${clerkUserId}@clerk.repscan.dev`;
          }
        }

        dbUser = await userRepo.upsertFromClerk(
          clerkUserId,
          finalEmail || `${clerkUserId}@clerk.repscan.dev`,
          finalName
        );

        if (!isTestEnv) {
          try {
            const userWorkspaces = await workspaceRepo.findWorkspacesByUserId(dbUser.id);
            if (userWorkspaces.length === 0) {
              await workspaceRepo.create("Personal Workspace", dbUser.id);
            }
          } catch (wsErr) {
            logger.warn("Failed to auto-create personal workspace for new user:", wsErr);
          }
        }
      }

      req.user = dbUser;
      req.clerkAuth = { userId: clerkUserId };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * 2. requireWorkspaceMember()
 * Checks that the authenticated user is a verified member of the requested workspace.
 */
export function requireWorkspaceMember() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const workspaceId =
        req.params.workspaceId ||
        (req.query.workspaceId as string) ||
        (req.headers["x-workspace-id"] as string) ||
        req.body?.workspace_id;

      if (!workspaceId) {
        res.status(400).json({ status: "error", message: "Workspace ID is required" });
        return;
      }

      const member = await workspaceRepo.getMember(workspaceId, req.user.id);
      if (!member) {
        res.status(403).json({
          status: "error",
          message: "Forbidden: You are not a member of this workspace",
        });
        return;
      }

      req.workspaceMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * 3. requireRole()
 * Ensures the member holds one of the specified roles: 'owner' | 'admin' | 'analyst'
 */
export function requireRole(allowedRoles: workspaceRepo.WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.workspaceMember?.role || req.businessRole;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        status: "error",
        message: `Forbidden: Requires ${allowedRoles.join(" or ")} role`,
      });
      return;
    }
    next();
  };
}

/**
 * 4. requireBusinessAccess()
 * Enforces the strict chain:
 * User → Workspace Membership → Workspace → Business
 * Prevents accessing another workspace's business by tampering with URL IDs.
 */
export function requireBusinessAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const businessId = req.params.id || req.params.businessId;
      if (!businessId) {
        next();
        return;
      }

      const business = await businessRepo.findById(businessId);
      if (!business) {
        res.status(404).json({ status: "error", message: "Business not found" });
        return;
      }

      if (business.workspace_id) {
        const member = await workspaceRepo.getMember(business.workspace_id, req.user.id);
        if (!member) {
          res.status(403).json({
            status: "error",
            message: "Forbidden: You do not have access to this business",
          });
          return;
        }
        req.businessRole = member.role;
        req.workspaceMember = member;
      } else {
        req.businessRole = "owner";
      }

      req.business = business;
      next();
    } catch (err) {
      next(err);
    }
  };
}
