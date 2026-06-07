import React, { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, AlertCircle, ArrowDown, ArrowUp, Edit3, X, Calendar, SendHorizonal, CheckCircle2, XCircle } from "lucide-react";
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

const PERIODS = [
  { label: "Tout", value: "" },
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "week" },
  { label: "30 jours", value: "month" },
];

interface DisburseResult {
  success: boolean;
  reference?: string;
  transactionId?: string;
  message?: string;
  error?: string;
  code?: string;
}

export default function AdminTransactions() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forceModal, setForceModal] = useState<Tx | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  /* ── Disburse manuel ── */
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [dOperator, setDOperator] = useState<"tmoney" | "moov">("tmoney");
  const [dPhone, setDPhone] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [dMotif, setDMotif] = useState("");
  const [dLoading, setDLoading] = useState(false);
  const [dResult, setDResult] = useState<DisburseResult | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (period) params.set("period", period);
      const r = await adminFetch(`/admin/transactions?${params}`);
      if (!r.ok) { setError("Erreur chargement"); return; }
      const d = await r.json();
      setTxs(d.transactions);
      setTotal(d.total);
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter, period]);

  useEffect(() => { load(); }, [load]);

  const handleForce = async () => {
    if (!forceModal || !newStatus) return;
    setActionLoading(true);
    try {
      const r = await adminFetch(`/admin/transactions/${forceModal.id}/force-status`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      if (r.ok) { showToast("Statut mis à jour"); setForceModal(null); load(); }
    } finally { setActionLoading(false); }
  };

  const openDisburse = () => {
    setDPhone(""); setDAmount(""); setDMotif(""); setDResult(null);
    setDOperator("tmoney"); setDisburseOpen(true);
  };

  const handleDisburse = async () => {
    if (!dPhone.trim() || !dAmount) return;
    setDLoading(true); setDResult(null);
    try {
      const r = await adminFetch("/admin/disburse", {
        method: "POST",
        body: JSON.stringify({ operator: dOperator, phone: dPhone.trim(), amount: parseInt(dAmount), motif: dMotif.trim() || undefined }),
      });
      const data = await r.json() as DisburseResult;
      setDResult(data);
      if (data.success) {
        showToast(`✓ Déboursement envoyé — réf. ${data.reference}`);
        load();
      }
    } catch {
      setDResult({ success: false, error: "Erreur réseau" });
    } finally { setDLoading(false); }
  };

  const closeDisburse = () => { setDisburseOpen(false); setDResult(null); };

  const pages = Math.max(1, Math.ceil(total / 50));
  const totalAmount = txs.reduce((s, t) => s + t.amount, 0);
  const totalFees = txs.reduce((s, t) => s + t.fees, 0);
  const successCount = txs.filter(t => t.status === "success").length;

  const exportCSV = () => {
    const headers = ["ID", "Référence", "Type", "Titre", "Montant", "Commission", "Statut", "Opérateur", "De", "Vers", "UserID", "Date"];
    const rows = txs.map(t => [t.id, t.reference, t.type, `"${t.title}"`, t.amount, t.fees, t.status, t.operator, t.fromPhone ?? "", t.toPhone ?? "", t.userId ?? "", new Date(t.createdAt).toLocaleString("fr-FR")]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `transactions_${Date.now()}.csv`; a.click();
  };

  return (
    <AdminLayout title="Transactions">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        {/* Period tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { setPeriod(p.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick stats for current view */}
        {!loading && txs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Transactions affichées", value: String(txs.length), sub: `${successCount} réussies` },
              { label: "Volume total", value: formatAmount(totalAmount), sub: "montant brut" },
              { label: "Commissions", value: formatAmount(totalFees), sub: "frais collectés" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters + actions */}
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
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            Export CSV
          </button>
          {/* ── Débourser manuellement ── */}
          <button
            onClick={openDisburse}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
          >
            <SendHorizonal className="w-4 h-4" />
            Débourser manuellement
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
                  {["Réf.", "Type", "Titre", "Montant", "Commission", "Statut", "Opérateur", "De → Vers", "Date", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : txs.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-sm text-gray-400">Aucune transaction</td></tr>
                ) : txs.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-24" title={t.reference}>{t.reference.slice(-12)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">{TYPE_ICONS[t.type] ?? null}<span className="text-gray-600 text-xs capitalize">{t.type === "incoming" ? "Dépôt" : t.type === "outgoing" ? "Retrait" : t.type}</span></span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-32 truncate" title={t.title}>{t.title}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatAmount(t.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.fees > 0
                        ? <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatAmount(t.fees)}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.status === "success" ? "Succès" : t.status === "pending" ? "En attente" : t.status === "failed" ? "Échoué" : t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.operator}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.fromPhone ?? "—"} → {t.toPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <div>{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
                      <div className="text-gray-300">{new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
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

      {/* ── Force status modal ── */}
      {forceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Forcer le statut</h3>
              <button onClick={() => setForceModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-1 font-mono">{forceModal.reference}</p>
            <p className="text-sm font-semibold text-gray-800 mb-1">{formatAmount(forceModal.amount)}</p>
            {forceModal.fees > 0 && <p className="text-xs text-blue-600 mb-4">Commission : {formatAmount(forceModal.fees)}</p>}
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="success">Succès</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setForceModal(null)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={handleForce} disabled={actionLoading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Déboursement manuel modal ── */}
      {disburseOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <SendHorizonal className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Déboursement manuel</h3>
                  <p className="text-xs text-gray-400">Envoyer des fonds via PayDunya</p>
                </div>
              </div>
              <button onClick={closeDisburse} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Résultat si déjà soumis */}
              {dResult && (
                <div className={`rounded-xl p-4 flex items-start gap-3 ${dResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  {dResult.success
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${dResult.success ? "text-green-800" : "text-red-700"}`}>
                      {dResult.success ? "Déboursement envoyé avec succès" : "Déboursement refusé"}
                    </p>
                    {dResult.message && <p className="text-xs mt-1 text-gray-600 break-words">{dResult.message}</p>}
                    {dResult.error && <p className="text-xs mt-1 text-red-600 break-words">{dResult.error}</p>}
                    {dResult.reference && (
                      <p className="text-xs mt-1 font-mono text-gray-500">Réf : {dResult.reference}</p>
                    )}
                    {dResult.transactionId && (
                      <p className="text-xs font-mono text-gray-400">TX ID : {dResult.transactionId}</p>
                    )}
                    {dResult.code && !dResult.success && (
                      <p className="text-xs mt-1 text-red-500 font-mono">Code : {dResult.code}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Opérateur */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Opérateur</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["tmoney", "moov"] as const).map(op => (
                    <button
                      key={op}
                      onClick={() => setDOperator(op)}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        dOperator === op
                          ? op === "tmoney"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {op === "tmoney" ? "🔵 TMoney" : "🟠 Moov Money"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numéro destinataire */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Numéro destinataire
                  <span className="text-gray-400 font-normal ml-1">
                    {dOperator === "tmoney" ? "(TMoney : 90-93…)" : "(Moov : 96-99…)"}
                  </span>
                </label>
                <input
                  type="tel"
                  value={dPhone}
                  onChange={e => setDPhone(e.target.value)}
                  placeholder={dOperator === "tmoney" ? "ex: 92123456" : "ex: 97123456"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Montant */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant (FCFA)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={dAmount}
                    onChange={e => setDAmount(e.target.value)}
                    placeholder="ex: 5000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">FCFA</span>
                </div>
                {dAmount && parseInt(dAmount) > 0 && (
                  <p className="text-xs text-blue-600 mt-1">{formatAmount(parseInt(dAmount))}</p>
                )}
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Motif <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={dMotif}
                  onChange={e => setDMotif(e.target.value)}
                  placeholder="ex: Remboursement, correction transaction…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={closeDisburse}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleDisburse}
                disabled={dLoading || !dPhone.trim() || !dAmount || parseInt(dAmount) <= 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {dLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                  : <><SendHorizonal className="w-4 h-4" /> Envoyer</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
