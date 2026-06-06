import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { desc, eq, ilike, or } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function formatTransaction(t: typeof transactionsTable.$inferSelect) {
  const date = new Date(t.createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let dateLabel: string;
  if (date.toDateString() === today.toDateString()) {
    dateLabel = "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    dateLabel = "Hier";
  } else {
    dateLabel = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const timeLabel = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return {
    id: String(t.id),
    type: t.type,
    title: t.title,
    amount: t.amount,
    date: dateLabel,
    time: timeLabel,
    status: t.status,
    operator: t.operator,
    reference: t.reference,
    fromPhone: t.fromPhone ?? null,
    toPhone: t.toPhone ?? null,
    fees: t.fees ?? null,
    description: t.description ?? null,
  };
}

router.get("/transactions", async (req, res) => {
  try {
    const { search, filter, period } = req.query as Record<string, string>;

    let query = db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));

    const rows = await query;
    let result = rows.map(formatTransaction);

    if (filter === "incoming") result = result.filter((t) => t.type === "incoming");
    if (filter === "outgoing") result = result.filter((t) => t.type === "outgoing");

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          (t.fromPhone ?? "").includes(s) ||
          (t.toPhone ?? "").includes(s) ||
          t.reference.toLowerCase().includes(s),
      );
    }

    if (period === "today") {
      result = result.filter((t) => t.date === "Aujourd'hui");
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "List transactions error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/transactions/recent", async (req, res) => {
  try {
    const rows = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(5);
    res.json(rows.map(formatTransaction));
  } catch (err) {
    req.log.error({ err }, "Recent transactions error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Transaction introuvable" });
      return;
    }
    res.json(formatTransaction(rows[0]));
  } catch (err) {
    req.log.error({ err }, "Get transaction error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const { type, title, amount, operator, fromPhone, toPhone, description } = req.body;
    const reference = "BC" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();

    const [t] = await db
      .insert(transactionsTable)
      .values({
        reference,
        type,
        title,
        amount,
        operator,
        fromPhone: fromPhone ?? null,
        toPhone: toPhone ?? null,
        description: description ?? null,
        status: "success",
      })
      .returning();

    res.status(201).json(formatTransaction(t));
  } catch (err) {
    req.log.error({ err }, "Create transaction error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
