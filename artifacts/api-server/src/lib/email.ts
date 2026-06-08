import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL
  ? `Bloum Cash Togo <${process.env.RESEND_FROM_EMAIL}>`
  : "Bloum Cash Togo <noreply@bloumcash.tg>";

/* ── Template de base ─────────────────────────────────────────────────────── */
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Bloum Cash</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(26,63,196,0.13);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3fc4 0%,#2b50e8 100%);padding:36px 40px 28px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:10px 18px;margin-bottom:14px;">
              <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">💎 Bloum Cash</span>
            </div>
            <div style="color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Togo • Fintech</div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8faff;border-top:1px solid #e8eeff;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#8a9ac0;">© 2026 Bloum Cash Togo — Tous droits réservés</p>
            <p style="margin:0;font-size:11px;color:#b0bdd8;">Cet email a été envoyé automatiquement, ne pas répondre.<br/>En cas de problème, contactez <span style="color:#1a3fc4;">support@bloumcash.tg</span></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── 1. Email de bienvenue ────────────────────────────────────────────────── */
export async function sendWelcomeEmail(opts: { to: string; fullName: string }) {
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:8px;">🎉</div>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#1a2a6c;">Bienvenue, ${opts.fullName} !</h1>
      <p style="margin:10px 0 0;color:#667299;font-size:15px;">Votre compte Bloum Cash est créé avec succès</p>
    </div>
    <div style="background:linear-gradient(135deg,#f0f4ff 0%,#e8eeff 100%);border-radius:14px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 12px;font-size:15px;color:#334;line-height:1.6;">
        Avec <strong style="color:#1a3fc4;">Bloum Cash</strong>, vous pouvez désormais :
      </p>
      <ul style="margin:0;padding-left:20px;color:#445;font-size:14px;line-height:2;">
        <li>💸 Transférer de l'argent entre <strong>TMoney</strong> et <strong>Moov Money</strong></li>
        <li>📱 Payer via <strong>QR Code</strong> en quelques secondes</li>
        <li>📊 Suivre toutes vos transactions en temps réel</li>
        <li>🔒 Profiter d'une sécurité bancaire de haut niveau</li>
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="https://bloumcash.tg" style="display:inline-block;background:linear-gradient(135deg,#1a3fc4,#2b50e8);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
        Accéder à mon compte →
      </a>
    </div>
  `);
  const resend = getResend();
  if (!resend) { console.warn("RESEND_API_KEY not set — welcome email skipped"); return; }
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `🎉 Bienvenue sur Bloum Cash, ${opts.fullName} !`,
    html,
  });
}

/* ── 2. Réinitialisation du PIN ──────────────────────────────────────────── */
export async function sendPinResetEmail(opts: { to: string; fullName: string; code: string }) {
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">🔐</div>
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#1a2a6c;">Réinitialisation de votre PIN</h1>
      <p style="margin:10px 0 0;color:#667299;font-size:15px;">Bonjour ${opts.fullName}</p>
    </div>
    <p style="font-size:15px;color:#445;line-height:1.7;margin-bottom:24px;">
      Vous avez demandé la réinitialisation de votre code PIN.<br/>
      Utilisez le code ci-dessous pour continuer :
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#1a3fc4,#2b50e8);border-radius:16px;padding:4px;">
        <div style="background:#fff;border-radius:13px;padding:20px 48px;">
          <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1a3fc4;font-family:monospace;">${opts.code}</div>
        </div>
      </div>
    </div>
    <div style="background:#fff8e8;border:1px solid #ffd970;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#8a6500;">
        ⏱️ Ce code expire dans <strong>15 minutes</strong><br/>
        Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    </div>
  `);
  const resend = getResend();
  if (!resend) { console.warn("RESEND_API_KEY not set — pin reset email skipped"); return; }
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "🔐 Code de réinitialisation — Bloum Cash",
    html,
  });
}

/* ── 3. Code de vérification admin (connexion suspecte / nouveau device) ─── */
export async function sendAdminVerificationCode(opts: {
  to: string;
  fullName: string;
  code: string;
  reason: "inactivity" | "new_device";
}) {
  const reasonText = opts.reason === "inactivity"
    ? "Vous ne vous êtes pas connecté depuis plus de 3 jours."
    : "Une connexion depuis un nouvel appareil ou navigateur a été détectée.";

  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">${opts.reason === "new_device" ? "📱" : "⏰"}</div>
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#1a2a6c;">Vérification d'identité</h1>
      <p style="margin:10px 0 0;color:#667299;font-size:15px;">Espace Administrateur — Bloum Cash</p>
    </div>
    <div style="background:#fff3f3;border:1px solid #ffc5c5;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#c0392b;">
        🔒 <strong>Connexion sécurisée requise</strong><br/>
        ${reasonText}
      </p>
    </div>
    <p style="font-size:15px;color:#445;line-height:1.7;margin-bottom:24px;">
      Bonjour <strong>${opts.fullName}</strong>,<br/>
      Entrez le code suivant pour accéder au panneau d'administration :
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#1a3fc4,#2b50e8);border-radius:16px;padding:4px;">
        <div style="background:#fff;border-radius:13px;padding:20px 48px;">
          <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1a3fc4;font-family:monospace;">${opts.code}</div>
        </div>
      </div>
    </div>
    <div style="background:#fff8e8;border:1px solid #ffd970;border-radius:12px;padding:16px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#8a6500;">
        ⏱️ Ce code expire dans <strong>10 minutes</strong><br/>
        Si ce n'est pas vous, changez votre mot de passe immédiatement.
      </p>
    </div>
  `);
  const resend = getResend();
  if (!resend) { console.warn("RESEND_API_KEY not set — admin verification email skipped"); return; }
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "🔒 Code de vérification admin — Bloum Cash",
    html,
  });
}

/* ── 4. Email de masse (campagne admin) ──────────────────────────────────── */
export async function sendMassEmail(opts: {
  to: string;
  fullName: string;
  subject: string;
  title: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
}) {
  const button = opts.buttonText
    ? `<div style="text-align:center;margin-top:28px;">
        <a href="${opts.buttonUrl ?? "#"}" style="display:inline-block;background:linear-gradient(135deg,#1a3fc4,#2b50e8);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
          ${opts.buttonText} →
        </a>
       </div>`
    : "";

  const html = baseTemplate(`
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#1a2a6c;">${opts.title}</h1>
    <p style="margin:0 0 24px;color:#667299;font-size:14px;">Bonjour ${opts.fullName},</p>
    <div style="font-size:15px;color:#334;line-height:1.8;white-space:pre-wrap;">${opts.body.replace(/\n/g, "<br/>")}</div>
    ${button}
    <hr style="border:none;border-top:1px solid #e8eeff;margin:32px 0 20px;"/>
    <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
      Vous recevez cet email car vous êtes inscrit sur Bloum Cash Togo.
    </p>
  `);
  const resend = getResend();
  if (!resend) { console.warn("RESEND_API_KEY not set — mass email skipped"); return; }
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html,
  });
}
