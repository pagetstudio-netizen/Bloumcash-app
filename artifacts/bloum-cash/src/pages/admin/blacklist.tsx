import React, { useEffect, useState, useCallback } from "react";
import { Ban, Plus, Trash2, RefreshCw, Loader2, Search, AlertCircle, X } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface Blacklisted {
  id: number;
  phone: string;
  reason: string | null;
  blockedBy: string | null;
  createdAt: string;
}

interface BlacklistData {
  blacklist: Blacklisted[];
  stats: { blocked: number; securityLogs: number; unlockAttempts: number };
}

export default function AdminBlacklist() {
  const [data, setData] = useState<BlacklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/blacklist");
      if (r.ok) setData(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!phone) { alert("Numéro requis"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch("/admin/blacklist", { method: "POST", body: JSON.stringify({ phone, reason }) });
      const d = await r.json();
      if (r.ok) { showToast("Numéro blacklisté"); setModal(false); setPhone(""); setReason(""); load(); }
      else { alert(d.error); }
    } finally { setActionLoading(false); }
  };

  const handleRemove = async (id: number, ph: string) => {
    if (!confirm(`Retirer ${ph} de la blacklist ?`)) return;
    await adminFetch(`/admin/blacklist/${id}`, { method: "DELETE" });
    showToast("Numéro retiré de la blacklist");
    load();
  };

  const filtered = (data?.blacklist ?? []).filter(b => !search || b.phone.includes(search) || (b.reason ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Blacklist">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Numéros bloqués", value: data.stats.blocked, color: "text-red-600" },
              { label: "Logs sécurité", value: data.stats.securityLogs, color: "text-orange-600" },
              { label: "Tentatives déverrouillage", value: data.stats.unlockAttempts, color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un numéro…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setModal(true); setPhone(""); setReason(""); }} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">
            <Plus className="w-3.5 h-3.5" /> Bloquer un numéro
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">{filtered.length} numéro(s) blacklisté(s)</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Ban className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Aucun numéro blacklisté</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(b => (
                <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Ban className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm font-mono">{b.phone}</div>
                      <div className="text-xs text-gray-400">{b.reason ?? "Sans raison"} · {b.blockedBy ?? "admin"} · {new Date(b.createdAt).toLocaleDateString("fr-FR")}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(b.id, b.phone)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Retirer de la blacklist">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Bloquer un numéro</h3>
              <button onClick={() => setModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Numéro de téléphone *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+228 90 00 00 00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Raison (optionnel)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  placeholder="Activité suspecte, fraude…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={handleAdd} disabled={actionLoading || !phone} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Blacklister"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
