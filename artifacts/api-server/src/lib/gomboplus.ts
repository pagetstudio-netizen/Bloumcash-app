/**
 * GomboPlus (EgoPay) — Intégration Mobile Money
 *
 * CASHIN  : POST /api/mobile-services/mobile-deposit/   — collecte chez l'envoyeur
 * CASHOUT : POST /api/mobile-services/mobile-withdrawal/ — envoi au destinataire
 * Status  : POST /api/mobile-services/check-transaction-status/
 * Balance : GET  /api/wallets/get-balance/
 *
 * Auth headers : X-Public-Key + X-Private-Key
 * Opérateurs Togo : yas (T-Money/YAS), moov (Moov Money)
 */

const BASE_URL = "https://api.gomboplus.com";

function getAppBaseUrl(): string {
  // Priorité 1 : URL spécifique GomboPlus
  if (process.env.GOMBOPLUS_CALLBACK_URL) {
    return process.env.GOMBOPLUS_CALLBACK_URL.replace(/\/$/, "");
  }
  // Priorité 2 : URL commune (une seule valeur à changer pour tous les webhooks)
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  // Priorité 3 : domaine Replit en production
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    return `https://${replitDomains.split(",")[0].trim()}`;
  }
  // Priorité 4 : domaine Replit en développement
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "https://bloumcash.com";
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Public-Key":  process.env.GOMBOPLUS_PUBLIC_KEY  ?? "",
    "X-Private-Key": process.env.GOMBOPLUS_PRIVATE_KEY ?? "",
  };
}

export function isConfigured(): boolean {
  return !!(process.env.GOMBOPLUS_PUBLIC_KEY && process.env.GOMBOPLUS_PRIVATE_KEY);
}

export function getWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/gomboplus/webhook`;
}

export class GomboPlusError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly rawResponse?: unknown
  ) {
    super(message);
    this.name = "GomboPlusError";
  }
}

type Logger = {
  info:  (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
  warn:  (obj: object, msg: string) => void;
};

/** Mapping opérateur interne → code GomboPlus + pays */
const OPERATOR_GP_MAP: Record<string, { operator: string; country: string; label: string }> = {
  tmoney: { operator: "yas",  country: "TG", label: "YAS/T-Money Togo" },
  moov:   { operator: "moov", country: "TG", label: "Moov Money Togo"  },
};

async function gombofetch(
  endpoint: string,
  options: Omit<RequestInit, "headers">,
  logger: Logger
): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = getHeaders();
  const safeHeaders = { ...headers, "X-Public-Key": "***", "X-Private-Key": "***" };

  logger.info({ url, method: options.method, headers: safeHeaders, body: options.body }, "GomboPlus ▶ requête");

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    logger.error({ url, err }, "GomboPlus ✖ erreur réseau");
    throw new GomboPlusError("Erreur réseau lors de la connexion à GomboPlus.", "NETWORK_ERROR");
  }

  const rawText = await response.text();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    logger.error({ url, httpStatus: response.status, rawText: rawText.slice(0, 300) }, "GomboPlus ✖ corps non-JSON");
    throw new GomboPlusError(
      `GomboPlus a retourné un corps non-JSON (HTTP ${response.status}).`,
      "INVALID_JSON"
    );
  }

  logger.info({ url, httpStatus: response.status, body: parsed }, "GomboPlus ◀ réponse");
  return parsed;
}

export interface GomboPlusResult {
  success: boolean;
  gpReference: string;
  message: string;
  rawResponse: Record<string, unknown>;
}

/**
 * CASHIN — Collecte de fonds depuis le portefeuille de l'envoyeur.
 * L'utilisateur reçoit une demande de paiement sur son téléphone.
 * Après confirmation, GomboPlus appelle callback_url.
 */
export async function cashin(
  params: {
    phone:     string;
    amount:    number;
    operator:  "tmoney" | "moov";
    reference: string;
  },
  logger: Logger
): Promise<GomboPlusResult> {
  const opMap = OPERATOR_GP_MAP[params.operator];
  if (!opMap) {
    throw new GomboPlusError(`Opérateur non supporté par GomboPlus : ${params.operator}`, "UNSUPPORTED_OPERATOR");
  }

  if (params.amount <= 0) {
    throw new GomboPlusError("Le montant doit être supérieur à 0.", "INVALID_AMOUNT");
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");

  const data = await gombofetch(
    "/api/mobile-services/mobile-deposit/",
    {
      method: "POST",
      body: JSON.stringify({
        amount:           params.amount,
        recipient_number: cleanPhone,
        country:          opMap.country,
        operator:         opMap.operator,
        callback_url:     getWebhookUrl(),
      }),
    },
    logger
  );

  const content    = data.content as Record<string, unknown> | undefined;
  const gpRef      = (content?.reference as string | undefined) ?? "";
  const statusStr  = String(data.status ?? "");
  const code       = Number(data.code ?? 0);

  if (statusStr !== "succes" || (code !== 202 && code !== 200)) {
    const msg = String(data.message ?? JSON.stringify(data));
    logger.error({ data, params: { ...params, phone: "***" } }, `GomboPlus ✖ CASHIN échoué — ${msg}`);
    return { success: false, gpReference: gpRef, message: msg, rawResponse: data };
  }

  logger.info({ gpReference: gpRef, amount: params.amount, operator: opMap.label }, "GomboPlus ✔ CASHIN initié");
  return {
    success: true,
    gpReference: gpRef,
    message: String(data.message ?? "Demande de paiement envoyée."),
    rawResponse: data,
  };
}

/**
 * CASHOUT — Envoi de fonds vers le portefeuille du destinataire.
 * Déclenché automatiquement après confirmation du CASHIN.
 */
export async function cashout(
  params: {
    phone:     string;
    amount:    number;
    operator:  "tmoney" | "moov";
    reference: string;
  },
  logger: Logger
): Promise<GomboPlusResult> {
  const opMap = OPERATOR_GP_MAP[params.operator];
  if (!opMap) {
    throw new GomboPlusError(`Opérateur non supporté par GomboPlus : ${params.operator}`, "UNSUPPORTED_OPERATOR");
  }

  if (params.amount <= 0) {
    throw new GomboPlusError("Le montant de payout doit être supérieur à 0.", "INVALID_AMOUNT");
  }

  const cleanPhone = params.phone.replace(/[\s\-().+]/g, "");

  const data = await gombofetch(
    "/api/mobile-services/mobile-withdrawal/",
    {
      method: "POST",
      body: JSON.stringify({
        amount:           params.amount,
        recipient_number: cleanPhone,
        country:          opMap.country,
        operator:         opMap.operator,
        callback_url:     getWebhookUrl(),
      }),
    },
    logger
  );

  const content   = data.content as Record<string, unknown> | undefined;
  const gpRef     = (content?.reference as string | undefined) ?? "";
  const statusStr = String(data.status ?? "");
  const code      = Number(data.code ?? 0);

  if (statusStr !== "succes" || (code !== 202 && code !== 200)) {
    const msg = String(data.message ?? JSON.stringify(data));
    logger.error({ data, params: { ...params, phone: "***" } }, `GomboPlus ✖ CASHOUT échoué — ${msg}`);
    return { success: false, gpReference: gpRef, message: msg, rawResponse: data };
  }

  logger.info({ gpReference: gpRef, amount: params.amount, operator: opMap.label }, "GomboPlus ✔ CASHOUT initié");
  return {
    success: true,
    gpReference: gpRef,
    message: String(data.message ?? "Paiement envoyé au destinataire."),
    rawResponse: data,
  };
}

export type GPStatus = "pending" | "completed" | "failed" | "cancelled";

/** Vérification du statut d'une transaction GomboPlus */
export async function checkStatus(
  gpReference: string,
  logger: Logger
): Promise<{ status: GPStatus; raw: Record<string, unknown> }> {
  const data = await gombofetch(
    "/api/mobile-services/check-transaction-status/",
    {
      method: "POST",
      body: JSON.stringify({ transaction_reference: gpReference }),
    },
    logger
  );

  const content   = data.content as Record<string, unknown> | undefined;
  const rawStatus = String(content?.status ?? data.status ?? "pending").toLowerCase();

  const STATUS_MAP: Record<string, GPStatus> = {
    pending:   "pending",
    completed: "completed",
    success:   "completed",
    failed:    "failed",
    cancelled: "cancelled",
    canceled:  "cancelled",
  };

  return { status: STATUS_MAP[rawStatus] ?? "pending", raw: data };
}

/** Consulter le solde d'un wallet GomboPlus */
export async function getBalance(
  operator: "tmoney" | "moov",
  logger: Logger
): Promise<{ balance: number; currency: string; raw: Record<string, unknown> }> {
  const opMap = OPERATOR_GP_MAP[operator];
  if (!opMap) throw new GomboPlusError(`Opérateur non supporté : ${operator}`, "UNSUPPORTED_OPERATOR");

  const url = `${BASE_URL}/api/wallets/get-balance/?country_code=${opMap.country}&operator_code=${opMap.operator}`;

  logger.info({ url }, "GomboPlus ▶ balance");
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers: getHeaders() });
  } catch (err) {
    logger.error({ err }, "GomboPlus ✖ balance — erreur réseau");
    throw new GomboPlusError("Erreur réseau balance GomboPlus.", "NETWORK_ERROR");
  }

  const raw = await response.json() as Record<string, unknown>;
  const content = raw.content as Record<string, unknown> | undefined;

  return {
    balance:  Number(content?.balance ?? 0),
    currency: String(content?.currency ?? "XOF"),
    raw,
  };
}
