import { Router } from "express";
import { validate } from "../../middleware/validate";
import {
  authenticate,
  requireBusinessAccess,
  requireRole,
} from "../../middleware/auth";
import {
  createBusinessSchema,
  updateBusinessSchema,
  createPlatformConnectionSchema,
  updatePlatformConnectionSchema,
} from "../../schemas/businessSchemas";
import { weeklyAnalyticsQuerySchema } from "../../schemas/analyticsSchemas";
import {
  generateBriefBodySchema,
  listBriefsQuerySchema,
} from "../../schemas/briefSchemas";
import {
  generateReportBodySchema,
  listReportsQuerySchema,
} from "../../schemas/reportSchemas";
import { ragChatBodySchema } from "../../schemas/ragSchemas";
import {
  nearbyCompetitorsQuerySchema,
  trackCompetitorBodySchema,
} from "../../schemas/competitorSchemas";
import {
  createBusiness,
  getBusiness,
  getAllBusinesses,
  updateBusiness,
  listBusinessReviews,
} from "../../controllers/businessController";
import {
  getNearbyCompetitorsHandler,
  listCompetitorsHandler,
  getCompetitorByIdHandler,
  trackCompetitorHandler,
  untrackCompetitorHandler,
  syncCompetitorHandler,
  getCompetitorComparisonHandler,
} from "../../controllers/competitorController";
import {
  connectPlatform,
  listPlatforms,
  updatePlatformConnection,
  deletePlatformConnection,
} from "../../controllers/platformConnectionController";
import {
  scrapeGoogleReviewsForConnection,
  listScrapeRunsForConnection,
  getScrapeRunForConnection,
  getIngestionStatusForConnection,
} from "../../controllers/googleReviewsController";
import { getWeeklyAnalytics } from "../../controllers/analyticsController";
import {
  createWeeklyBrief,
  getLatestBriefHandler,
  getBriefByIdHandler,
  listBriefsHandler,
} from "../../controllers/briefController";
import {
  generateReportHandler,
  getReportByIdHandler,
  listReportsHandler,
  downloadReportPdfHandler,
  deleteReportHandler,
} from "../../controllers/reportController";
import { handleRagChat } from "../../controllers/ragChatController";

const router = Router();

// All business routes require authentication
router.use(authenticate());

// ── Business routes ──────────────────────────────────────────
router.get("/v1/businesses", getAllBusinesses);
router.post("/v1/businesses", validate(createBusinessSchema), createBusiness);
router.get("/v1/businesses/:id", requireBusinessAccess(), getBusiness);
router.get("/v1/businesses/:id/reviews", requireBusinessAccess(), listBusinessReviews);
router.put(
  "/v1/businesses/:id",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  validate(updateBusinessSchema),
  updateBusiness
);

// ── Platform connection routes ────────────────────────────────
router.get("/v1/businesses/:id/platforms", requireBusinessAccess(), listPlatforms);
router.post(
  "/v1/businesses/:id/platforms",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  validate(createPlatformConnectionSchema),
  connectPlatform
);
router.patch(
  "/v1/businesses/:id/platforms/:platformId",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  validate(updatePlatformConnectionSchema),
  updatePlatformConnection
);
router.delete(
  "/v1/businesses/:id/platforms/:platformId",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  deletePlatformConnection
);

// ── Scrape and Ingestion routes ──────────────────────────────
router.post(
  "/v1/businesses/:id/platforms/:platformId/scrape",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  scrapeGoogleReviewsForConnection
);
router.get(
  "/v1/businesses/:id/platforms/:platformId/scrapes",
  requireBusinessAccess(),
  listScrapeRunsForConnection
);
router.get(
  "/v1/businesses/:id/platforms/:platformId/scrapes/:runId",
  requireBusinessAccess(),
  getScrapeRunForConnection
);
router.get(
  "/v1/businesses/:id/platforms/:platformId/ingestion-status",
  requireBusinessAccess(),
  getIngestionStatusForConnection
);

// ── Phase 3: Analytics & Brief routes ─────────────────────────
router.get(
  "/v1/businesses/:id/analytics/weekly",
  requireBusinessAccess(),
  validate(weeklyAnalyticsQuerySchema),
  getWeeklyAnalytics
);
router.post(
  "/v1/businesses/:id/briefs/generate",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  validate(generateBriefBodySchema),
  createWeeklyBrief
);
router.get("/v1/businesses/:id/briefs/latest", requireBusinessAccess(), getLatestBriefHandler);
router.get("/v1/businesses/:id/briefs/:briefId", requireBusinessAccess(), getBriefByIdHandler);
router.get(
  "/v1/businesses/:id/briefs",
  requireBusinessAccess(),
  validate(listBriefsQuerySchema),
  listBriefsHandler
);

// ── Reports System routes ────────────────────────────────────
router.post(
  "/v1/businesses/:id/reports/generate",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  validate(generateReportBodySchema),
  generateReportHandler
);
router.get(
  "/v1/businesses/:id/reports",
  requireBusinessAccess(),
  validate(listReportsQuerySchema),
  listReportsHandler
);
router.get(
  "/v1/businesses/:id/reports/:reportId",
  requireBusinessAccess(),
  getReportByIdHandler
);
router.get(
  "/v1/businesses/:id/reports/:reportId/download",
  requireBusinessAccess(),
  downloadReportPdfHandler
);
router.delete(
  "/v1/businesses/:id/reports/:reportId",
  requireBusinessAccess(),
  requireRole(["owner", "admin"]),
  deleteReportHandler
);

// ── Phase 4: RAG Chat & Evidence route ───────────────────────
router.post(
  "/v1/businesses/:id/chat",
  requireBusinessAccess(),
  validate(ragChatBodySchema),
  handleRagChat
);

// ── Competitor Intelligence routes ───────────────────────────
// Supports both :id and :businessId parameter conventions
const competitorNearbyRoutes = [
  "/v1/businesses/:id/competitors/nearby",
  "/v1/businesses/:businessId/competitors/nearby",
];
competitorNearbyRoutes.forEach((path) => {
  router.get(
    path,
    requireBusinessAccess(),
    validate(nearbyCompetitorsQuerySchema),
    getNearbyCompetitorsHandler
  );
});

const competitorListRoutes = [
  "/v1/businesses/:id/competitors",
  "/v1/businesses/:businessId/competitors",
];
competitorListRoutes.forEach((path) => {
  router.get(path, requireBusinessAccess(), listCompetitorsHandler);
  router.post(
    path,
    requireBusinessAccess(),
    requireRole(["owner", "admin"]),
    validate(trackCompetitorBodySchema),
    trackCompetitorHandler
  );
});

const competitorItemRoutes = [
  "/v1/businesses/:id/competitors/:competitorId",
  "/v1/businesses/:businessId/competitors/:competitorId",
];
competitorItemRoutes.forEach((path) => {
  router.get(path, requireBusinessAccess(), getCompetitorByIdHandler);
  router.delete(
    path,
    requireBusinessAccess(),
    requireRole(["owner", "admin"]),
    untrackCompetitorHandler
  );
});

const competitorSyncRoutes = [
  "/v1/businesses/:id/competitors/:competitorId/sync",
  "/v1/businesses/:businessId/competitors/:competitorId/sync",
];
competitorSyncRoutes.forEach((path) => {
  router.post(
    path,
    requireBusinessAccess(),
    requireRole(["owner", "admin"]),
    syncCompetitorHandler
  );
});

const competitorComparisonRoutes = [
  "/v1/businesses/:id/competitors/:competitorId/comparison",
  "/v1/businesses/:businessId/competitors/:competitorId/comparison",
];
competitorComparisonRoutes.forEach((path) => {
  router.get(path, requireBusinessAccess(), getCompetitorComparisonHandler);
});

export { router as businessRouter };

