import { z } from "zod";
import { confidenceLevelSchema } from "./analyticsSchemas";

export const reportTypeSchema = z.enum(["weekly", "monthly", "custom"]);

export const generateReportBodySchema = z.object({
  body: z.object({
    report_type: reportTypeSchema.default("weekly"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    title: z.string().max(255).optional(),
  }),
});

export const listReportsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

export type GenerateReportInput = z.infer<typeof generateReportBodySchema>["body"];
export type ReportType = z.infer<typeof reportTypeSchema>;
