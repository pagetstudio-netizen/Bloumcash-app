import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable, blacklistTable, verificationCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signUserToken, requireUser } from "../middleware/user-auth";
import { sendPushNotification } from "../lib/onesignal";
import { sendPinResetSms } from "../lib/africasms";
import { notifyNewUser } from "../lib/telegram";

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
  max: process.env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de créations de compte depuis cette adresse IP. Réessayez dans 1 heure." },
  skip: () => process.env.NODE_ENV !== "production",
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
function sanitizeStr(v: unknown, maxLen = 255): string {
  return String(v ?? "").trim().slice(0, maxLen);
}

function normalizeTogoPhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-]/g, "");
  if (digits.startsWith("+228")) digits = digits.slice(4);
  else if (digits.startsWith("228")) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits)) return null;
  const prefix = parseInt(digits.slice(0, 2));
  if ((prefix >= 90 && prefix <= 93) || (prefix >= 96 && prefix <= 99)) return digits;
  return null;
}

function phoneToEmail(phone: string): string {
  return `${phone}@users.bloumcash.app`;
}

async function isBlacklisted(phone: string | null | undefined): Promise<boolean> {
  if (!phone) return false;
  const rows = await db.select().from(blacklistTable).where(eq(blacklistTable.phone, phone)).limit(1);
  return rows.length > 0;
}

function generateCode(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
}

/* ── LOGIN ── */
router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const rawPhone = sanitizeStr(req.body.phone, 30);
    const pin      = sanitizeStr(req.body.pin, 20);

    const phone = normalizeTogoPhone(rawPhone);
    if (!phone || !pin) {
      res.status(400).json({ error: "Numéro de téléphone et mot de passe requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (!users.length) {
      res.status(401).json({ error: "Numéro ou mot de passe incorrect" });
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
      res.status(401).json({ error: "Numéro ou mot de passe incorrect" });
      return;
    }

    const token = signUserToken({ id: user.id, email: user.email });

    await db.update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    sendPushNotification({
      externalUserId: user.email,
      title: "Bloum Cash",
      message: `Bienvenue, ${user.fullName} ! Vous êtes maintenant connecté.`,
      data: { type: "login" },
    }, req.log);

    res.json({ token, user: { id: String(user.id), fullName: user.fullName, email: user.email, phone: user.phone } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── REGISTER ── */
router.post("/auth/register", registerLimiter, async (req, res) => {
  try {
    const fullName = sanitizeStr(req.body.fullName, 100);
    const rawPhone = sanitizeStr(req.body.phone, 30);
    const pin      = sanitizeStr(req.body.pin, 20);
    const village  = req.body.village  ? sanitizeStr(req.body.village, 100) : null;
    const city     = req.body.city     ? sanitizeStr(req.body.city, 100) : null;
    const region   = req.body.region   ? sanitizeStr(req.body.region, 100) : null;
    const country  = req.body.country  ? sanitizeStr(req.body.country, 100) : "Togo";

    const phone = normalizeTogoPhone(rawPhone);
    if (!phone) {
      res.status(400).json({ error: "Numéro de téléphone Togo requis" });
      return;
    }
    const resolvedName = fullName || `Utilisateur ${phone.slice(-4)}`;
    if (!pin || pin.length < 4) {
      res.status(400).json({ error: "Le mot de passe doit avoir au moins 4 caractères" });
      return;
    }

    if (await isBlacklisted(phone)) {
      res.status(403).json({ error: "Escroquerie détectée. Inscription refusée.", code: "PHONE_BLACKLISTED" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existing.length) {
      res.status(400).json({ error: "Ce numéro de téléphone est déjà utilisé" });
      return;
    }

    const email = phoneToEmail(phone);
    const hashedPin = await bcrypt.hash(pin, 12);
    const [user] = await db.insert(usersTable)
      .values({ fullName: resolvedName, email, pin: hashedPin, phone, onesignalExternalUserId: email, village, city, region, country })
      .returning();

    const token = signUserToken({ id: user.id, email: user.email });

    sendPushNotification({
      externalUserId: user.email,
      title: "Bienvenue sur Bloum Cash !",
      message: `Bonjour ${user.fullName}, votre compte est créé !`,
      data: { type: "register" },
    }, req.log);

    notifyNewUser({ fullName: user.fullName, phone: user.phone ?? "" });

    res.status(201).json({ token, user: { id: String(user.id), fullName: user.fullName, email: user.email, phone: user.phone } });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── FORGOT PIN (par numéro de téléphone) ── */
router.post("/auth/forgot-pin", forgotPinLimiter, async (req, res) => {
  try {
    const rawPhone = sanitizeStr(req.body.phone ?? req.body.email, 30);
    const phone = normalizeTogoPhone(rawPhone);
    if (!phone) {
      res.status(400).json({ error: "Numéro de téléphone requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (!users.length) {
      res.json({ message: "Si ce numéro existe, un code de réinitialisation a été envoyé." });
      return;
    }

    const user = users[0];
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.delete(verificationCodesTable).where(
      and(eq(verificationCodesTable.email, user.email), eq(verificationCodesTable.type, "pin_reset"))
    );
    await db.insert(verificationCodesTable).values({ email: user.email, code, type: "pin_reset", expiresAt });

    sendPinResetSms({ phone: user.phone ?? rawPhone, fullName: user.fullName, code }).catch((e) => {
      req.log.error({ e }, "Erreur envoi SMS reset PIN");
    });

    res.json({ message: "Si ce numéro existe, un code de réinitialisation a été envoyé." });
  } catch (err) {
    req.log.error({ err }, "Forgot PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── RESET PIN ── */
router.post("/auth/reset-pin", async (req, res) => {
  try {
    const rawPhone = sanitizeStr(req.body.phone ?? req.body.email, 30);
    const code     = sanitizeStr(req.body.code, 10);
    const newPin   = sanitizeStr(req.body.newPin, 20);

    const phone = normalizeTogoPhone(rawPhone);
    if (!phone || !code || !newPin) {
      res.status(400).json({ error: "Numéro de téléphone, code et nouveau mot de passe requis" });
      return;
    }
    if (newPin.length < 4) {
      res.status(400).json({ error: "Le mot de passe doit avoir au moins 4 caractères" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (!users.length) {
      res.status(400).json({ error: "Numéro introuvable" });
      return;
    }
    const user = users[0];

    const now = new Date();
    const codes = await db.select().from(verificationCodesTable).where(
      and(
        eq(verificationCodesTable.email, user.email),
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
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.id, user.id));
    await db.update(verificationCodesTable).set({ usedAt: now }).where(eq(verificationCodesTable.id, codes[0].id));

    res.json({ success: true, message: "Mot de passe réinitialisé avec succès" });
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
      res.status(400).json({ error: "Token, mot de passe actuel et nouveau mot de passe requis" });
      return;
    }
    if (newPin.length < 4) {
      res.status(400).json({ error: "Le nouveau mot de passe doit avoir au moins 4 caractères" });
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
      res.status(401).json({ error: "Mot de passe actuel incorrect" });
      return;
    }
    if (currentPin === newPin) {
      res.status(400).json({ error: "Le nouveau mot de passe doit être différent de l'ancien" });
      return;
    }

    const hashedPin = await bcrypt.hash(newPin, 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "Mot de passe modifié avec succès" });
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
