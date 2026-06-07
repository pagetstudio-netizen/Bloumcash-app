import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, ArrowLeftRight, TrendingUp, TrendingDown, DollarSign,
  Clock, Ban, RefreshCw, Loader2, AlertCircle, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminLayout, { adminFetch } from "./layout";
import { formatAmount } from "@/lib/utils";

interface Stats {
  users: { total: number; verified: number };
  transactions: { count: number; totalAmount: number };
  deposits: { total: number };
  withdrawals: { total: number };
  commissions: { today: number; total: number; rate: number };
  pending: { count: number };
  blacklist: { count: number };
}

interface ChartPoint {
  day: string;
  label: string;
  transactions: number;
  deposits: number;
  withdrawals: number;
  commissions: number;
  newUsers: number;
}

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

const fmtK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

const CHART_PERIODS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [period, setPeriod] = useState(30);
  const [activeChart, setActiveChart] = useState<"volume" | "txCount" | "users">("volume");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/stats");
      if (!r.ok) { setError("Erreur chargement stats"); return; }
      setStats(await r.json());
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  const loadChart = useCallback(async (days: number) => {
    setChartLoading(true);
    try {
      const r = await adminFetch(`/admin/stats/charts?days=${days}`);
      if (r.ok) { const d = await r.json(); setChart(d.chart ?? []); }
    } catch {} finally { setChartLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadChart(period); }, [loadChart, period]);

  const handleReset = async () => {
    if (!confirm("Réinitialiser les compteurs ? Cette action est enregistrée.")) return;
    setResetting(true);
    try {
      await adminFetch("/admin/reset", { method: "POST" });
      alert("Réinitialisation effectuée.");
    } finally { setResetting(false); }
  };

  const totalDeposits = chart.reduce((s, d) => s + d.deposits, 0);
  const totalWithdrawals = chart.reduce((s, d) => s + d.withdrawals, 0);
  const totalCommissions = chart.reduce((s, d) => s + d.commissions, 0);
  const totalTx = chart.reduce((s, d) => s + d.transactions, 0);

  return (
    <AdminLayout title="Tableau de bord">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vue d'ensemble</h2>
            <p className="text-sm text-gray-400">Activité de la plateforme Bloum Cash</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </button>
            <button onClick={handleReset} disabled={resetting} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Utilisateurs" value={String(stats.users.total)} sub="inscrits" color="bg-blue-50 text-blue-600" delay={0} />
              <StatCard icon={ArrowLeftRight} label="Transactions" value={String(stats.transactions.count)} sub="au total" color="bg-purple-50 text-purple-600" delay={0.05} />
              <StatCard icon={TrendingUp} label="Total dépôts" value={formatAmount(stats.deposits.total)} color="bg-green-50 text-green-600" delay={0.1} />
              <StatCard icon={TrendingDown} label="Total retraits" value={formatAmount(stats.withdrawals.total)} color="bg-orange-50 text-orange-600" delay={0.15} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Commissions aujourd'hui" value={formatAmount(stats.commissions.today)} sub={`Taux : ${stats.commissions.rate}%`} color="bg-yellow-50 text-yellow-600" delay={0.2} />
              <StatCard icon={DollarSign} label="Commissions totales" value={formatAmount(stats.commissions.total)} color="bg-yellow-50 text-yellow-600" delay={0.25} />
              <StatCard icon={Clock} label="En attente" value={String(stats.pending.count)} sub="transactions" color="bg-gray-50 text-gray-600" delay={0.3} />
            </div>
          </>
        ) : null}

        {/* ── Charts ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Activité de la plateforme</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {(["volume", "txCount", "users"] as const).map(c => (
                  <button key={c} onClick={() => setActiveChart(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeChart === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {c === "volume" ? "Volume" : c === "txCount" ? "Transactions" : "Utilisateurs"}
                  </button>
                ))}
              </div>
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {CHART_PERIODS.map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${period === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary mini-stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Transactions", value: String(totalTx), color: "text-purple-600" },
              { label: "Dépôts", value: fmtK(totalDeposits) + " FCFA", color: "text-green-600" },
              { label: "Retraits", value: fmtK(totalWithdrawals) + " FCFA", color: "text-orange-600" },
              { label: "Commissions", value: fmtK(totalCommissions) + " FCFA", color: "text-yellow-600" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label} ({period}j)</div>
              </div>
            ))}
          </div>

          {chartLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : chart.length === 0 ? (
            <div className="flex justify-center py-16 text-sm text-gray-400">Aucune donnée pour cette période</div>
          ) : activeChart === "volume" ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWithdraw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={56} />
                <Tooltip formatter={(v: number, name: string) => [formatAmount(v), name === "deposits" ? "Dépôts" : "Retraits"]} labelStyle={{ color: "#1e293b", fontWeight: 600 }} contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend formatter={v => v === "deposits" ? "Dépôts" : "Retraits"} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="deposits" stroke="#22c55e" strokeWidth={2} fill="url(#gDeposit)" dot={false} />
                <Area type="monotone" dataKey="withdrawals" stroke="#f97316" strokeWidth={2} fill="url(#gWithdraw)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : activeChart === "txCount" ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={period <= 7 ? 24 : 10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip formatter={(v: number) => [v, "Transactions"]} contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="transactions" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip formatter={(v: number) => [v, "Nouveaux utilisateurs"]} contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="newUsers" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Financial summary */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Résumé financier</h3>
              <div className="space-y-3">
                {[
                  { label: "Volume total traité", value: formatAmount(stats.transactions.totalAmount), color: "text-gray-900" },
                  { label: "Total dépôts", value: formatAmount(stats.deposits.total), color: "text-green-600" },
                  { label: "Total retraits", value: formatAmount(stats.withdrawals.total), color: "text-orange-600" },
                  { label: "Total commissions", value: formatAmount(stats.commissions.total), color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className={`font-semibold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Sécurité & Statut</h3>
              <div className="space-y-3">
                {[
                  { label: "Statut plateforme", value: "Opérationnelle", dot: "bg-green-400" },
                  { label: "Numéros blacklistés", value: String(stats.blacklist.count), dot: "bg-red-400" },
                  { label: "Transactions en attente", value: String(stats.pending.count), dot: "bg-yellow-400" },
                  { label: "Taux de commission", value: `${stats.commissions.rate}%`, dot: "bg-blue-400" },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className="font-semibold text-sm text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
