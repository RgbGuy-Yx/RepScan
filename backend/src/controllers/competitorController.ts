import type { Request, Response, NextFunction } from "express";
import * as competitorService from "../services/competitorService";
import type { NearbyCompetitorsQuery, TrackCompetitorBody } from "../schemas/competitorSchemas";

export async function getNearbyCompetitorsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const query = req.query as unknown as NearbyCompetitorsQuery;
    const result = await competitorService.discoverNearbyCompetitors(businessId, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCompetitorsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const result = await competitorService.listTrackedCompetitors(businessId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCompetitorByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const { competitorId } = req.params;
    const competitor = await competitorService.getCompetitorById(businessId, competitorId);
    res.json({ competitor });
  } catch (err) {
    next(err);
  }
}

export async function trackCompetitorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const { place_id } = req.body as TrackCompetitorBody;
    const result = await competitorService.trackCompetitor(businessId, place_id);
    const statusCode = result.already_tracked ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (err) {
    next(err);
  }
}

export async function untrackCompetitorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const { competitorId } = req.params;
    await competitorService.untrackCompetitor(businessId, competitorId);
    res.json({ success: true, message: "Competitor removed from tracking" });
  } catch (err) {
    next(err);
  }
}

export async function syncCompetitorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const { competitorId } = req.params;
    const competitor = await competitorService.syncCompetitor(businessId, competitorId);
    res.json({ competitor });
  } catch (err) {
    next(err);
  }
}

export async function getCompetitorComparisonHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.params.id;
    const { competitorId } = req.params;
    const result = await competitorService.getCompetitorComparison(businessId, competitorId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
