import { Router } from "express";
import { db } from "@workspace/db";
import { adminSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const UPDATE_KEYS = [
  "update_mode",
  "min_required_version",
  "update_download_url",
  "update_title",
  "update_message",
  "update_button_enabled",
] as const;

const UPDATE_DEFAULTS: Record<(typeof UPDATE_KEYS)[number], string> = {
  update_mode: "disabled",
  min_required_version: "1.0.0",
  update_download_url: "",
  update_title: "Mise à jour disponible",
  update_message: "Une nouvelle version est disponible. Veuillez mettre à jour pour continuer à utiliser l'application.",
  update_button_enabled: "true",
};

/**
 * GET /api/config
 * Retourne la configuration publique de l'app (identifiants non-secrets).
 * L'App ID OneSignal est un identifiant public (comme un GA ID) — pas un secret.
 * Inclut aussi la config de mise à jour forcée/optionnelle (lue depuis admin_settings).
 */
router.get("/config", async (_req, res) => {
  const update = { ...UPDATE_DEFAULTS };
  try {
    const rows = await db.select().from(adminSettingsTable).where(
      sql`key IN ('update_mode','min_required_version','update_download_url','update_title','update_message','update_button_enabled')`
    );
    for (const row of rows) {
      if ((UPDATE_KEYS as readonly string[]).includes(row.key)) {
        update[row.key as (typeof UPDATE_KEYS)[number]] = row.value;
      }
    }
  } catch {
    // En cas d'erreur DB, on renvoie les valeurs par défaut (mode "disabled" = aucun impact)
  }

  res.json({
    onesignalAppId: process.env.ONESIGNAL_APP_ID ?? "",
    updateMode: update.update_mode,
    minRequiredVersion: update.min_required_version,
    updateDownloadUrl: update.update_download_url,
    updateTitle: update.update_title,
    updateMessage: update.update_message,
    updateButtonEnabled: update.update_button_enabled !== "false",
  });
});

export default router;
