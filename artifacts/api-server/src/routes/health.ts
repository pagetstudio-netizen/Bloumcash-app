import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

/* GET /api/healthz — Replit internal check */
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

/* GET /api/health — vérification DB (ne révèle aucune info d'environnement) */
router.get("/health", async (_req, res) => {
  const start = Date.now();
  try {
    await pool.query("SELECT 1 AS ping");
    res.json({
      status: "OK",
      db_latency_ms: Date.now() - start,
    });
  } catch {
    res.status(503).json({
      status: "ERROR",
      db_latency_ms: Date.now() - start,
    });
  }
});

export default router;
