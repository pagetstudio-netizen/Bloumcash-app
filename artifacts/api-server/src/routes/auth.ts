import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      res.status(400).json({ error: "Email et PIN requis" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!users.length || users[0].pin !== pin) {
      res.status(401).json({ error: "Email ou PIN incorrect" });
      return;
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");

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

    const [user] = await db.insert(usersTable).values({ fullName, email, pin }).returning();
    const token = crypto.randomBytes(32).toString("hex");

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
