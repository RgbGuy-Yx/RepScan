import type { Request, Response, NextFunction } from "express";
import * as workspaceRepo from "../repositories/workspaceRepository";
import * as businessRepo from "../repositories/businessRepository";
import * as userRepo from "../repositories/userRepository";
import { AppError } from "../middleware/errorHandler";

export async function getMyProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const workspaces = await workspaceRepo.findWorkspacesByUserId(req.user.id);
    const businesses = await businessRepo.findBusinessesByUserId(req.user.id);

    res.json({
      status: "success",
      data: {
        user: req.user,
        workspaces,
        businesses,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listWorkspaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const workspaces = await workspaceRepo.findWorkspacesByUserId(req.user.id);
    res.json({ status: "success", data: workspaces });
  } catch (err) {
    next(err);
  }
}

export async function createWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError("Workspace name is required", 400);
    }

    const workspace = await workspaceRepo.create(name.trim(), req.user.id);
    res.status(201).json({ status: "success", data: workspace });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const workspace = await workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }
    res.json({
      status: "success",
      data: {
        ...workspace,
        role: req.workspaceMember?.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listWorkspaceBusinesses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const businesses = await businessRepo.findByWorkspaceId(workspaceId);
    res.json({ status: "success", data: businesses });
  } catch (err) {
    next(err);
  }
}

export async function createWorkspaceBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const { name, description, industry, website, location } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError("Business name is required", 400);
    }

    const business = await businessRepo.create({
      name: name.trim(),
      description: description?.trim(),
      workspace_id: workspaceId,
      industry: industry?.trim(),
      website: website?.trim(),
      location: location?.trim(),
    });

    res.status(201).json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const members = await workspaceRepo.listMembers(workspaceId);
    res.json({ status: "success", data: members });
  } catch (err) {
    next(err);
  }
}

export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const { email, role = "analyst" } = req.body;

    if (!email) {
      throw new AppError("Member email is required", 400);
    }
    if (!["owner", "admin", "analyst"].includes(role)) {
      throw new AppError("Invalid role. Must be owner, admin, or analyst", 400);
    }

    let targetUser = await userRepo.findByEmail(email);
    if (!targetUser) {
      targetUser = await userRepo.create({
        auth_provider_id: `invited_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
      });
    }

    const member = await workspaceRepo.addMember(workspaceId, targetUser.id, role);
    res.status(201).json({ status: "success", data: member });
  } catch (err) {
    next(err);
  }
}
