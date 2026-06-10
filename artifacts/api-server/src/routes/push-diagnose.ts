import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/admin-auth";

const router: IRouter = Router();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY ?? "";

/**
 * GET /api/push/diagnose
 * Vérifie la configuration OneSignal et teste la connectivité.
 * Accessible uniquement à l'admin.
 */
router.get("/push/diagnose", requireAdmin, async (_req, res) => {
  const appIdSet = Boolean(ONESIGNAL_APP_ID);
  const apiKeySet = Boolean(ONESIGNAL_API_KEY);

  if (!appIdSet || !apiKeySet) {
    res.json({
      configured: false,
      appIdSet,
      apiKeySet,
      error: "Variables manquantes : " + [
        !appIdSet && "ONESIGNAL_APP_ID",
        !apiKeySet && "ONESIGNAL_API_KEY",
      ].filter(Boolean).join(", "),
    });
    return;
  }

  try {
    const response = await fetch(
      `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`,
      {
        headers: { Authorization: `Key ${ONESIGNAL_API_KEY}` },
      }
    );

    const body = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      res.json({
        configured: true,
        appIdSet,
        apiKeySet,
        onesignalStatus: response.status,
        error: "OneSignal a refusé la clé — vérifiez ONESIGNAL_API_KEY",
        details: body,
      });
      return;
    }

    res.json({
      configured: true,
      appIdSet,
      apiKeySet,
      onesignalStatus: response.status,
      appName: body["name"] ?? "—",
      players: body["players"] ?? 0,
      messageable_players: body["messageable_players"] ?? 0,
      ok: true,
    });
  } catch (err) {
    res.json({
      configured: true,
      appIdSet,
      apiKeySet,
      error: "Impossible de joindre OneSignal",
      details: String(err),
    });
  }
});

export default router;
