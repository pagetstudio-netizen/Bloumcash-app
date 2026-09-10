import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import {
  blacklistTable,
  usersTable,
  whatsappConversationsTable,
} from "@workspace/db";
import { signUserToken } from "../middleware/user-auth";
import {
  WawpError as ConvessaError,
  getWhatsappOnboardingUrl,
  getWhatsappTransferUrl,
  sendWawpMessage as sendConvessaMessage,
  sendWelcomeMessage,
  toWawpPhone as toConvessaPhone,
} from "../lib/wawp";

const router: IRouter = Router();

type ConversationPatch = Partial<typeof whatsappConversationsTable.$inferInsert>;
const VERIFICATION_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_REQUESTS = 3;
const MAX_VERIFICATION_ATTEMPTS = 5;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function createToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeAccountPhone(raw: string): string | null {
  let digits = raw.replace(/@s\.whatsapp\.net$/i, "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("228")) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits)) return null;
  const prefix = Number(digits.slice(0, 2));
  if ((prefix >= 70 && prefix <= 79) || (prefix >= 90 && prefix <= 99)) {
    return digits;
  }
  return null;
}

function normalizeInboundText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isWhatsappLid(value: string): boolean {
  return /@lid$/i.test(value) || /:\d+@s\.whatsapp\.net$/i.test(value);
}

function firstSenderAddress(...values: unknown[]): string {
  let lidFallback = "";
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const candidate = value.trim();
    if (!isWhatsappLid(candidate)) return candidate;
    if (!lidFallback) lidFallback = candidate;
  }
  return lidFallback;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

async function consumeVerificationRequest(senderPhone: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE whatsapp_conversations
     SET verification_request_count = CASE
           WHEN verification_request_window_started_at IS NULL
             OR verification_request_window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN 1
           ELSE verification_request_count + 1
         END,
         verification_request_window_started_at = CASE
           WHEN verification_request_window_started_at IS NULL
             OR verification_request_window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN NOW()
           ELSE verification_request_window_started_at
         END,
         updated_at = NOW()
     WHERE whatsapp_phone = $1
       AND (
         verification_request_window_started_at IS NULL
         OR verification_request_window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
         OR verification_request_count < $3
       )
     RETURNING verification_request_count`,
    [senderPhone, VERIFICATION_WINDOW_MS, MAX_VERIFICATION_REQUESTS],
  );
  return (result.rowCount ?? 0) > 0;
}

async function incrementVerificationAttempt(senderPhone: string): Promise<number> {
  const result = await pool.query(
    `UPDATE whatsapp_conversations
     SET verification_attempts = verification_attempts + 1, updated_at = NOW()
     WHERE whatsapp_phone = $1
     RETURNING verification_attempts`,
    [senderPhone],
  );
  return Number(result.rows[0]?.verification_attempts ?? 0);
}

async function resetVerificationAttempts(senderPhone: string): Promise<void> {
  await pool.query(
    `UPDATE whatsapp_conversations
     SET verification_attempts = 0, updated_at = NOW()
     WHERE whatsapp_phone = $1`,
    [senderPhone],
  );
}

function parseInboundPayload(payload: Record<string, unknown>): {
  id: string;
  from: string;
  text: string;
} {
  const data = asRecord(payload.payload);
  const nestedPayload = asRecord(data?.payload);
  const nestedData = asRecord(data?.data);
  const rawData = asRecord(data?._data);
  const messageInfo = asRecord(rawData?.Info);
  const response = asRecord(data?.response) ?? asRecord(payload.response);
  const listResponse =
    asRecord(data?.listResponse) ??
    asRecord(nestedPayload?.listResponse) ??
    asRecord(response?.listResponse) ??
    asRecord(response?.list_response);
  const buttonResponse =
    asRecord(data?.buttonResponse) ??
    asRecord(nestedPayload?.buttonResponse) ??
    asRecord(response?.buttonResponse) ??
    asRecord(response?.button_response);
  const sources = [data, nestedPayload, nestedData, response, payload];

  const from = firstSenderAddress(
    ...sources.flatMap((source) => [
      source?.senderAlt,
      source?.sender_alt,
      source?.authorAlt,
      source?.phone,
      source?.from,
      source?.author,
      source?.chatId,
      source?.sender,
    ]),
    messageInfo?.SenderAlt,
    messageInfo?.Sender,
  );

  const text = normalizeInboundText(firstString(
    ...sources.flatMap((source) => [
      source?.body,
      source?.text,
      source?.content,
      source?.selectedRowId,
      source?.selectedRowID,
      source?.rowId,
      source?.rowID,
    ]),
    listResponse?.rowId,
    listResponse?.selectedRowId,
    listResponse?.selectedRowID,
    listResponse?.title,
    buttonResponse?.id,
    buttonResponse?.selectedButtonId,
    buttonResponse?.selectedButtonID,
    buttonResponse?.text,
  ));

  const id = firstString(
    ...sources.flatMap((source) => [source?.id, source?.messageId, source?.eventId]),
  );

  return { id, from: toConvessaPhone(from), text };
}

async function getConversation(whatsappPhone: string) {
  const rows = await db
    .select()
    .from(whatsappConversationsTable)
    .where(eq(whatsappConversationsTable.whatsappPhone, whatsappPhone))
    .limit(1);
  return rows[0] ?? null;
}

async function updateConversation(
  whatsappPhone: string,
  patch: ConversationPatch,
): Promise<void> {
  await db
    .update(whatsappConversationsTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(whatsappConversationsTable.whatsappPhone, whatsappPhone));
}

async function getOrCreateConversation(whatsappPhone: string) {
  const existing = await getConversation(whatsappPhone);
  if (existing) return existing;

  const [created] = await db
    .insert(whatsappConversationsTable)
    .values({
      whatsappPhone,
      state: "welcome",
      lastMessageAt: new Date(),
    })
    .returning();
  return created;
}

async function sendPhoneVerification(
  senderPhone: string,
  accountPhone: string,
  action: "account" | "transfer" = "account",
): Promise<void> {
  if (!(await consumeVerificationRequest(senderPhone))) {
    await sendConvessaMessage(
      senderPhone,
      "Trop de demandes de code. Réessayez dans quelques minutes.",
    );
    return;
  }

  const code = createCode();
  await sendConvessaMessage(
    toConvessaPhone(accountPhone),
    `Votre code de vérification Bloum Cash est : ${code}\n\nNe le partagez avec personne.`,
  );
  await updateConversation(senderPhone, {
    accountPhone,
    pendingCodeHash: sha256(code),
    pendingCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    state: action === "transfer" ? "awaiting_transfer_code" : "awaiting_phone_code",
  });
  await resetVerificationAttempts(senderPhone);
  await sendConvessaMessage(
    senderPhone,
    "Un code de vérification vient d'être envoyé sur le numéro indiqué. Répondez ici avec le code à 6 chiffres.",
  );
}

async function sendPinSetupLink(
  senderPhone: string,
  userId: number,
  accountPhone: string,
  fullName: string,
): Promise<void> {
  const token = createToken();
  const url = getWhatsappOnboardingUrl(token);
  if (!url) {
    throw new Error("APP_BASE_URL ou REPLIT_DEV_DOMAIN est requis pour le lien sécurisé WhatsApp");
  }

  await updateConversation(senderPhone, {
    userId,
    accountPhone,
    fullName,
    pendingTokenHash: sha256(token),
    pendingTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    state: "awaiting_pin",
  });

  await sendConvessaMessage(
    senderPhone,
    [
      `Merci ${fullName} ! Votre compte Bloum Cash est presque prêt.`,
      "",
      "Ouvrez ce lien sécurisé pour créer votre PIN :",
      url,
      "",
      "Le lien expire dans 30 minutes et ne peut être utilisé qu'une seule fois.",
    ].join("\n"),
  );
}

async function sendWhatsappTransferLink(
  senderPhone: string,
  userId: number,
  accountPhone: string,
  fullName: string,
): Promise<void> {
  const token = createToken();
  const url = getWhatsappTransferUrl(token);
  if (!url) {
    throw new Error("APP_BASE_URL ou REPLIT_DEV_DOMAIN est requis pour le lien sécurisé WhatsApp");
  }

  await updateConversation(senderPhone, {
    userId,
    accountPhone,
    fullName,
    pendingTokenHash: sha256(token),
    pendingTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    state: "awaiting_transfer",
  });

  await sendConvessaMessage(
    senderPhone,
    [
      `Bonjour ${fullName} ! Votre identité Bloum Cash a été vérifiée.`,
      "",
      "Ouvrez ce lien sécurisé pour préparer votre transfert :",
      url,
      "",
      "Le lien expire dans 15 minutes et ne peut être utilisé qu'une seule fois.",
      "Votre transfert devra être confirmé uniquement sur cette page sécurisée.",
    ].join("\n"),
  );
}

async function handleInboundMessage(
  req: Request,
  senderPhone: string,
  text: string,
): Promise<void> {
  const conversation = await getOrCreateConversation(senderPhone);
  const normalized = text.toLowerCase().trim();

  if (!text) {
    await sendWelcomeMessage(senderPhone);
    await updateConversation(senderPhone, { state: "menu" });
    return;
  }

  if (
    conversation.state === "welcome" ||
    /^(bonjour|bonsoir|salut|hello|hi|menu|start|0)$/i.test(normalized)
  ) {
    await sendWelcomeMessage(senderPhone);
    await updateConversation(senderPhone, { state: "menu" });
    return;
  }

  if (conversation.state === "menu") {
    if (normalized === "1" || normalized.includes("transfert") || normalized.includes("transfer")) {
      await sendConvessaMessage(
        senderPhone,
        "Très bien. Envoyez le numéro Bloum Cash vérifié qui servira de compte expéditeur (format 90 00 00 00).",
      );
      await updateConversation(senderPhone, { state: "awaiting_transfer_phone" });
      return;
    }

    if (normalized === "2" || normalized.includes("compte") || normalized.includes("inscri")) {
      await sendConvessaMessage(
        senderPhone,
        "Pour créer votre compte, envoyez le numéro Togo qui sera associé à Bloum Cash (Mixx by Yas ou Moov).",
      );
      await updateConversation(senderPhone, { state: "awaiting_account_phone" });
      return;
    }

    if (normalized === "3" || normalized.includes("aide")) {
      await sendConvessaMessage(
        senderPhone,
        "Bloum Cash permet de transférer de l'argent entre Mixx by Yas et Moov Togo. Répondez 1 pour commencer ou écrivez AIDE pour contacter l'assistance.",
      );
      return;
    }

    await sendWelcomeMessage(senderPhone);
    await updateConversation(senderPhone, { state: "menu" });
    return;
  }

  if (conversation.state === "awaiting_account_phone" || conversation.state === "awaiting_transfer_phone") {
    const accountPhone = normalizeAccountPhone(text);
    if (!accountPhone) {
      await sendConvessaMessage(
        senderPhone,
        "Numéro invalide. Envoyez un numéro Togo Mixx by Yas ou Moov, par exemple 90 00 00 00.",
      );
      return;
    }

    const blocked = await db
      .select({ id: blacklistTable.id })
      .from(blacklistTable)
      .where(eq(blacklistTable.phone, accountPhone))
      .limit(1);
    if (blocked.length) {
      await sendConvessaMessage(senderPhone, "Ce numéro ne peut pas être utilisé. Contactez l'assistance Bloum Cash.");
      return;
    }

    await sendPhoneVerification(
      senderPhone,
      accountPhone,
      conversation.state === "awaiting_transfer_phone" ? "transfer" : "account",
    );
    return;
  }

  if (conversation.state === "awaiting_phone_code" || conversation.state === "awaiting_transfer_code") {
    const code = text.replace(/\D/g, "");
    const expected = conversation.pendingCodeHash;
    const expiresAt = conversation.pendingCodeExpiresAt?.getTime() ?? 0;
    if (!expected || !expiresAt || expiresAt <= Date.now() || code.length !== 6 || sha256(code) !== expected) {
      const attempts = await incrementVerificationAttempt(senderPhone);
      if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await updateConversation(senderPhone, {
          pendingCodeHash: null,
          pendingCodeExpiresAt: null,
          state: "menu",
        });
        await resetVerificationAttempts(senderPhone);
        await sendConvessaMessage(
          senderPhone,
          "Trop d'essais incorrects. La vérification est annulée. Répondez 0 pour recommencer.",
        );
        return;
      }
      await sendConvessaMessage(senderPhone, "Code invalide ou expiré. Demandez un nouveau code en répondant NOUVEAU CODE.");
      if (normalized === "nouveau code" && conversation.accountPhone) {
        await sendPhoneVerification(
          senderPhone,
          conversation.accountPhone,
          conversation.state === "awaiting_transfer_code" ? "transfer" : "account",
        );
      }
      return;
    }

    const accountPhone = conversation.accountPhone!;
    const transferRequested = conversation.state === "awaiting_transfer_code";
    await resetVerificationAttempts(senderPhone);
    await updateConversation(senderPhone, {
      pendingCodeHash: null,
      pendingCodeExpiresAt: null,
      state: transferRequested ? "awaiting_transfer" : "awaiting_name",
    });

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, accountPhone))
      .limit(1);
    if (existing.length) {
      const user = existing[0];
      if (transferRequested) {
        await sendWhatsappTransferLink(senderPhone, user.id, accountPhone, user.fullName);
        return;
      }
      await updateConversation(senderPhone, {
        userId: user.id,
        fullName: user.fullName,
        state: "ready",
      });
      await sendConvessaMessage(
        senderPhone,
        `Votre compte ${user.fullName} a été vérifié. Pour continuer, ouvrez Bloum Cash et connectez-vous avec le numéro ${accountPhone}.`,
      );
      return;
    }

    if (transferRequested) {
      await updateConversation(senderPhone, { state: "menu" });
      await sendConvessaMessage(
        senderPhone,
        "Aucun compte Bloum Cash n'est associé à ce numéro. Répondez 2 pour créer un compte, puis réessayez le transfert.",
      );
      return;
    }

    await sendConvessaMessage(senderPhone, "Numéro vérifié ✅. Quel est votre nom complet ?");
    return;
  }

  if (conversation.state === "awaiting_name") {
    const fullName = text.trim().replace(/\s+/g, " ").slice(0, 100);
    if (fullName.length < 2) {
      await sendConvessaMessage(senderPhone, "Veuillez envoyer votre nom complet, avec au moins 2 caractères.");
      return;
    }

    const accountPhone = conversation.accountPhone;
    if (!accountPhone) {
      await updateConversation(senderPhone, { state: "menu" });
      await sendWelcomeMessage(senderPhone);
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, accountPhone))
      .limit(1);
    if (existing.length) {
      await updateConversation(senderPhone, { userId: existing[0].id, state: "ready" });
      await sendConvessaMessage(senderPhone, "Ce numéro possède déjà un compte Bloum Cash. Connectez-vous depuis la page sécurisée.");
      return;
    }

    const email = `${accountPhone}@users.bloumcash.app`;
    const temporaryPin = crypto.randomBytes(24).toString("hex");
    const [user] = await db
      .insert(usersTable)
      .values({
        fullName,
        email,
        pin: await bcrypt.hash(temporaryPin, 12),
        phone: accountPhone,
        onesignalExternalUserId: email,
        country: "Togo",
      })
      .returning();

    await sendPinSetupLink(senderPhone, user.id, accountPhone, fullName);
    return;
  }

  if (conversation.state === "awaiting_pin") {
    await sendConvessaMessage(
      senderPhone,
      "Votre lien de création du PIN est toujours actif. Ouvrez-le depuis votre dernier message WhatsApp.",
    );
    return;
  }

  if (conversation.state === "awaiting_transfer") {
    await sendConvessaMessage(
      senderPhone,
      "Votre lien de transfert est toujours actif. Ouvrez le dernier lien sécurisé reçu dans WhatsApp.",
    );
    return;
  }

  if (conversation.state === "ready") {
    await sendConvessaMessage(
      senderPhone,
      "Votre compte est prêt ✅. Ouvrez Bloum Cash pour vous connecter. Répondez MENU pour revoir les options.",
    );
    if (normalized === "menu") {
      await sendWelcomeMessage(senderPhone);
      await updateConversation(senderPhone, { state: "menu" });
    }
    return;
  }

  await sendWelcomeMessage(senderPhone);
  await updateConversation(senderPhone, { state: "menu" });
}

/* WAWP appelle cette URL pour les messages entrants et les événements de statut. */
router.post("/webhooks/convessa", async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  const event = typeof payload.event === "string" ? payload.event : "";

  if (!["message", "message.any", "list_response", "button_response", "event.response"].includes(event)) {
    res.json({ received: true });
    return;
  }

  const eventPayload = asRecord(payload.payload);
  const nestedPayload = asRecord(eventPayload?.payload);
  if ([payload, eventPayload, nestedPayload].some((source) => source?.fromMe === true)) {
    res.json({ received: true, ignored: "outgoing" });
    return;
  }

  const inbound = parseInboundPayload(payload);
  if (!inbound.from) {
    res.status(400).json({ received: false, error: "Numéro expéditeur manquant" });
    return;
  }

  try {
    const conversation = await getOrCreateConversation(inbound.from);
    if (inbound.id && conversation.lastInboundId === inbound.id) {
      res.json({ received: true, duplicate: true });
      return;
    }
    await updateConversation(inbound.from, {
      lastInboundId: inbound.id || null,
      lastMessageAt: new Date(),
    });
    await handleInboundMessage(req, inbound.from, inbound.text);
    res.json({ received: true });
  } catch (error) {
    if (error instanceof ConvessaError) {
      req.log.error({ status: error.status, code: error.code }, "Erreur WAWP pendant le traitement WhatsApp");
    } else {
      req.log.error({ err: error }, "Erreur webhook WAWP");
    }
    res.status(500).json({ received: false, error: "Erreur de traitement" });
  }
});

router.post("/whatsapp/onboarding/complete", async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const pin = typeof req.body?.pin === "string" ? req.body.pin.trim() : "";
    if (!token || !/^\d{4,20}$/.test(pin)) {
      res.status(400).json({ error: "PIN invalide" });
      return;
    }

    const rows = await db
      .select()
      .from(whatsappConversationsTable)
      .where(
        and(
          eq(whatsappConversationsTable.pendingTokenHash, sha256(token)),
          eq(whatsappConversationsTable.state, "awaiting_pin"),
          gt(whatsappConversationsTable.pendingTokenExpiresAt, new Date()),
        ),
      )
      .limit(1);
    const conversation = rows[0];
    if (!conversation?.userId) {
      res.status(410).json({ error: "Lien invalide ou expiré" });
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    await db.update(usersTable).set({ pin: hashedPin }).where(eq(usersTable.id, conversation.userId));
    await db
      .update(whatsappConversationsTable)
      .set({
        state: "ready",
        pendingTokenHash: null,
        pendingTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappConversationsTable.id, conversation.id),
          eq(whatsappConversationsTable.state, "awaiting_pin"),
        ),
      );

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, conversation.userId))
      .limit(1);
    const user = users[0];
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    await sendConvessaMessage(
      conversation.whatsappPhone,
      "Votre compte Bloum Cash est maintenant activé ✅. Vous pouvez vous connecter avec votre numéro et votre nouveau PIN.",
    ).catch(() => undefined);

    const authToken = signUserToken({ id: user.id, email: user.email });
    res.json({
      success: true,
      token: authToken,
      user: {
        id: String(user.id),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Erreur activation compte WhatsApp");
    res.status(500).json({ error: "Impossible d'activer le compte" });
  }
});

router.post("/whatsapp/transfer/exchange", async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "Lien de transfert invalide" });
      return;
    }

    const rows = await db
      .update(whatsappConversationsTable)
      .set({
        state: "ready",
        pendingTokenHash: null,
        pendingTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappConversationsTable.pendingTokenHash, sha256(token)),
          eq(whatsappConversationsTable.state, "awaiting_transfer"),
          gt(whatsappConversationsTable.pendingTokenExpiresAt, new Date()),
        ),
      )
      .returning();

    const conversation = rows[0];
    if (!conversation?.userId) {
      res.status(410).json({ error: "Lien de transfert invalide ou expiré" });
      return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, conversation.userId))
      .limit(1);
    const user = users[0];
    if (!user || !user.phone) {
      res.status(404).json({ error: "Compte Bloum Cash introuvable" });
      return;
    }

    const authToken = signUserToken({ id: user.id, email: user.email, channel: "whatsapp" });
    res.json({
      success: true,
      token: authToken,
      user: {
        id: String(user.id),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Erreur échange lien de transfert WhatsApp");
    res.status(500).json({ error: "Impossible d'ouvrir le transfert sécurisé" });
  }
});

export default router;