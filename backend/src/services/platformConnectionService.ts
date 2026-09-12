import * as platformRepo from "../repositories/platformConnectionRepository";
import * as businessRepo from "../repositories/businessRepository";
import { AppError } from "../middleware/errorHandler";

export async function connectPlatform(
  businessId: string,
  data: platformRepo.CreatePlatformConnectionData
) {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const existing = await platformRepo.findByBusinessAndPlatform(
    businessId,
    data.platform
  );
  if (existing) {
    throw new AppError(
      `Platform '${data.platform}' is already connected to this business`,
      409
    );
  }

  return platformRepo.create({
    ...data,
    business_id: businessId,
  });
}

export async function listPlatforms(businessId: string) {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  return platformRepo.findByBusinessId(businessId);
}

export async function updatePlatformConnection(
  businessId: string,
  platformId: string,
  data: platformRepo.UpdatePlatformConnectionData
) {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const connection = await platformRepo.findById(platformId);
  if (!connection) {
    throw new AppError("Platform connection not found", 404);
  }

  if (connection.business_id !== businessId) {
    throw new AppError("Platform connection does not belong to this business", 403);
  }

  const updated = await platformRepo.update(platformId, data);
  if (!updated) {
    throw new AppError("Failed to update platform connection", 500);
  }

  return updated;
}
