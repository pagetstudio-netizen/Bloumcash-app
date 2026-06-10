import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

/* GET /api/healthz — Replit internal check */
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

/* GET /api/health — vérification complète avec Supabase */
router.get("/health", async (_req, res) => {
  const start = Date.now();
  try {
    await pool.query("SELECT 1 AS ping");
    res.json({
      status: "OK",
      supabase: "connected",
      db_latency_ms: Date.now() - start,
      env: {
        NODE_ENV: process.env.NODE_ENV ?? "non défini",
        DB_SOURCE: process.env.DATABASE_URL
          ? "DATABASE_URL"
          : process.env.SUPABASE_DATABASE_URL
            ? "SUPABASE_DATABASE_URL"
            : "AUCUNE",
        USER_JWT_SECRET: process.env.USER_JWT_SECRET ? "✅ défini" : "❌ manquant",
        ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ? "✅ défini" : "❌ manquant",
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: "ERROR",
      supabase: "disconnected",
      error: err.message,
      db_latency_ms: Date.now() - start,
    });
  }
});

export default router;
