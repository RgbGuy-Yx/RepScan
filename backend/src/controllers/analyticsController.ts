import type { Request, Response, NextFunction } from "express";
import { getWeeklyComparison } from "../services/briefService";

export async function getWeeklyAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const result = await getWeeklyComparison(businessId, startDate, endDate);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
