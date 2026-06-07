import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";
import { extractUser } from "../middleware/user-auth";

const router: IRouter = Router();

function calculateFees(fromOperator: string, toOperator: string, amount: number): number {
  const rate = fromOperator === toOperator ? 0.01 : 0.02;
  return Math.ceil(amount * rate);
}

router.post("/transfer/fees", async (req, res) => {
  try {
    const { fromOperator, toOperator, amount } = req.body;
    if (!fromOperator || !toOperator || !amount) {
      res.status(400).json({ error: "Champs requis manquants" });
      return;
    }
    const amt = parseInt(String(amount));
    const fees = calculateFees(fromOperator, toOperator, amt);
    res.json({ amount: amt, fees, total: amt + fees, estimatedTime: "Instantané" });
  } catch (err) {
    req.log.error({ err }, "Calculate fees error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const {
      fromOperator,
      fromPhone,
      toOperator,
      toPhone,
      amount,
      payerName,
      payerEmail,
    } = req.body;

    if (!fromOperator || !fromPhone || !toOperator || !toPhone || !amount) {
      res.status(400).json({ error: "Champs requis manquants" });
      return;
    }

    const amt = parseInt(String(amount));
    if (isNaN(amt) || amt <= 0) {
      res.status(400).json({ error: "Montant invalide" });
      return;
    }

    const fees = calculateFees(fromOperator, toOperator, amt);
    const total = amt + fees;
    const reference =
      "TR" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();

    const name = payerName ?? "Client Bloum Cash";
    const email =
      payerEmail ?? `${fromPhone.replace(/\D/g, "")}@bloumcash.tg`;

    /* ── Mode démo — PayDunya non configuré ── */
    const currentUser = extractUser(req);
    const userId = currentUser?.id ?? null;

    if (!paydunya.isConfigured()) {
      req.log.warn("PayDunya not configured — saving transaction in demo mode");
      await db.insert(transactionsTable).values({
        reference,
        type: "outgoing",
        title: `Transfert vers ${toPhone}`,
        amount: amt,
        operator: fromOperator,
        fromPhone,
        toPhone,
        toOperator,
        fees,
        description: `Transfert ${fromOperator} → ${toOperator}`,
        status: "success",
        userId,
      });
      res.status(201).json({
        success: true,
        message: "Transfert effectué (mode démo — PayDunya non configuré)",
        reference,
        fees,
        total,
        isPending: false,
        paydunhaConfigured: false,
      });
      return;
    }

    /* ── Débiter le wallet de l'expéditeur (SoftPay direct) ── */
    let chargeResult: paydunya.ChargeResult;
    try {
      chargeResult = await paydunya.chargeTogoWallet(
        fromOperator as "tmoney" | "moov",
        { name, email, phone: fromPhone, amount: total },
        req.log
      );
    } catch (err) {
      const isPduErr = err instanceof paydunya.PaydunyaError;
      const msg = isPduErr
        ? err.message
        : "Erreur lors du débit mobile money. Veuillez réessayer.";
      const code = isPduErr ? err.code : "CHARGE_ERROR";
      req.log.error({ err, code }, "Charge failed");
      res.status(502).json({ error: msg, code });
      return;
    }

    if (!chargeResult.success) {
      res.status(402).json({
        error: chargeResult.message,
        code: "PAYMENT_REFUSED",
      });
      return;
    }

    const txStatus = chargeResult.isPending ? "pending" : "success";

    /* ── Sauvegarder la transaction ── */
    await db.insert(transactionsTable).values({
      reference,
      type: "outgoing",
      title: `Transfert vers ${toPhone}`,
      amount: amt,
      operator: fromOperator,
      fromPhone,
      toPhone,
      toOperator,
      fees,
      description: `Transfert ${fromOperator} → ${toOperator}`,
      status: txStatus,
      userId,
    });

    /* ── Étape 3 : Si Moov (instantané) → déclencher le payout immédiatement ── */
    if (!chargeResult.isPending && toPhone && toOperator) {
      req.log.info(
        { reference, toOperator, toPhone, amount: amt },
        "Payin confirmé — déclenchement payout vers destinataire"
      );
      try {
        const payoutResult = await paydunya.disburseTogoWallet(
          toOperator as "tmoney" | "moov",
          { name: "Bénéficiaire Bloum Cash", phone: toPhone, amount: amt, reference },
          req.log
        );
        if (payoutResult.success) {
          req.log.info({ reference, transactionId: payoutResult.transactionId }, "Payout destinataire OK");
        } else {
          req.log.warn({ reference, message: payoutResult.message }, "Payout destinataire refusé — transaction reste pending");
          await db.update(transactionsTable).set({ status: "pending" }).where(eq(transactionsTable.reference, reference));
        }
      } catch (payoutErr) {
        req.log.error({ err: payoutErr, reference }, "Erreur payout destinataire — transaction marquée pending");
        await db.update(transactionsTable).set({ status: "pending" }).where(eq(transactionsTable.reference, reference));
      }
    }

    res.status(201).json({
      success: true,
      message: chargeResult.message,
      reference,
      fees,
      total,
      isPending: chargeResult.isPending ?? false,
      paydunhaConfigured: true,
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

router.get("/transfer/:reference/status", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, req.params.reference))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "Transaction introuvable" });
      return;
    }
    const tx = rows[0];
    res.json({ reference: tx.reference, status: tx.status, amount: tx.amount, fees: tx.fees });
  } catch (err) {
    req.log.error({ err }, "Transfer status error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
