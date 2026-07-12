import { Router, type IRouter } from "express";
import healthRouter from "./health";
import halalRouter from "./halal";
import storageRouter from "./storage";
import v1Router from "./v1";

const router: IRouter = Router();

// ── Public v1 API — versioned JSON endpoints for external frontends ────────────
// Mounted first so /api/v1/analyze/:barcode can forward to /api/halal/analyze/:barcode
router.use("/v1", v1Router);

// ── Internal / legacy routes ───────────────────────────────────────────────────
router.use(healthRouter);
router.use(halalRouter);
router.use(storageRouter);

export default router;
