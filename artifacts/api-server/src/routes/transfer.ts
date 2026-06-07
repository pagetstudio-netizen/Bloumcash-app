import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";

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
    const total = amt + fees;

    res.json({
      amount: amt,
      fees,
      total,
      estimatedTime: "Instantané",
    });
  } catch (err) {
    req.log.error({ err }, "Calculate fees error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const { fromOperator, fromPhone, toOperator, toPhone, amount, payerName, payerEmail } = req.body;

    if (!fromOperator || !fromPhone || !toOperator || !toPhone || !amount) {
      res.status(400).json({ error: "Champs requis manquants" });
      return;
    }

    const amt = parseInt(String(amount));
    const fees = calculateFees(fromOperator, toOperator, amt);
    const total = amt + fees;
    const reference = "TR" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();

    const name = payerName ?? "Client Bloum Cash";
    const email = payerEmail ?? `${fromPhone.replace(/\s/g, "")}@bloumcash.tg`;

    if (!paydunya.isConfigured()) {
      await db.insert(transactionsTable).values({
        reference,
        type: "outgoing",
        title: `Transfert vers ${toPhone}`,
        amount: amt,
        operator: fromOperator,
        fromPhone,
        toPhone,
        fees,
        description: `Transfert ${fromOperator} → ${toOperator}`,
        status: "success",
      });

      res.status(201).json({
        success: true,
        message: "Transfert effectué avec succès",
        reference,
        fees,
        total,
        isPending: false,
        paydunhaConfigured: false,
      });
      return;
    }

    let invoiceToken: string;
    try {
      const invoice = await paydunya.createInvoice(
        total,
        `Transfert ${fromOperator.toUpperCase()} → ${toOperator.toUpperCase()} | ${fromPhone} → ${toPhone}`
      );
      invoiceToken = invoice.token;
    } catch (invoiceErr) {
      req.log.error({ err: invoiceErr }, "PayDunya invoice creation failed");
      res.status(502).json({ error: "Impossible de contacter PayDunya. Veuillez réessayer." });
      return;
    }

    let chargeResult: paydunya.ChargeResult;
    try {
      chargeResult = await paydunya.chargeWallet(
        fromOperator as "tmoney" | "moov",
        name,
        email,
        fromPhone,
        invoiceToken
      );
    } catch (chargeErr) {
      req.log.error({ err: chargeErr }, "PayDunya charge failed");
      res.status(502).json({ error: "Erreur lors du débit. Vérifiez votre solde et réessayez." });
      return;
    }

    if (!chargeResult.success) {
      res.status(402).json({
        error: chargeResult.message ?? "Paiement refusé par l'opérateur",
        code: "PAYMENT_REFUSED",
      });
      return;
    }

    const isPending = fromOperator === "tmoney";
    const txStatus = isPending ? "pending" : "success";

    await db.insert(transactionsTable).values({
      reference,
      type: "outgoing",
      title: `Transfert vers ${toPhone}`,
      amount: amt,
      operator: fromOperator,
      fromPhone,
      toPhone,
      fees,
      description: `Transfert ${fromOperator} → ${toOperator}`,
      status: txStatus,
    });

    res.status(201).json({
      success: true,
      message: chargeResult.message,
      reference,
      fees,
      total,
      isPending,
      paydunhaConfigured: true,
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Erreur serveur" });
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
    res.json({
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      fees: tx.fees,
    });
  } catch (err) {
    req.log.error({ err }, "Transfer status error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
