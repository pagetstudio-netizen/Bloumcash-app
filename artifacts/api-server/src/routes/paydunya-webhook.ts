import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as paydunya from "../lib/paydunya";
import type { DisburseStatus } from "../lib/paydunya";
import { sendPushNotification } from "../lib/onesignal";
import { formatAmount } from "../lib/format";

const router: IRouter = Router();

/**
 * POST /api/paydunya/webhook
 *
 * Appelé par PayDunya quand le statut d'un paiement change.
 *
 * FLUX CRITIQUE :
 *  - "completed" → déclencher le payout UNIQUEMENT si payoutSent=false (atomique)
 *  - "cancelled"/"failed" → marquer la transaction échouée, JAMAIS de payout
 */
router.post("/paydunya/webhook", async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    req.log.info({ payload }, "PayDunya webhook reçu");

    const dataNode = payload?.data as Record<string, unknown> | undefined;
    const invoiceData = dataNode?.invoice as Record<string, unknown> | undefined;

    const token =
      (invoiceData?.token as string | undefined) ??
      (dataNode?.token as string | undefined) ??
      (payload?.token as string | undefined);

    const status =
      (dataNode?.status as string | undefined) ??
      (invoiceData?.status as string | undefined) ??
      (payload?.status as string | undefined);

    if (!token) {
      req.log.warn({ payload }, "PayDunya webhook: token manquant dans le payload");
      res.status(400).json({ error: "Token manquant dans le payload webhook" });
      return;
    }

    req.log.info(
      { token: token.slice(0, 8) + "…", status },
      "PayDunya webhook — traitement"
    );

    /* Trouver la transaction par son token PayDunya */
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.paydunyaToken, token))
      .limit(1);

    if (!rows.length) {
      req.log.warn(
        { token: token.slice(0, 8) + "…" },
        "PayDunya webhook: aucune transaction trouvée pour ce token"
      );
      res.json({ received: true, status, matched: false });
      return;
    }

    const tx = rows[0];
    req.log.info(
      { reference: tx.reference, currentStatus: tx.status, webhookStatus: status },
      "PayDunya webhook — transaction trouvée"
    );

    /* ──────────────────────────────────────────────────────────────────────────
       PAIEMENT CONFIRMÉ PAR PAYDUNYA
       → Déclencher le payout atomiquement (évite le double payout si webhook
         et polling arrivent simultanément).
       ────────────────────────────────────────────────────────────────────────── */
    if (status === "completed") {

      /* Mise à jour atomique : payoutSent passe à true SEULEMENT si elle était false.
         Si payoutSent était déjà true (polling a géré avant), updated sera vide. */
      const updated = await db
        .update(transactionsTable)
        .set({ payoutSent: true })
        .where(
          and(
            eq(transactionsTable.paydunyaToken, token),
            eq(transactionsTable.payoutSent, false)
          )
        )
        .returning({ id: transactionsTable.id, reference: transactionsTable.reference });

      if (updated.length === 0) {
        req.log.info(
          { reference: tx.reference },
          "PayDunya webhook: payout déjà déclenché (polling ou webhook précédent) — skip"
        );
        res.json({ received: true, status, reference: tx.reference, skipped: true });
        return;
      }

      req.log.info(
        { reference: tx.reference },
        "PayDunya webhook: payin confirmé — déclenchement payout vers destinataire"
      );

      if (!tx.toPhone || !tx.toOperator || tx.amount <= 0) {
        req.log.error(
          { reference: tx.reference, toPhone: tx.toPhone, toOperator: tx.toOperator },
          "PayDunya webhook: infos destinataire manquantes — payout impossible. INTERVENTION MANUELLE REQUISE."
        );
        await db
          .update(transactionsTable)
          .set({ status: "payout_failed" })
          .where(eq(transactionsTable.reference, tx.reference));
        res.json({ received: true, status, reference: tx.reference });
        return;
      }

      try {
        const payoutResult = await paydunya.disburseTogoWallet(
          tx.toOperator as "tmoney" | "moov",
          {
            name: "Bénéficiaire Bloum Cash",
            phone: tx.toPhone,
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

          req.log.info(
            { reference: tx.reference, transactionId: payoutResult.transactionId },
            "PayDunya webhook: payout destinataire OK → transaction SUCCESS"
          );

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
                  message: `Votre transfert de ${formatAmount(tx.amount)} vers ${tx.toPhone} a été confirmé avec succès.`,
                  data: { type: "transfer_confirmed", reference: tx.reference },
                },
                req.log
              );
            }
          }

        } else {
          /* Payout refusé — le payin a réussi mais le retrait a échoué.
             Marquer payout_failed pour intervention manuelle. */
          await db
            .update(transactionsTable)
            .set({ status: "payout_failed" })
            .where(eq(transactionsTable.reference, tx.reference));

          req.log.error(
            { reference: tx.reference, message: payoutResult.message },
            "PayDunya webhook: payout refusé après payin confirmé — INTERVENTION MANUELLE REQUISE"
          );
        }
      } catch (payoutErr) {
        await db
          .update(transactionsTable)
          .set({ status: "payout_failed" })
          .where(eq(transactionsTable.reference, tx.reference));

        req.log.error(
          { err: payoutErr, reference: tx.reference },
          "PayDunya webhook: erreur payout après payin confirmé — INTERVENTION MANUELLE REQUISE"
        );
      }

    /* ──────────────────────────────────────────────────────────────────────────
       PAIEMENT ANNULÉ OU ÉCHOUÉ — ne jamais déclencher de payout
       ────────────────────────────────────────────────────────────────────────── */
    } else if (status === "cancelled" || status === "failed") {
      await db
        .update(transactionsTable)
        .set({ status: "failed" })
        .where(eq(transactionsTable.paydunyaToken, token));

      req.log.warn(
        { reference: tx.reference, status },
        "PayDunya webhook: paiement annulé/échoué — aucun payout effectué"
      );

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
              title: "Transfert annulé ❌",
              message: `Votre transfert de ${formatAmount(tx.amount)} a été annulé ou a échoué.`,
              data: { type: "transfer_failed", reference: tx.reference },
            },
            req.log
          );
        }
      }

    } else {
      req.log.info(
        { status, reference: tx.reference },
        "PayDunya webhook: statut non géré — aucune mise à jour DB"
      );
    }

    res.json({ received: true, status, reference: tx.reference });
  } catch (err) {
    req.log.error({ err }, "PayDunya webhook — erreur serveur");
    res.status(500).json({ error: "Erreur serveur webhook" });
  }
});

/**
 * POST /api/paydunya/disburse-webhook
 * Appelé par PayDunya quand le statut d'un déboursement change.
 */
router.post("/paydunya/disburse-webhook", async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    req.log.info({ payload }, "PayDunya disburse webhook reçu");

    const disburseToken =
      (payload?.disburse_invoice as string | undefined) ??
      (payload?.token as string | undefined);

    const status = (payload?.status as string | undefined)?.toLowerCase() as DisburseStatus | undefined;

    req.log.info(
      { disburseTokenPrefix: disburseToken ? disburseToken.slice(0, 8) + "…" : "?", status },
      "PayDunya disburse webhook — traitement"
    );

    if (disburseToken) {
      const rows = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.paydunyaToken, disburseToken))
        .limit(1);

      if (rows.length) {
        const tx = rows[0];
        if (status === "success") {
          await db
            .update(transactionsTable)
            .set({ status: "success" })
            .where(eq(transactionsTable.reference, tx.reference));
          req.log.info({ reference: tx.reference }, "PayDunya disburse webhook: payout confirmé ✔");
        } else if (status === "failed") {
          await db
            .update(transactionsTable)
            .set({ status: "payout_failed" })
            .where(eq(transactionsTable.reference, tx.reference));
          req.log.warn({ reference: tx.reference }, "PayDunya disburse webhook: payout échoué — INTERVENTION MANUELLE REQUISE ✖");
        }
      }
    }

    res.json({ received: true, status });
  } catch (err) {
    req.log.error({ err }, "PayDunya disburse webhook — erreur serveur");
    res.status(500).json({ error: "Erreur serveur webhook disburse" });
  }
});

export default router;
