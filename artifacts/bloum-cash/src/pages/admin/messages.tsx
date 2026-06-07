import React, { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Trash2, Edit3, X, Bell, AlertCircle } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface Notif {
  id: number;
  title: string;
  message: string;
  type: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const TYPES = [
  { value: "info", label: "Information", color: "bg-blue-100 text-blue-700" },
  { value: "success", label: "Succès", color: "bg-green-100 text-green-700" },
  { value: "warning", label: "Avertissement", color: "bg-yellow-100 text-yellow-700" },
  { value: "error", label: "Urgent", color: "bg-red-100 text-red-700" },
];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

const EMPTY: Omit<Notif, "id" | "createdAt"> = {
  title: "", message: "", type: "info", imageUrl: "", buttonText: "", buttonUrl: "", isActive: true,
};

export default function AdminMessages() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<Partial<Notif> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isEdit = !!(modal && "id" in modal && modal.id);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/notifications");
      if (r.ok) setNotifs(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!modal?.title || !modal?.message) { alert("Titre et message requis"); return; }
    setActionLoading(true);
    try {
      const body = JSON.stringify({
        title: modal.title, message: modal.message, type: modal.type, imageUrl: modal.imageUrl || null,
        buttonText: modal.buttonText || null, buttonUrl: modal.buttonUrl || null, isActive: modal.isActive,
      });
      if (isEdit) {
        await adminFetch(`/admin/notifications/${modal.id}`, { method: "PUT", body });
        showToast("Notification mise à jour");
      } else {
        await adminFetch("/admin/notifications", { method: "POST", body });
        showToast("Notification créée");
      }
      setModal(null); load();
    } finally { setActionLoading(false); }
  };

  const deleteNotif = async (id: number) => {
    if (!confirm("Supprimer cette notification ?")) return;
    await adminFetch(`/admin/notifications/${id}`, { method: "DELETE" });
    showToast("Notification supprimée"); load();
  };

  const toggleActive = async (n: Notif) => {
    await adminFetch(`/admin/notifications/${n.id}`, { method: "PUT", body: JSON.stringify({ ...n, isActive: !n.isActive }) });
    setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, isActive: !x.isActive } : x));
    showToast(n.isActive ? "Notification désactivée" : "Notification activée");
  };

  const typeInfo = (type: string) => TYPES.find(t => t.value === type) ?? TYPES[0];

  return (
    <AdminLayout title="Message global">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Créez des popups qui s'affichent sur le tableau de bord des utilisateurs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setModal({ ...EMPTY })} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Nouveau message
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun message global configuré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map(n => {
              const ti = typeInfo(n.type);
              return (
                <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ti.color}`}>{ti.label}</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${n.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {n.isActive ? "Actif" : "Inactif"}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{n.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{n.message}</p>
                      {n.buttonText && <p className="text-xs text-blue-600 mt-1">Bouton: {n.buttonText}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ToggleSwitch value={n.isActive} onChange={() => toggleActive(n)} />
                      <button onClick={() => setModal({ ...n })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteNotif(n.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{isEdit ? "Modifier" : "Nouveau"} message global</h3>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
                <input value={modal.title ?? ""} onChange={e => setModal({ ...modal, title: e.target.value })}
                  placeholder="Titre du message" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Message *</label>
                <textarea value={modal.message ?? ""} onChange={e => setModal({ ...modal, message: e.target.value })}
                  rows={3} placeholder="Contenu du message" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                <select value={modal.type ?? "info"} onChange={e => setModal({ ...modal, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">URL image (optionnel)</label>
                <input value={modal.imageUrl ?? ""} onChange={e => setModal({ ...modal, imageUrl: e.target.value })}
                  placeholder="https://…" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Texte du bouton</label>
                  <input value={modal.buttonText ?? ""} onChange={e => setModal({ ...modal, buttonText: e.target.value })}
                    placeholder="Voir plus" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">URL du bouton</label>
                  <input value={modal.buttonUrl ?? ""} onChange={e => setModal({ ...modal, buttonUrl: e.target.value })}
                    placeholder="/dashboard" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">Activer immédiatement</label>
                <ToggleSwitch value={modal.isActive !== false} onChange={v => setModal({ ...modal, isActive: v })} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={save} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isEdit ? "Sauvegarder" : "Créer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
