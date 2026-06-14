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
  externalUserId: string;
  title: string;
  message: string;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  notSubscribed?: boolean;
  accessDenied?: boolean;
  error?: string;
  recipients?: number;
  notificationId?: string;
}

export async function sendPushNotification(
  options: PushNotificationOptions,
  log?: { warn: (obj: object, msg: string) => void; info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void }
): Promise<PushResult> {
  if (!isOneSignalConfigured()) {
    log?.warn({ reason: "ONESIGNAL_APP_ID ou ONESIGNAL_API_KEY manquant" }, "OneSignal non configuré — notification ignorée");
    return { success: false, error: "OneSignal non configuré" };
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [options.externalUserId] },
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
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json() as { id?: string; errors?: unknown; recipients?: number };

    const errorsArr = Array.isArray(body.errors) ? body.errors as string[] : [];

    /* Clé API invalide */
    if (response.status === 400 && errorsArr.some((e: string) => e.toLowerCase().includes("access denied"))) {
      log?.error({ externalUserId: options.externalUserId }, "OneSignal — CLEF API INVALIDE : vérifiez ONESIGNAL_API_KEY dans les paramètres");
      return { success: false, accessDenied: true, error: "Clé API OneSignal invalide — mettez à jour ONESIGNAL_API_KEY" };
    }

    /* Appareil non abonné */
    const notSubscribed = errorsArr.some((e: string) =>
      e.toLowerCase().includes("not subscribed") || e.toLowerCase().includes("no subscriptions")
    );
    if (notSubscribed) {
      log?.warn({ externalUserId: options.externalUserId }, "OneSignal — appareil non abonné (pas encore ouvert l'app Median)");
      return { success: false, notSubscribed: true };
    }

    /* Autre erreur OneSignal */
    if (!response.ok || errorsArr.length > 0) {
      log?.warn({ status: response.status, errors: body.errors, externalUserId: options.externalUserId }, "OneSignal — échec envoi");
      return { success: false, error: String(body.errors ?? response.status) };
    }

    log?.info({ notificationId: body.id, recipients: body.recipients, externalUserId: options.externalUserId }, "OneSignal — notification envoyée");
    return { success: true, notificationId: body.id, recipients: body.recipients };
  } catch (err) {
    log?.warn({ err, externalUserId: options.externalUserId }, "OneSignal — erreur réseau lors de l'envoi");
    return { success: false, error: String(err) };
  }
}
