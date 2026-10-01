import type { Request, Response, NextFunction } from "express";
import * as businessService from "../services/businessService";

export async function createBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.createBusiness(req.body, req.user?.id);
    res.status(201).json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function getBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.getBusiness(req.params.id, req.user?.id);
    res.json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function getAllBusinesses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const businesses = await businessService.getAllBusinesses(req.user?.id, workspaceId);
    res.json({ status: "success", data: businesses });
  } catch (err) {
    next(err);
  }
}

export async function updateBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const business = await businessService.updateBusiness(
      req.params.id,
      req.body,
      req.user?.id
    );
    res.json({ status: "success", data: business });
  } catch (err) {
    next(err);
  }
}

export async function listBusinessReviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const feedbackRepo = await import("../repositories/feedbackRepository");
    const reviews = await feedbackRepo.findReviewsByBusinessId(businessId, limit, offset);
    res.json({ status: "success", data: reviews });
  } catch (err) {
    next(err);
  }
}

