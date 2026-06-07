/**
 * PayDunya SoftPay — Intégration officielle
 * Flux : POST /checkout-invoice/create → token → POST /softpay/{operator}
 * Doc  : https://developers.paydunya.com/doc/FR/softpay
 *
 * Règles strictes :
 *  - Jamais de UUID local comme payment_token
 *  - Le token provient TOUJOURS de checkout-invoice/create
 *  - Tous les appels sont intégralement loggés (requête + code HTTP + corps complet)
 *  - Les messages d'erreur PayDunya sont retransmis tels quels, sans paraphrase
 */

import {
  OPERATOR_MAP,
  TOGO_OPERATOR_MAP,
  type OperatorKey,
  type OperatorConfig,
} from "./paydunya-softpay-map";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * URL de base de l'API PayDunya.
 * Priorité : PAYDUNYA_BASE_URL → PAYDUNYA_SANDBOX=true → production live
 */
function getBaseUrl(): string {
  if (process.env.PAYDUNYA_BASE_URL) {
    return process.env.PAYDUNYA_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.PAYDUNYA_SANDBOX === "true") {
    return "https://app.paydunya.com/sandbox-api/v1";
  }
  return "https://app.paydunya.com/api/v1";
}

function getHeaders(): Record<string, string> {
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY":  process.env.PAYDUNYA_MASTER_KEY  ?? "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
    "PAYDUNYA-PUBLIC-KEY":  process.env.PAYDUNYA_PUBLIC_KEY  ?? "",
    "PAYDUNYA-TOKEN":       process.env.PAYDUNYA_TOKEN       ?? "",
  };
}

// ─── Types publics ────────────────────────────────────────────────────────────

export interface ConfigStatus {
  ok: boolean;
  baseUrl: string;
  mode: "live" | "sandbox" | "custom";
  keys: {
    PAYDUNYA_MASTER_KEY:  "set" | "missing";
    PAYDUNYA_PRIVATE_KEY: "set" | "missing";
    PAYDUNYA_PUBLIC_KEY:  "set" | "missing";
    PAYDUNYA_TOKEN:       "set" | "missing";
  };
  missingKeys: string[];
}

export interface ChargeResult {
  success: boolean;
  message: string;
  fees?: number;
  currency?: string;
  isPending: boolean;
  invoiceToken: string;
  rawPaydunyaResponse: Record<string, unknown>;
}

export interface DisburseResult {
  success: boolean;
  message: string;
  transactionId?: string;
  rawPaydunyaResponse: Record<string, unknown>;
}

/** Erreur PayDunya typée — code machine + message utilisateur (jamais générique) */
export class PaydunyaError extends Error {
  constructor(
    message: string,
    public readonly code: PaydunyaErrorCode,
    public readonly retryable: boolean = false,
    public readonly rawResponse?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PaydunyaError";
  }
}

export type PaydunyaErrorCode =
  | "NOT_CONFIGURED"          // clés API absentes
  | "AUTH_FAILED"             // 401 — clés invalides
  | "PAYIN_NOT_ENABLED"       // canal mobile money non activé sur le compte
  | "INVOICE_FAILED"          // checkout-invoice/create a échoué
  | "INVALID_PHONE"           // numéro rejeté par l'opérateur
  | "PROVIDER_ERROR"          // rejet opérateur (autre raison)
  | "SERVICE_UNAVAILABLE"     // 502/503/504
  | "ENDPOINT_NOT_FOUND"      // 404 — endpoint inexistant
  | "HTML_RESPONSE"           // HTML reçu au lieu de JSON
  | "INVALID_JSON"            // corps non-JSON
  | "NETWORK_ERROR"           // erreur réseau
  | "INVALID_AMOUNT"
  | "EMPTY_TOKEN"
  | "MISSING_FIELD"
  | "UNSUPPORTED_OPERATOR";

type Logger = {
  info:  (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
  warn:  (obj: object, msg: string) => void;
};

// ─── Helpers internes ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Analyse le message PayDunya pour distinguer les types d'erreur */
function classifyProviderError(
  msg: string,
  status: number,
  raw: Record<string, unknown>
): PaydunyaErrorCode {
  const lower = msg.toLowerCase();

  if (status === 401) return "AUTH_FAILED";
  if (status === 404) return "ENDPOINT_NOT_FOUND";
  if (status === 503 || status === 502 || status === 504) return "SERVICE_UNAVAILABLE";

  if (
    lower.includes("payin is not enabled") ||
    lower.includes("payin n'est pas activé") ||
    lower.includes("not enabled") ||
    lower.includes("1001")
  ) return "PAYIN_NOT_ENABLED";

  if (
    lower.includes("numéro") && (lower.includes("invalide") || lower.includes("inexistant")) ||
    lower.includes("phone") && (lower.includes("invalid") || lower.includes("not found")) ||
    lower.includes("subscriber not found") ||
    lower.includes("abonné introuvable")
  ) return "INVALID_PHONE";

  const rc = String(raw.response_code ?? "");
  if (rc === "1001") return "PAYIN_NOT_ENABLED";

  return "PROVIDER_ERROR";
}

// ─── Fetch principal avec logs intégraux ─────────────────────────────────────

async function paydunyaFetch(
  url: string,
  options: RequestInit,
  logger: Logger
): Promise<{ data: Record<string, unknown>; status: number; rawText: string }> {
  const startMs = Date.now();

  // Log de la requête (clés masquées)
  const safeHeaders = { ...(options.headers as Record<string, string>) };
  for (const k of ["PAYDUNYA-MASTER-KEY", "PAYDUNYA-PRIVATE-KEY", "PAYDUNYA-PUBLIC-KEY", "PAYDUNYA-TOKEN"]) {
    safeHeaders[k] = safeHeaders[k] ? "***set***" : "***MISSING***";
  }
  logger.info(
    { url, method: options.method, headers: safeHeaders, body: options.body },
    "PayDunya ▶ requête"
  );

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr) {
    logger.error({ url, elapsed: Date.now() - startMs, err: netErr }, "PayDunya ✖ erreur réseau");
    throw new PaydunyaError(
      "Erreur réseau lors de la connexion à PayDunya.",
      "NETWORK_ERROR",
      true
    );
  }

  const elapsed = Date.now() - startMs;
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  // Log intégral de la réponse (pas de troncature)
  logger.info(
    { url, httpStatus: response.status, contentType, elapsed, body: rawText },
    "PayDunya ◀ réponse"
  );

  // Détection HTML (endpoint incorrect ou erreur auth avant parsing JSON)
  if (contentType.includes("text/html") || rawText.trimStart().startsWith("<!")) {
    logger.error(
      { url, httpStatus: response.status, contentType, body: rawText.slice(0, 500) },
      "PayDunya ✖ HTML reçu (endpoint invalide ou clés incorrectes)"
    );
    throw new PaydunyaError(
      `PayDunya a retourné du HTML (HTTP ${response.status}). Vérifiez l'URL de base et vos clés API.`,
      "HTML_RESPONSE",
      false
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    logger.error({ url, rawText }, "PayDunya ✖ corps non-JSON");
    throw new PaydunyaError(
      `PayDunya a retourné un corps non-JSON (HTTP ${response.status}).`,
      "INVALID_JSON",
      false
    );
  }

  return { data: parsed, status: response.status, rawText };
}

/** Fetch avec 2 retries automatiques sur erreurs réseau et 5xx */
async function paydunyaFetchWithRetry(
  url: string,
  options: RequestInit,
  logger: Logger
): Promise<{ data: Record<string, unknown>; status: number; rawText: string }> {
  const MAX = 2;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX; attempt++) {
    try {
      const result = await paydunyaFetch(url, options, logger);

      if ((result.status === 502 || result.status === 503 || result.status === 504) && attempt < MAX) {
        const delay = 1000 * (attempt + 1);
        logger.warn({ url, httpStatus: result.status, attempt, nextRetryMs: delay }, "PayDunya ⚠ retryable — retry…");
        await sleep(delay);
        continue;
      }

      return result;
    } catch (err) {
      if (err instanceof PaydunyaError && err.retryable && attempt < MAX) {
        await sleep(1000 * (attempt + 1));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

// ─── Vérification de configuration ───────────────────────────────────────────

export function checkConfiguration(): ConfigStatus {
  const keys = {
    PAYDUNYA_MASTER_KEY:  process.env.PAYDUNYA_MASTER_KEY  ? "set" : "missing",
    PAYDUNYA_PRIVATE_KEY: process.env.PAYDUNYA_PRIVATE_KEY ? "set" : "missing",
    PAYDUNYA_PUBLIC_KEY:  process.env.PAYDUNYA_PUBLIC_KEY  ? "set" : "missing",
    PAYDUNYA_TOKEN:       process.env.PAYDUNYA_TOKEN        ? "set" : "missing",
  } as ConfigStatus["keys"];

  const missingKeys = Object.entries(keys)
    .filter(([, v]) => v === "missing")
    .map(([k]) => k);

  const baseUrl = getBaseUrl();
  const mode: ConfigStatus["mode"] = process.env.PAYDUNYA_BASE_URL
    ? "custom"
    : process.env.PAYDUNYA_SANDBOX === "true"
    ? "sandbox"
    : "live";

  return { ok: missingKeys.length === 0, baseUrl, mode, keys, missingKeys };
}

export function isConfigured(): boolean {
  return checkConfiguration().ok;
}

export function isSandbox(): boolean {
  return process.env.PAYDUNYA_SANDBOX === "true";
}

// ─── Étape 1 : POST /checkout-invoice/create ─────────────────────────────────
// Retourne le token PayDunya — jamais de UUID local

export async function createInvoice(
  amount: number,
  description: string,
  channels: string[],
  logger: Logger
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new PaydunyaError("Le montant doit être supérieur à 0.", "INVALID_AMOUNT");
  }

  const cfg = checkConfiguration();
  if (!cfg.ok) {
    throw new PaydunyaError(
      `Clés PayDunya manquantes : ${cfg.missingKeys.join(", ")}. Configurez ces secrets.`,
      "NOT_CONFIGURED"
    );
  }

  const url = `${getBaseUrl()}/checkout-invoice/create`;

  const invoiceBody = {
    invoice: {
      total_amount: amount,
      description,
      channels,
    },
    store: {
      name:           process.env.PAYDUNYA_STORE_NAME  || "Bloum Cash",
      tagline:        "Transferts TMoney & Moov Money au Togo",
      postal_address: "Lomé, Togo",
      phone:          process.env.PAYDUNYA_STORE_PHONE || "",
      website_url:    "",
    },
    actions: {
      cancel_url:   process.env.PAYDUNYA_CALLBACK_URL || "",
      return_url:   process.env.PAYDUNYA_CALLBACK_URL || "",
      callback_url: process.env.PAYDUNYA_CALLBACK_URL || "",
    },
  };

  const { data, status } = await paydunyaFetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(invoiceBody) },
    logger
  );

  // Vérification de succès : response_code === "00" + token présent
  if (data.response_code !== "00" || !data.token) {
    const rawMsg = String(data.response_text ?? data.message ?? JSON.stringify(data));
    const code = classifyProviderError(rawMsg, status, data);

    logger.error(
      { url, httpStatus: status, responseCode: data.response_code, paydunya_raw: data },
      `PayDunya ✖ checkout-invoice/create échoué — ${rawMsg}`
    );

    // Message exact PayDunya retransmis, jamais paraphrasé
    throw new PaydunyaError(
      `[checkout-invoice/create] PayDunya response_code=${data.response_code} : "${rawMsg}"`,
      code,
      false,
      data
    );
  }

  const token = String(data.token);
  logger.info(
    { mode: cfg.mode, baseUrl: cfg.baseUrl, tokenPrefix: token.slice(0, 8) + "…", channels },
    "PayDunya ✔ invoice créée — token obtenu"
  );
  return token;
}

// ─── Étape 2 : POST /softpay/{operator} ──────────────────────────────────────
// payment_token = token de checkout-invoice (jamais généré localement)

export async function chargeOperator(
  operatorKey: OperatorKey,
  params: {
    name: string;
    email: string;
    phone: string;
    paymentToken: string;
    address?: string;
  },
  logger: Logger
): Promise<ChargeResult> {
  const config: OperatorConfig | undefined = OPERATOR_MAP[operatorKey];
  if (!config) {
    throw new PaydunyaError(`Opérateur non supporté : ${operatorKey}`, "UNSUPPORTED_OPERATOR");
  }

  if (!params.paymentToken?.trim()) {
    throw new PaydunyaError(
      "payment_token absent. Il doit provenir de checkout-invoice/create — jamais généré localement.",
      "EMPTY_TOKEN"
    );
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(`Numéro de téléphone invalide : "${params.phone}"`, "INVALID_PHONE");
  }

  const payload = config.payloadBuilder({
    name:         params.name  || "Client Bloum Cash",
    email:        params.email || `${cleanPhone}@bloumcash.tg`,
    phone:        cleanPhone,
    paymentToken: params.paymentToken,
    address:      params.address,
  });

  // Vérification des champs requis avant l'appel réseau
  for (const field of config.requiredFields) {
    const val = payload[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      throw new PaydunyaError(
        `Champ requis manquant dans le payload SoftPay pour ${config.label} : "${field}"`,
        "MISSING_FIELD"
      );
    }
  }

  const url = `${getBaseUrl()}/softpay/${config.endpoint}`;

  logger.info(
    {
      operator: operatorKey,
      label: config.label,
      endpoint: url,
      mode: checkConfiguration().mode,
      payloadKeys: Object.keys(payload),
      paymentTokenPrefix: params.paymentToken.slice(0, 8) + "…",
    },
    "PayDunya ▶ SoftPay charge"
  );

  const { data, status } = await paydunyaFetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) },
    logger
  );

  // Classification précise des erreurs HTTP
  if (status === 401) {
    throw new PaydunyaError(
      `[/softpay/${config.endpoint}] HTTP 401 — Authentification refusée. Vérifiez PAYDUNYA-MASTER-KEY, PAYDUNYA-PRIVATE-KEY et PAYDUNYA-TOKEN.`,
      "AUTH_FAILED",
      false,
      data
    );
  }

  if (status === 404) {
    throw new PaydunyaError(
      `[/softpay/${config.endpoint}] HTTP 404 — Endpoint introuvable. L'opérateur "${operatorKey}" est peut-être indisponible sur votre compte.`,
      "ENDPOINT_NOT_FOUND",
      false,
      data
    );
  }

  if (status === 503 || status === 502 || status === 504) {
    throw new PaydunyaError(
      `[/softpay/${config.endpoint}] HTTP ${status} — Service PayDunya temporairement indisponible.`,
      "SERVICE_UNAVAILABLE",
      true,
      data
    );
  }

  const success = data.success === true;

  // Message exact de PayDunya — jamais de message générique
  const rawMsg = String(data.message ?? data.response_text ?? data.error ?? "");
  const displayMsg = rawMsg || (success ? "Paiement mobile money initié avec succès." : "Paiement refusé (aucun message PayDunya).");

  if (!success) {
    const errorCode = classifyProviderError(rawMsg, status, data);
    logger.warn(
      { operator: operatorKey, httpStatus: status, errorCode, paydunya_raw: data },
      `PayDunya ✖ SoftPay refusé — ${rawMsg}`
    );

    return {
      success: false,
      message: `[/softpay/${config.endpoint}] ${displayMsg}`,
      isPending: false,
      invoiceToken: params.paymentToken,
      rawPaydunyaResponse: data,
    };
  }

  logger.info(
    { operator: operatorKey, isPending: config.isPending, fees: data.fees, currency: data.currency },
    "PayDunya ✔ SoftPay charge acceptée"
  );

  return {
    success: true,
    message: displayMsg,
    fees:     typeof data.fees     === "number" ? data.fees     : undefined,
    currency: typeof data.currency === "string" ? data.currency : "XOF",
    isPending: config.isPending,
    invoiceToken: params.paymentToken,
    rawPaydunyaResponse: data,
  };
}

// ─── Wrapper Togo ─────────────────────────────────────────────────────────────

export async function chargeTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; email: string; phone: string; paymentToken: string },
  logger: Logger
): Promise<ChargeResult> {
  return chargeOperator(TOGO_OPERATOR_MAP[operator], params, logger);
}

// ─── Étape 3 : GET /checkout-invoice/confirm/{token} ─────────────────────────

export async function confirmInvoice(
  invoiceToken: string,
  logger: Logger
): Promise<{ status: string; completed: boolean; rawPaydunyaResponse: Record<string, unknown> }> {
  const url = `${getBaseUrl()}/checkout-invoice/confirm/${invoiceToken}`;

  const { data } = await paydunyaFetchWithRetry(
    url,
    { method: "GET", headers: getHeaders() },
    logger
  );

  const status = String(data.status ?? data.invoice_status ?? "pending").toLowerCase();
  return { status, completed: status === "completed", rawPaydunyaResponse: data };
}

// ─── Payout : API v2 /disburse/ ───────────────────────────────────────────────
// Flux officiel PayDunya :
//   1. POST /api/v2/disburse/get-invoice  → disburse_token
//   2. POST /api/v2/disburse/submit-invoice { disburse_invoice, disburse_id }
//   3. POST /api/v2/disburse/check-status  { disburse_invoice }  (optionnel)
//
// withdraw_mode : "t-money-togo" | "moov-togo" | ...
// account_alias : numéro bénéficiaire sans indicatif pays (ex: "99935673")

function getBaseUrlV2(): string {
  if (process.env.PAYDUNYA_SANDBOX === "true") {
    return "https://app.paydunya.com/sandbox-api/v2";
  }
  return "https://app.paydunya.com/api/v2";
}

/** withdraw_mode PayDunya v2 selon l'opérateur Togo */
const WITHDRAW_MODE: Partial<Record<OperatorKey, string>> = {
  "tmoney-togo": "t-money-togo",
  "moov-togo":   "moov-togo",
};

export type DisburseStatus = "created" | "pending" | "success" | "failed";

export interface DisburseStatusResult {
  status: DisburseStatus;
  rawPaydunyaResponse: Record<string, unknown>;
}

export async function disburseWallet(
  operatorKey: OperatorKey,
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  if (!OPERATOR_MAP[operatorKey]) {
    throw new PaydunyaError(`Opérateur de payout non supporté : ${operatorKey}`, "UNSUPPORTED_OPERATOR");
  }

  const withdrawMode = WITHDRAW_MODE[operatorKey];
  if (!withdrawMode) {
    throw new PaydunyaError(`Aucun withdraw_mode v2 pour l'opérateur : ${operatorKey}`, "UNSUPPORTED_OPERATOR");
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(`Numéro destinataire invalide : "${params.phone}"`, "INVALID_PHONE");
  }
  if (params.amount <= 0) {
    throw new PaydunyaError("Montant de payout invalide (doit être > 0).", "INVALID_AMOUNT");
  }

  const callbackUrl =
    process.env.PAYDUNYA_DISBURSE_CALLBACK_URL ||
    process.env.PAYDUNYA_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN ?? "bloumcash.com"}/api/paydunya/disburse-webhook`;

  const baseV2 = getBaseUrlV2();

  // ── Étape 1 : obtenir le disburse_token ──────────────────────────────────────
  logger.info(
    { operator: operatorKey, withdrawMode, phone: cleanPhone, amount: params.amount, ref: params.reference },
    "PayDunya ▶ disburse/get-invoice (v2)"
  );

  const { data: inv, status: invStatus } = await paydunyaFetchWithRetry(
    `${baseV2}/disburse/get-invoice`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        account_alias:  cleanPhone,
        amount:         params.amount,
        withdraw_mode:  withdrawMode,
        callback_url:   callbackUrl,
      }),
    },
    logger
  );

  // response_code "00" = succès ; récupérer disburse_token
  const disburseToken =
    (inv.disburse_token as string | undefined) ??
    (inv.token as string | undefined);

  if (inv.response_code !== "00" || !disburseToken) {
    const rawMsg = String(inv.response_text ?? inv.message ?? JSON.stringify(inv));
    logger.error(
      { httpStatus: invStatus, responseCode: inv.response_code, paydunya_raw: inv },
      `PayDunya ✖ disburse/get-invoice échoué — ${rawMsg}`
    );
    return {
      success: false,
      message: `[disburse/get-invoice] ${rawMsg}`,
      rawPaydunyaResponse: inv,
    };
  }

  logger.info(
    { disburseTokenPrefix: disburseToken.slice(0, 8) + "…" },
    "PayDunya ✔ disburse_token obtenu — soumission en cours"
  );

  // ── Étape 2 : soumettre le déboursement ──────────────────────────────────────
  const { data: sub, status: subStatus } = await paydunyaFetchWithRetry(
    `${baseV2}/disburse/submit-invoice`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        disburse_invoice: disburseToken,
        disburse_id:      params.reference,
      }),
    },
    logger
  );

  const success = sub.response_code === "00" || sub.success === true;
  const rawMsg  = String(sub.response_text ?? sub.message ?? "");
  const message = rawMsg || (success ? "Payout initié avec succès." : "Payout refusé (aucun message PayDunya).");

  if (!success) {
    logger.warn(
      { operator: operatorKey, httpStatus: subStatus, paydunya_raw: sub },
      `PayDunya ✖ disburse/submit-invoice refusé — ${rawMsg}`
    );
  } else {
    logger.info(
      { operator: operatorKey, disburseToken: disburseToken.slice(0, 8) + "…", ref: params.reference },
      "PayDunya ✔ disburse soumis"
    );
  }

  return {
    success,
    message,
    transactionId: disburseToken,
    rawPaydunyaResponse: sub,
  };
}

/** Vérifier le statut d'un déboursement v2 par son disburse_token */
export async function checkDisburseStatus(
  disburseToken: string,
  logger: Logger
): Promise<DisburseStatusResult> {
  const { data } = await paydunyaFetchWithRetry(
    `${getBaseUrlV2()}/disburse/check-status`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ disburse_invoice: disburseToken }),
    },
    logger
  );

  const status = (data.status ?? data.disburse_status ?? "pending") as DisburseStatus;
  return { status, rawPaydunyaResponse: data };
}

export async function disburseTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  return disburseWallet(TOGO_OPERATOR_MAP[operator], params, logger);
}
