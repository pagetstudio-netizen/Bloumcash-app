import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qrCodesTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import * as paydunya from "../lib/paydunya";

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
    const email = payerEmail ?? `${(payerPhone ?? "").replace(/\s/g, "")}@bloumcash.tg`;

    if (paydunya.isConfigured() && payerPhone && payerOperator) {
      let invoiceToken: string;
      try {
        const invoice = await paydunya.createInvoice(
          qr.amount,
          `Paiement QR Code - ${qr.businessName} | ${qr.reference}`
        );
        invoiceToken = invoice.token;
      } catch (invoiceErr) {
        req.log.error({ err: invoiceErr }, "PayDunya QR invoice failed");
        res.status(502).json({ error: "Impossible de contacter PayDunya. Veuillez réessayer." });
        return;
      }

      let chargeResult: paydunya.ChargeResult;
      try {
        chargeResult = await paydunya.chargeWallet(
          payerOperator as "tmoney" | "moov",
          name,
          email,
          payerPhone,
          invoiceToken
        );
      } catch (chargeErr) {
        req.log.error({ err: chargeErr }, "PayDunya QR charge failed");
        res.status(502).json({ error: "Erreur lors du débit. Vérifiez votre solde." });
        return;
      }

      if (!chargeResult.success) {
        res.status(402).json({
          error: chargeResult.message ?? "Paiement refusé par l'opérateur",
          code: "PAYMENT_REFUSED",
        });
        return;
      }

      const isPending = payerOperator === "tmoney";

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
      return;
    }

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
      message: "Paiement effectué avec succès",
      reference: txRef,
      transactionId: String(tx.id),
      isPending: false,
    });
  } catch (err) {
    req.log.error({ err }, "Pay QR error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
