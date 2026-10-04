import * as businessRepo from "../repositories/businessRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorHandler";

export async function createBusiness(
  data: businessRepo.CreateBusinessData,
  userId?: string
) {
  let targetWorkspaceId = data.workspace_id;
  if (userId && !targetWorkspaceId) {
    const userWorkspaces = await workspaceRepo.findWorkspacesByUserId(userId);
    if (userWorkspaces.length > 0) {
      targetWorkspaceId = userWorkspaces[0].id;
    }
  }

  if (userId && targetWorkspaceId) {
    const member = await workspaceRepo.getMember(targetWorkspaceId, userId);
    if (!member) {
      throw new AppError("Forbidden: You are not a member of this workspace", 403);
    }
    if (member.role === "analyst") {
      throw new AppError("Forbidden: Insufficient role permissions to create a business", 403);
    }
  }
  return businessRepo.create({ ...data, workspace_id: targetWorkspaceId });
}

export async function getBusiness(id: string, userId?: string) {
  const business = await businessRepo.findById(id);
  if (!business) {
    throw new AppError("Business not found", 404);
  }
  if (userId && business.workspace_id) {
    const member = await workspaceRepo.getMember(business.workspace_id, userId);
    if (!member) {
      throw new AppError("Forbidden: You do not have access to this business", 403);
    }
  }
  return business;
}

export async function getAllBusinesses(userId?: string, workspaceId?: string) {
  if (workspaceId) {
    if (userId) {
      const member = await workspaceRepo.getMember(workspaceId, userId);
      if (!member) {
        throw new AppError("Forbidden: You are not a member of this workspace", 403);
      }
    }
    return businessRepo.findByWorkspaceId(workspaceId);
  }
  return businessRepo.findAll();
}

export async function updateBusiness(
  id: string,
  data: businessRepo.UpdateBusinessData,
  userId?: string
) {
  const business = await businessRepo.findById(id);
  if (!business) {
    throw new AppError("Business not found", 404);
  }
  if (userId && business.workspace_id) {
    const member = await workspaceRepo.getMember(business.workspace_id, userId);
    if (!member) {
      throw new AppError("Forbidden: You do not have access to this business", 403);
    }
    if (member.role === "analyst") {
      throw new AppError("Forbidden: Insufficient role permissions to update business", 403);
    }
  }
  const updated = await businessRepo.update(id, data);
  return updated;
}
