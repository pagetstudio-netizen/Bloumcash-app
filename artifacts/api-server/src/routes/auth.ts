import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, blacklistTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signUserToken } from "../middleware/user-auth";
import { sendPushNotification } from "../lib/onesignal";

const router: IRouter = Router();

/* Vérifie si un numéro est blacklisté */
async function isBlacklisted(phone: string | null | undefined): Promise<boolean> {
  if (!phone) return false;
  const rows = await db.select().from(blacklistTable).where(eq(blacklistTable.phone, phone)).limit(1);
  return rows.length > 0;
}

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

    /* ── Vérification statut compte ── */
    if (user.status === "banned") {
      res.status(403).json({
        error: "Votre compte a été désactivé pour cause d'activité suspecte. Contactez le support.",
        code: "ACCOUNT_BANNED",
      });
      return;
    }
    if (user.status === "suspended") {
      res.status(403).json({
        error: "Votre compte est temporairement suspendu. Contactez le support.",
        code: "ACCOUNT_SUSPENDED",
      });
      return;
    }

    /* ── Vérification blacklist (numéro de téléphone) ── */
    if (await isBlacklisted(user.phone)) {
      res.status(403).json({
        error: "Escroquerie détectée. Accès refusé. Bye.",
        code: "PHONE_BLACKLISTED",
      });
      return;
    }

    const pinMatches = await bcrypt.compare(String(pin), user.pin);
    if (!pinMatches) {
      res.status(401).json({ error: "Email ou PIN incorrect" });
      return;
    }

    const token = signUserToken({ id: user.id, email: user.email });

    await db
      .update(usersTable)
      .set({ onesignalExternalUserId: user.email, lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    sendPushNotification(
      {
        externalUserId: user.email,
        title: "Bloum Cash",
        message: `Bienvenue, ${user.fullName} ! Vous êtes maintenant connecté.`,
        data: { type: "login" },
      },
      req.log
    );

    res.json({
      token,
      user: {
        id: String(user.id),
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { fullName, email, pin, phone } = req.body;
    if (!fullName || !email || !pin) {
      res.status(400).json({ error: "Tous les champs sont requis" });
      return;
    }

    /* ── Vérification blacklist sur le numéro fourni à l'inscription ── */
    if (phone && await isBlacklisted(phone)) {
      res.status(403).json({
        error: "Escroquerie détectée. Inscription refusée.",
        code: "PHONE_BLACKLISTED",
      });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length) {
      res.status(400).json({ error: "Cet email est déjà utilisé" });
      return;
    }

    const hashedPin = await bcrypt.hash(String(pin), 12);
    const [user] = await db
      .insert(usersTable)
      .values({ fullName, email, pin: hashedPin, phone: phone ?? null, onesignalExternalUserId: email })
      .returning();
    const token = signUserToken({ id: user.id, email: user.email });

    sendPushNotification(
      {
        externalUserId: user.email,
        title: "Bienvenue sur Bloum Cash 🎉",
        message: `Bonjour ${user.fullName}, votre compte est créé. Commencez à transférer de l'argent !`,
        data: { type: "register" },
      },
      req.log
    );

    res.status(201).json({
      token,
      user: {
        id: String(user.id),
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/auth/forgot-pin", async (_req, res) => {
  res.json({ message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
});

export default router;
