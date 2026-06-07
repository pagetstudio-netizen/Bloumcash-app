import React, { useState } from "react";
import {
  BellRing, Send, Loader2, Users, User, CheckCircle,
  XCircle, Info, ChevronDown,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

type Target = "all" | "user";
type Status = "idle" | "loading" | "success" | "error";

interface SendResult {
  sent?: number;
  notificationId?: string;
  message?: string;
  error?: string;
}

export default function AdminPushCampaigns() {
  const [target, setTarget] = useState<Target>("all");
  const [userEmail, setUserEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SendResult | null>(null);

  const isValid =
    title.trim() &&
    message.trim() &&
    (target === "all" || (target === "user" && userEmail.trim()));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const confirmMsg =
      target === "all"
        ? "Envoyer cette notification à TOUS les utilisateurs ?"
        : `Envoyer cette notification à ${userEmail} ?`;
    if (!confirm(confirmMsg)) return;

    setStatus("loading");
    setResult(null);

    try {
      let res: Response;

      if (target === "all") {
        res = await adminFetch("/admin/notifications/push/broadcast", {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), message: message.trim() }),
        });
      } else {
        res = await fetch("/api/send-push-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("bloum_admin_token")}`,
          },
          body: JSON.stringify({
            userEmail: userEmail.trim(),
            title: title.trim(),
            message: message.trim(),
          }),
        });
      }

      const data = await res.json() as SendResult;
      setResult(data);
      setStatus(res.ok ? "success" : "error");

      if (res.ok) {
        setTitle("");
        setMessage("");
        setUserEmail("");
      }
    } catch {
      setResult({ error: "Erreur réseau — impossible de joindre le serveur." });
      setStatus("error");
    }
  };

  return (
    <AdminLayout title="Campagnes Push">
      <div className="max-w-2xl space-y-6">

        {/* Info banner */}
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Notifications push via OneSignal</p>
            <p className="text-xs text-indigo-600">
              Les utilisateurs doivent avoir accepté les notifications dans l'app mobile Bloum Cash.
              Les notifications en broadcast ciblent tous les utilisateurs enregistrés dans OneSignal.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <BellRing className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Nouvelle campagne push</h2>
              <p className="text-xs text-gray-400">Envoyez une notification à un ou tous les utilisateurs</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-5">

            {/* Audience selector */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Audience *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget("all")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    target === "all"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  Tous les utilisateurs
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("user")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    target === "user"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  Utilisateur ciblé
                </button>
              </div>
            </div>

            {/* Email cible (si user) */}
            {target === "user" && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Email de l'utilisateur *
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  required={target === "user"}
                  placeholder="utilisateur@exemple.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Titre */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Titre de la notification *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="ex : Offre spéciale Bloum Cash 🎉"
                maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Message *
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Rédigez votre message…"
                maxLength={500}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
            </div>

            {/* Résultat */}
            {result && (
              <div className={`rounded-xl p-4 text-sm flex gap-3 ${
                status === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {status === "success"
                  ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                }
                <div>
                  {status === "success" && result.sent !== undefined && (
                    <p className="font-semibold mb-0.5">
                      {result.sent} utilisateur{result.sent > 1 ? "s" : ""} notifié{result.sent > 1 ? "s" : ""}
                    </p>
                  )}
                  {status === "success" && result.notificationId && (
                    <p className="font-semibold mb-0.5">Notification envoyée avec succès</p>
                  )}
                  <p className="text-xs opacity-80">
                    {result.message ?? result.error ?? (status === "success" ? "Envoi réussi." : "Une erreur est survenue.")}
                  </p>
                </div>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={status === "loading" || !isValid}
              className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              ) : (
                <><Send className="w-4 h-4" />
                  {target === "all" ? "Envoyer à tous les utilisateurs" : "Envoyer à l'utilisateur"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
