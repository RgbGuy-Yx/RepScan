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
import { ragChatBodySchema } from "../../schemas/ragSchemas";
import {
  createBusiness,
  getBusiness,
  getAllBusinesses,
  updateBusiness,
  listBusinessReviews,
} from "../../controllers/businessController";
import {
  connectPlatform,
  listPlatforms,
  updatePlatformConnection,
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

// ── Phase 4: RAG Chat & Evidence route ───────────────────────
router.post(
  "/v1/businesses/:id/chat",
  requireBusinessAccess(),
  validate(ragChatBodySchema),
  handleRagChat
);

export { router as businessRouter };
