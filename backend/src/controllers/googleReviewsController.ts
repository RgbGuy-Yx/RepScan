import type { NextFunction, Request, Response } from "express";
import { scrapeGoogleReviews } from "../services/googleReviewsService";

export async function scrapeGoogleReviewsForConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await scrapeGoogleReviews(req.params.id, req.params.platformId);
    res.status(201).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}
