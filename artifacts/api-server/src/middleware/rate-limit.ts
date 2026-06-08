/**
 * Rate limiter en mémoire (sliding window).
 * Aucune dépendance externe — stockage process-local.
 * Adapté pour un serveur single-instance (Replit / Plesk).
 */
import type { Request, Response, NextFunction } from "express";

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

/** Nettoie les entrées expirées toutes les 5 minutes. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Crée un middleware de rate limiting.
 *
 * @param max         Nombre max de requêtes autorisées dans la fenêtre
 * @param windowMs    Durée de la fenêtre en millisecondes
 * @param keyFn       Fonction qui retourne la clé discriminante (IP + route par défaut)
 */
export function rateLimit(
  max: number,
  windowMs: number,
  keyFn?: (req: Request) => string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
      req.socket?.remoteAddress ??
      "unknown";

    const key = keyFn ? keyFn(req) : `${req.path}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.status(429).json({
        error: "Trop de tentatives. Réessayez dans quelques minutes.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

/** 5 tentatives / 15 min — pour login, register, forgot-pin */
export const authRateLimit = rateLimit(5, 15 * 60 * 1000);

/** 30 requêtes / min — pour les endpoints API standard */
export const apiRateLimit = rateLimit(30, 60 * 1000);
