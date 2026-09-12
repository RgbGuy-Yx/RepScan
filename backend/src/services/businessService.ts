import * as businessRepo from "../repositories/businessRepository";
import { AppError } from "../middleware/errorHandler";

export async function createBusiness(data: businessRepo.CreateBusinessData) {
  return businessRepo.create(data);
}

export async function getBusiness(id: string) {
  const business = await businessRepo.findById(id);
  if (!business) {
    throw new AppError("Business not found", 404);
  }
  return business;
}

export async function getAllBusinesses() {
  return businessRepo.findAll();
}

export async function updateBusiness(id: string, data: businessRepo.UpdateBusinessData) {
  const business = await businessRepo.update(id, data);
  if (!business) {
    throw new AppError("Business not found", 404);
  }
  return business;
}
