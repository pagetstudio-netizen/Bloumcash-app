import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import {
  adminSettingsTable,
  blacklistTable,
  usersTable,
  whatsappConversationsTable,
} from "@workspace/db";
import { signUserToken } from "../middleware/user-auth";
import { notifyNewUser } from "../lib/telegram";
import {
  WawpError as ConvessaError,
  getWhatsappOnboardingUrl,
  getWhatsappTransferUrl,
  sendWawpMessage as sendConvessaMessage,
  sendOperatorChoiceMenu,
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
  if (!/^[789]\d{7}$/.test(digits)) return null;
  return digits;
}

type TransferOperator = "tmoney" | "moov";

function parseOperatorChoice(value: string): TransferOperator | null {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("tmoney") || normalized.includes("mixx") || normalized.includes("yas")) {
    return "tmoney";
  }
  if (normalized.includes("moov")) return "moov";
  return null;
}

function operatorForPhone(phone: string): TransferOperator {
  return Number(phone.slice(0, 2)) >= 90 ? "moov" : "tmoney";
}

function validPassword(value: string): boolean {
  return /^\d{4,20}$/.test(value.trim());
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
  const message = asRecord(rawData?.Message);
  const listResponseMessage = asRecord(message?.listResponseMessage);
  const singleSelectReply = asRecord(listResponseMessage?.singleSelectReply);
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
    singleSelectReply?.selectedRowID,
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

async function claimInboundMessage(
  whatsappPhone: string,
  inboundId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE whatsapp_conversations
     SET last_inbound_id = $2, last_message_at = NOW(), updated_at = NOW()
     WHERE whatsapp_phone = $1
       AND last_inbound_id IS DISTINCT FROM $2
     RETURNING id`,
    [whatsappPhone, inboundId],
  );
  return (result.rowCount ?? 0) > 0;
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

async function sendHelpMessage(to: string): Promise<void> {
  const rows = await db
    .select({ key: adminSettingsTable.key, value: adminSettingsTable.value })
    .from(adminSettingsTable)
    .where(sql`key IN ('support_phone','facebook_url','instagram_url','telegram_url','tiktok_url','youtube_url','whatsapp_url')`);
  const settings = new Map(rows.map((row) => [row.key, row.value?.trim() ?? ""]));
  const supportPhone = settings.get("support_phone") || "";
  const socialLinks = [
    ["Facebook", settings.get("facebook_url")],
    ["Instagram", settings.get("instagram_url")],
    ["Telegram", settings.get("telegram_url")],
    ["TikTok", settings.get("tiktok_url")],
    ["YouTube", settings.get("youtube_url")],
    ["WhatsApp", settings.get("whatsapp_url")],
  ].filter(([, url]) => Boolean(url));

  const lines = [
    "🆘 Aide Bloum Cash",
    "",
    supportPhone
      ? `📞 Support WhatsApp : ${supportPhone}`
      : "📞 Numéro du support WhatsApp non configuré.",
  ];

  if (socialLinks.length) {
    lines.push("", "🌐 Retrouvez-nous sur :");
    for (const [label, url] of socialLinks) {
      lines.push(`• ${label} : ${url}`);
    }
  } else {
    lines.push("", "🌐 Aucun réseau social n'est actuellement configuré.");
  }

  lines.push("", "Vous pouvez nous suivre sur WhatsApp directement");
  await sendConvessaMessage(to, lines.join("\n"));
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
  recipientOperator: TransferOperator,
  recipientPhone: string,
  senderOperator: TransferOperator,
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
    transferRecipientOperator: recipientOperator,
    transferRecipientPhone: recipientPhone,
    transferSenderOperator: senderOperator,
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

async function beginTransfer(
  senderPhone: string,
  conversation: typeof whatsappConversationsTable.$inferSelect,
): Promise<void> {
  if (!conversation.userId || !conversation.accountPhone) {
    await updateConversation(senderPhone, { state: "menu" });
    await sendConvessaMessage(
      senderPhone,
      "Pour effectuer un transfert, vous devez d'abord créer un compte. Répondez 2 pour vous inscrire.",
    );
    return;
  }

  await updateConversation(senderPhone, {
    state: "awaiting_transfer_recipient_operator",
    transferRecipientOperator: null,
    transferRecipientPhone: null,
    transferSenderOperator: null,
  });
  await sendOperatorChoiceMenu(senderPhone, "recipient");
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
      await beginTransfer(senderPhone, conversation);
      return;
    }

    if (normalized === "2" || normalized.includes("compte") || normalized.includes("inscri")) {
      await sendConvessaMessage(
        senderPhone,
        "Votre numéro : quel numéro souhaitez-vous utiliser pour vous inscrire ? Envoyez un numéro Togo à 8 chiffres.",
      );
      await updateConversation(senderPhone, { state: "awaiting_account_phone" });
      return;
    }

    if (
      normalized === "3" ||
      normalized === "help" ||
      normalized.includes("aide") ||
      normalized.includes("support")
    ) {
      await sendHelpMessage(senderPhone);
      return;
    }

    await sendWelcomeMessage(senderPhone);
    await updateConversation(senderPhone, { state: "menu" });
    return;
  }

  if (conversation.state === "awaiting_account_phone") {
    const accountPhone = normalizeAccountPhone(text);
    if (!accountPhone) {
      await sendConvessaMessage(
        senderPhone,
        "Numéro invalide. Envoyez un numéro Togo à 8 chiffres, par exemple 90 00 00 00.",
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

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, accountPhone))
      .limit(1);
    if (existing.length) {
      await updateConversation(senderPhone, {
        accountPhone,
        userId: existing[0].id,
        fullName: existing[0].fullName,
        state: "awaiting_existing_login_confirmation",
      });
      await sendConvessaMessage(
        senderPhone,
        "Ce compte existe déjà. Souhaitez-vous vous connecter ? Répondez OUI ou NON.",
      );
      return;
    }

    await updateConversation(senderPhone, {
      accountPhone,
      state: "awaiting_registration_password",
    });
    await sendConvessaMessage(
      senderPhone,
      "Choisissez maintenant votre mot de passe Bloum Cash (4 à 20 chiffres).",
    );
    return;
  }

  if (conversation.state === "awaiting_transfer_phone") {
    await updateConversation(senderPhone, { state: "menu" });
    await sendConvessaMessage(
      senderPhone,
      "Ce parcours a changé. Répondez 1 pour effectuer un transfert.",
    );
    return;
  }

  if (conversation.state === "awaiting_registration_password") {
    const password = text.trim();
    const accountPhone = conversation.accountPhone;
    if (!accountPhone || !validPassword(password)) {
      await sendConvessaMessage(
        senderPhone,
        "Mot de passe invalide. Choisissez un mot de passe de 4 à 20 chiffres.",
      );
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, accountPhone))
      .limit(1);
    if (existing.length) {
      await updateConversation(senderPhone, {
        userId: existing[0].id,
        fullName: existing[0].fullName,
        state: "awaiting_existing_login_confirmation",
      });
      await sendConvessaMessage(
        senderPhone,
        "Ce compte existe déjà. Souhaitez-vous vous connecter ? Répondez OUI ou NON.",
      );
      return;
    }

    const fullName = `Utilisateur ${accountPhone.slice(-4)}`;
    const email = `${accountPhone}@users.bloumcash.app`;
    const [user] = await db
      .insert(usersTable)
      .values({
        fullName,
        email,
        pin: await bcrypt.hash(password, 12),
        phone: accountPhone,
        operator: operatorForPhone(accountPhone),
        registrationChannel: "whatsapp",
        onesignalExternalUserId: email,
        country: "Togo",
      })
      .returning();

    notifyNewUser({ fullName: user.fullName, phone: user.phone ?? "" });
    await updateConversation(senderPhone, {
      userId: user.id,
      fullName: user.fullName,
      state: "menu",
    });
    await sendConvessaMessage(
      senderPhone,
      "Votre compte est créé ✅. Vous pouvez utiliser ce numéro et ce mot de passe pour vous connecter à l'application.",
    );
    await sendWelcomeMessage(senderPhone);
    return;
  }

  if (conversation.state === "awaiting_existing_login_confirmation") {
    if (/^(oui|yes|o|1)$/i.test(normalized)) {
      await updateConversation(senderPhone, { state: "awaiting_existing_login_password" });
      await sendConvessaMessage(senderPhone, "Entrez votre mot de passe Bloum Cash.");
      return;
    }
    if (/^(non|no|n|2)$/i.test(normalized)) {
      await updateConversation(senderPhone, { state: "menu" });
      await sendWelcomeMessage(senderPhone);
      return;
    }
    await sendConvessaMessage(senderPhone, "Répondez OUI pour vous connecter ou NON pour annuler.");
    return;
  }

  if (conversation.state === "awaiting_existing_login_password") {
    const accountPhone = conversation.accountPhone;
    const password = text.trim();
    if (!accountPhone || !validPassword(password)) {
      await sendConvessaMessage(senderPhone, "Mot de passe incorrect. Réessayez.");
      return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, accountPhone))
      .limit(1);
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.pin))) {
      await sendConvessaMessage(senderPhone, "Mot de passe incorrect. Réessayez.");
      return;
    }

    await updateConversation(senderPhone, {
      userId: user.id,
      fullName: user.fullName,
      state: "menu",
    });
    await sendConvessaMessage(
      senderPhone,
      "Connexion réussie ✅. Vous pouvez utiliser les mêmes identifiants pour vous connecter à l'application.",
    );
    await sendWelcomeMessage(senderPhone);
    return;
  }

  if (conversation.state === "awaiting_transfer_recipient_operator") {
    const recipientOperator = parseOperatorChoice(text);
    if (!recipientOperator) {
      await sendConvessaMessage(senderPhone, "Sélectionnez TMoney ou Moov Money dans le menu.");
      await sendOperatorChoiceMenu(senderPhone, "recipient");
      return;
    }

    await updateConversation(senderPhone, {
      transferRecipientOperator: recipientOperator,
      state: "awaiting_transfer_recipient_phone",
    });
    await sendConvessaMessage(
      senderPhone,
      `Envoyez maintenant le numéro du bénéficiaire ${recipientOperator === "tmoney" ? "TMoney" : "Moov Money"} (8 chiffres).`,
    );
    return;
  }

  if (conversation.state === "awaiting_transfer_recipient_phone") {
    const recipientPhone = normalizeAccountPhone(text);
    const recipientOperator = conversation.transferRecipientOperator as TransferOperator | null;
    if (!recipientPhone) {
      await sendConvessaMessage(senderPhone, "Numéro bénéficiaire invalide. Envoyez un numéro Togo à 8 chiffres.");
      return;
    }
    const blocked = await db
      .select({ id: blacklistTable.id })
      .from(blacklistTable)
      .where(eq(blacklistTable.phone, recipientPhone))
      .limit(1);
    if (blocked.length) {
      await sendConvessaMessage(senderPhone, "Ce numéro ne peut pas recevoir de transfert. Contactez l'assistance Bloum Cash.");
      return;
    }

    await updateConversation(senderPhone, {
      transferRecipientPhone: recipientPhone,
      state: "awaiting_transfer_sender_operator",
    });
    await sendOperatorChoiceMenu(senderPhone, "sender");
    return;
  }

  if (conversation.state === "awaiting_transfer_sender_operator") {
    const senderOperator = parseOperatorChoice(text);
    const recipientOperator = conversation.transferRecipientOperator as TransferOperator | null;
    if (!senderOperator) {
      await sendConvessaMessage(senderPhone, "Sélectionnez TMoney ou Moov Money dans le menu.");
      await sendOperatorChoiceMenu(senderPhone, "sender");
      return;
    }
    if (senderOperator === recipientOperator) {
      await sendConvessaMessage(
        senderPhone,
        "Le transfert doit être effectué entre deux opérateurs différents. Choisissez l'autre opérateur.",
      );
      await sendOperatorChoiceMenu(senderPhone, "sender");
      return;
    }
    if (!conversation.userId || !conversation.accountPhone || !conversation.transferRecipientPhone || !recipientOperator) {
      await updateConversation(senderPhone, { state: "menu" });
      await sendConvessaMessage(senderPhone, "La préparation a expiré. Répondez 1 pour recommencer le transfert.");
      return;
    }

    await sendWhatsappTransferLink(
      senderPhone,
      conversation.userId,
      conversation.accountPhone,
      conversation.fullName ?? `Utilisateur ${conversation.accountPhone.slice(-4)}`,
      recipientOperator,
      conversation.transferRecipientPhone,
      senderOperator,
    );
    return;
  }

  if (conversation.state === "awaiting_phone_code" || conversation.state === "awaiting_transfer_code") {
    await updateConversation(senderPhone, {
      pendingCodeHash: null,
      pendingCodeExpiresAt: null,
      state: "menu",
    });
    await sendConvessaMessage(
      senderPhone,
      "Le code OTP n'est plus nécessaire. Répondez 2 pour vous inscrire avec votre numéro et votre mot de passe.",
    );
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
        operator: operatorForPhone(accountPhone),
        registrationChannel: "whatsapp",
        onesignalExternalUserId: email,
        country: "Togo",
      })
      .returning();

    notifyNewUser({ fullName: user.fullName, phone: user.phone ?? "" });
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
    if (normalized === "1" || normalized.includes("transfert") || normalized.includes("transfer")) {
      await beginTransfer(senderPhone, conversation);
      return;
    }
    if (normalized === "menu") {
      await updateConversation(senderPhone, { state: "menu" });
      await sendWelcomeMessage(senderPhone);
      return;
    }
    await sendConvessaMessage(
      senderPhone,
      "Votre compte est connecté ✅. Répondez MENU pour revoir les options ou 1 pour effectuer un transfert.",
    );
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
  const eventData = asRecord(eventPayload?._data);
  const eventInfo = asRecord(eventData?.Info);
  const isOutgoing = [payload, eventPayload, nestedPayload, eventData, eventInfo].some(
    (source) =>
      source?.fromMe === true ||
      source?.isFromMe === true ||
      source?.IsFromMe === true,
  );
  if (isOutgoing) {
    res.json({ received: true, ignored: "outgoing" });
    return;
  }

  const inbound = parseInboundPayload(payload);
  if (!inbound.from) {
    res.status(400).json({ received: false, error: "Numéro expéditeur manquant" });
    return;
  }

  try {
    await getOrCreateConversation(inbound.from);
    if (inbound.id && !(await claimInboundMessage(inbound.from, inbound.id))) {
      res.json({ received: true, duplicate: true });
      return;
    }
    if (!inbound.id) {
      await updateConversation(inbound.from, {
        lastInboundId: null,
        lastMessageAt: new Date(),
      });
    }
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
      transfer: {
        senderOperator: conversation.transferSenderOperator,
        recipientOperator: conversation.transferRecipientOperator,
        recipientPhone: conversation.transferRecipientPhone,
      },
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