import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

function calculateFees(fromOperator: string, toOperator: string, amount: number): number {
  // Same network: 1%, different network: 2%
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
    const { fromOperator, fromPhone, toOperator, toPhone, amount } = req.body;
    if (!fromOperator || !fromPhone || !toOperator || !toPhone || !amount) {
      res.status(400).json({ error: "Champs requis manquants" });
      return;
    }

    const amt = parseInt(String(amount));
    const fees = calculateFees(fromOperator, toOperator, amt);
    const total = amt + fees;
    const reference = "TR" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();

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
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
