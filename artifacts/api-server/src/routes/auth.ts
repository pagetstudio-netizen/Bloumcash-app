import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable, blacklistTable, verificationCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signUserToken, requireUser } from "../middleware/user-auth";
import { sendPushNotification } from "../lib/onesignal";
import { sendWelcomeEmail, sendPinResetEmail } from "../lib/email";

const router: IRouter = Router();

/* ── Rate limiters ── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de créations de compte depuis cette adresse IP. Réessayez dans 1 heure." },
});

const forgotPinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de demandes de réinitialisation. Réessayez dans 1 heure." },
  skipSuccessfulRequests: false,
});

/* ── Helpers ── */
async function isBlacklisted(phone: string | null | undefined): Promise<boolean> {
  if (!phone) return false;
  const rows = await db.select().from(blacklistTable).where(eq(blacklistTable.phone, phone)).limit(1);
  return rows.length > 0;
}

function generateCode(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
}

function sanitizeStr(v: unknown, maxLen = 255): string {
  return String(v ?? "").trim().slice(0, maxLen);
}

/* ── LOGIN ── */
router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const email = sanitizeStr(req.body.email, 255);
    const pin = sanitizeStr(req.body.pin, 20);
    if (!email || !pin) {
      res.status(400).json({ error: "Email et PIN requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!users.length) {
      res.status(401).json({ error: "Email ou PIN incorrect" });
      return;
    }

    const user = users[0];

    if (user.status === "banned") {
      res.status(403).json({ error: "Votre compte a été désactivé. Contactez le support.", code: "ACCOUNT_BANNED" });
      return;
    }
    if (user.status === "suspended") {
      res.status(403).json({ error: "Votre compte est temporairement suspendu. Contactez le support.", code: "ACCOUNT_SUSPENDED" });
      return;
    }
    if (await isBlacklisted(user.phone)) {
      res.status(403).json({ error: "Escroquerie détectée. Accès refusé.", code: "PHONE_BLACKLISTED" });
      return;
    }

    const pinMatches = await bcrypt.compare(pin, user.pin);
    if (!pinMatches) {
      res.status(401).json({ error: "Email ou PIN incorrect" });
      return;
    }

    const token = signUserToken({ id: user.id, email: user.email });

    await db.update(usersTable)
      .set({ onesignalExternalUserId: user.email, lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    sendPushNotification({
      externalUserId: user.email,
      title: "Bloum Cash",
      message: `Bienvenue, ${user.fullName} ! Vous êtes maintenant connecté.`,
      data: { type: "login" },
    }, req.log);

    res.json({ token, user: { id: String(user.id), fullName: user.fullName, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── REGISTER ── */
router.post("/auth/register", registerLimiter, async (req, res) => {
  try {
    const fullName = sanitizeStr(req.body.fullName, 100);
    const email    = sanitizeStr(req.body.email, 255);
    const pin      = sanitizeStr(req.body.pin, 20);
    const phone    = req.body.phone ? sanitizeStr(req.body.phone, 20) : null;
    const village  = req.body.village  ? sanitizeStr(req.body.village, 100) : null;
    const city     = req.body.city     ? sanitizeStr(req.body.city, 100) : null;
    const region   = req.body.region   ? sanitizeStr(req.body.region, 100) : null;
    const country  = req.body.country  ? sanitizeStr(req.body.country, 100) : "Togo";

    if (!fullName || !email || !pin) {
      res.status(400).json({ error: "Tous les champs sont requis" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Format d'email invalide" });
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      res.status(400).json({ error: "Le PIN doit être 4 à 6 chiffres" });
      return;
    }

    if (phone && await isBlacklisted(phone)) {
      res.status(403).json({ error: "Escroquerie détectée. Inscription refusée.", code: "PHONE_BLACKLISTED" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length) {
      res.status(400).json({ error: "Cet email est déjà utilisé" });
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    const [user] = await db.insert(usersTable)
      .values({ fullName, email, pin: hashedPin, phone, onesignalExternalUserId: email, village, city, region, country })
      .returning();

    const token = signUserToken({ id: user.id, email: user.email });

    sendWelcomeEmail({ to: user.email, fullName: user.fullName }).catch(() => {});
    sendPushNotification({
      externalUserId: user.email,
      title: "Bienvenue sur Bloum Cash 🎉",
      message: `Bonjour ${user.fullName}, votre compte est créé !`,
      data: { type: "register" },
    }, req.log);

    res.status(201).json({ token, user: { id: String(user.id), fullName: user.fullName, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── FORGOT PIN ── */
router.post("/auth/forgot-pin", forgotPinLimiter, async (req, res) => {
  try {
    const email = sanitizeStr(req.body.email, 255);
    if (!email) {
      res.status(400).json({ error: "Email requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!users.length) {
      res.json({ message: "Si cet email existe, un code de réinitialisation a été envoyé." });
      return;
    }

    const user = users[0];
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.delete(verificationCodesTable).where(
      and(eq(verificationCodesTable.email, email), eq(verificationCodesTable.type, "pin_reset"))
    );
    await db.insert(verificationCodesTable).values({ email, code, type: "pin_reset", expiresAt });

    sendPinResetEmail({ to: user.email, fullName: user.fullName, code }).catch((e) => {
      req.log.error({ e }, "Erreur envoi email reset PIN");
    });

    res.json({ message: "Si cet email existe, un code de réinitialisation a été envoyé." });
  } catch (err) {
    req.log.error({ err }, "Forgot PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── RESET PIN ── */
router.post("/auth/reset-pin", async (req, res) => {
  try {
    const email  = sanitizeStr(req.body.email, 255);
    const code   = sanitizeStr(req.body.code, 10);
    const newPin = sanitizeStr(req.body.newPin, 20);

    if (!email || !code || !newPin) {
      res.status(400).json({ error: "Email, code et nouveau PIN requis" });
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      res.status(400).json({ error: "Le PIN doit être 4 à 6 chiffres" });
      return;
    }

    const now = new Date();
    const codes = await db.select().from(verificationCodesTable).where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, code),
        eq(verificationCodesTable.type, "pin_reset"),
        gt(verificationCodesTable.expiresAt, now),
      )
    ).limit(1);

    if (!codes.length || codes[0].usedAt) {
      res.status(400).json({ error: "Code invalide ou expiré" });
      return;
    }

    const hashedPin = await bcrypt.hash(newPin, 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.email, email));
    await db.update(verificationCodesTable).set({ usedAt: now }).where(eq(verificationCodesTable.id, codes[0].id));

    res.json({ success: true, message: "PIN réinitialisé avec succès" });
  } catch (err) {
    req.log.error({ err }, "Reset PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── CHANGE PIN ── */
router.post("/auth/change-pin", async (req, res) => {
  try {
    const token      = sanitizeStr(req.body.token, 500);
    const currentPin = sanitizeStr(req.body.currentPin, 20);
    const newPin     = sanitizeStr(req.body.newPin, 20);

    if (!token || !currentPin || !newPin) {
      res.status(400).json({ error: "Token, PIN actuel et nouveau PIN requis" });
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      res.status(400).json({ error: "Le nouveau PIN doit être 4 à 6 chiffres" });
      return;
    }

    const { verifyUserToken } = await import("../middleware/user-auth");
    let payload: { id: number; email: string };
    try {
      payload = verifyUserToken(token);
    } catch {
      res.status(401).json({ error: "Token invalide ou expiré" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.id)).limit(1);
    if (!users.length) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    const user = users[0];
    const pinMatches = await bcrypt.compare(currentPin, user.pin);
    if (!pinMatches) {
      res.status(401).json({ error: "PIN actuel incorrect" });
      return;
    }
    if (currentPin === newPin) {
      res.status(400).json({ error: "Le nouveau PIN doit être différent de l'ancien" });
      return;
    }

    const hashedPin = await bcrypt.hash(newPin, 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "PIN modifié avec succès" });
  } catch (err) {
    req.log.error({ err }, "Change PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── Mise à jour localisation automatique ── */
router.patch("/profile/location", requireUser, async (req, res) => {
  try {
    const userId = req.currentUser!.id;
    const { city, region, country } = req.body as { city?: string; region?: string; country?: string };
    await db.update(usersTable)
      .set({ city: city ?? null, region: region ?? null, country: country ?? null })
      .where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update location error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
