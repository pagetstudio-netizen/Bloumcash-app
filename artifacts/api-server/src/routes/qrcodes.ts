import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qrCodesTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";
import { OPERATOR_MAP, TOGO_OPERATOR_MAP } from "../lib/paydunya-softpay-map";

const router: IRouter = Router();

function generateRef(): string {
  return "QR" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();
}

router.post("/qr/generate", async (req, res) => {
  try {
    const { businessName, phone, operator, amount, description } = req.body;
    if (!businessName || !phone || !operator || !amount) {
      res.status(400).json({ error: "Champs requis manquants" });
      return;
    }

    const reference = generateRef();
    const qrData = JSON.stringify({ reference, businessName, phone, operator, amount });

    const [qr] = await db
      .insert(qrCodesTable)
      .values({
        reference,
        businessName,
        phone,
        operator,
        amount: parseInt(String(amount)),
        qrData,
        description: description ?? null,
        status: "active",
      })
      .returning();

    res.status(201).json({
      reference: qr.reference,
      businessName: qr.businessName,
      phone: qr.phone,
      operator: qr.operator,
      amount: qr.amount,
      qrData: qr.qrData,
      description: qr.description ?? null,
      createdAt: qr.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Generate QR error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/qr/:reference", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(qrCodesTable)
      .where(eq(qrCodesTable.reference, req.params.reference))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "QR Code introuvable" });
      return;
    }

    const qr = rows[0];
    res.json({
      reference: qr.reference,
      businessName: qr.businessName,
      phone: qr.phone,
      operator: qr.operator,
      amount: qr.amount,
      qrData: qr.qrData,
      description: qr.description ?? null,
      createdAt: qr.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get QR error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/qr/:reference/pay", async (req, res) => {
  try {
    const { payerPhone, payerOperator, payerName, payerEmail } = req.body;

    if (!payerPhone || !payerOperator) {
      res.status(400).json({ error: "Numéro et opérateur du payeur requis" });
      return;
    }

    const rows = await db
      .select()
      .from(qrCodesTable)
      .where(eq(qrCodesTable.reference, req.params.reference))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "QR Code introuvable" });
      return;
    }

    const qr = rows[0];
    const txRef = "BC" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();
    const name = payerName ?? "Client Bloum Cash";
    const email = payerEmail ?? `${payerPhone.replace(/\D/g, "")}@bloumcash.tg`;

    /* ── Mode démo — PayDunya non configuré ── */
    if (!paydunya.isConfigured()) {
      req.log.warn("PayDunya not configured — QR payment in demo mode");
      const [tx] = await db
        .insert(transactionsTable)
        .values({
          reference: txRef,
          type: "incoming",
          title: `Paiement QR - ${qr.businessName}`,
          amount: qr.amount,
          operator: qr.operator,
          fromPhone: payerPhone ?? null,
          toPhone: qr.phone,
          description: `Paiement via QR Code ${qr.reference}`,
          status: "success",
        })
        .returning();

      res.json({
        success: true,
        message: "Paiement effectué avec succès (mode démo)",
        reference: txRef,
        transactionId: String(tx.id),
        isPending: false,
      });
      return;
    }

    /* ── Étape 1 (doc officielle) : Créer une checkout invoice → obtenir le payment_token ── */
    const operatorKey = TOGO_OPERATOR_MAP[payerOperator as "tmoney" | "moov"];
    const operatorConfig = OPERATOR_MAP[operatorKey];
    const channels = operatorConfig?.channels ?? [operatorKey];

    let paymentToken: string;
    try {
      paymentToken = await paydunya.createInvoice(
        qr.amount,
        `Paiement QR Bloum Cash — ${qr.businessName} — ref ${txRef}`,
        channels,
        req.log
      );
    } catch (err) {
      const isPduErr = err instanceof paydunya.PaydunyaError;
      const msg = isPduErr ? err.message : "Erreur lors de la création de l'invoice PayDunya.";
      const code = isPduErr ? err.code : "INVOICE_ERROR";
      req.log.error({ err, code }, "QR invoice creation failed");
      res.status(502).json({ error: msg, code });
      return;
    }

    /* ── Étape 2 (doc officielle) : Débiter le payeur via SoftPay ── */
    let chargeResult: paydunya.ChargeResult;
    try {
      chargeResult = await paydunya.chargeTogoWallet(
        payerOperator as "tmoney" | "moov",
        { name, email, phone: payerPhone, paymentToken },
        req.log
      );
    } catch (err) {
      const isPduErr = err instanceof paydunya.PaydunyaError;
      const msg = isPduErr ? err.message : "Erreur lors du débit mobile money.";
      const code = isPduErr ? err.code : "CHARGE_ERROR";
      req.log.error({ err, code }, "QR charge failed");
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

    const isPending = chargeResult.isPending ?? false;

    const [tx] = await db
      .insert(transactionsTable)
      .values({
        reference: txRef,
        type: "incoming",
        title: `Paiement QR - ${qr.businessName}`,
        amount: qr.amount,
        operator: qr.operator,
        fromPhone: payerPhone ?? null,
        toPhone: qr.phone,
        description: `Paiement via QR Code ${qr.reference}`,
        status: isPending ? "pending" : "success",
      })
      .returning();

    res.json({
      success: true,
      message: chargeResult.message,
      reference: txRef,
      transactionId: String(tx.id),
      isPending,
    });
  } catch (err) {
    req.log.error({ err }, "Pay QR error");
    res.status(500).json({ error: "Erreur serveur interne" });
  }
});

export default router;
