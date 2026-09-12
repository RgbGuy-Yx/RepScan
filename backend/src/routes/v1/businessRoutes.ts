import { Router } from "express";
import { validate } from "../../middleware/validate";
import {
  createBusinessSchema,
  updateBusinessSchema,
  createPlatformConnectionSchema,
  updatePlatformConnectionSchema,
} from "../../schemas/businessSchemas";
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
import { scrapeGoogleReviewsForConnection } from "../../controllers/googleReviewsController";

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
router.post("/v1/businesses/:id/platforms/:platformId/scrape", scrapeGoogleReviewsForConnection);

export { router as businessRouter };
