import React, { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, Trash2, KeyRound, Loader2, ChevronLeft, ChevronRight,
  UserX, AlertCircle, Eye, PauseCircle, Ban, CheckCircle2, PlusCircle, MinusCircle, X, Phone, MapPin, Pencil, Save,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";
import { formatAmount } from "@/lib/utils";

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  operator: string | null;
  status: string;
  balance: number;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserDetail {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  operator: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  village: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  transactions: Array<{ id: number; reference: string; type: string; amount: number; fees: number; status: string; createdAt: string }>;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: "Actif", cls: "bg-green-100 text-green-700" },
  suspended: { label: "Suspendu", cls: "bg-yellow-100 text-yellow-700" },
  banned: { label: "Banni", cls: "bg-red-100 text-red-700" },
};

type ModalType = "credit" | "debit" | "pin" | "blacklist" | "detail";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [modal, setModal] = useState<ModalType | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [newPin, setNewPin] = useState("");
  const [blacklistPhone, setBlacklistPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [editingLocation, setEditingLocation] = useState(false);
  const [locVillage, setLocVillage] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const r = await adminFetch(`/admin/users?${params}`);
      if (!r.ok) { setError("Erreur chargement"); return; }
      const data = await r.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = (type: ModalType, user: User) => {
    setSelectedUser(user);
    setModal(type);
    setNewPin(""); setBlacklistPhone(""); setAmount(""); setReason("");
  };

  const closeModal = () => { setModal(null); setSelectedUser(null); setDetail(null); };

  const handleAction = async (endpoint: string, body?: Record<string, unknown>) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${selectedUser.id}/${endpoint}`, {
        method: "POST", body: JSON.stringify(body ?? {}),
      });
      const d = await r.json();
      if (r.ok) { showToast(d.message ?? "Action effectuée"); closeModal(); load(); }
      else { alert(d.error ?? "Erreur"); }
    } catch { alert("Erreur réseau"); } finally { setActionLoading(false); }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Supprimer ${user.fullName} et toutes ses données ? Cette action est irréversible.`)) return;
    setActionLoading(true);
    try {
      await adminFetch(`/admin/users/${user.id}`, { method: "DELETE" });
      showToast("Utilisateur supprimé");
      load();
    } finally { setActionLoading(false); }
  };

  const handleStatusChange = async (user: User, action: "suspend" | "ban" | "reactivate") => {
    const labels = { suspend: "Suspendre", ban: "Bannir", reactivate: "Réactiver" };
    if (!confirm(`${labels[action]} ${user.fullName} ?`)) return;
    setActionLoading(true);
    try {
      const r = await adminFetch(`/admin/users/${user.id}/${action}`, { method: "POST", body: "{}" });
      const d = await r.json();
      if (r.ok) { showToast("Statut mis à jour"); load(); }
      else { alert(d.error ?? "Erreur"); }
    } catch { alert("Erreur réseau"); } finally { setActionLoading(false); }
  };

  const loadDetail = async (user: User) => {
    setSelectedUser(user);
    const r = await adminFetch(`/admin/users/${user.id}`);
    if (r.ok) { setDetail(await r.json()); setModal("detail"); }
  };

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <AdminLayout title="Utilisateurs">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, email ou téléphone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
            <option value="banned">Bannis</option>
          </select>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">{total} utilisateur(s)</span>
            <span className="text-xs text-gray-400">Page {page}/{pages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Opérateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Solde</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Inscription</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td></tr>
                ) : users.map(user => {
                  const st = STATUS_MAP[user.status] ?? STATUS_MAP.active;
                  return (
                    <tr key={user.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${user.status !== "active" ? "bg-gray-50/40" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">#{user.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{user.fullName}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-600 font-mono">{user.phone ?? <span className="text-gray-300">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-600">{user.operator ?? <span className="text-gray-300">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-sm font-semibold ${user.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>{formatAmount(user.balance)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => loadDetail(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir profil">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openModal("credit", user)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Créditer">
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openModal("debit", user)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Débiter">
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openModal("pin", user)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset PIN">
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {user.status === "active" ? (
                            <button onClick={() => handleStatusChange(user, "suspend")} disabled={actionLoading} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Suspendre">
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          {user.status !== "banned" ? (
                            <button onClick={() => handleStatusChange(user, "ban")} disabled={actionLoading} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Bannir">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          {user.status !== "active" ? (
                            <button onClick={() => handleStatusChange(user, "reactivate")} disabled={actionLoading} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Réactiver">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button onClick={() => openModal("blacklist", user)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Blacklister numéro">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(user)} disabled={actionLoading} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* ── Detail modal ── */}
      {modal === "detail" && detail && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Profil — {detail.fullName}</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Email", value: detail.email },
                { label: "Téléphone", value: detail.phone ?? "—" },
                { label: "Opérateur", value: detail.operator ?? "—" },
                { label: "Statut", value: STATUS_MAP[detail.status]?.label ?? detail.status },
                { label: "Solde", value: formatAmount(selectedUser.balance) },
                { label: "Inscription", value: new Date(detail.createdAt).toLocaleDateString("fr-FR") },
                { label: "Dernière connexion", value: detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleDateString("fr-FR") : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* ── Localisation ── */}
            {(detail.village || detail.city || detail.region || detail.country) && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span>📍</span> Localisation
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Village", value: detail.village },
                    { label: "Ville", value: detail.city },
                    { label: "Région", value: detail.region },
                    { label: "Pays", value: detail.country },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="bg-blue-50 rounded-xl px-3 py-2.5">
                      <div className="text-xs text-blue-500 mb-0.5">{label}</div>
                      <div className="text-sm font-medium text-blue-900 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!(detail.village || detail.city || detail.region || detail.country) && (
              <div className="mb-4 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className="text-base">📍</span>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Localisation</div>
                  <div className="text-sm text-gray-400 italic">Non renseignée</div>
                </div>
              </div>
            )}
            <h4 className="font-semibold text-gray-700 text-sm mb-2">Dernières transactions</h4>
            {detail.transactions.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Aucune transaction</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {detail.transactions.map(t => (
                  <div key={t.id} className="flex justify-between py-2 text-xs">
                    <span className="text-gray-500 font-mono truncate mr-2">{t.reference.slice(-16)}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${t.status === "success" ? "bg-green-100 text-green-700" : t.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{t.status}</span>
                      <span className="font-semibold text-gray-800">{formatAmount(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closeModal} className="mt-4 w-full py-2.5 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 font-medium">Fermer</button>
          </div>
        </div>
      )}

      {/* ── Credit modal ── */}
      {modal === "credit" && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center"><PlusCircle className="w-4 h-4 text-green-600" /></div>
                <h3 className="font-bold text-gray-900">Créditer le solde</h3>
              </div>
              <button onClick={closeModal}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedUser.fullName} — solde actuel : <strong>{formatAmount(selectedUser.balance)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Montant (FCFA) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="ex: 5000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Raison (optionnel)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Bonus, remboursement…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={() => handleAction("credit", { amount: parseInt(amount), reason })} disabled={actionLoading || !amount}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Créditer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Debit modal ── */}
      {modal === "debit" && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center"><MinusCircle className="w-4 h-4 text-orange-600" /></div>
                <h3 className="font-bold text-gray-900">Débiter le solde</h3>
              </div>
              <button onClick={closeModal}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedUser.fullName} — solde actuel : <strong>{formatAmount(selectedUser.balance)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Montant (FCFA) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="ex: 1000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Raison (optionnel)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Fraude, rectification…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={() => handleAction("debit", { amount: parseInt(amount), reason })} disabled={actionLoading || !amount}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MinusCircle className="w-4 h-4" /> Débiter</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PIN modal ── */}
      {modal === "pin" && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Réinitialiser le PIN</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedUser.fullName}</p>
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/, "").slice(0, 6))} placeholder="Nouveau PIN (6 chiffres)" maxLength={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={async () => {
                if (!newPin || newPin.length !== 6) { alert("PIN de 6 chiffres requis"); return; }
                setActionLoading(true);
                try {
                  const r = await adminFetch(`/admin/users/${selectedUser.id}/reset-pin`, { method: "POST", body: JSON.stringify({ newPin }) });
                  if (r.ok) { showToast("PIN réinitialisé"); closeModal(); }
                  else { const d = await r.json(); alert(d.error); }
                } finally { setActionLoading(false); }
              }} disabled={actionLoading || newPin.length !== 6} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blacklist modal ── */}
      {modal === "blacklist" && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Blacklister un numéro</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Utilisateur : <strong>{selectedUser.fullName}</strong></p>
            <input value={blacklistPhone} onChange={e => setBlacklistPhone(e.target.value)}
              placeholder="+228 90 00 00 00"
              defaultValue={selectedUser.phone ?? ""}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={async () => {
                if (!blacklistPhone) { alert("Numéro requis"); return; }
                setActionLoading(true);
                try {
                  const r = await adminFetch("/admin/blacklist", { method: "POST", body: JSON.stringify({ phone: blacklistPhone, reason: `Blacklisté depuis profil utilisateur #${selectedUser.id}` }) });
                  const d = await r.json();
                  if (r.ok) { showToast("Numéro blacklisté"); closeModal(); }
                  else { alert(d.error); }
                } finally { setActionLoading(false); }
              }} disabled={actionLoading || !blacklistPhone} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Blacklister"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
