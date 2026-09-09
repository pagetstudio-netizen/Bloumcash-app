import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_API_URL = "https://convessa.epac-uac-optica-chapter.bj";
const WELCOME_IMAGE_NAME = "bloum-cash-whatsapp-welcome.jpg";

export class ConvessaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ConvessaError";
  }
}

function getBaseUrl(): string {
  return (process.env.CONVESSA_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = process.env.CONVESSA_API_KEY?.trim();
  if (!key) {
    throw new ConvessaError("CONVESSA_API_KEY non configurée", 503, "NOT_CONFIGURED");
  }
  return key;
}

async function requestConvessa<T>(
  method: "GET" | "POST",
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method,
    headers: {
      "X-Api-Key": getApiKey(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    data = { error: { message: raw.slice(0, 200) } };
  }

  if (!response.ok) {
    const error = data.error as Record<string, unknown> | undefined;
    throw new ConvessaError(
      typeof error?.message === "string" ? error.message : `Convessa HTTP ${response.status}`,
      response.status,
      typeof error?.code === "string" ? error.code : undefined,
    );
  }

  return data as T;
}

export type ConvessaSendResponse = {
  success?: boolean;
  status?: string;
  messageId?: string;
  messages?: Array<{ messageId?: string; to?: string }>;
};

export type ConvessaSessionInfo = {
  success?: boolean;
  from?: string;
  status?: string;
  connected?: boolean;
  connectedAt?: string;
};

export function toConvessaPhone(raw: string): string {
  let digits = raw
    .replace(/@s\.whatsapp\.net$/i, "")
    .replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `228${digits}`;
  return digits;
}

export async function getConvessaSessionInfo(): Promise<ConvessaSessionInfo> {
  return requestConvessa<ConvessaSessionInfo>("GET", "/api/v1/send/info");
}

export async function sendConvessaMessage(
  to: string,
  message?: string,
  media?: { type: "image"; mime: string; url?: string; base64?: string; name?: string },
): Promise<ConvessaSendResponse> {
  if (!message && !media) {
    throw new Error("Un message ou un média Convessa est requis");
  }
  return requestConvessa<ConvessaSendResponse>("POST", "/api/v1/send", {
    to: toConvessaPhone(to),
    ...(message ? { message } : {}),
    ...(media ? { media } : {}),
  });
}

async function getWelcomeImageBase64(): Promise<string | null> {
  const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  const candidates = [
    path.resolve(baseDir, "../public", WELCOME_IMAGE_NAME),
    path.resolve(process.cwd(), "public", WELCOME_IMAGE_NAME),
    path.resolve(process.cwd(), "../bloum-cash/public", WELCOME_IMAGE_NAME),
  ];

  for (const candidate of candidates) {
    try {
      const bytes = await fs.readFile(candidate);
      return bytes.toString("base64");
    } catch {
      // Try the next known workspace/deployment location.
    }
  }
  return null;
}

export async function sendWelcomeMessage(to: string): Promise<ConvessaSendResponse> {
  const welcomeText = [
    "Bonjour 👋",
    "",
    "Je suis l'assistante de Bloum Cash.",
    "Bloum Cash vous aide à transférer de l'argent entre Mixx by Yas et Moov Togo.",
    "",
    "Répondez 1 pour transférer maintenant.",
    "Répondez 2 pour créer un compte.",
    "Répondez 3 pour obtenir de l'aide.",
  ].join("\n");

  const image = await getWelcomeImageBase64();
  if (image) {
    return sendConvessaMessage(to, welcomeText, {
      type: "image",
      mime: "image/jpeg",
      base64: image,
      name: WELCOME_IMAGE_NAME,
    });
  }

  return sendConvessaMessage(to, welcomeText);
}

export function getWhatsappOnboardingUrl(token: string): string | null {
  const configuredBase = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  const base = configuredBase || (devDomain ? `https://${devDomain}` : null);
  return base ? `${base}/whatsapp-register?token=${encodeURIComponent(token)}` : null;
}