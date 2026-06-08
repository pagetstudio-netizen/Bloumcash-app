import React, { useState } from "react";
import { Mail, Send, Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

export default function AdminBroadcast() {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; sent?: number; failed?: number } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title || !body) return;
    if (!confirm(`Envoyer cet email à TOUS les utilisateurs actifs ?`)) return;
    setLoading(true); setResult(null);
    try {
      const r = await adminFetch("/admin/email/broadcast", {
        method: "POST",
        body: JSON.stringify({
          subject, title, body,
          buttonText: buttonText || undefined,
          buttonUrl: buttonUrl || undefined,
        }),
      });
      const d = await r.json();
      setResult({ success: r.ok, message: d.message ?? d.error ?? "Erreur", sent: d.sent, failed: d.failed });
      if (r.ok) { setSubject(""); setTitle(""); setBody(""); setButtonText(""); setButtonUrl(""); }
    } catch {
      setResult({ success: false, message: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Email Broadcast">
      <div className="max-w-2xl space-y-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Nouvel email de masse</h2>
              <p className="text-xs text-gray-400">Envoyé à tous les utilisateurs actifs via Resend</p>
            </div>
            <button type="button" onClick={() => setPreview(!preview)}
              className={`ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${preview ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Eye className="w-3.5 h-3.5" />
              {preview ? "Masquer aperçu" : "Aperçu"}
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sujet de l'email *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} required
                placeholder="ex: Nouvelle fonctionnalité disponible !" maxLength={150}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Titre affiché dans l'email *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="ex: 🎉 Une bonne nouvelle pour vous !" maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Corps du message *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} required rows={6}
                placeholder="Bonjour,&#10;&#10;Votre message ici…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <p className="text-xs text-gray-400 mt-1">{body.length} caractères</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Texte du bouton CTA</label>
                <input value={buttonText} onChange={e => setButtonText(e.target.value)}
                  placeholder="En savoir plus"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">URL du bouton CTA</label>
                <input value={buttonUrl} onChange={e => setButtonUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Aperçu email */}
            {preview && (title || body) && (
              <div className="border-2 border-blue-100 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 border-b border-blue-100">
                  Aperçu de l'email
                </div>
                <div className="p-4 bg-gray-50">
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-center">
                      <div className="text-white font-black text-lg">💎 Bloum Cash</div>
                      <div className="text-blue-200 text-xs tracking-widest uppercase mt-0.5">Togo • Fintech</div>
                    </div>
                    <div className="p-5">
                      {title && <h3 className="font-bold text-gray-900 text-base mb-1">{title}</h3>}
                      <p className="text-xs text-gray-400 mb-3">Bonjour [Prénom],</p>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{body}</p>
                      {buttonText && (
                        <div className="mt-4 text-center">
                          <span className="inline-block bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold px-5 py-2 rounded-lg">
                            {buttonText} →
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
                      <p className="text-xs text-gray-400">© 2026 Bloum Cash Togo</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className={`rounded-xl p-4 text-sm flex gap-3 ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {result.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <div>
                  {result.success && result.sent !== undefined && (
                    <p className="font-semibold mb-0.5">{result.sent} email(s) envoyé(s){result.failed ? `, ${result.failed} échec(s)` : ""}</p>
                  )}
                  <p>{result.message}</p>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !subject || !title || !body}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</> : <><Send className="w-4 h-4" /> Envoyer à tous les utilisateurs</>}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
