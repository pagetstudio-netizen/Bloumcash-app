import React, { useState } from "react";
import { Mail, Send, Loader2, Info } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

export default function AdminBroadcast() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; sent?: number } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;
    if (!confirm(`Envoyer cet email à TOUS les utilisateurs ?`)) return;
    setLoading(true); setResult(null);
    try {
      const r = await adminFetch("/admin/broadcast/email", {
        method: "POST",
        body: JSON.stringify({ subject, body, buttonText: buttonText || null, buttonUrl: buttonUrl || null }),
      });
      const d = await r.json();
      setResult({ success: r.ok, message: d.message ?? d.error ?? "Erreur", sent: d.sent });
      if (r.ok) { setSubject(""); setBody(""); setButtonText(""); setButtonUrl(""); }
    } catch { setResult({ success: false, message: "Erreur réseau" }); } finally { setLoading(false); }
  };

  return (
    <AdminLayout title="Email Broadcast">
      <div className="max-w-2xl space-y-6">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Service email requis</p>
            <p className="text-xs text-blue-600">Pour activer l'envoi réel, connectez un service (Resend, SendGrid, etc.) dans les paramètres du serveur. La diffusion est actuellement enregistrée sans envoi effectif.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Nouvel email de masse</h2>
              <p className="text-xs text-gray-400">Envoyé à tous les utilisateurs inscrits</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sujet *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} required
                placeholder="ex: Nouvelle fonctionnalité disponible !" maxLength={150}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Corps du message *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} required rows={6}
                placeholder="Bonjour,&#10;&#10;Votre message ici…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              <p className="text-xs text-gray-400 mt-1">{body.length} caractères</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Texte du bouton CTA</label>
                <input value={buttonText} onChange={e => setButtonText(e.target.value)}
                  placeholder="En savoir plus"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">URL du bouton CTA</label>
                <input value={buttonUrl} onChange={e => setButtonUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {result && (
              <div className={`rounded-xl p-4 text-sm ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {result.success && result.sent !== undefined && (
                  <p className="font-medium mb-1">{result.sent} destinataire(s)</p>
                )}
                {result.message}
              </div>
            )}

            <button type="submit" disabled={loading || !subject || !body}
              className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</> : <><Send className="w-4 h-4" /> Envoyer à tous</>}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
