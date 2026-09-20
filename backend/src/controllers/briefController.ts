import type { Request, Response, NextFunction } from "express";
import {
  generateWeeklyBrief,
  getLatestBrief,
  getBriefById,
  listBriefs,
} from "../services/briefService";

export async function createWeeklyBrief(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const { startDate, endDate, forceRefresh } = req.body;

    const brief = await generateWeeklyBrief(businessId, {
      startDate,
      endDate,
      forceRefresh,
    });

    res.status(201).json({
      status: "success",
      data: brief,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLatestBriefHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const brief = await getLatestBrief(businessId);

    if (!brief) {
      res.status(404).json({
        status: "error",
        message: "No brief found for this business",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: brief,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBriefByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: businessId, briefId } = req.params;
    const brief = await getBriefById(businessId, briefId);

    res.status(200).json({
      status: "success",
      data: brief,
    });
  } catch (err) {
    next(err);
  }
}

export async function listBriefsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await listBriefs(businessId, limit, offset);

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
