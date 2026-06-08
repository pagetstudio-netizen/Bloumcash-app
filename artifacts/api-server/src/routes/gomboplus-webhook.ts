/**
 * POST /api/gomboplus/webhook
 *
 * Reçoit les notifications GomboPlus (EgoPay) pour les transactions CASHIN et CASHOUT.
 *
 * Payload GomboPlus :
 * {
 *   transaction_reference: "TXN_...",
 *   transaction_type: "cashin" | "cashout",
 *   status_message: "Transaction completed successfully" | "...",
 *   amount: 1000,
 *   fees: 25,
 *   total_amount: 1025,
 *   number: "90123456",
 *   country: "TG",
 *   operator: "yas",
 *   created_at: "...",
 *   completed_at: "..."
 * }
 *
 * Les tokens GomboPlus sont stockés en DB avec le préfixe "gp:" dans le champ paydunyaToken.
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as gomboplus from "../lib/gomboplus";
import { sendPushNotification } from "../lib/onesignal";
import { formatAmount } from "../lib/format";

const router: IRouter = Router();

router.post("/gomboplus/webhook", async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    req.log.info({ payload }, "GomboPlus webhook reçu");

    const gpReference     = String(payload.transaction_reference ?? "").trim();
    const transactionType = String(payload.transaction_type ?? "").toLowerCase();
    const statusMsg       = String(payload.status_message ?? "").toLowerCase();

    if (!gpReference) {
      req.log.warn({ payload }, "GomboPlus webhook: transaction_reference manquant");
      res.json({ received: true });
      return;
    }

    const storedToken = `gp:${gpReference}`;

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.paydunyaToken, storedToken))
      .limit(1);

    if (!rows.length) {
      req.log.warn({ gpReference, storedToken }, "GomboPlus webhook: aucune transaction trouvée pour cette référence");
      res.json({ received: true, matched: false });
      return;
    }

    const tx = rows[0];
    req.log.info(
      { reference: tx.reference, currentStatus: tx.status, transactionType, statusMsg },
      "GomboPlus webhook — transaction trouvée"
    );

    const isCompleted = statusMsg.includes("completed") || statusMsg === "success" || statusMsg === "successful";
    const isFailed    = statusMsg.includes("failed") || statusMsg.includes("cancel");

    /* ── CASHIN confirmé → déclencher le CASHOUT vers le destinataire ── */
    if (transactionType === "cashin" && isCompleted) {

      /* Mise à jour atomique — évite le double payout si webhook + polling simultanés */
      const updated = await db
        .update(transactionsTable)
        .set({ payoutSent: true })
        .where(
          and(
            eq(transactionsTable.paydunyaToken, storedToken),
            eq(transactionsTable.payoutSent, false)
          )
        )
        .returning({ id: transactionsTable.id });

      if (updated.length === 0) {
        req.log.info({ reference: tx.reference }, "GomboPlus webhook: payout déjà déclenché — skip");
        res.json({ received: true, reference: tx.reference, skipped: true });
        return;
      }

      if (!tx.toPhone || !tx.toOperator || tx.amount <= 0) {
        req.log.error(
          { reference: tx.reference, toPhone: tx.toPhone, toOperator: tx.toOperator },
          "GomboPlus webhook: infos destinataire manquantes — INTERVENTION MANUELLE REQUISE"
        );
        await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
        res.json({ received: true, reference: tx.reference });
        return;
      }

      req.log.info({ reference: tx.reference }, "GomboPlus webhook: CASHIN confirmé — déclenchement CASHOUT");

      try {
        const payoutResult = await gomboplus.cashout(
          {
            phone:     tx.toPhone,
            amount:    tx.amount,
            operator:  tx.toOperator as "tmoney" | "moov",
            reference: tx.reference,
          },
          req.log
        );

        if (payoutResult.success) {
          await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.reference, tx.reference));
          req.log.info({ reference: tx.reference, gpRef: payoutResult.gpReference }, "GomboPlus webhook: CASHOUT OK → success");

          if (tx.userId) {
            const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
            if (userRows[0]?.email) {
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
          await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
          req.log.error(
            { reference: tx.reference, msg: payoutResult.message },
            "GomboPlus webhook: CASHOUT refusé après CASHIN confirmé — INTERVENTION MANUELLE REQUISE"
          );
        }
      } catch (payoutErr) {
        await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
        req.log.error({ err: payoutErr, reference: tx.reference }, "GomboPlus webhook: erreur CASHOUT — INTERVENTION MANUELLE REQUISE");
      }

    /* ── CASHOUT confirmé (payout direct) → succès final ── */
    } else if (transactionType === "cashout" && isCompleted) {
      await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.reference, tx.reference));
      req.log.info({ reference: tx.reference }, "GomboPlus webhook: CASHOUT direct confirmé → success");

    /* ── Transaction échouée ou annulée ── */
    } else if (isFailed) {
      await db.update(transactionsTable).set({ status: "failed" }).where(eq(transactionsTable.reference, tx.reference));
      req.log.warn({ reference: tx.reference, statusMsg }, "GomboPlus webhook: transaction échouée/annulée");

      if (tx.userId) {
        const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
        if (userRows[0]?.email) {
          sendPushNotification(
            {
              externalUserId: userRows[0].email,
              title: "Transfert annulé ❌",
              message: `Votre transfert de ${formatAmount(tx.amount)} a été annulé ou a échoué.`,
              data: { type: "transfer_failed", reference: tx.reference },
            },
            req.log
          );
        }
      }
    } else {
      req.log.info({ transactionType, statusMsg, reference: tx.reference }, "GomboPlus webhook: statut non géré — aucune action");
    }

    res.json({ received: true, reference: tx.reference });
  } catch (err) {
    req.log.error({ err }, "GomboPlus webhook — erreur serveur");
    res.status(500).json({ error: "Erreur serveur webhook GomboPlus" });
  }
});

export default router;
