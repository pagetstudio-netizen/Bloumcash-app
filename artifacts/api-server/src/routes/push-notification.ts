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
      res.status(503).json({ error: "OneSignal n'est pas configuré sur ce serveur (variables manquantes)." });
      return;
    }

    // Essaie d'abord avec include_aliases (API v1 mode aliased — recommandé avec Median)
    // puis avec include_external_user_ids (ancienne syntaxe, conservée en fallback)
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [userEmail] },
      target_channel: "push",
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

    const body = await response.json() as {
      id?: string;
      errors?: string[] | Record<string, unknown>;
      recipients?: number;
    };

    req.log.info({ status: response.status, body, userEmail }, "OneSignal — réponse");

    // OneSignal retourne errors: ["All included players are not subscribed"]
    // quand l'appareil n'est pas encore enregistré (l'utilisateur n'a pas encore
    // ouvert l'app Median et accepté les notifications).
    // Ce n'est pas une vraie erreur serveur — on retourne un message explicite.
    if (
      Array.isArray(body.errors) &&
      body.errors.some((e: string) => e.toLowerCase().includes("not subscribed"))
    ) {
      res.status(200).json({
        success: false,
        notSubscribed: true,
        error:
          "Cet utilisateur n'est pas encore abonné aux notifications push. " +
          "Il doit d'abord ouvrir l'application mobile Bloum Cash (via Median) et accepter les notifications.",
      });
      return;
    }

    if (!response.ok || (body.errors && (Array.isArray(body.errors) ? body.errors.length > 0 : true))) {
      req.log.warn({ status: response.status, errors: body.errors, userEmail }, "OneSignal — échec envoi");
      res.status(502).json({
        success: false,
        error: "Échec de l'envoi de la notification via OneSignal.",
        details: body.errors ?? null,
      });
      return;
    }

    req.log.info({ notificationId: body.id, recipients: body.recipients, userEmail }, "OneSignal — notification envoyée");
    res.json({ success: true, notificationId: body.id, recipients: body.recipients });
  } catch (err) {
    req.log.error({ err }, "send-push-notification error");
    res.status(500).json({ success: false, error: "Erreur serveur interne." });
  }
});

export default router;
