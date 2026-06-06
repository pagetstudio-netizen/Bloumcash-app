import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { desc, gte, eq } from "drizzle-orm";

const router: IRouter = Router();

function getPeriodStart(period?: string): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    default: {
      // month
      const d = new Date(now);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
}

router.get("/stats/summary", async (req, res) => {
  try {
    const period = (req.query.period as string) || "month";
    const since = getPeriodStart(period);

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, since));

    let incoming = 0;
    let outgoing = 0;

    for (const row of rows) {
      if (row.type === "incoming") incoming += row.amount;
      else outgoing += row.amount;
    }

    res.json({
      totalAmount: incoming,
      incoming,
      outgoing,
      transactionCount: rows.length,
      period,
    });
  } catch (err) {
    req.log.error({ err }, "Stats summary error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/stats/chart", async (req, res) => {
  try {
    const period = (req.query.period as string) || "month";
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, getPeriodStart(period)))
      .orderBy(transactionsTable.createdAt);

    // Group by day
    const grouped: Record<string, number> = {};
    for (const row of rows) {
      const d = new Date(row.createdAt);
      let key: string;
      if (period === "today") {
        key = d.toLocaleTimeString("fr-FR", { hour: "2-digit" }) + "h";
      } else if (period === "year") {
        key = d.toLocaleDateString("fr-FR", { month: "short" });
      } else {
        key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      }
      grouped[key] = (grouped[key] || 0) + (row.type === "incoming" ? row.amount : 0);
    }

    const points = Object.entries(grouped).map(([label, value]) => ({
      label,
      value: Math.round(value / 1000), // in thousands
    }));

    // If no data, return dummy chart data
    if (!points.length) {
      res.json([
        { label: "01/06", value: 200 },
        { label: "02/06", value: 250 },
        { label: "03/06", value: 180 },
        { label: "04/06", value: 300 },
        { label: "05/06", value: 270 },
        { label: "06/06", value: 350 },
        { label: "07/06", value: 500 },
      ]);
      return;
    }

    res.json(points);
  } catch (err) {
    req.log.error({ err }, "Stats chart error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
