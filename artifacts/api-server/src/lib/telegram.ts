/**
 * Service Telegram pour Bloum Cash Admin
 * - Long polling pour recevoir les mises à jour du bot
 * - Détection automatique du groupe (phrase déclencheur)
 * - Notifications en temps réel (utilisateurs, paiements, feedback, sécurité)
 * - Bilans quotidiens à 00h00 et 12h00 (heure du Togo = UTC+0)
 * - Bouton inline pour bloquer une IP directement depuis Telegram
 */

import { db } from "@workspace/db";
import {
  adminSettingsTable,
  blockedIpsTable,
  securityEventsTable,
  usersTable,
  transactionsTable,
} from "@workspace/db";
import { eq, gte, and, sql, count } from "drizzle-orm";
import { logger } from "./logger";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

let groupChatId: string | null = null;

/* ─────────────────────────── HELPERS ─────────────────────────── */

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmt(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString("fr-FR");
}

function togoDt(): string {
  return new Date().toLocaleString("fr-FR", {
    timeZone: "Africa/Lome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function tgFetch(method: string, body?: object): Promise<unknown> {
  if (!TG_API) return null;
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(10_000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

/* ─────────────────────────── GROUP CHAT ID ─────────────────────────── */

async function loadGroupChatId(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, "telegram_group_chat_id"))
      .limit(1);
    if (rows[0]?.value) {
      groupChatId = rows[0].value;
      logger.info({ groupChatId }, "🤖 Telegram group chat ID chargé");
    }
  } catch {}
}

async function saveGroupChatId(chatId: string): Promise<void> {
  groupChatId = chatId;
  try {
    await db
      .insert(adminSettingsTable)
      .values({ key: "telegram_group_chat_id", value: chatId })
      .onConflictDoUpdate({
        target: adminSettingsTable.key,
        set: { value: chatId, updatedAt: new Date() },
      });
  } catch {}
}

/* ─────────────────────────── SEND HELPERS ─────────────────────────── */

export async function sendMessage(
  chatId: string,
  text: string,
  extra: object = {}
): Promise<void> {
  await tgFetch("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function sendToGroup(text: string, extra: object = {}): Promise<void> {
  if (!groupChatId) return;
  await sendMessage(groupChatId, text, extra);
}

/* ─────────────────────────── NOTIFICATIONS PUBLIQUES ─────────────────────────── */

export function notifyNewUser(user: {
  fullName: string;
  phone: string;
}): void {
  sendToGroup(
    `🆕 <b>NOUVEL UTILISATEUR</b>\n\n` +
    `👤 Nom : ${esc(user.fullName)}\n` +
    `📱 Téléphone : <code>${esc(user.phone)}</code>\n` +
    `🕐 ${togoDt()}`
  ).catch(() => {});
}

export function notifyPayment(tx: {
  reference: string;
  amount: number;
  fees: number | null;
  fromPhone: string | null;
  toPhone: string | null;
  fromOperator: string | null;
  toOperator: string | null;
}): void {
  sendToGroup(
    `💸 <b>TRANSFERT RÉUSSI</b>\n\n` +
    `📋 Réf : <code>${esc(tx.reference)}</code>\n` +
    `💰 Montant : <b>${fmt(tx.amount)} FCFA</b>\n` +
    `💳 Commission : ${fmt(tx.fees ?? 0)} FCFA\n` +
    `📤 De : ${esc(tx.fromPhone ?? "?")} (${esc(tx.fromOperator ?? "?")})\n` +
    `📥 Vers : ${esc(tx.toPhone ?? "?")} (${esc(tx.toOperator ?? "?")})\n` +
    `🕐 ${togoDt()}`
  ).catch(() => {});
}

export function notifyFeedback(fb: {
  type: string;
  title: string;
  message: string;
  userName: string | null;
  userPhone: string | null;
}): void {
  const typeIcon =
    fb.type === "bug" ? "🐛" : fb.type === "suggestion" ? "💡" : "💬";
  const typeLabel =
    fb.type === "bug"
      ? "Signalement de bug"
      : fb.type === "suggestion"
      ? "Suggestion"
      : "Retour utilisateur";

  sendToGroup(
    `${typeIcon} <b>${typeLabel.toUpperCase()}</b>\n\n` +
    `📌 <b>${esc(fb.title)}</b>\n` +
    `📝 ${esc(fb.message)}\n\n` +
    `👤 ${esc(fb.userName ?? "Inconnu")} — ${esc(fb.userPhone ?? "?")}\n` +
    `🕐 ${togoDt()}`
  ).catch(() => {});
}

export function notifyAdminLoginFail(email: string, ip: string): void {
  sendToGroup(
    `⚠️ <b>TENTATIVE DE CONNEXION ADMIN ÉCHOUÉE</b>\n\n` +
    `📧 Email : <code>${esc(email)}</code>\n` +
    `🌐 IP : <code>${esc(ip)}</code>\n` +
    `🕐 ${togoDt()}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚫 Bloquer cette IP", callback_data: `block_ip:${ip}` }],
        ],
      },
    }
  ).catch(() => {});
}

export function notifyAdminTotpFail(email: string, ip: string): void {
  sendToGroup(
    `🔐 <b>CODE TOTP INVALIDE — ADMIN</b>\n\n` +
    `📧 Email : <code>${esc(email)}</code>\n` +
    `🌐 IP : <code>${esc(ip)}</code>\n` +
    `🕐 ${togoDt()}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚫 Bloquer cette IP", callback_data: `block_ip:${ip}` }],
        ],
      },
    }
  ).catch(() => {});
}

export function notifyIpBlocked(opts: {
  ip: string;
  reason: string;
  country?: string;
  path?: string;
  type?: string;
  auto?: boolean;
}): void {
  const title = opts.auto
    ? "🔍 VPN/PROXY BLOQUÉ AUTOMATIQUEMENT"
    : "🚫 IP BLOQUÉE";
  sendToGroup(
    `${title}\n\n` +
    `🌐 IP : <code>${esc(opts.ip)}</code>\n` +
    (opts.country ? `🏳️ Pays : ${esc(opts.country)}\n` : "") +
    (opts.type ? `📡 Type : ${esc(opts.type)}\n` : "") +
    `📝 Raison : ${esc(opts.reason)}\n` +
    (opts.path ? `🔗 Chemin : ${esc(opts.path)}\n` : "") +
    `📅 ${togoDt()}\n\n` +
    `L'IP a été bloquée définitivement en base de données.`
  ).catch(() => {});
}

export function notifySecurityEvent(opts: {
  type: string;
  details: string;
  ip?: string;
}): void {
  sendToGroup(
    `🔐 <b>ÉVÉNEMENT SÉCURITÉ</b>\n\n` +
    `📌 Type : ${esc(opts.type)}\n` +
    `📋 Détails : ${esc(opts.details)}\n` +
    (opts.ip ? `🌐 IP : <code>${esc(opts.ip)}</code>\n` : "") +
    `🕐 ${togoDt()}`
  ).catch(() => {});
}

/* ─────────────────────────── BILAN QUOTIDIEN ─────────────────────────── */

async function sendDailyReport(): Promise<void> {
  if (!groupChatId) return;
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalUsers] = await db
      .select({ c: count() })
      .from(usersTable);

    const [todayUsers] = await db
      .select({ c: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, todayStart));

    const [todayTx] = await db
      .select({
        c: count(),
        vol: sql<number>`coalesce(sum(${transactionsTable.amount}), 0)`,
        fees: sql<number>`coalesce(sum(${transactionsTable.fees}), 0)`,
      })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, todayStart));

    const [successTx] = await db
      .select({ c: count() })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.createdAt, todayStart),
          eq(transactionsTable.status, "success")
        )
      );

    const [failedTx] = await db
      .select({ c: count() })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.createdAt, todayStart),
          eq(transactionsTable.status, "failed")
        )
      );

    const [pendingTx] = await db
      .select({ c: count() })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.createdAt, todayStart),
          eq(transactionsTable.status, "pending")
        )
      );

    const now = new Date();
    const hLabel = now.getUTCHours() === 0 ? "00h00" : "12h00";

    await sendMessage(
      groupChatId!,
      `📊 <b>BILAN ${hLabel} — BLOUM CASH</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👥 <b>Utilisateurs</b>\n` +
      `• Total : <b>${fmt(totalUsers.c)}</b>\n` +
      `• Aujourd'hui : +${todayUsers.c} nouveaux\n\n` +
      `💸 <b>Transactions du jour</b>\n` +
      `• Total : ${todayTx.c} opérations\n` +
      `• Volume : <b>${fmt(todayTx.vol)} FCFA</b>\n` +
      `• Commissions : ${fmt(todayTx.fees)} FCFA\n` +
      `• ✅ Réussies : ${successTx.c}\n` +
      `• ❌ Échouées : ${failedTx.c}\n` +
      `• ⏳ En attente : ${pendingTx.c}\n\n` +
      `📅 ${togoDt()} (Togo UTC+0)\n` +
      `<i>Rapport automatique Bloum Cash Admin</i>`
    );
  } catch (err) {
    logger.error({ err }, "Telegram daily report error");
  }
}

/* ─────────────────────────── POLLING ─────────────────────────── */

async function handleUpdate(update: Record<string, unknown>): Promise<void> {
  const message = update.message as Record<string, unknown> | undefined;
  const callbackQuery = update.callback_query as
    | Record<string, unknown>
    | undefined;

  if (message) {
    const text = String(message.text ?? "");
    const chat = message.chat as Record<string, unknown> | undefined;
    const chatId = String(chat?.id ?? "");

    const normalized = text
      .toLowerCase()
      .replace(/[''`]/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (
      normalized.includes("salut c'est toi le bot") ||
      normalized.includes("salut c est toi le bot") ||
      normalized.includes("salut cest toi le bot")
    ) {
      await saveGroupChatId(chatId);
      await sendMessage(
        chatId,
        `✅ <b>Groupe détecté et enregistré !</b>\n\n` +
        `Je vais maintenant envoyer toutes les notifications ici :\n` +
        `• 🆕 Nouveaux utilisateurs inscrits\n` +
        `• 💸 Paiements et transferts réussis\n` +
        `• 💬 Retours &amp; suggestions utilisateurs\n` +
        `• ⚠️ Tentatives de connexion admin échouées\n` +
        `• 🚫 IP bloquées (avec bouton blocage rapide)\n` +
        `• 📊 Bilans quotidiens à 00h et 12h (Togo)\n\n` +
        `<i>Bloum Cash Admin Bot actif ✓</i>`
      );
      logger.info({ chatId }, "🤖 Telegram group chat ID enregistré");
    }
  }

  if (callbackQuery) {
    const data = String(callbackQuery.data ?? "");
    const callbackId = String(callbackQuery.id ?? "");
    const cbMsg = callbackQuery.message as Record<string, unknown> | undefined;

    if (data.startsWith("block_ip:")) {
      const ip = data.slice(9).trim();
      if (!ip) return;

      try {
        await db
          .insert(blockedIpsTable)
          .values({ ip, reason: "Bloqué via bouton Telegram" });
        await db.insert(securityEventsTable).values({
          type: "ip_blocked",
          ip,
          details: "Bloqué via bouton Telegram par l'admin",
        });

        await tgFetch("answerCallbackQuery", {
          callback_query_id: callbackId,
          text: `✅ IP ${ip} bloquée définitivement !`,
          show_alert: true,
        });

        if (cbMsg) {
          const cbChat = cbMsg.chat as Record<string, unknown> | undefined;
          const cbMsgId = cbMsg.message_id;
          const originalText = String(cbMsg.text ?? "");
          await tgFetch("editMessageText", {
            chat_id: cbChat?.id,
            message_id: cbMsgId,
            text: originalText + `\n\n🚫 <b>IP bloquée définitivement par l'admin.</b>`,
            parse_mode: "HTML",
          });
        }

        logger.info({ ip }, "🚫 IP bloquée via bouton Telegram");
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        const alreadyBlocked =
          e?.code === "23505" || e?.message?.includes("unique");
        await tgFetch("answerCallbackQuery", {
          callback_query_id: callbackId,
          text: alreadyBlocked
            ? `⚠️ IP ${ip} déjà bloquée`
            : `❌ Erreur lors du blocage`,
          show_alert: true,
        });
      }
    }
  }
}

async function pollForever(): Promise<void> {
  let offset = 0;
  logger.info("🤖 Telegram long polling démarré");

  while (true) {
    try {
      const res = await fetch(
        `${TG_API}/getUpdates?offset=${offset}&timeout=25&allowed_updates=message,callback_query`,
        { signal: AbortSignal.timeout(35_000) }
      );

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }

      const data = (await res.json()) as {
        ok: boolean;
        result: Array<Record<string, unknown> & { update_id: number }>;
      };

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch((err) =>
            logger.error({ err }, "Telegram handleUpdate error")
          );
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
}

/* ─────────────────────────── SCHEDULER BILANS ─────────────────────────── */

let lastReportHour = -1;

function startScheduler(): void {
  setInterval(async () => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    if (m === 0 && (h === 0 || h === 12) && h !== lastReportHour) {
      lastReportHour = h;
      sendDailyReport().catch((err) =>
        logger.error({ err }, "Telegram scheduled report error")
      );
    }
  }, 60_000);
}

/* ─────────────────────────── DÉMARRAGE ─────────────────────────── */

export async function startTelegram(): Promise<void> {
  if (!TOKEN) {
    logger.warn("⚠️ TELEGRAM_BOT_TOKEN non configuré — bot Telegram désactivé");
    return;
  }

  await loadGroupChatId();

  pollForever().catch((err) =>
    logger.error({ err }, "Telegram polling fatal error")
  );

  startScheduler();

  if (groupChatId) {
    sendToGroup(
      `🟢 <b>SERVEUR REDÉMARRÉ — BLOUM CASH</b>\n\n` +
      `✅ Le bot Telegram est actif et opérationnel.\n` +
      `📡 Long polling en cours...\n` +
      `📅 ${togoDt()} (Togo UTC+0)\n\n` +
      `<i>Toutes les notifications sont rétablies.</i>`
    ).catch((err) => logger.error({ err }, "Telegram startup message error"));
  } else {
    logger.warn("⚠️ Telegram : aucun groupe enregistré — envoyez « salut c'est toi le bot » dans le groupe pour l'activer.");
  }

  logger.info("🤖 Telegram bot prêt (polling + scheduler quotidien)");
}
