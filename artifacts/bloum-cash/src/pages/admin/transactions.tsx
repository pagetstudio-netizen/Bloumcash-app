import React, { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, AlertCircle, ArrowDown, ArrowUp, Edit3, X } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";
import { formatAmount } from "@/lib/utils";

interface Tx {
  id: number;
  reference: string;
  type: string;
  title: string;
  amount: number;
  status: string;
  operator: string;
  fromPhone: string | null;
  toPhone: string | null;
  fees: number;
  description: string | null;
  userId: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  incoming: <ArrowDown className="w-3 h-3 text-green-600" />,
  outgoing: <ArrowUp className="w-3 h-3 text-red-600" />,
};

export default function AdminTransactions() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forceModal, setForceModal] = useState<Tx | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      const r = await adminFetch(`/admin/transactions?${params}`);
      if (!r.ok) { setError("Erreur chargement"); return; }
      const d = await r.json();
      setTxs(d.transactions);
      setTotal(d.total);
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleForce = async () => {
    if (!forceModal || !newStatus) return;
    setActionLoading(true);
    try {
      const r = await adminFetch(`/admin/transactions/${forceModal.id}/force-status`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      if (r.ok) { showToast("Statut mis à jour"); setForceModal(null); load(); }
    } finally { setActionLoading(false); }
  };

  const pages = Math.max(1, Math.ceil(total / 50));

  const exportCSV = () => {
    const headers = ["ID", "Référence", "Type", "Titre", "Montant", "Frais", "Statut", "Opérateur", "De", "Vers", "Date"];
    const rows = txs.map(t => [t.id, t.reference, t.type, `"${t.title}"`, t.amount, t.fees, t.status, t.operator, t.fromPhone ?? "", t.toPhone ?? "", new Date(t.createdAt).toLocaleString("fr-FR")]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `transactions_${Date.now()}.csv`; a.click();
  };

  return (
    <AdminLayout title="Transactions">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Référence ou numéro…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tous statuts</option>
            <option value="success">Succès</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tous types</option>
            <option value="incoming">Dépôt</option>
            <option value="outgoing">Retrait</option>
          </select>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Export CSV
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">{total} transaction(s)</span>
            <span className="text-xs text-gray-400">Page {page}/{pages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Réf.", "Type", "Montant", "Statut", "Opérateur", "De → Vers", "Date", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : txs.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">Aucune transaction</td></tr>
                ) : txs.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-24">{t.reference.slice(-12)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">{TYPE_ICONS[t.type] ?? null}<span className="text-gray-600 text-xs capitalize">{t.type}</span></span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatAmount(t.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.operator}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.fromPhone ?? "—"} → {t.toPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setForceModal(t); setNewStatus(t.status); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Forcer statut">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Force status modal */}
      {forceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Forcer le statut</h3>
              <button onClick={() => setForceModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1 font-mono">{forceModal.reference}</p>
            <p className="text-sm text-gray-600 mb-4">{formatAmount(forceModal.amount)}</p>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="success">Succès</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setForceModal(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={handleForce} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
