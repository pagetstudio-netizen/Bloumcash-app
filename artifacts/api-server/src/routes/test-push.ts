import { Router, type IRouter } from "express";
import { requireUser } from "../middleware/user-auth";

const router: IRouter = Router();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY ?? "";
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

const TEST_EMAIL = "blousprono@gmail.com";

router.post("/test-push-self", requireUser, async (req, res) => {
  const user = req.currentUser!;

  if (user.email !== TEST_EMAIL) {
    res.status(403).json({ error: "Accès non autorisé." });
    return;
  }

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    res.status(503).json({ error: "OneSignal n'est pas configuré (variables manquantes)." });
    return;
  }

  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [TEST_EMAIL] },
      target_channel: "push",
      headings: { fr: "🔔 Test Notification", en: "🔔 Test Notification" },
      contents: {
        fr: "La notification push fonctionne correctement sur Bloum Cash !",
        en: "Push notification is working correctly on Bloum Cash!",
      },
    };

    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json() as {
      id?: string;
      errors?: string[] | Record<string, unknown>;
      recipients?: number;
    };

    req.log.info({ status: response.status, body }, "test-push-self — réponse OneSignal");

    if (
      Array.isArray(body.errors) &&
      body.errors.some((e: string) => e.toLowerCase().includes("not subscribed"))
    ) {
      res.status(200).json({
        success: false,
        notSubscribed: true,
        error:
          "Appareil non encore abonné aux notifications. Ouvrez l'app mobile Bloum Cash et acceptez les notifications.",
      });
      return;
    }

    if (!response.ok || (body.errors && (Array.isArray(body.errors) ? body.errors.length > 0 : true))) {
      res.status(502).json({
        success: false,
        error: "Échec de l'envoi via OneSignal.",
        details: body.errors ?? null,
      });
      return;
    }

    res.json({ success: true, notificationId: body.id, recipients: body.recipients });
  } catch (err) {
    req.log.error({ err }, "test-push-self error");
    res.status(500).json({ success: false, error: "Erreur serveur interne." });
  }
});

export default router;
