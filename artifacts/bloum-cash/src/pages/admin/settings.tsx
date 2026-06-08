import React, { useEffect, useState, useCallback } from "react";
import { Save, Loader2, RefreshCw, AlertCircle, Settings } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

const SECTIONS = [
  {
    title: "Informations de la plateforme",
    fields: [
      { key: "platform_name", label: "Nom de la plateforme", type: "text" },
      { key: "support_email", label: "Email de support", type: "email" },
      { key: "support_phone", label: "Téléphone de support", type: "tel" },
    ],
  },
  {
    title: "Frais et commissions",
    fields: [
      { key: "fee_deposit_percent", label: "Frais de dépôt (%)", type: "number" },
      { key: "fee_withdraw_percent", label: "Frais de retrait (%)", type: "number" },
      { key: "fee_exchange_percent", label: "Frais d'échange (%)", type: "number" },
    ],
  },
  {
    title: "Réseaux sociaux",
    fields: [
      { key: "facebook_url", label: "Page Facebook URL", type: "url" },
      { key: "whatsapp_url", label: "Chaîne WhatsApp URL", type: "url" },
      { key: "youtube_url", label: "Chaîne YouTube URL", type: "url" },
      { key: "instagram_url", label: "Instagram URL", type: "url" },
      { key: "telegram_url", label: "Telegram URL", type: "url" },
      { key: "tiktok_url", label: "TikTok URL", type: "url" },
    ],
  },
];

const TOGGLES = [
  { key: "maintenance_mode", label: "Mode maintenance", description: "Désactive l'accès à la plateforme pour les utilisateurs", danger: true },
  { key: "withdrawals_enabled", label: "Retraits activés", description: "Autoriser les retraits sur la plateforme", danger: false },
];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/settings");
      if (r.ok) setSettings(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminFetch("/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
      if (r.ok) showToast("Paramètres sauvegardés !");
      else { const d = await r.json(); setError(d.error); }
    } finally { setSaving(false); }
  };

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));
  const toggle = (key: string) => setSettings(s => ({ ...s, [key]: s[key] === "true" ? "false" : "true" }));

  return (
    <AdminLayout title="Paramètres">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Configuration globale de la plateforme Bloum Cash</p>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={save} disabled={saving || loading} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde…</> : <><Save className="w-3.5 h-3.5" /> Sauvegarder</>}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <>
            {/* Toggle switches */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Contrôles de la plateforme</h3>
              <div className="space-y-4">
                {TOGGLES.map(({ key, label, description, danger }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${danger && settings[key] === "true" ? "text-red-600" : "text-gray-800"}`}>{label}</div>
                      <div className="text-xs text-gray-400">{description}</div>
                    </div>
                    <ToggleSwitch value={settings[key] === "true"} onChange={() => toggle(key)} />
                  </div>
                ))}
              </div>
            </div>

            {SECTIONS.map(section => (
              <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">{section.title}</h3>
                <div className="space-y-4">
                  {section.fields.map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                      <input
                        type={type}
                        value={settings[key] ?? ""}
                        onChange={e => set(key, e.target.value)}
                        step={type === "number" ? "0.1" : undefined}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Save at bottom */}
            <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</> : <><Save className="w-4 h-4" /> Sauvegarder tous les paramètres</>}
            </button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
