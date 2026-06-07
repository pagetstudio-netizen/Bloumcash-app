/**
 * Service OneSignal — envoi de notifications push via l'API REST OneSignal.
 * Utilise les variables d'env ONESIGNAL_APP_ID et ONESIGNAL_API_KEY.
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY ?? "";
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

export function isOneSignalConfigured(): boolean {
  return Boolean(ONESIGNAL_APP_ID && ONESIGNAL_API_KEY);
}

export interface PushNotificationOptions {
  /** Email de l'utilisateur cible (utilisé comme external_id) */
  externalUserId: string;
  /** Titre de la notification */
  title: string;
  /** Corps du message */
  message: string;
  /** Données supplémentaires envoyées avec la notification (ex: référence transaction) */
  data?: Record<string, string>;
}

/**
 * Envoie une notification push à un utilisateur identifié par son email (external_id).
 * Ne lève jamais d'exception — les erreurs sont retournées silencieusement pour
 * ne pas bloquer le flux principal de l'API.
 */
export async function sendPushNotification(
  options: PushNotificationOptions,
  log?: { warn: (obj: object, msg: string) => void; info: (obj: object, msg: string) => void }
): Promise<void> {
  if (!isOneSignalConfigured()) {
    log?.warn({ reason: "ONESIGNAL_APP_ID ou ONESIGNAL_API_KEY manquant" }, "OneSignal non configuré — notification ignorée");
    return;
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: {
      external_id: [options.externalUserId],
    },
    target_channel: "push",
    headings: { fr: options.title, en: options.title },
    contents: { fr: options.message, en: options.message },
    ...(options.data ? { data: options.data } : {}),
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json() as { id?: string; errors?: unknown };

    if (!response.ok || body.errors) {
      log?.warn({ status: response.status, errors: body.errors, externalUserId: options.externalUserId }, "OneSignal — échec d'envoi de la notification");
    } else {
      log?.info({ notificationId: body.id, externalUserId: options.externalUserId }, "OneSignal — notification envoyée");
    }
  } catch (err) {
    log?.warn({ err, externalUserId: options.externalUserId }, "OneSignal — erreur réseau lors de l'envoi");
  }
}
