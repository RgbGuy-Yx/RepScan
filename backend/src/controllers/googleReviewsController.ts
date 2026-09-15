import type { NextFunction, Request, Response } from "express";
import {
  scrapeGoogleReviews,
  getScrapeRunsForConnection,
  getScrapeRunById,
  getIngestionStatusForConnection as getIngestionStatusService,
} from "../services/googleReviewsService";

export async function scrapeGoogleReviewsForConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await scrapeGoogleReviews(req.params.id, req.params.platformId);
    res.status(201).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}

export async function listScrapeRunsForConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const runs = await getScrapeRunsForConnection(req.params.id, req.params.platformId, limit);
    res.status(200).json({ status: "success", data: runs });
  } catch (error) {
    next(error);
  }
}

export async function getScrapeRunForConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await getScrapeRunById(req.params.id, req.params.platformId, req.params.runId);
    res.status(200).json({ status: "success", data: run });
  } catch (error) {
    next(error);
  }
}

export async function getIngestionStatusForConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await getIngestionStatusService(req.params.id, req.params.platformId);
    res.status(200).json({ status: "success", data: status });
  } catch (error) {
    next(error);
  }
}


