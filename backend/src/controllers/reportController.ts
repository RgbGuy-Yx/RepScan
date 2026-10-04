import type { Request, Response, NextFunction } from "express";
import * as reportService from "../services/reportService";
import { AppError } from "../middleware/errorHandler";

export async function generateReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const report = await reportService.generateReport(businessId, req.body, req.user?.id);
    res.status(201).json({
      status: "success",
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function getReportByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const reportId = req.params.reportId;
    const report = await reportService.getReportById(reportId, businessId);

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    res.json({
      status: "success",
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function listReportsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const { reports, total } = await reportService.listReports(businessId, limit, offset);

    res.json({
      status: "success",
      data: reports,
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadReportPdfHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const reportId = req.params.reportId;

    const { buffer, filename } = await reportService.getReportPdfBuffer(reportId, businessId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (err) {
    next(err);
  }
}

export async function deleteReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.id;
    const reportId = req.params.reportId;

    await reportService.deleteReport(reportId, businessId);

    res.json({
      status: "success",
      message: "Report deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
