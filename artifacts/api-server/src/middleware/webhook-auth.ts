/**
 * Middleware de vérification des webhooks entrants.
 *
 * Stratégie :
 *  - Si WEBHOOK_SECRET est défini dans l'environnement, le header
 *    `X-Webhook-Secret` de la requête DOIT correspondre.
 *  - Si WEBHOOK_SECRET n'est PAS défini, on autorise la requête MAIS
 *    on émet un warning dans les logs pour rappeler de configurer le secret.
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

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

export function requireWebhookSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!WEBHOOK_SECRET) {
    req.log.warn(
      { path: req.path },
      "WEBHOOK_SECRET non défini — webhook accepté sans vérification. " +
      "Configurez la variable WEBHOOK_SECRET pour sécuriser les callbacks.",
    );
    next();
    return;
  }

  const provided = (req.headers["x-webhook-secret"] as string | undefined) ?? "";

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
