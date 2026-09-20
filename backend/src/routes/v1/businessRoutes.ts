import { Router } from "express";
import { validate } from "../../middleware/validate";
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

// ── Business routes ──────────────────────────────────────────
router.get("/v1/businesses", getAllBusinesses);
router.post("/v1/businesses", validate(createBusinessSchema), createBusiness);
router.get("/v1/businesses/:id", getBusiness);
router.put("/v1/businesses/:id", validate(updateBusinessSchema), updateBusiness);

// ── Platform connection routes ────────────────────────────────
router.get("/v1/businesses/:id/platforms", listPlatforms);
router.post(
  "/v1/businesses/:id/platforms",
  validate(createPlatformConnectionSchema),
  connectPlatform
);
router.patch(
  "/v1/businesses/:id/platforms/:platformId",
  validate(updatePlatformConnectionSchema),
  updatePlatformConnection
);

// ── Scrape and Ingestion routes ──────────────────────────────
router.post("/v1/businesses/:id/platforms/:platformId/scrape", scrapeGoogleReviewsForConnection);
router.get("/v1/businesses/:id/platforms/:platformId/scrapes", listScrapeRunsForConnection);
router.get("/v1/businesses/:id/platforms/:platformId/scrapes/:runId", getScrapeRunForConnection);
router.get("/v1/businesses/:id/platforms/:platformId/ingestion-status", getIngestionStatusForConnection);

// ── Phase 3: Analytics & Brief routes ─────────────────────────
router.get(
  "/v1/businesses/:id/analytics/weekly",
  validate(weeklyAnalyticsQuerySchema),
  getWeeklyAnalytics
);
router.post(
  "/v1/businesses/:id/briefs/generate",
  validate(generateBriefBodySchema),
  createWeeklyBrief
);
router.get("/v1/businesses/:id/briefs/latest", getLatestBriefHandler);
router.get("/v1/businesses/:id/briefs/:briefId", getBriefByIdHandler);
router.get(
  "/v1/businesses/:id/briefs",
  validate(listBriefsQuerySchema),
  listBriefsHandler
);

// ── Phase 4: RAG Chat & Evidence route ───────────────────────
router.post(
  "/v1/businesses/:id/chat",
  validate(ragChatBodySchema),
  handleRagChat
);

export { router as businessRouter };
