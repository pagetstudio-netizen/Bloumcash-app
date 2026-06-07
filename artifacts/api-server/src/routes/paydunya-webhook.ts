import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/paydunya/webhook", async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    req.log.info({ payload }, "PayDunya webhook received");

    const invoiceData = (payload?.data as Record<string, unknown>)?.invoice as
      | Record<string, unknown>
      | undefined;

    const token =
      (invoiceData?.token as string | undefined) ??
      (payload?.token as string | undefined);

    const status =
      (invoiceData?.status as string | undefined) ??
      (payload?.status as string | undefined);

    if (!token) {
      req.log.warn({ payload }, "PayDunya webhook: missing token");
      res.status(400).json({ error: "Token manquant dans le payload webhook" });
      return;
    }

    req.log.info({ token: token.slice(0, 8) + "…", status }, "PayDunya webhook processing");

    if (status === "completed") {
      await db
        .update(transactionsTable)
        .set({ status: "success" })
        .where(eq(transactionsTable.status, "pending"));

      req.log.info({ token: token.slice(0, 8) + "…" }, "PayDunya webhook: transaction(s) confirmed");
    } else if (status === "cancelled" || status === "failed") {
      await db
        .update(transactionsTable)
        .set({ status: "failed" })
        .where(eq(transactionsTable.status, "pending"));

      req.log.warn({ token: token.slice(0, 8) + "…", status }, "PayDunya webhook: transaction(s) failed/cancelled");
    } else {
      req.log.info({ status }, "PayDunya webhook: unhandled status, no DB update");
    }

    res.json({ received: true, status });
  } catch (err) {
    req.log.error({ err }, "PayDunya webhook error");
    res.status(500).json({ error: "Erreur serveur webhook" });
  }
});

export default router;
