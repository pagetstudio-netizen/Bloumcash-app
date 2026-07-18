/**
 * POST /api/access-token/validate
 * Valide le token d'accès côté serveur (via APP_ACCESS_TOKEN env var).
 * Le token n'est jamais exposé dans le bundle frontend.
 */
import { Router, type IRouter } from "express";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/access-token/validate", (req, res) => {
  const APP_ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN ?? "";

  if (!APP_ACCESS_TOKEN) {
    // Pas configuré → accès refusé par sécurité
    res.status(503).json({ valid: false, error: "APP_ACCESS_TOKEN non configuré" });
    return;
  }

  const { token } = req.body as { token?: unknown };

  if (typeof token !== "string" || !token) {
    res.status(400).json({ valid: false });
    return;
  }

  // Comparaison en temps constant (anti-timing attack)
  let valid = false;
  try {
    const expected = Buffer.from(APP_ACCESS_TOKEN, "utf8");
    const provided = Buffer.from(token, "utf8");
    valid =
      expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);
  } catch {
    valid = false;
  }

  res.json({ valid });
});

export default router;
