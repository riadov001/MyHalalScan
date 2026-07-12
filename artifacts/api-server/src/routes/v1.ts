/**
 * HalalScan Public API — v1
 *
 * All endpoints return JSON and are CORS-enabled (inherited from app.ts).
 * Base path: /api/v1
 *
 * GET /api/v1/                        → API info + endpoint list
 * GET /api/v1/health                  → {"status":"ok","version":"1.2.07"}
 * GET /api/v1/analyze/:barcode        → same analysis as /api/halal/analyze/:barcode
 * GET /api/v1/product/:barcode        → alias for /api/v1/analyze/:barcode
 */

import { Router, type Request, type Response, type NextFunction } from "express";

const router = Router();

const API_VERSION = "1.2.07";
const API_NAME = "HalalScan API — Straight Path Intelligence";

// ─── Info ──────────────────────────────────────────────────────────────────────

router.get("/", (_req: Request, res: Response) => {
  res.json({
    name: API_NAME,
    version: API_VERSION,
    description: "Halal ingredient analysis API. Checks product barcodes against halal classification rules.",
    endpoints: [
      { method: "GET", path: "/api/v1/health",          description: "Health check" },
      { method: "GET", path: "/api/v1/analyze/:barcode", description: "Analyze a product barcode for halal compliance" },
      { method: "GET", path: "/api/v1/product/:barcode", description: "Alias for /api/v1/analyze/:barcode" },
    ],
    docs: "https://www.straight-path.eu",
    response_schema: {
      result: "halal | haram | warning | unknown",
      productName: "string",
      reason: "string | undefined — explains the classification",
      ingredientsText: "string | undefined — raw ingredients string",
      ingredientsList: "string[] | undefined — parsed ingredients",
      source: "internal_db | openfoodfacts | unknown",
      foundInDatabase: "boolean",
      hasIngredients: "boolean",
    },
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    version: API_VERSION,
    name: API_NAME,
    timestamp: new Date().toISOString(),
  });
});

// ─── Analyze (proxy to internal halal router) ─────────────────────────────────

// We forward internally to /api/halal/analyze/:barcode by delegating via middleware injection.
// Rather than duplicating logic, we mount a proxy that re-routes internally.
router.get("/analyze/:barcode", (req: Request, res: Response, next: NextFunction) => {
  // Rewrite URL to the canonical internal path and re-dispatch
  req.url = `/halal/analyze/${req.params.barcode}`;
  next("router");
});

router.get("/product/:barcode", (req: Request, res: Response, next: NextFunction) => {
  req.url = `/halal/analyze/${req.params.barcode}`;
  next("router");
});

// ─── 404 for unknown v1 paths ─────────────────────────────────────────────────

router.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "This endpoint does not exist. GET /api/v1/ for the full endpoint list.",
    version: API_VERSION,
  });
});

export default router;
