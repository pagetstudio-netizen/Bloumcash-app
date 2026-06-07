import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY ?? "";
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

router.post("/send-push-notification", async (req, res) => {
  try {
    const { userEmail, title, message } = req.body as {
      userEmail?: string;
      title?: string;
      message?: string;
    };

    if (!userEmail || !title || !message) {
      res.status(400).json({ error: "Les champs userEmail, title et message sont requis." });
      return;
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      res.status(503).json({ error: "OneSignal n'est pas configuré sur ce serveur." });
      return;
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [userEmail],
      headings: { fr: title, en: title },
      contents: { fr: message, en: message },
    };

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
      req.log.warn({ status: response.status, errors: body.errors, userEmail }, "OneSignal — échec envoi notification");
      res.status(502).json({
        success: false,
        error: "Échec de l'envoi de la notification via OneSignal.",
        details: body.errors ?? null,
      });
      return;
    }

    req.log.info({ notificationId: body.id, userEmail }, "OneSignal — notification envoyée");
    res.json({ success: true, notificationId: body.id });
  } catch (err) {
    req.log.error({ err }, "send-push-notification error");
    res.status(500).json({ success: false, error: "Erreur serveur interne." });
  }
});

export default router;
