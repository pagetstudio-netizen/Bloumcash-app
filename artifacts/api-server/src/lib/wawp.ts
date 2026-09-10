const DEFAULT_API_URL = "https://api.wawp.net";
const WELCOME_IMAGE_NAME = "bloum-cash-whatsapp-welcome.jpg";

export class WawpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "WawpError";
  }
}

type WawpResponse = Record<string, unknown>;

type WawpListRow = {
  title: string;
  rowId: string;
  description?: string;
};

type WawpListSection = {
  title: string;
  rows: WawpListRow[];
};

export type WawpListMessage = {
  title: string;
  description: string;
  footer?: string;
  button: string;
  sections: WawpListSection[];
};

export type WawpSendResponse = WawpResponse;

function getApiUrl(): string {
  return (process.env.WAWP_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

function getConfig(): { instanceId: string; accessToken: string } {
  const instanceId = process.env.WAWP_INSTANCE_ID?.trim();
  const accessToken = process.env.WAWP_ACCESS_TOKEN?.trim();
  if (!instanceId || !accessToken) {
    throw new WawpError(
      "WAWP_INSTANCE_ID et WAWP_ACCESS_TOKEN doivent être configurés",
      503,
      "NOT_CONFIGURED",
    );
  }
  return { instanceId, accessToken };
}

function getPublicAppBaseUrl(): string | null {
  const configuredBase = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  return configuredBase || (devDomain ? `https://${devDomain}` : null);
}

async function requestWawp<T extends WawpResponse>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { instanceId, accessToken } = getConfig();
  const query = new URLSearchParams({
    instance_id: instanceId,
    access_token: accessToken,
  });

  const response = await fetch(`${getApiUrl()}${endpoint}?${query.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const raw = await response.text();
  let data: WawpResponse = {};
  try {
    data = raw ? JSON.parse(raw) as WawpResponse : {};
  } catch {
    data = { error: raw.slice(0, 300) };
  }

  if (!response.ok) {
    const error = data.error as WawpResponse | undefined;
    const message =
      typeof error?.message === "string"
        ? error.message
        : typeof data.message === "string"
          ? data.message
          : `WAWP HTTP ${response.status}`;
    const code =
      typeof data.code === "string"
        ? data.code
        : typeof error?.code === "string"
          ? error.code
          : undefined;
    throw new WawpError(message, response.status, code);
  }

  return data as T;
}

export function toWawpPhone(raw: string): string {
  let digits = raw
    .replace(/@(?:s\.)?c\.us$/i, "")
    .replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `228${digits}`;
  return digits;
}

export function toWawpChatId(raw: string): string {
  return `${toWawpPhone(raw)}@c.us`;
}

export async function sendWawpMessage(
  to: string,
  message: string,
  replyTo?: string,
): Promise<WawpSendResponse> {
  return requestWawp("/v2/send/text", {
    chatId: toWawpChatId(to),
    message,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
}

export async function sendWawpImage(
  to: string,
  imageUrl: string,
  caption: string,
  filename = WELCOME_IMAGE_NAME,
): Promise<WawpSendResponse> {
  return requestWawp("/v2/send/image", {
    chatId: toWawpChatId(to),
    "file[url]": imageUrl,
    "file[filename]": filename,
    "file[mimetype]": "image/jpeg",
    caption,
  });
}

export async function sendWawpList(
  to: string,
  message: WawpListMessage,
): Promise<WawpSendResponse> {
  return requestWawp("/v2/send/list", {
    chatId: toWawpChatId(to),
    message,
  });
}

export async function sendWelcomeMessage(to: string): Promise<WawpSendResponse> {
  const welcomeText = [
    "Bonjour 👋",
    "",
    "Je suis l'assistante de Bloum Cash.",
    "Bloum Cash vous aide à transférer de l'argent entre Mixx by Yas et Moov Togo.",
  ].join("\n");

  const baseUrl = getPublicAppBaseUrl();
  if (baseUrl) {
    try {
      await sendWawpImage(
        to,
        `${baseUrl}/${WELCOME_IMAGE_NAME}`,
        welcomeText,
      );
    } catch (error) {
      console.warn("[WAWP] Image d'accueil non envoyée, le menu sera quand même envoyé", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return sendWawpList(to, {
    title: "Bloum Cash",
    description: "Choisissez ce que vous voulez faire.",
    footer: "Bloum Cash",
    button: "Ouvrir le menu",
    sections: [
      {
        title: "Options principales",
        rows: [
          {
            title: "Faire un transfert",
            rowId: "transfer",
            description: "Préparer un transfert sécurisé",
          },
          {
            title: "Créer un compte",
            rowId: "account",
            description: "Créer votre compte Bloum Cash",
          },
          {
            title: "Obtenir de l'aide",
            rowId: "help",
            description: "Voir les informations d'assistance",
          },
        ],
      },
    ],
  });
}

export function getWhatsappOnboardingUrl(token: string): string | null {
  const base = getPublicAppBaseUrl();
  return base ? `${base}/whatsapp-register?token=${encodeURIComponent(token)}` : null;
}

export function getWhatsappTransferUrl(token: string): string | null {
  const base = getPublicAppBaseUrl();
  return base ? `${base}/whatsapp-transfer?token=${encodeURIComponent(token)}` : null;
}
