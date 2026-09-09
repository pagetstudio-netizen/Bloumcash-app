/**
 * Middleware de vérification des webhooks entrants.
 *
 * Stratégie :
 *  - WEBHOOK_SECRET est la valeur recommandée.
 *  - APP_ACCESS_TOKEN est accepté en secours pour les installations qui
 *    utilisent déjà ce secret pour le portail privé.
 *  - Si aucun secret n'est configuré, le webhook est refusé (fail closed).
 *
 * Configuration Plesk / Replit :
 *   WEBHOOK_SECRET=<valeur-aléatoire-forte>
 *
 * Chez PayDunya / GomboPlus, ajouter ce header dans l'URL du webhook :
 *   https://api.bloumcash.tg/api/paydunya/webhook
 *   Header : X-Webhook-Secret: <même valeur>
 */
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET?.trim() ||
  process.env.APP_ACCESS_TOKEN?.trim() ||
  "";

export function requireWebhookSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!WEBHOOK_SECRET) {
    req.log.error(
      { path: req.path },
      "Webhook refusé : WEBHOOK_SECRET ou APP_ACCESS_TOKEN non configuré",
    );
    res.status(503).json({ error: "Webhook non configuré" });
    return;
  }

  const authorization = req.headers.authorization;
  const bearer =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
  const provided =
    (req.headers["x-webhook-secret"] as string | undefined) ??
    (req.headers["x-access-token"] as string | undefined) ??
    bearer ??
    "";

  const expected = Buffer.from(WEBHOOK_SECRET);
  const actual   = Buffer.from(provided);

  /* Comparaison en temps constant pour prévenir les timing attacks */
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    req.log.warn(
      { path: req.path, ip: req.ip },
      "Webhook refusé — X-Webhook-Secret invalide",
    );
    res.status(401).json({ error: "Webhook non autorisé" });
    return;
  }

  next();
}
