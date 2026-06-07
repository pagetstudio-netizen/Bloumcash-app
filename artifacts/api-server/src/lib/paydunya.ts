import {
  OPERATOR_MAP,
  TOGO_OPERATOR_MAP,
  type OperatorKey,
  type OperatorConfig,
} from "./paydunya-softpay-map";

const PAYDUNYA_BASE = process.env.PAYDUNYA_SANDBOX === "true"
  ? "https://app.paydunya.com/sandbox-api/v1"
  : "https://app.paydunya.com/api/v1";

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

export function isSandbox(): boolean {
  return process.env.PAYDUNYA_SANDBOX === "true";
}

export interface ChargeResult {
  success: boolean;
  message: string;
  fees?: number;
  currency?: string;
  isPending: boolean;
  invoiceToken?: string;
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
    { url, method: options.method, headers: headersToLog, payload: options.body },
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
    { url, status: response.status, contentType, elapsed, bodyPreview: rawText.slice(0, 600) },
    "PayDunya ← response"
  );

  if (contentType.includes("text/html") || rawText.trimStart().startsWith("<!")) {
    logger.error(
      { url, status: response.status, contentType, bodyPreview: rawText.slice(0, 300) },
      "PayDunya returned HTML instead of JSON — invalid endpoint or auth error"
    );
    throw new PaydunyaError(
      "PayDunya a retourné une page HTML. Vérifiez vos clés API et l'endpoint.",
      "HTML_RESPONSE",
      false
    );
  }

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

// ─── Retry wrapper ────────────────────────────────────────────────────────────

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
          `PayDunya retryable HTTP error, retry in ${RETRY_DELAY_MS * (attempt + 1)}ms…`
        );
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      return result;
    } catch (err) {
      if (err instanceof PaydunyaError && err.retryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

// ─── Étape 1 : Créer une checkout invoice → obtenir le payment_token ──────────
// Doc officielle : https://developers.paydunya.com/doc/FR/softpay
// Flux : checkout-invoice/create → token → softpay/{operator}

export async function createInvoice(
  amount: number,
  description: string,
  channels: string[],
  logger: Logger
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new PaydunyaError("Le montant doit être supérieur à 0.", "INVALID_AMOUNT", false);
  }

  if (!isConfigured()) {
    throw new PaydunyaError(
      "Les clés PayDunya ne sont pas configurées.",
      "NOT_CONFIGURED",
      false
    );
  }

  const url = `${PAYDUNYA_BASE}/checkout-invoice/create`;

  const body = JSON.stringify({
    invoice: {
      total_amount: amount,
      description,
      channels,
    },
    store: {
      name: process.env.PAYDUNYA_STORE_NAME || "Bloum Cash",
      tagline: "Transferts TMoney & Moov Money au Togo",
      postal_address: "Lomé, Togo",
      phone: process.env.PAYDUNYA_STORE_PHONE || "",
      website_url: "",
    },
    actions: {
      cancel_url: process.env.PAYDUNYA_CALLBACK_URL || "",
      return_url: process.env.PAYDUNYA_CALLBACK_URL || "",
      callback_url: process.env.PAYDUNYA_CALLBACK_URL || "",
    },
  });

  const { data } = await fetchWithRetry(url, { method: "POST", headers: getHeaders(), body }, logger);

  const res = data as Record<string, unknown>;

  if (res.response_code !== "00" || !res.token) {
    logger.error({ url, response: res }, "PayDunya invoice creation failed");
    const detail = String(res.response_text ?? JSON.stringify(res));
    throw new PaydunyaError(
      `Erreur PayDunya (checkout-invoice) : ${detail}`,
      "INVOICE_FAILED",
      false
    );
  }

  const token = String(res.token);
  logger.info({ mode: isSandbox() ? "sandbox" : "live", token: token.slice(0, 8) + "…" }, "PayDunya invoice créée ✓");
  return token;
}

// ─── Étape 2 : Débiter le wallet mobile money via SoftPay ────────────────────

export async function chargeOperator(
  operatorKey: OperatorKey,
  params: { name: string; email: string; phone: string; paymentToken: string; address?: string },
  logger: Logger
): Promise<ChargeResult> {
  const config: OperatorConfig | undefined = OPERATOR_MAP[operatorKey];

  if (!config) {
    throw new PaydunyaError(`Opérateur non supporté : ${operatorKey}`, "UNSUPPORTED_OPERATOR", false);
  }

  if (!params.paymentToken?.trim()) {
    throw new PaydunyaError("Le payment_token est vide ou manquant.", "EMPTY_TOKEN", false);
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(`Numéro de téléphone invalide : "${params.phone}"`, "INVALID_PHONE", false);
  }

  const payload = config.payloadBuilder({
    name: params.name || "Client Bloum Cash",
    email: params.email || `${cleanPhone}@bloumcash.tg`,
    phone: cleanPhone,
    paymentToken: params.paymentToken,
    address: params.address,
  });

  for (const field of config.requiredFields) {
    const value = payload[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new PaydunyaError(
        `Champ requis manquant pour ${config.label} : "${field}"`,
        "MISSING_FIELD",
        false
      );
    }
  }

  const url = `${PAYDUNYA_BASE}/softpay/${config.endpoint}`;

  logger.info(
    { operator: operatorKey, endpoint: url, mode: isSandbox() ? "sandbox" : "live", payloadFields: Object.keys(payload) },
    "PayDunya SoftPay → charge initié"
  );

  const { data, status } = await fetchWithRetry(
    url,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) },
    logger
  );

  const res = data as Record<string, unknown>;

  // 401 uniquement = vraie erreur d'auth. 403 peut être un rejet opérateur (body JSON valide).
  if (status === 401) {
    throw new PaydunyaError(
      "Authentification PayDunya échouée. Vérifiez vos clés API.",
      "AUTH_FAILED",
      false
    );
  }

  if (status === 404) {
    throw new PaydunyaError(
      `Endpoint PayDunya introuvable : /softpay/${config.endpoint}.`,
      "ENDPOINT_NOT_FOUND",
      false
    );
  }

  const success = res.success === true;
  const message = String(
    res.message ?? (success ? "Paiement mobile money initié" : "Paiement refusé par l'opérateur")
  );

  if (!success) {
    logger.warn({ operator: operatorKey, status, response: res }, "PayDunya charge refusée");
  } else {
    logger.info({ operator: operatorKey, isPending: config.isPending }, "PayDunya charge acceptée ✓");
  }

  return {
    success,
    message,
    fees: typeof res.fees === "number" ? res.fees : undefined,
    currency: typeof res.currency === "string" ? res.currency : "XOF",
    isPending: config.isPending,
    invoiceToken: params.paymentToken,
  };
}

// ─── Wrapper Togo (charge) ────────────────────────────────────────────────────

export async function chargeTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; email: string; phone: string; paymentToken: string },
  logger: Logger
): Promise<ChargeResult> {
  const operatorKey: OperatorKey = TOGO_OPERATOR_MAP[operator];
  return chargeOperator(operatorKey, params, logger);
}

// ─── Vérifier le statut d'une invoice (polling) ──────────────────────────────

export async function confirmInvoice(
  invoiceToken: string,
  logger: Logger
): Promise<{ status: string; completed: boolean }> {
  const url = `${PAYDUNYA_BASE}/checkout-invoice/confirm/${invoiceToken}`;

  const { data } = await fetchWithRetry(
    url,
    { method: "GET", headers: getHeaders() },
    logger
  );

  const res = data as Record<string, unknown>;
  const status = String(res.status ?? res.invoice_status ?? "pending").toLowerCase();
  const completed = status === "completed";

  return { status, completed };
}

// ─── Payout : Envoyer de l'argent vers un wallet (SoftPay Send) ──────────────

export async function disburseWallet(
  operatorKey: OperatorKey,
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  const config: OperatorConfig | undefined = OPERATOR_MAP[operatorKey];

  if (!config) {
    throw new PaydunyaError(`Opérateur de payout non supporté : ${operatorKey}`, "UNSUPPORTED_OPERATOR", false);
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");
  if (cleanPhone.length < 8) {
    throw new PaydunyaError(`Numéro destinataire invalide : "${params.phone}"`, "INVALID_PHONE", false);
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

  if (status === 401) {
    throw new PaydunyaError("Authentification PayDunya échouée pour le payout.", "AUTH_FAILED", false);
  }

  const success = res.success === true || res.response_code === "00";
  const message = String(res.message ?? res.response_text ?? (success ? "Payout envoyé" : "Payout refusé"));
  const transactionId = typeof res.transaction_id === "string" ? res.transaction_id : undefined;

  if (!success) {
    logger.warn({ operator: operatorKey, status, response: res }, "PayDunya payout refusé");
  } else {
    logger.info({ operator: operatorKey, transactionId }, "PayDunya payout confirmé ✓");
  }

  return { success, message, transactionId };
}

// ─── Wrapper Togo pour payout ─────────────────────────────────────────────────

export async function disburseTogoWallet(
  operator: "tmoney" | "moov",
  params: { name: string; phone: string; amount: number; reference: string },
  logger: Logger
): Promise<DisburseResult> {
  const operatorKey: OperatorKey = TOGO_OPERATOR_MAP[operator];
  return disburseWallet(operatorKey, params, logger);
}
