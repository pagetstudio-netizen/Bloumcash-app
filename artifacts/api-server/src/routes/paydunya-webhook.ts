import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as paydunya from "../lib/paydunya";
import type { DisburseStatus } from "../lib/paydunya";

const router: IRouter = Router();

router.post("/paydunya/webhook", async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    req.log.info({ payload }, "PayDunya webhook reçu");

    /* ── Extraire token + statut depuis le payload PayDunya ── */
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
      req.log.warn({ payload }, "PayDunya webhook: token manquant dans le payload");
      res.status(400).json({ error: "Token manquant dans le payload webhook" });
      return;
    }

    req.log.info(
      { token: token.slice(0, 8) + "…", status },
      "PayDunya webhook — traitement"
    );

    /* ── CORRECTION CRITIQUE : trouver la transaction par son token PayDunya ── */
    /* (avant, le code mettait à jour TOUTES les transactions en attente — bug grave) */
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
      /* Répondre 200 pour que PayDunya ne re-essaie pas indéfiniment */
      res.json({ received: true, status, matched: false });
      return;
    }

    const tx = rows[0];
    req.log.info(
      { reference: tx.reference, currentStatus: tx.status, webhookStatus: status },
      "PayDunya webhook — transaction trouvée"
    );

    if (status === "completed") {
      /* ── Vérifier si la transaction était déjà "success" (Moov — payout déjà fait) ── */
      const wasAlreadySuccess = tx.status === "success";

      /* ── Marquer le payin comme confirmé ── */
      await db
        .update(transactionsTable)
        .set({ status: "success" })
        .where(eq(transactionsTable.paydunyaToken, token));

      req.log.info(
        { reference: tx.reference, wasAlreadySuccess },
        "PayDunya webhook: payin confirmé"
      );

      /* ── Déclencher le payout UNIQUEMENT si la transaction était encore pending ──
         Si elle était déjà "success", le payout a été fait directement (Moov immédiat)
         → évite le double paiement */
      if (!wasAlreadySuccess && tx.toPhone && tx.toOperator && tx.amount > 0) {
        req.log.info({ reference: tx.reference }, "PayDunya webhook: déclenchement payout vers destinataire");
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
            req.log.info(
              { reference: tx.reference, transactionId: payoutResult.transactionId },
              "PayDunya payout destinataire OK"
            );
          } else {
            req.log.error(
              { reference: tx.reference, message: payoutResult.message },
              "PayDunya payout destinataire REFUSÉ — vérifier manuellement"
            );
          }
        } catch (payoutErr) {
          req.log.error(
            { err: payoutErr, reference: tx.reference },
            "Erreur payout destinataire — payin OK mais retrait échoué"
          );
        }
      } else if (wasAlreadySuccess) {
        req.log.info(
          { reference: tx.reference },
          "PayDunya webhook: payout déjà effectué (Moov immédiat) — pas de double envoi"
        );
      } else {
        req.log.warn(
          { reference: tx.reference, toPhone: tx.toPhone, toOperator: tx.toOperator },
          "PayDunya webhook: infos destinataire manquantes — payout impossible"
        );
      }

    } else if (status === "cancelled" || status === "failed") {
      await db
        .update(transactionsTable)
        .set({ status: "failed" })
        .where(eq(transactionsTable.paydunyaToken, token));

      req.log.warn(
        { reference: tx.reference, status },
        "PayDunya webhook: paiement échoué/annulé"
      );
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

// ─── Webhook PayDunya Disbursement v2 ────────────────────────────────────────
// PayDunya appelle cet endpoint quand le statut d'un déboursement change.
// Payload attendu : { disburse_invoice, status, ... }

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

    // Retrouver la transaction via le disburse_token (stocké dans paydunyaToken)
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
            .set({ status: "failed" })
            .where(eq(transactionsTable.reference, tx.reference));
          req.log.warn({ reference: tx.reference }, "PayDunya disburse webhook: payout échoué ✖");
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
