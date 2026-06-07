import {
  OPERATOR_MAP,
  TOGO_OPERATOR_MAP,
  type OperatorKey,
  type OperatorConfig,
} from "./paydunya-softpay-map";

const PAYDUNYA_BASE = "https://app.paydunya.com/api/v1";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function getHeaders(): Record<string, string> {
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY ?? "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
    "PAYDUNYA-PUBLIC-KEY": process.env.PAYDUNYA_PUBLIC_KEY ?? "",
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN ?? "",
  };
}

export function isConfigured(): boolean {
  return !!(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_PUBLIC_KEY &&
    process.env.PAYDUNYA_TOKEN
  );
}

export interface ChargeResult {
  success: boolean;
  message: string;
  fees?: number;
  currency?: string;
  isPending: boolean;
}

export interface DisburseResult {
  success: boolean;
  message: string;
  transactionId?: string;
}

export class PaydunyaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "PaydunyaError";
  }
}

type Logger = {
  info: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
  warn: (obj: object, msg: string) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

// ─── Core fetch with full logging ───────────────────────────────────────────

async function fetchWithLogs(
  url: string,
  options: RequestInit,
  logger: Logger
): Promise<{ data: unknown; status: number }> {
  const startMs = Date.now();

  const headersToLog = { ...(options.headers as Record<string, string>) };
  headersToLog["PAYDUNYA-MASTER-KEY"] = headersToLog["PAYDUNYA-MASTER-KEY"] ? "***set***" : "***MISSING***";
  headersToLog["PAYDUNYA-PRIVATE-KEY"] = headersToLog["PAYDUNYA-PRIVATE-KEY"] ? "***set***" : "***MISSING***";
  headersToLog["PAYDUNYA-PUBLIC-KEY"] = headersToLog["PAYDUNYA-PUBLIC-KEY"] ? "***set***" : "***MISSING***";
  headersToLog["PAYDUNYA-TOKEN"] = headersToLog["PAYDUNYA-TOKEN"] ? "***set***" : "***MISSING***";

  logger.info(
    {
      url,
      method: options.method,
      headers: headersToLog,
      payload: options.body,
    },
    "PayDunya → request"
  );

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    const elapsed = Date.now() - startMs;
    logger.error({ url, elapsed, err: networkErr }, "PayDunya → network error");
    throw new PaydunyaError(
      "Erreur réseau lors de la connexion à PayDunya. Veuillez réessayer.",
      "NETWORK_ERROR",
      true
    );
  }

  const elapsed = Date.now() - startMs;
  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();

  logger.info(
    {
      url,
      status: response.status,
      contentType,
      elapsed,
      bodyPreview: rawText.slice(0, 600),
    },
    "PayDunya ← response"
  );

  // ── Détection HTML — endpoint invalide, token expiré, compte restreint ──
  if (contentType.includes("text/html") || rawText.trimStart().startsWith("<!")) {
    logger.error(
      {
        url,
        status: response.status,
        contentType,
        bodyPreview: rawText.slice(0, 300),
      },
      "PayDunya returned HTML instead of JSON. Possible invalid endpoint, expired token, authentication issue, or restricted account."
    );
    throw new PaydunyaError(
      "PayDunya a retourné une page HTML au lieu de JSON. Vérifiez vos clés API et l'endpoint utilisé.",
      "HTML_RESPONSE",
      false
    );
  }

  // ── Parse JSON ──
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    logger.error({ url, rawText: rawText.slice(0, 400) }, "PayDunya returned non-JSON body");
    throw new PaydunyaError(
      "PayDunya a retourné une réponse invalide (non-JSON).",
      "INVALID_JSON",
      false
    );
  }

  return { data: parsed, status: response.status };
}

// ─── Retry wrapper — seulement pour erreurs réseau et 5xx temporaires ────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  logger: Logger
): Promise<{ data: unknown; status: number }> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fetchWithLogs(url, options, logger);

      if (isRetryableStatus(result.status) && attempt < MAX_RETRIES) {
        logger.warn(
          { url, status: result.status, attempt },
          `PayDunya retryable HTTP error (${result.status}), retry in ${RETRY_DELAY_MS * (attempt + 1)}ms…`
        );
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      return result;
    } catch (err) {
      // Ne retry que sur les erreurs réseau (NETWORK_ERROR) — jamais sur HTML, token invalide, validation
      if (err instanceof PaydunyaError && err.retryable && attempt < MAX_RETRIES) {
        logger.warn(
          { url, code: err.code, attempt },
          `PayDunya retryable error (${err.code}), retry in ${RETRY_DELAY_MS * (attempt + 1)}ms…`
        );
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

// ─── Étape 1 : Créer une invoice PayDunya → obtenir le payment_token ─────────

export async function createInvoice(
  amount: number,
  description: string,
  logger: Logger
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new PaydunyaError("Le montant doit être supérieur à 0.", "INVALID_AMOUNT", false);
  }

  if (!isConfigured()) {
    throw new PaydunyaError(
      "Les clés PayDunya ne sont pas configurées (PAYDUNYA_MASTER_KEY / PRIVATE / PUBLIC / TOKEN).",
      "NOT_CONFIGURED",
      false
    );
  }

  const url = `${PAYDUNYA_BASE}/checkout-invoice/create`;
  const body = JSON.stringify({
    invoice: {
      total_amount: amount,
      description,
    },
    store: {
      name: process.env.PAYDUNYA_STORE_NAME || "Bloum Cash",
      tagline: "Transferts TMoney & Moov Money",
      postal_address: "Lomé, Togo",
      phone: process.env.PAYDUNYA_STORE_PHONE || "",
      website_url: process.env.PAYDUNYA_CALLBACK_URL || "",
    },
    actions: {
      cancel_url: process.env.PAYDUNYA_CALLBACK_URL || "",
      return_url: process.env.PAYDUNYA_CALLBACK_URL || "",
      callback_url: process.env.PAYDUNYA_CALLBACK_URL || "",
    },
  });

  const { data, status } = await fetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body },
    logger
  );

  const res = data as Record<string, unknown>;

  if (res.response_code !== "00" || !res.token) {
    logger.error({ url, status, response: res }, "PayDunya invoice creation failed");
    throw new PaydunyaError(
      `Impossible de créer l'invoice PayDunya : ${res.response_text ?? JSON.stringify(res)}`,
      "INVOICE_FAILED",
      false
    );
  }

  const token = String(res.token);
  if (!token) {
    throw new PaydunyaError("PayDunya a retourné un token vide.", "EMPTY_TOKEN", false);
  }

  logger.info({ token: token.slice(0, 8) + "…" }, "PayDunya invoice created ✓");
  return token;
}

// ─── Étape 2 : Débiter un wallet mobile money (SoftPay PayIn) ────────────────

export async function chargeOperator(
  operatorKey: OperatorKey,
  params: { name: string; email: string; phone: string; address?: string },
  paymentToken: string,
  logger: Logger
): Promise<ChargeResult> {
  const config: OperatorConfig | undefined = OPERATOR_MAP[operatorKey];

  if (!config) {
    throw new PaydunyaError(
      `Opérateur non supporté : ${operatorKey}`,
      "UNSUPPORTED_OPERATOR",
      false
    );
  }

  if (!paymentToken || paymentToken.trim() === "") {
    throw new PaydunyaError("Le payment_token est vide ou manquant.", "EMPTY_TOKEN", false);
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(
      `Numéro de téléphone invalide : "${params.phone}"`,
      "INVALID_PHONE",
      false
    );
  }

  const payload = config.payloadBuilder({
    name: params.name || "Client Bloum Cash",
    email: params.email || `${cleanPhone}@bloumcash.tg`,
    phone: cleanPhone,
    paymentToken,
    address: params.address,
  });

  // ── Validation stricte des champs requis ──
  for (const field of config.requiredFields) {
    const value = payload[field];
    if (!value || value.trim() === "") {
      throw new PaydunyaError(
        `Champ requis manquant pour ${config.label} : "${field}"`,
        "MISSING_FIELD",
        false
      );
    }
  }

  const url = `${PAYDUNYA_BASE}/softpay/${config.endpoint}`;

  logger.info(
    {
      operator: operatorKey,
      endpoint: url,
      payloadFields: Object.keys(payload),
    },
    "PayDunya SoftPay → charge initié"
  );

  const { data, status } = await fetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) },
    logger
  );

  const res = data as Record<string, unknown>;

  // ── Erreurs d'authentification — ne pas retry ──
  if (status === 401 || status === 403) {
    throw new PaydunyaError(
      "Authentification PayDunya échouée. Vérifiez vos clés API (MASTER-KEY, PRIVATE-KEY, PUBLIC-KEY, TOKEN).",
      "AUTH_FAILED",
      false
    );
  }

  if (status === 404) {
    throw new PaydunyaError(
      `Endpoint PayDunya introuvable : /softpay/${config.endpoint}. Vérifiez le slug de l'opérateur.`,
      "ENDPOINT_NOT_FOUND",
      false
    );
  }

  const success = res.success === true;
  const message = String(
    res.message ?? (success ? "Paiement mobile money initié" : "Paiement refusé")
  );

  if (!success) {
    logger.warn(
      { operator: operatorKey, endpoint: url, status, response: res },
      "PayDunya charge refused by operator"
    );
  } else {
    logger.info(
      { operator: operatorKey, isPending: config.isPending },
      "PayDunya charge accepted ✓"
    );
  }

  return {
    success,
    message,
    fees: typeof res.fees === "number" ? res.fees : undefined,
    currency: typeof res.currency === "string" ? res.currency : "XOF",
    isPending: config.isPending,
  };
}

// ─── Wrapper Togo (rétro-compatibilité) ──────────────────────────────────────

export async function chargeTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; email: string; phone: string },
  paymentToken: string,
  logger: Logger
): Promise<ChargeResult> {
  const operatorKey: OperatorKey = TOGO_OPERATOR_MAP[operator];
  return chargeOperator(operatorKey, params, paymentToken, logger);
}

// ─── Payout : Envoyer de l'argent vers un wallet (SoftPay Send) ──────────────

export async function disburseWallet(
  operatorKey: OperatorKey,
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  const config: OperatorConfig | undefined = OPERATOR_MAP[operatorKey];

  if (!config) {
    throw new PaydunyaError(
      `Opérateur de payout non supporté : ${operatorKey}`,
      "UNSUPPORTED_OPERATOR",
      false
    );
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(
      `Numéro destinataire invalide : "${params.phone}"`,
      "INVALID_PHONE",
      false
    );
  }

  if (params.amount <= 0) {
    throw new PaydunyaError("Montant de payout invalide (doit être > 0).", "INVALID_AMOUNT", false);
  }

  const payload = config.disbursePayloadBuilder({
    name: params.name || "Bénéficiaire Bloum Cash",
    phone: cleanPhone,
    amount: params.amount,
    reference: params.reference,
  });

  const url = `${PAYDUNYA_BASE}/softpay/${config.disburseEndpoint}/send`;

  logger.info(
    { operator: operatorKey, phone: cleanPhone, amount: params.amount, ref: params.reference, endpoint: url },
    "PayDunya SoftPay → payout initié"
  );

  const { data, status } = await fetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) },
    logger
  );

  const res = data as Record<string, unknown>;

  if (status === 401 || status === 403) {
    throw new PaydunyaError(
      "Authentification PayDunya échouée pour le payout.",
      "AUTH_FAILED",
      false
    );
  }

  const success = res.success === true || res.response_code === "00";
  const message = String(
    res.message ?? res.response_text ?? (success ? "Payout envoyé" : "Payout refusé")
  );
  const transactionId =
    typeof res.transaction_id === "string" ? res.transaction_id : undefined;

  if (!success) {
    logger.warn({ operator: operatorKey, status, response: res }, "PayDunya payout refusé");
  } else {
    logger.info({ operator: operatorKey, transactionId }, "PayDunya payout confirmé ✓");
  }

  return { success, message, transactionId };
}

// ─── Wrapper Togo pour payout (rétro-compatibilité) ──────────────────────────

export async function disburseTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  const operatorKey: OperatorKey = TOGO_OPERATOR_MAP[operator];
  return disburseWallet(operatorKey, params, logger);
}
