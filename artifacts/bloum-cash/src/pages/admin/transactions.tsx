import React, { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, AlertCircle,
  ArrowDown, ArrowUp, Edit3, X, Calendar, SendHorizonal, CheckCircle2,
  XCircle, User, Phone, Mail, Hash, RotateCcw, Info,
} from "lucide-react";
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
  toOperator: string | null;
  fees: number;
  description: string | null;
  userId: number | null;
  paydunyaToken: string | null;
  payoutSent: boolean;
  createdAt: string;
}

interface TxDetail extends Tx {
  user: { fullName: string; email: string; phone: string | null; operator: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed:  "bg-red-100 text-red-700",
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

/* ── Utilitaires ── */
const fmtLabel = (s: string) => s === "success" ? "Succès" : s === "pending" ? "En attente" : s === "failed" ? "Échoué" : s;
const fmtType  = (t: string) => t === "incoming" ? "Dépôt" : t === "outgoing" ? "Retrait" : t;

/* ── Modal détail transaction ─────────────────────────── */
function DetailModal({ tx, onClose, onUpdated }: { tx: TxDetail; onClose: () => void; onUpdated: () => void }) {
  const [newStatus, setNewStatus] = useState(tx.status);
  const [loading, setLoading]     = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  const forceStatus = async () => {
    if (newStatus === tx.status) return;
    setLoading(true); setMsg(null);
    try {
      const r = await adminFetch(`/admin/transactions/${tx.id}/force-status`, {
        method: "PUT", body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) { setMsg({ ok: true, text: "Statut mis à jour" }); onUpdated(); }
      else { const d = await r.json(); setMsg({ ok: false, text: d.error ?? "Erreur" }); }
    } finally { setLoading(false); }
  };

  const retryPayout = async () => {
    if (!confirm("Relancer le retrait vers " + tx.toPhone + " ?")) return;
    setRetryLoading(true); setMsg(null);
    try {
      const r = await adminFetch(`/admin/transactions/${tx.id}/retry-payout`, { method: "POST" });
      const d = await r.json();
      if (r.ok && d.success) { setMsg({ ok: true, text: `Retrait relancé — réf. ${d.reference ?? ""}` }); onUpdated(); }
      else { setMsg({ ok: false, text: d.error ?? "Échec du retrait" }); }
    } finally { setRetryLoading(false); }
  };

  const Row = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 text-right break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900">Détail transaction</h3>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{tx.reference}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Message retour */}
          {msg && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {msg.text}
            </div>
          )}

          {/* ── Utilisateur ── */}
          {tx.user && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Utilisateur</span>
              </div>
              <div className="space-y-0">
                <Row label="Nom complet"   value={tx.user.fullName} />
                <Row label="Email"         value={tx.user.email} />
                <Row label="Téléphone"     value={tx.user.phone ?? "—"} mono />
                <Row label="Opérateur"     value={tx.user.operator ?? "—"} />
              </div>
            </div>
          )}
          {!tx.user && tx.userId && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
              <Info className="w-4 h-4 inline mr-1" /> Utilisateur ID #{tx.userId}
            </div>
          )}

          {/* ── Montants ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Montants</span>
            </div>
            <Row label="Montant"          value={formatAmount(tx.amount)} />
            <Row label="Frais"            value={tx.fees > 0 ? formatAmount(tx.fees) : "—"} />
            <Row label="À recevoir"       value={<span className="text-green-700">{formatAmount(tx.amount - tx.fees)}</span>} />
          </div>

          {/* ── Détails transaction ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Numéros & Références</span>
            </div>
            <Row label="Émetteur"         value={tx.fromPhone ?? "—"} mono />
            <Row label="Destinataire"     value={tx.toPhone ?? "—"} mono />
            <Row label="Opérateur source" value={tx.operator} />
            <Row label="Opérateur dest."  value={tx.toOperator ?? "—"} />
            <Row label="Réf. Bloum Cash"  value={tx.reference} mono />
            {tx.paydunyaToken && (
              <Row label="Réf. PayDunya"  value={tx.paydunyaToken} mono />
            )}
            <Row label="Retrait envoyé"   value={tx.payoutSent ? <span className="text-green-600">✓ Oui</span> : <span className="text-gray-400">Non</span>} />
            <Row label="Type"             value={fmtType(tx.type)} />
            <Row label="Date"             value={new Date(tx.createdAt).toLocaleString("fr-FR")} />
            {tx.description && <Row label="Description" value={tx.description} />}
          </div>

          {/* ── Changer statut ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Changer le statut</p>
            <div className="flex gap-2">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="success">Succès</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
              </select>
              <button onClick={forceStatus} disabled={loading || newStatus === tx.status}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
              </button>
            </div>
          </div>

          {/* ── Relancer retrait (si échoué ou pending) ── */}
          {(tx.status === "failed" || (tx.status === "pending" && !tx.payoutSent)) && tx.toPhone && (
            <button onClick={retryPayout} disabled={retryLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {retryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Relancer le retrait vers {tx.toPhone}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────── */
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
  const [toast, setToast] = useState("");

  /* Detail modal */
  const [detailModal, setDetailModal] = useState<TxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* Disburse */
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

  const openDetail = async (tx: Tx) => {
    setDetailLoading(true);
    try {
      const r = await adminFetch(`/admin/transactions/${tx.id}`);
      if (r.ok) { setDetailModal(await r.json()); }
      else { setDetailModal({ ...tx, user: null, toOperator: tx.toOperator ?? null, paydunyaToken: null, payoutSent: false }); }
    } catch {
      setDetailModal({ ...tx, user: null, toOperator: null, paydunyaToken: null, payoutSent: false });
    } finally { setDetailLoading(false); }
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
      if (data.success) { showToast(`✓ Déboursement envoyé — réf. ${data.reference}`); load(); }
    } catch { setDResult({ success: false, error: "Erreur réseau" }); }
    finally { setDLoading(false); }
  };

  const pages = Math.max(1, Math.ceil(total / 50));
  const totalAmount = txs.reduce((s, t) => s + t.amount, 0);
  const totalFees   = txs.reduce((s, t) => s + t.fees, 0);
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
      {detailLoading && <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}

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

        {/* Quick stats */}
        {!loading && txs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Transactions affichées", value: String(txs.length), sub: `${successCount} réussies` },
              { label: "Volume total",           value: formatAmount(totalAmount), sub: "montant brut" },
              { label: "Commissions",            value: formatAmount(totalFees),   sub: "frais collectés" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

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
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={() => { setDPhone(""); setDAmount(""); setDMotif(""); setDResult(null); setDOperator("tmoney"); setDisburseOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-colors">
            <SendHorizonal className="w-4 h-4" /> Débourser manuellement
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">{total} transaction(s)</span>
            <span className="text-xs text-gray-400">Cliquer sur une ligne pour voir le détail · Page {page}/{pages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Réf.", "Type", "Titre", "Montant", "Commission", "Statut", "Opérateur", "De → Vers", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : txs.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">Aucune transaction</td></tr>
                ) : txs.map(t => (
                  <tr key={t.id}
                    onClick={() => openDetail(t)}
                    className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-24 group-hover:text-blue-600" title={t.reference}>{t.reference.slice(-12)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">{TYPE_ICONS[t.type] ?? null}<span className="text-gray-600 text-xs">{fmtType(t.type)}</span></span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-32 truncate" title={t.title}>{t.title}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatAmount(t.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.fees > 0
                        ? <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatAmount(t.fees)}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {fmtLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.operator}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{t.fromPhone ?? "—"} → {t.toPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <div>{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
                      <div className="text-gray-300">{new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
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

      {/* ── Detail modal ── */}
      {detailModal && (
        <DetailModal
          tx={detailModal}
          onClose={() => setDetailModal(null)}
          onUpdated={() => { load(); }}
        />
      )}

      {/* ── Déboursement manuel modal ── */}
      {disburseOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
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
              <button onClick={() => { setDisburseOpen(false); setDResult(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {dResult && (
                <div className={`rounded-xl p-4 flex items-start gap-3 ${dResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  {dResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${dResult.success ? "text-green-800" : "text-red-700"}`}>
                      {dResult.success ? "Déboursement envoyé" : "Déboursement refusé"}
                    </p>
                    {dResult.message && <p className="text-xs mt-1 text-gray-600 break-words">{dResult.message}</p>}
                    {dResult.error && <p className="text-xs mt-1 text-red-600 break-words">{dResult.error}</p>}
                    {dResult.reference && <p className="text-xs mt-1 font-mono text-gray-500">Réf : {dResult.reference}</p>}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Opérateur</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["tmoney", "moov"] as const).map(op => (
                    <button key={op} onClick={() => setDOperator(op)}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${dOperator === op ? (op === "tmoney" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-orange-500 bg-orange-50 text-orange-700") : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {op === "tmoney" ? "🔵 TMoney" : "🟠 Moov Money"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Numéro destinataire <span className="text-gray-400 font-normal ml-1">{dOperator === "tmoney" ? "(90-93…)" : "(96-99…)"}</span>
                </label>
                <input type="tel" value={dPhone} onChange={e => setDPhone(e.target.value)} placeholder={dOperator === "tmoney" ? "ex: 92123456" : "ex: 97123456"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant (FCFA)</label>
                <input type="number" min={1} value={dAmount} onChange={e => setDAmount(e.target.value)} placeholder="ex: 5000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {dAmount && parseInt(dAmount) > 0 && <p className="text-xs text-blue-600 mt-1">{formatAmount(parseInt(dAmount))}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motif <span className="font-normal text-gray-400">(optionnel)</span></label>
                <input type="text" value={dMotif} onChange={e => setDMotif(e.target.value)} placeholder="ex: Remboursement…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setDisburseOpen(false); setDResult(null); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors">Fermer</button>
              <button onClick={handleDisburse} disabled={dLoading || !dPhone.trim() || !dAmount || parseInt(dAmount) <= 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                {dLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><SendHorizonal className="w-4 h-4" /> Envoyer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
