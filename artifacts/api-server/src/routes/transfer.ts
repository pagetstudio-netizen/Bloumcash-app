import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";
import { extractUser } from "../middleware/user-auth";
import { OPERATOR_MAP, TOGO_OPERATOR_MAP } from "../lib/paydunya-softpay-map";
import { sendPushNotification } from "../lib/onesignal";
import { formatAmount } from "../lib/format";

const router: IRouter = Router();

function calculateFees(_fromOperator: string, _toOperator: string, amount: number): number {
  return Math.ceil(amount * 0.035);
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
        payoutSent: true,
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

    /* ──────────────────────────────────────────────────────────────────────────
       FLUX CORRECT PayDunya :
       1. createInvoice  → obtenir le payment_token
       2. chargeTogoWallet → envoyer le push USSD au payeur
       3. Sauvegarder en status "pending" — AUCUN payout à ce stade
       4. L'utilisateur valide sur son téléphone avec son code secret
       5. PayDunya appelle le webhook /api/paydunya/webhook (status: "completed")
       6. Le webhook déclenche le payout vers le destinataire
       ────────────────────────────────────────────────────────────────────────── */

    /* ── Étape 1 : Créer une checkout invoice → obtenir le payment_token ── */
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

    /* ── Étape 2 : Envoyer le push USSD au payeur via SoftPay ── */
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
        : "Erreur lors de la demande de paiement mobile money. Veuillez réessayer.";
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

    /* ── Étape 3 : Sauvegarder en PENDING — le payout sera déclenché UNIQUEMENT
       après confirmation officielle de PayDunya via webhook ou polling.
       NE JAMAIS créditer le destinataire avant cette confirmation. ── */
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
        status: "pending",
        payoutSent: false,
        userId,
        paydunyaToken: paymentToken,
      });
    } catch (dbErr) {
      req.log.error({
        err: dbErr,
        CRITICAL: "PAYDUNYA_CHARGE_SENT_BUT_DB_INSERT_FAILED",
        reference,
        paydunyaToken: paymentToken,
        fromPhone,
        toPhone,
        fromOperator,
        toOperator,
        amount: amt,
        fees,
      }, "⚠️ CRITIQUE — Push PayDunya envoyé mais échec insertion DB. Récupération manuelle requise.");
    }

    req.log.info(
      { reference, fromOperator, toOperator, fromPhone, toPhone, amount: amt },
      "Demande de paiement envoyée — en attente de validation par le payeur"
    );

    res.status(201).json({
      success: true,
      message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone mobile.",
      reference,
      fees,
      total,
      isPending: true,
      paydunhaConfigured: true,
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

/**
 * GET /api/transfer/:reference/status
 *
 * Polling endpoint — vérifie le statut d'une transaction via PayDunya.
 * Si PayDunya confirme le paiement (completed) ET que le payout n'a pas encore
 * été déclenché (payoutSent = false), déclenche le payout atomiquement.
 */
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

    /* ── Vérifier le statut via PayDunya si la transaction est encore pending ── */
    if (tx.status === "pending" && paydunya.isConfigured() && tx.paydunyaToken) {
      try {
        const confirmed = await paydunya.confirmInvoice(tx.paydunyaToken, req.log);

        if (confirmed.completed) {
          /* ── ATOMIQUE : marquer payoutSent=true seulement si ce n'était pas déjà fait ──
             Utilise le WHERE payoutSent=false pour éviter un double payout si le webhook
             et le polling arrivent en même temps. */
          const updated = await db
            .update(transactionsTable)
            .set({ payoutSent: true })
            .where(
              and(
                eq(transactionsTable.reference, tx.reference),
                eq(transactionsTable.payoutSent, false)
              )
            )
            .returning({ id: transactionsTable.id });

          if (updated.length > 0) {
            /* C'est ce processus qui doit déclencher le payout */
            req.log.info({ reference: tx.reference }, "Polling: payin confirmé — déclenchement payout");

            try {
              const payoutResult = await paydunya.disburseTogoWallet(
                tx.toOperator as "tmoney" | "moov",
                {
                  name: "Bénéficiaire Bloum Cash",
                  phone: tx.toPhone!,
                  amount: tx.amount,
                  reference: tx.reference,
                },
                req.log
              );

              if (payoutResult.success) {
                await db
                  .update(transactionsTable)
                  .set({ status: "success" })
                  .where(eq(transactionsTable.reference, tx.reference));
                tx.status = "success";
                req.log.info({ reference: tx.reference }, "Polling: payout destinataire OK → success");

                /* Notification push à l'expéditeur */
                if (tx.userId) {
                  const userRows = await db
                    .select({ email: usersTable.email })
                    .from(usersTable)
                    .where(eq(usersTable.id, tx.userId))
                    .limit(1);
                  if (userRows.length && userRows[0].email) {
                    sendPushNotification(
                      {
                        externalUserId: userRows[0].email,
                        title: "Transfert confirmé ✅",
                        message: `Votre transfert de ${formatAmount(tx.amount)} vers ${tx.toPhone ?? "destinataire"} a été confirmé.`,
                        data: { type: "transfer_confirmed", reference: tx.reference },
                      },
                      req.log
                    );
                  }
                }
              } else {
                await db
                  .update(transactionsTable)
                  .set({ status: "payout_failed" })
                  .where(eq(transactionsTable.reference, tx.reference));
                tx.status = "payout_failed";
                req.log.error({ reference: tx.reference, msg: payoutResult.message }, "Polling: payout refusé après payin confirmé — INTERVENTION MANUELLE REQUISE");
              }
            } catch (payoutErr) {
              await db
                .update(transactionsTable)
                .set({ status: "payout_failed" })
                .where(eq(transactionsTable.reference, tx.reference));
              tx.status = "payout_failed";
              req.log.error({ err: payoutErr, reference: tx.reference }, "Polling: erreur payout après payin confirmé — INTERVENTION MANUELLE REQUISE");
            }
          } else {
            /* payoutSent était déjà true — le webhook a déjà géré ça */
            req.log.info({ reference: tx.reference }, "Polling: payout déjà déclenché par le webhook — skip");
            /* Recharger le statut actuel depuis la DB */
            const fresh = await db
              .select({ status: transactionsTable.status })
              .from(transactionsTable)
              .where(eq(transactionsTable.reference, tx.reference))
              .limit(1);
            if (fresh.length) tx.status = fresh[0].status;
          }

        } else if (confirmed.status === "failed" || confirmed.status === "cancelled") {
          await db
            .update(transactionsTable)
            .set({ status: "failed" })
            .where(eq(transactionsTable.reference, tx.reference));
          tx.status = "failed";
          req.log.warn({ reference: tx.reference, paydunya_status: confirmed.status }, "Polling: transaction marquée échouée/annulée");

          if (tx.userId) {
            const userRows = await db
              .select({ email: usersTable.email })
              .from(usersTable)
              .where(eq(usersTable.id, tx.userId))
              .limit(1);
            if (userRows.length && userRows[0].email) {
              sendPushNotification(
                {
                  externalUserId: userRows[0].email,
                  title: "Transfert échoué ❌",
                  message: `Votre transfert de ${formatAmount(tx.amount)} n'a pas pu être effectué. Veuillez réessayer.`,
                  data: { type: "transfer_failed", reference: tx.reference },
                },
                req.log
              );
            }
          }
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
