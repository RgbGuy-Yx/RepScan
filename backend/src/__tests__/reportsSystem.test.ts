import type { Request, Response, NextFunction } from "express";
import {
  generateReportHandler,
  getReportByIdHandler,
  listReportsHandler,
  downloadReportPdfHandler,
  deleteReportHandler,
} from "../controllers/reportController";
import * as reportService from "../services/reportService";
import { parseReportDateRange } from "../services/reportService";

jest.mock("../services/reportService", () => {
  const actual = jest.requireActual("../services/reportService");
  return {
    ...actual,
    generateReport: jest.fn(),
    getReportById: jest.fn(),
    listReports: jest.fn(),
    getReportPdfBuffer: jest.fn(),
    deleteReport: jest.fn(),
  };
});

const mockReportService = reportService as jest.Mocked<typeof reportService>;

describe("Reports System Controller & Service Tests", () => {
  const businessId = "11111111-1111-1111-1111-111111111111";
  const reportId = "rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let responseData: any;
  let responseStatus: number;
  let headersSet: Record<string, string | number>;

  beforeEach(() => {
    jest.clearAllMocks();
    responseStatus = 200;
    responseData = null;
    headersSet = {};
    mockNext = jest.fn();

    mockRes = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatus = code;
        return mockRes;
      }),
      json: jest.fn().mockImplementation((body: unknown) => {
        responseData = body;
        return mockRes;
      }),
      setHeader: jest.fn().mockImplementation((name: string, value: string | number) => {
        headersSet[name] = value;
        return mockRes;
      }),
      end: jest.fn().mockImplementation((chunk: any) => {
        responseData = chunk;
        return mockRes;
      }),
    };
  });

  describe("Date Range Parsing", () => {
    it("correctly parses weekly date ranges (7 days)", () => {
      const dates = parseReportDateRange("weekly", undefined, "2026-10-01T00:00:00.000Z");
      expect(dates.currentEnd.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      const diffDays =
        (dates.currentEnd.getTime() - dates.currentStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
      expect(dates.previousEnd.getTime()).toBe(dates.currentStart.getTime());
    });

    it("correctly parses monthly date ranges (30 days)", () => {
      const dates = parseReportDateRange("monthly", undefined, "2026-10-01T00:00:00.000Z");
      const diffDays =
        (dates.currentEnd.getTime() - dates.currentStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it("correctly parses custom date ranges", () => {
      const dates = parseReportDateRange(
        "custom",
        "2026-09-01T00:00:00.000Z",
        "2026-09-15T00:00:00.000Z"
      );
      expect(dates.currentStart.toISOString()).toBe("2026-09-01T00:00:00.000Z");
      expect(dates.currentEnd.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    });
  });

  describe("POST /v1/businesses/:id/reports/generate", () => {
    it("generates and returns 201 with structured report data", async () => {
      mockReq = {
        params: { id: businessId },
        body: {
          report_type: "weekly",
          title: "Weekly Executive Audit",
        },
        user: { id: "user-1" } as any,
      };

      const mockCreatedReport = {
        id: reportId,
        business_id: businessId,
        title: "Weekly Executive Audit",
        report_type: "weekly" as const,
        period_start: new Date("2026-09-24"),
        period_end: new Date("2026-10-01"),
        summary_text: "Customer sentiment remained high with doctor consultations leading praise.",
        confidence: "High" as const,
        confidence_score: 0.95,
        data: {
          kpis: { total_reviews: 25, average_rating: 4.8 },
          key_changes: [{ theme: "Wait Time", change_type: "decreasing", description: "Fewer complaints" }],
          recommendations: [{ title: "Maintain Consultation Standard", action: "Continue training", priority: "High" }],
        },
        pdf_path: "storage/reports/biz/report.pdf",
        created_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReportService.generateReport.mockResolvedValueOnce(mockCreatedReport);

      await generateReportHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReportService.generateReport).toHaveBeenCalledWith(
        businessId,
        mockReq.body,
        "user-1"
      );
      expect(responseStatus).toBe(201);
      expect(responseData).toEqual({
        status: "success",
        data: mockCreatedReport,
      });
    });
  });

  describe("GET /v1/businesses/:id/reports", () => {
    it("lists reports for the business with pagination", async () => {
      mockReq = {
        params: { id: businessId },
        query: { limit: "10", offset: "0" },
      };

      mockReportService.listReports.mockResolvedValueOnce({
        reports: [
          {
            id: reportId,
            business_id: businessId,
            title: "Test Report",
            report_type: "weekly",
            period_start: new Date(),
            period_end: new Date(),
            summary_text: "Summary",
            confidence: "High",
            confidence_score: 0.9,
            data: {},
            pdf_path: "path.pdf",
            created_by: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
      });

      await listReportsHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData.status).toBe("success");
      expect(responseData.total).toBe(1);
      expect(responseData.data).toHaveLength(1);
    });
  });

  describe("GET /v1/businesses/:id/reports/:reportId", () => {
    it("returns report by id", async () => {
      mockReq = {
        params: { id: businessId, reportId },
      };

      mockReportService.getReportById.mockResolvedValueOnce({
        id: reportId,
        business_id: businessId,
        title: "Test Report",
        report_type: "weekly",
        period_start: new Date(),
        period_end: new Date(),
        summary_text: "Summary",
        confidence: "High",
        confidence_score: 0.9,
        data: {},
        pdf_path: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await getReportByIdHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData.data.id).toBe(reportId);
    });
  });

  describe("GET /v1/businesses/:id/reports/:reportId/download", () => {
    it("streams PDF with application/pdf header and attachment filename", async () => {
      mockReq = {
        params: { id: businessId, reportId },
      };

      const fakePdfBuffer = Buffer.from("%PDF-1.4 Fake PDF Content");
      mockReportService.getReportPdfBuffer.mockResolvedValueOnce({
        buffer: fakePdfBuffer,
        filename: "Test_Report.pdf",
      });

      await downloadReportPdfHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(headersSet["Content-Type"]).toBe("application/pdf");
      expect(headersSet["Content-Disposition"]).toBe('attachment; filename="Test_Report.pdf"');
      expect(headersSet["Content-Length"]).toBe(fakePdfBuffer.length);
      expect(responseData).toEqual(fakePdfBuffer);
    });
  });

  describe("DELETE /v1/businesses/:id/reports/:reportId", () => {
    it("deletes report successfully", async () => {
      mockReq = {
        params: { id: businessId, reportId },
      };

      mockReportService.deleteReport.mockResolvedValueOnce(true);

      await deleteReportHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData.message).toBe("Report deleted successfully");
    });
  });
});
