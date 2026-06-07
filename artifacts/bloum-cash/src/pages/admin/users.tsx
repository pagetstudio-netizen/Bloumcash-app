import React, { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Trash2, KeyRound, Loader2, ChevronLeft, ChevronRight, UserX, AlertCircle, Eye } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface User {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  role: string;
  status: string;
}

interface UserDetail {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  transactions: Array<{ id: number; reference: string; type: string; amount: number; status: string; createdAt: string }>;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [pinModal, setPinModal] = useState<number | null>(null);
  const [newPin, setNewPin] = useState("");
  const [blacklistModal, setBlacklistModal] = useState<User | null>(null);
  const [blacklistPhone, setBlacklistPhone] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      const r = await adminFetch(`/admin/users?${params}`);
      if (!r.ok) { setError("Erreur chargement"); return; }
      const data = await r.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur et toutes ses données ?")) return;
    setActionLoading(true);
    try {
      await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
      showToast("Utilisateur supprimé");
      load();
    } finally { setActionLoading(false); }
  };

  const handleResetPin = async () => {
    if (!newPin || newPin.length !== 6) { alert("PIN de 6 chiffres requis"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${pinModal}/reset-pin`, { method: "POST", body: JSON.stringify({ newPin }) });
      if (r.ok) { showToast("PIN réinitialisé"); setPinModal(null); setNewPin(""); }
      else { const d = await r.json(); alert(d.error); }
    } finally { setActionLoading(false); }
  };

  const handleBlacklist = async () => {
    if (!blacklistPhone) { alert("Numéro requis"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch("/admin/blacklist", { method: "POST", body: JSON.stringify({ phone: blacklistPhone, reason: `Blacklisté depuis profil utilisateur #${blacklistModal?.id}` }) });
      const d = await r.json();
      if (r.ok) { showToast("Numéro blacklisté"); setBlacklistModal(null); setBlacklistPhone(""); }
      else { alert(d.error); }
    } finally { setActionLoading(false); }
  };

  const loadDetail = async (id: number) => {
    const r = await adminFetch(`/admin/users/${id}`);
    if (r.ok) setDetail(await r.json());
  };

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <AdminLayout title="Utilisateurs">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 animate-pulse">
          {toast}
        </div>
      )}

      <div className="space-y-4">
        {/* Search + actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom ou email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">{total} utilisateur(s)</span>
            <span className="text-xs text-gray-400">Page {page}/{pages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom complet</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inscription</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">#{user.id}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{user.fullName}</td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{user.email}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => loadDetail(user.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir détails">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setPinModal(user.id); setNewPin(""); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset PIN">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setBlacklistModal(user); setBlacklistPhone(""); }} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Blacklister numéro">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(user.id)} disabled={actionLoading} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <span className="text-xs text-gray-400">{page}/{pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">Profil — {detail.fullName}</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{detail.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Inscription</span><span>{new Date(detail.createdAt).toLocaleDateString("fr-FR")}</span></div>
            </div>
            <h4 className="font-semibold text-gray-700 text-sm mb-2">Dernières transactions</h4>
            {detail.transactions.length === 0 ? <p className="text-sm text-gray-400">Aucune transaction</p> : detail.transactions.map(t => (
              <div key={t.id} className="flex justify-between py-1.5 border-b border-gray-50 text-xs">
                <span className="text-gray-500 font-mono">{t.reference}</span>
                <span className={`font-medium ${t.status === "success" ? "text-green-600" : t.status === "failed" ? "text-red-600" : "text-yellow-600"}`}>{(t.amount / 1000).toFixed(0)}K FCFA</span>
              </div>
            ))}
            <button onClick={() => setDetail(null)} className="mt-4 w-full py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">Fermer</button>
          </div>
        </div>
      )}

      {/* PIN modal */}
      {pinModal !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 mb-4">Réinitialiser le PIN</h3>
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/, "").slice(0, 6))} placeholder="Nouveau PIN (6 chiffres)" maxLength={6} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={() => setPinModal(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={handleResetPin} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist modal */}
      {blacklistModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 mb-2">Blacklister un numéro</h3>
            <p className="text-sm text-gray-500 mb-4">Utilisateur : {blacklistModal.fullName}</p>
            <input value={blacklistPhone} onChange={e => setBlacklistPhone(e.target.value)} placeholder="+228 90 00 00 00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="flex gap-2">
              <button onClick={() => setBlacklistModal(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={handleBlacklist} disabled={actionLoading} className="flex-1 py-2 bg-orange-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Blacklister"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
