import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/paydunya/webhook", async (req, res) => {
  try {
    const payload = req.body;

    req.log.info({ payload }, "PayDunya webhook received");

    const token = payload?.data?.invoice?.token ?? payload?.token;
    const status = payload?.data?.invoice?.status ?? payload?.status;

    if (!token) {
      res.status(400).json({ error: "Token manquant" });
      return;
    }

    if (status === "completed") {
      await db
        .update(transactionsTable)
        .set({ status: "success" })
        .where(eq(transactionsTable.status, "pending"));

      req.log.info({ token }, "PayDunya transaction confirmed");
    } else if (status === "cancelled" || status === "failed") {
      await db
        .update(transactionsTable)
        .set({ status: "failed" })
        .where(eq(transactionsTable.status, "pending"));

      req.log.warn({ token, status }, "PayDunya transaction failed or cancelled");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "PayDunya webhook error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
