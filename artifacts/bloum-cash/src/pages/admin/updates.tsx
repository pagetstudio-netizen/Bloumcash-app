import React, { useEffect, useState, useCallback } from "react";
import { Save, Loader2, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

type UpdateMode = "disabled" | "optional" | "mandatory";

const MODES: { value: UpdateMode; label: string; description: string }[] = [
  { value: "disabled", label: "Désactivé", description: "Aucune notification." },
  { value: "optional", label: "Optionnel", description: "Modal fermable — l'utilisateur peut ignorer." },
  { value: "mandatory", label: "Obligatoire", description: "Bloque toute l'app jusqu'à la mise à jour." },
];

export default function AdminUpdates() {
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
      const payload = {
        update_mode: settings.update_mode ?? "disabled",
        min_required_version: settings.min_required_version ?? "",
        update_download_url: settings.update_download_url ?? "",
        update_title: settings.update_title ?? "",
        update_message: settings.update_message ?? "",
      };
      const r = await adminFetch("/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
      if (r.ok) showToast("Paramètres de mise à jour sauvegardés !");
      else { const d = await r.json(); setError(d.error); }
    } finally { setSaving(false); }
  };

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));
  const mode = (settings.update_mode ?? "disabled") as UpdateMode;

  return (
    <AdminLayout title="Mises à jour">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Gérer la notification de mise à jour de l'application</p>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <>
            {/* Mode */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Mode de mise à jour</h3>
              <div className="space-y-3">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => set("update_mode", m.value)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${
                      mode === m.value
                        ? m.value === "mandatory"
                          ? "border-red-400 bg-red-50"
                          : "border-blue-400 bg-blue-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        mode === m.value ? (m.value === "mandatory" ? "border-red-500" : "border-blue-500") : "border-gray-300"
                      }`}
                    >
                      {mode === m.value && (
                        <span className={`w-2 h-2 rounded-full ${m.value === "mandatory" ? "bg-red-500" : "bg-blue-500"}`} />
                      )}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${mode === m.value && m.value === "mandatory" ? "text-red-600" : "text-gray-800"}`}>
                        {m.label}
                      </span>
                      <span className="block text-xs text-gray-400">{m.description}</span>
                    </span>
                  </button>
                ))}
              </div>

              {mode === "mandatory" && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Toute l'app sera bloquée pour les utilisateurs dont la version est inférieure à la version minimale.
                </div>
              )}
            </div>

            {/* Version requise */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Version requise</h3>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Version minimale (ex: 1.0.2)</label>
              <input
                type="text"
                value={settings.min_required_version ?? ""}
                onChange={(e) => set("min_required_version", e.target.value)}
                placeholder="1.0.0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">Les utilisateurs avec une version inférieure verront la notification.</p>
            </div>

            {/* Lien de téléchargement */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Lien de téléchargement</h3>
              <label className="text-xs font-medium text-gray-600 mb-1 block">URL Play Store / App Store / page externe</label>
              <input
                type="url"
                value={settings.update_download_url ?? ""}
                onChange={(e) => set("update_download_url", e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Message affiché */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Message affiché</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Titre</label>
                  <input
                    type="text"
                    value={settings.update_title ?? ""}
                    onChange={(e) => set("update_title", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
                  <textarea
                    value={settings.update_message ?? ""}
                    onChange={(e) => set("update_message", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</> : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
