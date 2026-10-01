import { Router } from "express";
import { healthCheck } from "../../controllers/healthController";
import { businessRouter } from "./businessRoutes";
import { workspaceRouter } from "./workspaceRoutes";

const router = Router();

router.get("/v1/health", healthCheck);
router.use(workspaceRouter);
router.use(businessRouter);

export { router as v1Router };
