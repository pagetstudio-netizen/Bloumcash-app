import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as paydunya from "../lib/paydunya";

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
      /* ── Marquer le payin comme confirmé ── */
      await db
        .update(transactionsTable)
        .set({ status: "success" })
        .where(eq(transactionsTable.paydunyaToken, token));

      req.log.info(
        { reference: tx.reference },
        "PayDunya webhook: payin confirmé — déclenchement payout vers destinataire"
      );

      /* ── Déclencher le payout vers le destinataire ── */
      if (tx.toPhone && tx.toOperator && tx.amount > 0) {
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
      } else {
        req.log.warn(
          { reference: tx.reference, toPhone: tx.toPhone, toOperator: tx.toOperator },
          "PayDunya webhook: infos destinataire manquantes — pas de payout"
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

export default router;
