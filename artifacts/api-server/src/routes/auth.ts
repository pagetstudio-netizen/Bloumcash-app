import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signUserToken } from "../middleware/user-auth";
import { sendPushNotification } from "../lib/onesignal";

const router: IRouter = Router();

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
    const pinMatches = await bcrypt.compare(String(pin), user.pin);
    if (!pinMatches) {
      res.status(401).json({ error: "Email ou PIN incorrect" });
      return;
    }

    const token = signUserToken({ id: user.id, email: user.email });

    // Enregistrer l'email comme external_id OneSignal et envoyer notification de bienvenue
    await db
      .update(usersTable)
      .set({ onesignalExternalUserId: user.email })
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
    const { fullName, email, pin } = req.body;
    if (!fullName || !email || !pin) {
      res.status(400).json({ error: "Tous les champs sont requis" });
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
      .values({ fullName, email, pin: hashedPin, onesignalExternalUserId: email })
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
