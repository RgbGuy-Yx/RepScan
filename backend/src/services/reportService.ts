import fs from "fs";
import path from "path";
import { AppError } from "../middleware/errorHandler";
import * as businessRepo from "../repositories/businessRepository";
import * as analyticsRepo from "../repositories/analyticsRepository";
import * as reportRepo from "../repositories/reportRepository";
import {
  aggregateWeeklyMetrics,
  calculateConfidenceAndLimitations,
  detectMeaningfulChanges,
} from "./analyticsService";
import {
  generateReportAIBrief,
  renderReportPdf,
  type ReportAIBriefPayload,
} from "./aiService";
import { logger } from "../config/logger";
import type { GenerateReportInput, ReportType } from "../schemas/reportSchemas";

const STORAGE_DIR = path.join(process.cwd(), "storage", "reports");

function ensureStorageDir(businessId: string): string {
  const dir = path.join(STORAGE_DIR, businessId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function parseReportDateRange(
  reportType: ReportType,
  startDateStr?: string,
  endDateStr?: string
): { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date } {
  let currentEnd = new Date();
  if (endDateStr) {
    currentEnd = new Date(endDateStr);
    if (isNaN(currentEnd.getTime())) {
      throw new AppError("Invalid endDate format", 400);
    }
  }

  let durationDays = 7;
  if (reportType === "monthly") {
    durationDays = 30;
  }

  let currentStart = new Date(currentEnd.getTime() - durationDays * 24 * 60 * 60 * 1000);
  if (startDateStr) {
    currentStart = new Date(startDateStr);
    if (isNaN(currentStart.getTime())) {
      throw new AppError("Invalid startDate format", 400);
    }
  }

  if (currentStart >= currentEnd) {
    throw new AppError("startDate must be before endDate", 400);
  }

  const durationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

function computeTrends(reviews: analyticsRepo.AnalyzedReviewRow[], start: Date, end: Date) {
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const bucketsCount = totalDays <= 14 ? Math.min(totalDays, 7) : 6;
  const bucketDurationMs = (end.getTime() - start.getTime()) / bucketsCount;

  const buckets: Array<{
    label: string;
    count: number;
    ratingSum: number;
    ratingCount: number;
    positive: number;
    neutral: number;
    negative: number;
  }> = [];

  for (let i = 0; i < bucketsCount; i++) {
    const bStart = new Date(start.getTime() + i * bucketDurationMs);
    const label = `${bStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    buckets.push({
      label,
      count: 0,
      ratingSum: 0,
      ratingCount: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
    });
  }

  for (const r of reviews) {
    const revTime = (r.published_at || r.created_at).getTime();
    if (revTime < start.getTime() || revTime > end.getTime()) continue;

    const idx = Math.min(
      bucketsCount - 1,
      Math.max(0, Math.floor((revTime - start.getTime()) / bucketDurationMs))
    );
    buckets[idx].count++;
    if (r.rating !== null && r.rating !== undefined) {
      buckets[idx].ratingSum += r.rating;
      buckets[idx].ratingCount++;
    }

    const sentiment = String(r.sentiment_label || "").toLowerCase();
    if (sentiment === "positive") {
      buckets[idx].positive++;
    } else if (sentiment === "negative") {
      buckets[idx].negative++;
    } else {
      buckets[idx].neutral++;
    }
  }

  return buckets.map((b) => ({
    label: b.label,
    count: b.count,
    average_rating: b.ratingCount > 0 ? Math.round((b.ratingSum / b.ratingCount) * 10) / 10 : null,
    positive: b.positive,
    neutral: b.neutral,
    negative: b.negative,
    positivePct: b.count > 0 ? Math.round((b.positive / b.count) * 100) : null,
    neutralPct: b.count > 0 ? Math.round((b.neutral / b.count) * 100) : null,
    negativePct: b.count > 0 ? Math.round((b.negative / b.count) * 100) : null,
  }));
}

export async function generateReport(
  businessId: string,
  input: GenerateReportInput,
  userId?: string
): Promise<reportRepo.ReportRow> {
  const business = await businessRepo.findById(businessId);
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const reportType: ReportType = input.report_type || "weekly";
  const { currentStart, currentEnd, previousStart, previousEnd } = parseReportDateRange(
    reportType,
    input.startDate,
    input.endDate
  );

  const [currentReviews, previousReviews, connectedPlatforms, latestReviewDate] =
    await Promise.all([
      analyticsRepo.getAnalyzedReviewsForPeriod(businessId, currentStart, currentEnd),
      analyticsRepo.getAnalyzedReviewsForPeriod(businessId, previousStart, previousEnd),
      analyticsRepo.getConnectedPlatformsForBusiness(businessId),
      analyticsRepo.getLatestReviewDateForBusiness(businessId),
    ]);

  const currentMetrics = aggregateWeeklyMetrics(currentReviews, {
    periodStart: currentStart,
    periodEnd: currentEnd,
    connectedPlatforms,
  });

  const previousMetrics = aggregateWeeklyMetrics(previousReviews, {
    periodStart: previousStart,
    periodEnd: previousEnd,
    connectedPlatforms,
  });

  const meaningfulChanges = detectMeaningfulChanges(currentMetrics, previousMetrics);
  const confidence = calculateConfidenceAndLimitations(
    currentMetrics,
    connectedPlatforms,
    latestReviewDate,
    currentEnd
  );

  // Evidence Snippets (Pick top 6-10 representative items)
  const evidenceSnippets = currentReviews
    .filter((r) => r.content && r.content.trim().length > 10)
    .slice(0, 8)
    .map((r) => ({
      author: r.author || "Verified Customer",
      rating: r.rating,
      platform: r.platform,
      published_at_str: (r.published_at || r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      content: r.content.trim(),
    }));

  const trends = computeTrends(currentReviews, currentStart, currentEnd);

  // AI Brief Generation via Mistral
  let aiBrief;
  if (currentReviews.length > 0) {
    const dataVersion = [
      currentMetrics.totalReviews,
      previousMetrics.totalReviews,
      currentMetrics.ratingStats.averageRating,
      previousMetrics.ratingStats.averageRating,
      latestReviewDate ? latestReviewDate.toISOString() : "no-date",
    ].join(":");

    const aiPayload: ReportAIBriefPayload = {
      business_id: business.id,
      data_version: dataVersion,
      business_name: business.name,
      report_type: reportType,
      period_start: currentStart.toISOString().slice(0, 10),
      period_end: currentEnd.toISOString().slice(0, 10),
      total_reviews: currentMetrics.totalReviews,
      previous_total_reviews: previousMetrics.totalReviews,
      average_rating: currentMetrics.ratingStats.averageRating,
      previous_average_rating: previousMetrics.ratingStats.averageRating,
      sentiment_distribution: {
        positive: currentMetrics.sentimentDistribution.positive,
        neutral: currentMetrics.sentimentDistribution.neutral,
        negative: currentMetrics.sentimentDistribution.negative,
      },
      top_themes: currentMetrics.themes.slice(0, 8).map((t) => ({
        theme: t.theme,
        count: t.count,
        sentiment: t.negativeCount > t.positiveCount ? "negative" : "positive",
      })),
      meaningful_changes: meaningfulChanges,
      confidence: confidence.level,
      limitations: confidence.limitations,
      sample_evidence: evidenceSnippets.map((e) => ({
        content: e.content,
        rating: e.rating,
        author: e.author,
        platform: e.platform,
      })),
    };

    aiBrief = await generateReportAIBrief(aiPayload);
  } else {
    // Insufficient data fallback
    aiBrief = {
      summary: `During the period from ${currentStart.toLocaleDateString()} to ${currentEnd.toLocaleDateString()}, zero customer reviews were logged for ${business.name}. No critical issues were observed, but active customer review solicitation is advised to ensure representative telemetry.`,
      key_changes: [],
      strengths: [],
      areas_to_improve: [],
      recommendations: [
        {
          title: "Initiate Review Ingestion & Ingestion Platforms",
          action: "Ensure platform connections (Google Maps, etc.) are properly configured and actively scraping review data.",
          priority: "High" as const,
          related_theme: "Platform Connections",
          rationale: "Zero review records prevent sentiment and theme trend analysis.",
        },
      ],
      sentiment_observation: "Insufficient feedback recorded during this reporting window to infer statistical sentiment trends.",
    };
  }

  // Calculate deltas
  const reviewsDelta = currentMetrics.totalReviews - previousMetrics.totalReviews;
  const ratingDelta =
    currentMetrics.ratingStats.averageRating !== null &&
    previousMetrics.ratingStats.averageRating !== null
      ? Math.round((currentMetrics.ratingStats.averageRating - previousMetrics.ratingStats.averageRating) * 100) / 100
      : null;

  const reportTitle =
    input.title?.trim() ||
    `${business.name} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Intelligence Report`;

  // Assemble full report dataset
  const fullReportData = {
    title: reportTitle,
    business_name: business.name,
    report_type: reportType,
    period_start: currentStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    period_end: currentEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    generated_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    confidence: confidence.level,
    confidence_score: confidence.score,
    limitations: confidence.limitations,
    kpis: {
      total_reviews: currentMetrics.totalReviews,
      previous_total_reviews: previousMetrics.totalReviews,
      reviews_delta: reviewsDelta,
      average_rating: currentMetrics.ratingStats.averageRating,
      previous_average_rating: previousMetrics.ratingStats.averageRating,
      rating_delta: ratingDelta,
      total_rated: currentMetrics.ratingStats.totalRated,
    },
    sentiment: {
      positive: currentMetrics.sentimentDistribution.positive,
      neutral: currentMetrics.sentimentDistribution.neutral,
      negative: currentMetrics.sentimentDistribution.negative,
      total: currentMetrics.sentimentDistribution.total,
      averageScore: currentMetrics.sentimentDistribution.averageScore,
    },
    ai_summary: aiBrief.summary,
    ai_sentiment_observation: aiBrief.sentiment_observation,
    key_changes: aiBrief.key_changes,
    strengths: aiBrief.strengths,
    areas_to_improve: aiBrief.areas_to_improve,
    recommendations: aiBrief.recommendations,
    themes: currentMetrics.themes,
    meaningful_changes: meaningfulChanges,
    evidence: evidenceSnippets,
    trends,
  };

  // Compile PDF via AI Service (Matplotlib + Jinja2 + WeasyPrint)
  let pdfRelativePath: string | null = null;
  try {
    const pdfBuffer = await renderReportPdf(fullReportData);
    const businessStorageDir = ensureStorageDir(businessId);
    const pdfFilename = `report_${Date.now()}_${reportType}.pdf`;
    const fullPdfPath = path.join(businessStorageDir, pdfFilename);
    fs.writeFileSync(fullPdfPath, pdfBuffer);
    pdfRelativePath = path.relative(process.cwd(), fullPdfPath);
  } catch (pdfErr) {
    logger.error("Failed to render or save report PDF:", pdfErr);
  }

  // Persist report in PostgreSQL
  const savedReport = await reportRepo.createReport({
    business_id: businessId,
    title: reportTitle,
    report_type: reportType,
    period_start: currentStart,
    period_end: currentEnd,
    summary_text: aiBrief.summary,
    confidence: confidence.level,
    confidence_score: confidence.score,
    data: fullReportData,
    pdf_path: pdfRelativePath,
    created_by: userId || null,
  });

  return savedReport;
}

export async function getReportById(id: string, businessId?: string): Promise<reportRepo.ReportRow | null> {
  return reportRepo.getReportById(id, businessId);
}

export async function listReports(
  businessId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ reports: reportRepo.ReportRow[]; total: number }> {
  return reportRepo.listReportsByBusiness(businessId, limit, offset);
}

export async function getReportPdfBuffer(id: string, businessId?: string): Promise<{ buffer: Buffer; filename: string }> {
  const report = await reportRepo.getReportById(id, businessId);
  if (!report) {
    throw new AppError("Report not found", 404);
  }

  // Check if PDF file exists on disk
  if (report.pdf_path) {
    const fullPath = path.isAbsolute(report.pdf_path)
      ? report.pdf_path
      : path.join(process.cwd(), report.pdf_path);

    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const safeTitle = report.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      return { buffer, filename: `${safeTitle}.pdf` };
    }
  }

  // Re-generate PDF on-demand if file was missing or not yet saved
  logger.info(`Re-generating PDF for report ${id}`);
  const pdfBuffer = await renderReportPdf(report.data);
  const businessStorageDir = ensureStorageDir(report.business_id);
  const pdfFilename = `report_${report.id}.pdf`;
  const fullPdfPath = path.join(businessStorageDir, pdfFilename);
  fs.writeFileSync(fullPdfPath, pdfBuffer);
  const relativePath = path.relative(process.cwd(), fullPdfPath);
  await reportRepo.updateReportPdfPath(report.id, relativePath);

  const safeTitle = report.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  return { buffer: pdfBuffer, filename: `${safeTitle}.pdf` };
}

export async function deleteReport(id: string, businessId?: string): Promise<boolean> {
  const report = await reportRepo.getReportById(id, businessId);
  if (!report) {
    throw new AppError("Report not found", 404);
  }

  if (report.pdf_path) {
    try {
      const fullPath = path.isAbsolute(report.pdf_path)
        ? report.pdf_path
        : path.join(process.cwd(), report.pdf_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      logger.warn(`Could not remove PDF file: ${report.pdf_path}`);
    }
  }

  return reportRepo.deleteReport(id, businessId);
}
