import { Router } from "express";

const router = Router();

/**
 * GET /api/config
 * Retourne la configuration publique de l'app (identifiants non-secrets).
 * L'App ID OneSignal est un identifiant public (comme un GA ID) — pas un secret.
 */
router.get("/config", (_req, res) => {
  res.json({
    onesignalAppId: process.env.ONESIGNAL_APP_ID ?? "",
  });
});

export default router;
