import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";
import { extractUser } from "../middleware/user-auth";
import { OPERATOR_MAP, TOGO_OPERATOR_MAP } from "../lib/paydunya-softpay-map";

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
    const email = payerEmail ?? `${fromPhone.replace(/\D/g, "")}@bloumcash.tg`;

    const currentUser = extractUser(req);
    const userId = currentUser?.id ?? null;

    /* ── Mode démo — PayDunya non configuré ── */
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

    /* ── Étape 1 (doc officielle) : Créer une checkout invoice → obtenir le payment_token ── */
    const operatorKey = TOGO_OPERATOR_MAP[fromOperator as "tmoney" | "moov"];
    const operatorConfig = OPERATOR_MAP[operatorKey];
    const channels = operatorConfig?.channels ?? [operatorKey];

    let paymentToken: string;
    try {
      paymentToken = await paydunya.createInvoice(
        total,
        `Transfert Bloum Cash ${fromOperator} → ${toOperator} — ref ${reference}`,
        channels,
        req.log
      );
    } catch (err) {
      const isPduErr = err instanceof paydunya.PaydunyaError;
      const msg = isPduErr
        ? err.message
        : "Erreur lors de la création de l'invoice PayDunya. Veuillez réessayer.";
      const code = isPduErr ? err.code : "INVOICE_ERROR";
      req.log.error({ err, code }, "Invoice creation failed");
      res.status(502).json({ error: msg, code });
      return;
    }

    /* ── Étape 2 (doc officielle) : Débiter le wallet de l'expéditeur via SoftPay ── */
    let chargeResult: paydunya.ChargeResult;
    try {
      chargeResult = await paydunya.chargeTogoWallet(
        fromOperator as "tmoney" | "moov",
        { name, email, phone: fromPhone, paymentToken },
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
    try {
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
        paydunyaToken: paymentToken,
      });
    } catch (dbErr) {
      // CRITIQUE : PayDunya a déjà débité l'envoyeur — on logue toutes les infos
      // pour permettre une récupération manuelle via le dashboard PayDunya.
      req.log.error({
        err: dbErr,
        CRITICAL: "PAYDUNYA_CHARGE_OK_BUT_DB_INSERT_FAILED",
        reference,
        paydunyaToken: paymentToken,
        fromPhone,
        toPhone,
        fromOperator,
        toOperator,
        amount: amt,
        fees,
      }, "⚠️ CRITIQUE — Paiement PayDunya réussi mais échec DB. Récupération manuelle requise via PayDunya dashboard.");
      // On continue quand même pour retourner une réponse au client
    }

    /* ── Étape 3 : Si Moov (instantané) → déclencher le payout vers destinataire ── */
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

    /* ── Confirmer le statut via PayDunya si la transaction est encore pending ── */
    if (tx.status === "pending" && paydunya.isConfigured() && tx.paydunyaToken) {
      try {
        const confirmed = await paydunya.confirmInvoice(tx.paydunyaToken, req.log);
        if (confirmed.completed) {
          await db
            .update(transactionsTable)
            .set({ status: "success" })
            .where(eq(transactionsTable.reference, tx.reference));
          tx.status = "success";
        } else if (confirmed.status === "failed" || confirmed.status === "cancelled") {
          await db
            .update(transactionsTable)
            .set({ status: "failed" })
            .where(eq(transactionsTable.reference, tx.reference));
          tx.status = "failed";
          req.log.warn({ reference: tx.reference, paydunya_status: confirmed.status }, "Transaction marquée échouée via polling PayDunya");
        }
      } catch {
        /* ignore — on retourne le statut actuel en DB */
      }
    }

    res.json({ reference: tx.reference, status: tx.status, amount: tx.amount, fees: tx.fees });
  } catch (err) {
    req.log.error({ err }, "Transfer status error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
