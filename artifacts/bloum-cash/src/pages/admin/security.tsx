import React, { useEffect, useState, useCallback } from "react";
import {
  Shield, RefreshCw, Loader2, AlertCircle, Clock,
  UserX, Ban, DollarSign, Edit3, RotateCcw, Activity,
  Filter, Download,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface SecurityEvent {
  id: number;
  type: string;
  ip: string | null;
  details: string | null;
  createdAt: string;
}

interface SecurityData {
  stats: {
    blockedIps: number;
    whitelistedIps: number;
    failedLogins: number;
    attempts1h: number;
  };
  events: SecurityEvent[];
}

const EVENT_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  phone_blacklisted:  { label: "Numéro blacklisté",        color: "bg-red-100 text-red-700",      icon: Ban },
  ip_blocked:         { label: "IP bloquée",                color: "bg-orange-100 text-orange-700", icon: Shield },
  user_banned:        { label: "Utilisateur banni",         color: "bg-red-100 text-red-700",      icon: UserX },
  user_suspended:     { label: "Utilisateur suspendu",      color: "bg-yellow-100 text-yellow-700", icon: UserX },
  user_reactivated:   { label: "Compte réactivé",           color: "bg-green-100 text-green-700",   icon: RotateCcw },
  user_edited:        { label: "Profil modifié",            color: "bg-blue-100 text-blue-700",     icon: Edit3 },
  admin_credit:       { label: "Crédit manuel",             color: "bg-green-100 text-green-700",   icon: DollarSign },
  admin_debit:        { label: "Débit manuel",              color: "bg-orange-100 text-orange-700", icon: DollarSign },
  tx_status_forced:   { label: "Statut transaction forcé",  color: "bg-purple-100 text-purple-700", icon: Edit3 },
  tx_retry_payout:    { label: "Retrait relancé",           color: "bg-blue-100 text-blue-700",     icon: RotateCcw },
  login_failed:       { label: "Connexion échouée",         color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  email_broadcast:    { label: "Email diffusé",             color: "bg-indigo-100 text-indigo-700", icon: Activity },
  admin_disburse:     { label: "Déboursement admin",        color: "bg-blue-100 text-blue-700",     icon: DollarSign },
  pin_reset:          { label: "PIN réinitialisé",          color: "bg-yellow-100 text-yellow-700", icon: Shield },
};

const ALL_FILTERS = [
  { value: "", label: "Tout" },
  { value: "user_banned", label: "Bans" },
  { value: "phone_blacklisted", label: "Blacklists" },
  { value: "user_suspended", label: "Suspensions" },
  { value: "admin_credit", label: "Crédits" },
  { value: "admin_debit", label: "Débits" },
  { value: "tx_status_forced", label: "Statuts forcés" },
  { value: "tx_retry_payout", label: "Retraits relancés" },
  { value: "ip_blocked", label: "IPs bloquées" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSecurity() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/security");
      if (r.ok) setData(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const events = (data?.events ?? []).filter(ev => {
    if (filter && ev.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (ev.details ?? "").toLowerCase().includes(q) || (ev.ip ?? "").includes(q) || ev.type.includes(q);
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["ID", "Type", "Détails", "IP", "Date"];
    const rows = events.map(ev => [ev.id, ev.type, `"${ev.details ?? ""}"`, ev.ip ?? "", fmtDate(ev.createdAt)]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit_log_${Date.now()}.csv`; a.click();
  };

  const totalByType = (type: string) => (data?.events ?? []).filter(e => e.type === type).length;

  return (
    <AdminLayout title="Logs & Sécurité">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Journal d'audit</h2>
            <p className="text-sm text-gray-400">Toutes les actions effectuées par les administrateurs</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ── KPI rapides ── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total événements",    value: data.events.length,            color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "Utilisateurs bannis", value: totalByType("user_banned"),    color: "text-red-600",    bg: "bg-red-50" },
              { label: "Numéros blacklistés", value: totalByType("phone_blacklisted"), color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Ajustements solde",   value: totalByType("admin_credit") + totalByType("admin_debit"), color: "text-green-600", bg: "bg-green-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 border border-white/50`}>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtres ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans les détails…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 flex-wrap">
              {ALL_FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Liste des événements ── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                {events.length} événement{events.length !== 1 ? "s" : ""}
                {filter || search ? " (filtrés)" : ""}
              </span>
              <Clock className="w-4 h-4 text-gray-300" />
            </div>
            {events.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Aucun événement{filter ? " pour ce filtre" : ""}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                {events.map(ev => {
                  const meta = EVENT_META[ev.type] ?? { label: ev.type, color: "bg-gray-100 text-gray-600", icon: Activity };
                  const Icon = meta.icon;
                  return (
                    <div key={ev.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color.replace("text-", "bg-").replace("-700", "-100").replace("-600", "-100")}`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color.split(" ")[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
                            {meta.label}
                          </span>
                          {ev.ip && <span className="text-xs text-gray-400 font-mono">{ev.ip}</span>}
                        </div>
                        {ev.details && (
                          <p className="text-sm text-gray-600 mt-0.5 break-words">{ev.details}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap pt-0.5">{fmtDate(ev.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
