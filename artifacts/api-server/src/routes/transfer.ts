import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable, blacklistTable, operatorsConfigTable, adminSettingsTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";
import * as gomboplus from "../lib/gomboplus";
import { extractUser } from "../middleware/user-auth";
import { OPERATOR_MAP, TOGO_OPERATOR_MAP } from "../lib/paydunya-softpay-map";
import { sendPushNotification } from "../lib/onesignal";
import { formatAmount } from "../lib/format";

const router: IRouter = Router();

/** Mapping interne → nom en DB pour la table operatorsConfigTable */
const OPERATOR_DB_NAME: Record<string, string> = {
  tmoney: "TMoney",
  moov:   "Moov Money",
};

/** Récupère la gateway configurée pour un opérateur Togo depuis la DB */
async function getOperatorGateway(operator: string): Promise<"PayDunya" | "GomboPlus"> {
  const name = OPERATOR_DB_NAME[operator.toLowerCase()];
  if (!name) return "PayDunya";
  try {
    const rows = await db
      .select({ gateway: operatorsConfigTable.gateway })
      .from(operatorsConfigTable)
      .where(
        and(
          ilike(operatorsConfigTable.name, name),
          eq(operatorsConfigTable.countryCode, "TG")
        )
      )
      .limit(1);
    const gw = rows[0]?.gateway ?? "PayDunya";
    return gw === "GomboPlus" ? "GomboPlus" : "PayDunya";
  } catch {
    return "PayDunya";
  }
}

async function getFeePercent(): Promise<number> {
  try {
    const rows = await db.select({ value: adminSettingsTable.value })
      .from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, "fee_deposit_percent"))
      .limit(1);
    if (rows.length && rows[0].value) {
      const v = parseFloat(rows[0].value);
      if (!isNaN(v) && v >= 0) return v / 100;
    }
  } catch { /* fallback */ }
  return 0.035;
}

async function calculateFees(_fromOperator: string, _toOperator: string, amount: number): Promise<number> {
  const rate = await getFeePercent();
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
    const rate = await getFeePercent();
    const fees = Math.ceil(amt * rate);
    res.json({ amount: amt, fees, total: amt + fees, feePercent: +(rate * 100).toFixed(2), estimatedTime: "Instantané" });
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

    const fees = await calculateFees(fromOperator, toOperator, amt);
    const total = amt + fees;
    const reference =
      "TR" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();

    const name  = payerName  ?? "Client Bloum Cash";
    const email = payerEmail ?? `${fromPhone.replace(/\D/g, "")}@bloumcash.tg`;

    const currentUser = extractUser(req);
    const userId = currentUser?.id ?? null;

    /* ── Vérification statut utilisateur + blacklist ── */
    if (userId) {
      const [userRow] = await db.select({ status: usersTable.status }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (userRow?.status === "banned") {
        res.status(403).json({ error: "Votre compte est banni. Contactez le support.", code: "ACCOUNT_BANNED" });
        return;
      }
      if (userRow?.status === "suspended") {
        res.status(403).json({ error: "Votre compte est temporairement suspendu.", code: "ACCOUNT_SUSPENDED" });
        return;
      }
    }
    const blRows = await db.select().from(blacklistTable).where(eq(blacklistTable.phone, fromPhone)).limit(1);
    if (blRows.length) {
      res.status(403).json({ error: "Escroquerie détectée. Accès refusé. Bye.", code: "PHONE_BLACKLISTED" });
      return;
    }

    /* ── Détecter la gateway configurée pour l'opérateur de l'envoyeur ── */
    const gateway = await getOperatorGateway(fromOperator);

    req.log.info({ fromOperator, gateway, reference }, "Transfer — gateway sélectionnée");

    /* ══════════════════════════════════════════════════════════════════════════
       FLUX GomboPlus
       1. cashin()       → USSD push au payeur
       2. GomboPlus appelle /api/gomboplus/webhook (transaction_type: "cashin")
       3. Le webhook déclenche cashout() vers le destinataire
       ══════════════════════════════════════════════════════════════════════════ */
    if (gateway === "GomboPlus") {
      if (!gomboplus.isConfigured()) {
        req.log.warn("GomboPlus non configuré — mode démo");
        await db.insert(transactionsTable).values({
          reference, type: "outgoing", title: `Transfert vers ${toPhone}`,
          amount: amt, operator: fromOperator, fromPhone, toPhone, toOperator,
          fees, description: `Transfert ${fromOperator} → ${toOperator} (GomboPlus démo)`,
          status: "success", payoutSent: true, userId,
        });
        res.status(201).json({
          success: true,
          message: "Transfert effectué (mode démo — GomboPlus non configuré)",
          reference, fees, total, isPending: false, gateway: "GomboPlus",
        });
        return;
      }

      let cashinResult: gomboplus.GomboPlusResult;
      try {
        cashinResult = await gomboplus.cashin(
          { phone: fromPhone, amount: total, operator: fromOperator as "tmoney" | "moov", reference },
          req.log
        );
      } catch (err) {
        const isGpErr = err instanceof gomboplus.GomboPlusError;
        const msg  = isGpErr ? err.message : "Erreur lors de la demande de paiement GomboPlus.";
        const code = isGpErr ? err.code    : "GP_CASHIN_ERROR";
        req.log.error({ err, code }, "GomboPlus cashin — échec");
        res.status(502).json({ error: msg, code });
        return;
      }

      if (!cashinResult.success) {
        res.status(402).json({ error: cashinResult.message, code: "GP_PAYMENT_REFUSED" });
        return;
      }

      /* Stocker avec préfixe "gp:" pour distinguer GomboPlus de PayDunya */
      const storedToken = `gp:${cashinResult.gpReference}`;

      try {
        await db.insert(transactionsTable).values({
          reference, type: "outgoing", title: `Transfert vers ${toPhone}`,
          amount: amt, operator: fromOperator, fromPhone, toPhone, toOperator,
          fees, description: `Transfert ${fromOperator} → ${toOperator} via GomboPlus`,
          status: "pending", payoutSent: false, userId,
          paydunyaToken: storedToken,
        });
      } catch (dbErr) {
        req.log.error({
          err: dbErr,
          CRITICAL: "GOMBOPLUS_CASHIN_SENT_BUT_DB_INSERT_FAILED",
          reference, gpReference: cashinResult.gpReference,
          fromPhone, toPhone, fromOperator, toOperator, amount: amt, fees,
        }, "⚠️ CRITIQUE — CASHIN GomboPlus envoyé mais échec insertion DB. Récupération manuelle requise.");
      }

      req.log.info(
        { reference, fromOperator, toOperator, fromPhone, toPhone, amount: amt, gpRef: cashinResult.gpReference },
        "GomboPlus CASHIN initié — en attente validation payeur"
      );

      res.status(201).json({
        success: true,
        message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone mobile.",
        reference, fees, total, isPending: true, gateway: "GomboPlus",
      });
      return;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       FLUX PayDunya (par défaut)
       1. createInvoice  → obtenir le payment_token
       2. chargeTogoWallet → envoyer le push USSD au payeur
       3. Sauvegarder en status "pending"
       4. PayDunya appelle /api/paydunya/webhook (status: "completed")
       5. Le webhook déclenche le payout vers le destinataire
       ══════════════════════════════════════════════════════════════════════════ */

    /* ── Mode démo — PayDunya non configuré ── */
    if (!paydunya.isConfigured()) {
      req.log.warn("PayDunya not configured — saving transaction in demo mode");
      await db.insert(transactionsTable).values({
        reference, type: "outgoing", title: `Transfert vers ${toPhone}`,
        amount: amt, operator: fromOperator, fromPhone, toPhone, toOperator,
        fees, description: `Transfert ${fromOperator} → ${toOperator}`,
        status: "success", payoutSent: true, userId,
      });
      res.status(201).json({
        success: true,
        message: "Transfert effectué (mode démo — PayDunya non configuré)",
        reference, fees, total, isPending: false, paydunhaConfigured: false, gateway: "PayDunya",
      });
      return;
    }

    /* ── Étape 1 : Créer une checkout invoice → obtenir le payment_token ── */
    const operatorKey    = TOGO_OPERATOR_MAP[fromOperator as "tmoney" | "moov"];
    const operatorConfig = OPERATOR_MAP[operatorKey];
    const channels       = operatorConfig?.channels ?? [operatorKey];

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
      const msg  = isPduErr ? err.message : "Erreur lors de la création de l'invoice PayDunya.";
      const code = isPduErr ? err.code    : "INVOICE_ERROR";
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
      const msg  = isPduErr ? err.message : "Erreur lors de la demande de paiement mobile money.";
      const code = isPduErr ? err.code    : "CHARGE_ERROR";
      req.log.error({ err, code }, "Charge failed");
      res.status(502).json({ error: msg, code });
      return;
    }

    if (!chargeResult.success) {
      res.status(402).json({ error: chargeResult.message, code: "PAYMENT_REFUSED" });
      return;
    }

    /* ── Étape 3 : Sauvegarder en PENDING ── */
    try {
      await db.insert(transactionsTable).values({
        reference, type: "outgoing", title: `Transfert vers ${toPhone}`,
        amount: amt, operator: fromOperator, fromPhone, toPhone, toOperator,
        fees, description: `Transfert ${fromOperator} → ${toOperator}`,
        status: "pending", payoutSent: false, userId,
        paydunyaToken: paymentToken,
      });
    } catch (dbErr) {
      req.log.error({
        err: dbErr,
        CRITICAL: "PAYDUNYA_CHARGE_SENT_BUT_DB_INSERT_FAILED",
        reference, paydunyaToken: paymentToken,
        fromPhone, toPhone, fromOperator, toOperator, amount: amt, fees,
      }, "⚠️ CRITIQUE — Push PayDunya envoyé mais échec insertion DB. Récupération manuelle requise.");
    }

    req.log.info(
      { reference, fromOperator, toOperator, fromPhone, toPhone, amount: amt },
      "Demande de paiement PayDunya envoyée — en attente de validation"
    );

    res.status(201).json({
      success: true,
      message: "Demande de paiement envoyée. Veuillez valider sur votre téléphone mobile.",
      reference, fees, total, isPending: true, paydunhaConfigured: true, gateway: "PayDunya",
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

/**
 * GET /api/transfer/:reference/status
 *
 * Polling endpoint — vérifie le statut d'une transaction via la gateway correspondante.
 * Détecte automatiquement PayDunya vs GomboPlus à partir du préfixe du token stocké.
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

    if (tx.status === "pending" && tx.paydunyaToken) {
      const isGomboPlus = tx.paydunyaToken.startsWith("gp:");

      /* ── Polling GomboPlus ── */
      if (isGomboPlus && gomboplus.isConfigured()) {
        try {
          const gpReference = tx.paydunyaToken.slice(3);
          const { status: gpStatus } = await gomboplus.checkStatus(gpReference, req.log);

          if (gpStatus === "completed") {
            const updated = await db
              .update(transactionsTable)
              .set({ payoutSent: true })
              .where(and(eq(transactionsTable.reference, tx.reference), eq(transactionsTable.payoutSent, false)))
              .returning({ id: transactionsTable.id });

            if (updated.length > 0) {
              req.log.info({ reference: tx.reference }, "Polling GomboPlus: CASHIN confirmé — déclenchement CASHOUT");
              try {
                const payoutResult = await gomboplus.cashout(
                  { phone: tx.toPhone!, amount: tx.amount, operator: tx.toOperator as "tmoney" | "moov", reference: tx.reference },
                  req.log
                );
                if (payoutResult.success) {
                  await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.reference, tx.reference));
                  tx.status = "success";
                  if (tx.userId) {
                    const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
                    if (userRows[0]?.email) {
                      sendPushNotification({ externalUserId: userRows[0].email, title: "Transfert confirmé ✅", message: `Votre transfert de ${formatAmount(tx.amount)} vers ${tx.toPhone ?? "destinataire"} a été confirmé.`, data: { type: "transfer_confirmed", reference: tx.reference } }, req.log);
                    }
                  }
                } else {
                  await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
                  tx.status = "payout_failed";
                }
              } catch {
                await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
                tx.status = "payout_failed";
              }
            } else {
              const fresh = await db.select({ status: transactionsTable.status }).from(transactionsTable).where(eq(transactionsTable.reference, tx.reference)).limit(1);
              if (fresh.length) tx.status = fresh[0].status;
            }
          } else if (gpStatus === "failed" || gpStatus === "cancelled") {
            await db.update(transactionsTable).set({ status: "failed" }).where(eq(transactionsTable.reference, tx.reference));
            tx.status = "failed";
            if (tx.userId) {
              const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
              if (userRows[0]?.email) {
                sendPushNotification({ externalUserId: userRows[0].email, title: "Transfert échoué ❌", message: `Votre transfert de ${formatAmount(tx.amount)} n'a pas pu être effectué.`, data: { type: "transfer_failed", reference: tx.reference } }, req.log);
              }
            }
          }
        } catch {
          /* ignore — on retourne le statut actuel en DB */
        }

      /* ── Polling PayDunya ── */
      } else if (!isGomboPlus && paydunya.isConfigured()) {
        try {
          const confirmed = await paydunya.confirmInvoice(tx.paydunyaToken, req.log);

          if (confirmed.completed) {
            const updated = await db
              .update(transactionsTable)
              .set({ payoutSent: true })
              .where(and(eq(transactionsTable.reference, tx.reference), eq(transactionsTable.payoutSent, false)))
              .returning({ id: transactionsTable.id });

            if (updated.length > 0) {
              req.log.info({ reference: tx.reference }, "Polling: payin PayDunya confirmé — déclenchement payout");
              try {
                const payoutResult = await paydunya.disburseTogoWallet(
                  tx.toOperator as "tmoney" | "moov",
                  { name: "Bénéficiaire Bloum Cash", phone: tx.toPhone!, amount: tx.amount, reference: tx.reference },
                  req.log
                );
                if (payoutResult.success) {
                  await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.reference, tx.reference));
                  tx.status = "success";
                  if (tx.userId) {
                    const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
                    if (userRows[0]?.email) {
                      sendPushNotification({ externalUserId: userRows[0].email, title: "Transfert confirmé ✅", message: `Votre transfert de ${formatAmount(tx.amount)} vers ${tx.toPhone ?? "destinataire"} a été confirmé.`, data: { type: "transfer_confirmed", reference: tx.reference } }, req.log);
                    }
                  }
                } else {
                  await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
                  tx.status = "payout_failed";
                }
              } catch (payoutErr) {
                await db.update(transactionsTable).set({ status: "payout_failed" }).where(eq(transactionsTable.reference, tx.reference));
                tx.status = "payout_failed";
                req.log.error({ err: payoutErr, reference: tx.reference }, "Polling: erreur payout PayDunya — INTERVENTION MANUELLE REQUISE");
              }
            } else {
              const fresh = await db.select({ status: transactionsTable.status }).from(transactionsTable).where(eq(transactionsTable.reference, tx.reference)).limit(1);
              if (fresh.length) tx.status = fresh[0].status;
            }
          } else if (confirmed.status === "failed" || confirmed.status === "cancelled") {
            await db.update(transactionsTable).set({ status: "failed" }).where(eq(transactionsTable.reference, tx.reference));
            tx.status = "failed";
            if (tx.userId) {
              const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
              if (userRows[0]?.email) {
                sendPushNotification({ externalUserId: userRows[0].email, title: "Transfert échoué ❌", message: `Votre transfert de ${formatAmount(tx.amount)} n'a pas pu être effectué.`, data: { type: "transfer_failed", reference: tx.reference } }, req.log);
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    res.json({ reference: tx.reference, status: tx.status, amount: tx.amount, fees: tx.fees });
  } catch (err) {
    req.log.error({ err }, "Transfer status error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
