import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, blacklistTable, verificationCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signUserToken } from "../middleware/user-auth";
import { sendPushNotification } from "../lib/onesignal";
import { sendWelcomeEmail, sendPinResetEmail } from "../lib/email";

const router: IRouter = Router();

/* Vérifie si un numéro est blacklisté */
async function isBlacklisted(phone: string | null | undefined): Promise<boolean> {
  if (!phone) return false;
  const rows = await db.select().from(blacklistTable).where(eq(blacklistTable.phone, phone)).limit(1);
  return rows.length > 0;
}

/* Génère un code numérique à 6 chiffres */
function generateCode(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
}

/* ── LOGIN ───────────────────────────────────────────────────────────────── */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
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

    const pinMatches = await bcrypt.compare(String(pin), user.pin);
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

/* ── REGISTER ────────────────────────────────────────────────────────────── */
router.post("/auth/register", async (req, res) => {
  try {
    const { fullName, email, pin, phone, village, city, region, country } = req.body;
    if (!fullName || !email || !pin) {
      res.status(400).json({ error: "Tous les champs sont requis" });
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

    const hashedPin = await bcrypt.hash(String(pin), 12);
    const [user] = await db.insert(usersTable)
      .values({ fullName, email, pin: hashedPin, phone: phone ?? null, onesignalExternalUserId: email, village: village ?? null, city: city ?? null, region: region ?? null, country: country ?? "Togo" })
      .returning();

    const token = signUserToken({ id: user.id, email: user.email });

    /* Email de bienvenue (non bloquant) */
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

/* ── FORGOT PIN — demande de code ────────────────────────────────────────── */
router.post("/auth/forgot-pin", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    /* Réponse identique qu'il existe ou non (sécurité) */
    if (!users.length) {
      res.json({ message: "Si cet email existe, un code de réinitialisation a été envoyé." });
      return;
    }

    const user = users[0];
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); /* 15 min */

    /* Invalider les anciens codes du même type */
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

/* ── RESET PIN — vérification du code et nouveau PIN ────────────────────── */
router.post("/auth/reset-pin", async (req, res) => {
  try {
    const { email, code, newPin } = req.body;
    if (!email || !code || !newPin) {
      res.status(400).json({ error: "Email, code et nouveau PIN requis" });
      return;
    }
    if (String(newPin).length !== 6 || !/^\d{6}$/.test(String(newPin))) {
      res.status(400).json({ error: "Le PIN doit être 6 chiffres" });
      return;
    }

    const now = new Date();
    const codes = await db.select().from(verificationCodesTable).where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, String(code)),
        eq(verificationCodesTable.type, "pin_reset"),
        gt(verificationCodesTable.expiresAt, now),
      )
    ).limit(1);

    if (!codes.length || codes[0].usedAt) {
      res.status(400).json({ error: "Code invalide ou expiré" });
      return;
    }

    const hashedPin = await bcrypt.hash(String(newPin), 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.email, email));
    await db.update(verificationCodesTable).set({ usedAt: now }).where(eq(verificationCodesTable.id, codes[0].id));

    res.json({ success: true, message: "PIN réinitialisé avec succès" });
  } catch (err) {
    req.log.error({ err }, "Reset PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ── CHANGE PIN — authentifié, ancien PIN requis ─────────────────────────── */
router.post("/auth/change-pin", async (req, res) => {
  try {
    const { token, currentPin, newPin } = req.body;
    if (!token || !currentPin || !newPin) {
      res.status(400).json({ error: "Token, PIN actuel et nouveau PIN requis" });
      return;
    }
    if (String(newPin).length !== 6 || !/^\d{6}$/.test(String(newPin))) {
      res.status(400).json({ error: "Le nouveau PIN doit être 6 chiffres" });
      return;
    }

    const { verifyUserToken } = await import("../middleware/user-auth");
    let payload: { id: number; email: string };
    try {
      payload = verifyUserToken(String(token));
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
    const pinMatches = await bcrypt.compare(String(currentPin), user.pin);
    if (!pinMatches) {
      res.status(401).json({ error: "PIN actuel incorrect" });
      return;
    }

    if (String(currentPin) === String(newPin)) {
      res.status(400).json({ error: "Le nouveau PIN doit être différent de l'ancien" });
      return;
    }

    const hashedPin = await bcrypt.hash(String(newPin), 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "PIN modifié avec succès" });
  } catch (err) {
    req.log.error({ err }, "Change PIN error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
