/**
 * AfricaSMS — envoi de SMS via https://www.africasms.com/docs
 *
 * Variables d'environnement requises (à configurer sur Plesk) :
 *   AFRICASMS_USERNAME  — votre nom d'utilisateur AfricaSMS
 *   AFRICASMS_API_KEY   — votre clé API AfricaSMS
 *   AFRICASMS_SENDER    — expéditeur (ex: "BLOUMCASH"), max 11 chars alphanum
 */

import { logger } from "./logger";

const BASE_URL = "https://www.africasms.com/api/sms/send";

function getConfig(): { username: string; apiKey: string; sender: string } | null {
  const username = process.env.AFRICASMS_USERNAME;
  const apiKey   = process.env.AFRICASMS_API_KEY;
  const sender   = process.env.AFRICASMS_SENDER ?? "BLOUMCASH";
  if (!username || !apiKey) return null;
  return { username, apiKey, sender };
}

/**
 * Normalise un numéro Togo pour AfricaSMS.
 * Accepte : "90123456", "+22890123456", "22890123456"
 * Retourne : "22890123456"
 */
function normalizeForSms(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("228")) return digits;
  if (digits.length === 8) return "228" + digits;
  return digits;
}

export interface SmsResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Envoie un SMS via AfricaSMS.
 * Ne lance jamais d'exception — retourne toujours un SmsResult.
 */
export async function sendSms(opts: {
  phone: string;
  message: string;
}): Promise<SmsResult> {
  const config = getConfig();
  if (!config) {
    logger.warn("AfricaSMS non configuré — AFRICASMS_USERNAME ou AFRICASMS_API_KEY manquant");
    return { success: false, error: "SMS non configuré" };
  }

  const to = normalizeForSms(opts.phone);

  const params = new URLSearchParams({
    username: config.username,
    api_key:  config.apiKey,
    to,
    from:     config.sender,
    message:  opts.message,
  });

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      logger.error({ status: res.status, body: text }, "AfricaSMS HTTP error");
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    // AfricaSMS retourne du JSON ou du texte selon la version
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { /* réponse texte simple */ }

    const success = res.ok && (
      !data.status || data.status === "success" || data.status === "200" || String(data.status) === "1800"
    );

    if (success) {
      logger.info({ to, sender: config.sender }, "SMS envoyé avec succès (AfricaSMS)");
      return { success: true, message: String(data.message ?? text) };
    } else {
      logger.error({ to, data }, "AfricaSMS — réponse d'erreur");
      return { success: false, error: String(data.message ?? data.error ?? text) };
    }
  } catch (err) {
    logger.error({ err, to }, "AfricaSMS — erreur réseau");
    return { success: false, error: (err as Error)?.message ?? "Erreur réseau SMS" };
  }
}

/**
 * Envoie un code de réinitialisation de mot de passe par SMS.
 */
export async function sendPinResetSms(opts: {
  phone: string;
  fullName: string;
  code: string;
}): Promise<SmsResult> {
  return sendSms({
    phone: opts.phone,
    message: `Bloum Cash - Bonjour ${opts.fullName}, votre code de réinitialisation est : ${opts.code}. Valable 15 minutes. Ne le partagez jamais.`,
  });
}

/**
 * Envoie un code de vérification admin par SMS.
 */
export async function sendAdminVerificationSms(opts: {
  phone: string;
  fullName: string;
  code: string;
}): Promise<SmsResult> {
  return sendSms({
    phone: opts.phone,
    message: `Bloum Cash Admin - Bonjour ${opts.fullName}, votre code de connexion est : ${opts.code}. Valable 10 minutes. Ne le partagez jamais.`,
  });
}
