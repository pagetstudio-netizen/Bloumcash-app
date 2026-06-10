import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { userFeedbackTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "../middleware/user-auth";
import { requireAdmin } from "../middleware/admin-auth";
import { notifyFeedback } from "../lib/telegram";

const router: IRouter = Router();

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'envois. Réessayez dans 1 heure." },
});

/* ── POST /feedback — Soumettre un retour utilisateur ── */
router.post("/feedback", feedbackLimiter, requireUser, async (req, res) => {
  try {
    const userId = req.currentUser!.id;
    const { type, title, message } = req.body;

    const VALID_TYPES = ["suggestion", "retour", "bug"];
    if (!type || !VALID_TYPES.includes(String(type))) {
      res.status(400).json({ error: "Type invalide. Choisissez : suggestion, retour ou bug." });
      return;
    }
    if (!title || String(title).trim().length < 3) {
      res.status(400).json({ error: "Titre requis (minimum 3 caractères)." });
      return;
    }
    if (!message || String(message).trim().length < 10) {
      res.status(400).json({ error: "Description requise (minimum 10 caractères)." });
      return;
    }

    /* Récupérer les infos utilisateur */
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = users[0];

    await db.insert(userFeedbackTable).values({
      userId,
      type: String(type),
      title: String(title).trim().slice(0, 100),
      message: String(message).trim().slice(0, 1000),
      status: "nouveau",
      userPhone: user?.phone ?? null,
      userName: user?.fullName ?? null,
    });

    notifyFeedback({
      type: String(type),
      title: String(title).trim().slice(0, 100),
      message: String(message).trim().slice(0, 500),
      userName: user?.fullName ?? null,
      userPhone: user?.phone ?? null,
    });

    res.status(201).json({ success: true, message: "Retour envoyé avec succès." });
  } catch (err) {
    req.log.error({ err }, "Feedback submit error");
    res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ── GET /admin/feedback — Lister tous les retours (admin) ── */
router.get("/admin/feedback", requireAdmin, async (req, res) => {
  try {
    const items = await db.select().from(userFeedbackTable)
      .orderBy(desc(userFeedbackTable.createdAt))
      .limit(500);
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "Admin feedback list error");
    res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ── PATCH /admin/feedback/:id/status — Mettre à jour le statut ── */
router.patch("/admin/feedback/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const VALID_STATUSES = ["nouveau", "lu", "traité"];
    if (!status || !VALID_STATUSES.includes(String(status))) {
      res.status(400).json({ error: "Statut invalide." });
      return;
    }
    await db.update(userFeedbackTable).set({ status: String(status) }).where(eq(userFeedbackTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin feedback status update error");
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
