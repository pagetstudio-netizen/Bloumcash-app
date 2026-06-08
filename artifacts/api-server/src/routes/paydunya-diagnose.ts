/**
 * GET /api/paydunya/diagnose
 *
 * Rapport de diagnostic complet de l'intégration PayDunya SoftPay.
 * Teste chaque étape du flux officiel et rapporte le résultat exact.
 *
 * ⚠️  N'appelle PAS SoftPay (ne déclenche pas de paiement réel).
 *      Teste uniquement checkout-invoice/create pour vérifier les clés + canaux.
 */

import { Router, type IRouter } from "express";
import * as paydunya from "../lib/paydunya";
import { requireAdmin } from "../middleware/admin-auth";

const router: IRouter = Router();

router.get("/paydunya/diagnose", requireAdmin, async (req, res) => {
  const report: {
    timestamp: string;
    steps: Array<{
      step: number;
      name: string;
      status: "ok" | "failed" | "skipped";
      detail: unknown;
    }>;
    conclusion: string;
    failedAt: string | null;
  } = {
    timestamp:   new Date().toISOString(),
    steps:       [],
    conclusion:  "",
    failedAt:    null,
  };

  // ── Étape 1 : Vérification de la configuration ───────────────────────────

  const cfg = paydunya.checkConfiguration();
  report.steps.push({
    step:   1,
    name:   "Vérification des clés API",
    status: cfg.ok ? "ok" : "failed",
    detail: {
      baseUrl:     cfg.baseUrl,
      mode:        cfg.mode,
      keys:        cfg.keys,
      missingKeys: cfg.missingKeys,
    },
  });

  if (!cfg.ok) {
    report.conclusion = `ÉCHEC étape 1 — Clés manquantes : ${cfg.missingKeys.join(", ")}. Configurez ces secrets dans l'environnement.`;
    report.failedAt = "Vérification des clés API";
    res.json(report);
    return;
  }

  // ── Étape 2 : POST /checkout-invoice/create (TMoney Togo) ────────────────

  let invoiceToken: string | null = null;
  try {
    invoiceToken = await paydunya.createInvoice(
      500,
      "Test diagnostic Bloum Cash — checkout-invoice/create",
      ["t-money-togo"],
      req.log
    );
    report.steps.push({
      step:   2,
      name:   "POST /checkout-invoice/create (canal t-money-togo, 500 FCFA)",
      status: "ok",
      detail: {
        tokenObtained: true,
        tokenPrefix:   invoiceToken.slice(0, 8) + "…",
        note:          "Token PayDunya valide reçu. La clé API et le canal TMoney sont correctement configurés.",
      },
    });
  } catch (err) {
    const isPdu = err instanceof paydunya.PaydunyaError;
    report.steps.push({
      step:   2,
      name:   "POST /checkout-invoice/create (canal t-money-togo, 500 FCFA)",
      status: "failed",
      detail: {
        errorCode:           isPdu ? (err as paydunya.PaydunyaError).code : "UNKNOWN",
        errorMessage:        isPdu ? err.message : String(err),
        rawPaydunyaResponse: isPdu ? (err as paydunya.PaydunyaError).rawResponse : null,
        hint:                hintForCode(isPdu ? (err as paydunya.PaydunyaError).code : "UNKNOWN"),
      },
    });
    report.steps.push({
      step:   3,
      name:   "POST /checkout-invoice/create (canal moov-togo, 500 FCFA)",
      status: "skipped",
      detail: "Ignoré car l'étape TMoney a déjà échoué.",
    });
    report.steps.push({
      step:   4,
      name:   "POST /softpay/t-money-togo",
      status: "skipped",
      detail: "Non exécuté (pas de token d'invoice valide).",
    });

    const code = isPdu ? (err as paydunya.PaydunyaError).code : "UNKNOWN";
    report.conclusion = `ÉCHEC étape 2 (TMoney) — ${(err as Error).message}`;
    report.failedAt   = "checkout-invoice/create (t-money-togo)";

    res.json(report);
    return;
  }

  // ── Étape 3 : POST /checkout-invoice/create (Moov Togo) ──────────────────

  try {
    const moovToken = await paydunya.createInvoice(
      500,
      "Test diagnostic Bloum Cash — checkout-invoice/create",
      ["moov-togo"],
      req.log
    );
    report.steps.push({
      step:   3,
      name:   "POST /checkout-invoice/create (canal moov-togo, 500 FCFA)",
      status: "ok",
      detail: {
        tokenObtained: true,
        tokenPrefix:   moovToken.slice(0, 8) + "…",
        note:          "Token PayDunya valide reçu. Le canal Moov est correctement configuré.",
      },
    });
  } catch (err) {
    const isPdu = err instanceof paydunya.PaydunyaError;
    report.steps.push({
      step:   3,
      name:   "POST /checkout-invoice/create (canal moov-togo, 500 FCFA)",
      status: "failed",
      detail: {
        errorCode:           isPdu ? (err as paydunya.PaydunyaError).code : "UNKNOWN",
        errorMessage:        isPdu ? err.message : String(err),
        rawPaydunyaResponse: isPdu ? (err as paydunya.PaydunyaError).rawResponse : null,
        hint:                hintForCode(isPdu ? (err as paydunya.PaydunyaError).code : "UNKNOWN"),
      },
    });
    // Continue quand même — on a le token TMoney pour l'étape 4
  }

  // ── Étape 4 : Résumé SoftPay (non exécuté — ne pas déclencher de vrai paiement) ──

  report.steps.push({
    step:   4,
    name:   "POST /softpay/t-money-togo (non exécuté — diagnostic uniquement)",
    status: "skipped",
    detail: {
      reason:        "SoftPay non appelé pour ne pas déclencher de paiement réel sur un numéro de test.",
      invoiceToken:  invoiceToken.slice(0, 8) + "…",
      payloadPreview: {
        name_t_money:    "Client Test",
        email_t_money:   "test@bloumcash.tg",
        phone_t_money:   "90000000",
        payment_token:   invoiceToken.slice(0, 8) + "…",
      },
      note: "Pour tester SoftPay, lancez un vrai transfert depuis l'application avec un vrai numéro de téléphone.",
    },
  });

  // ── Conclusion ────────────────────────────────────────────────────────────

  const allOk = report.steps.every((s) => s.status === "ok" || s.status === "skipped");
  if (allOk) {
    report.conclusion =
      "✅ Configuration PayDunya OK. Les clés sont valides et les canaux TMoney / Moov Togo sont actifs. " +
      "Lancez un vrai transfert avec un vrai numéro pour valider la notification USSD.";
  }

  res.json(report);
});

function hintForCode(code: string): string {
  switch (code) {
    case "PAYIN_NOT_ENABLED":
      return "Le canal mobile money n'est pas activé sur votre compte PayDunya. Contactez paydunya@paydunya.com pour activer Payin TMoney Togo / Moov Togo.";
    case "AUTH_FAILED":
      return "Vos clés API sont invalides ou révoquées. Vérifiez PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY et PAYDUNYA_TOKEN dans votre dashboard PayDunya.";
    case "HTML_RESPONSE":
      return "PayDunya retourne du HTML. L'URL de base est peut-être incorrecte (sandbox vs. live). Vérifiez PAYDUNYA_BASE_URL ou PAYDUNYA_SANDBOX.";
    case "NOT_CONFIGURED":
      return "Des clés API sont manquantes dans les secrets d'environnement.";
    case "NETWORK_ERROR":
      return "Impossible de joindre l'API PayDunya. Vérifiez la connectivité réseau.";
    default:
      return "Consultez les logs de l'API pour la réponse complète de PayDunya.";
  }
}

export default router;
