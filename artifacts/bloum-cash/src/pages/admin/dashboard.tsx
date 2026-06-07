import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, ArrowLeftRight, TrendingUp, TrendingDown, DollarSign,
  Clock, Ban, RefreshCw, Loader2, AlertCircle,
} from "lucide-react";
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

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/stats");
      if (!r.ok) { setError("Erreur chargement stats"); return; }
      setStats(await r.json());
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    if (!confirm("Réinitialiser les compteurs ? Cette action est enregistrée.")) return;
    setResetting(true);
    try {
      await adminFetch("/admin/reset", { method: "POST" });
      alert("Réinitialisation effectuée.");
    } finally { setResetting(false); }
  };

  return (
    <AdminLayout title="Tableau de bord">
      <div className="space-y-6">
        {/* Header actions */}
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
              Réinitialiser
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
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Utilisateurs" value={String(stats.users.total)} sub="inscrits" color="bg-blue-50 text-blue-600" />
              <StatCard icon={ArrowLeftRight} label="Transactions" value={String(stats.transactions.count)} sub="au total" color="bg-purple-50 text-purple-600" />
              <StatCard icon={TrendingUp} label="Dépôts" value={formatAmount(stats.deposits.total)} color="bg-green-50 text-green-600" />
              <StatCard icon={TrendingDown} label="Retraits" value={formatAmount(stats.withdrawals.total)} color="bg-orange-50 text-orange-600" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Commissions (aujourd'hui)" value={formatAmount(stats.commissions.today)} sub={`Taux : ${stats.commissions.rate}%`} color="bg-yellow-50 text-yellow-600" />
              <StatCard icon={DollarSign} label="Commissions (total)" value={formatAmount(stats.commissions.total)} color="bg-yellow-50 text-yellow-600" />
              <StatCard icon={Clock} label="En attente" value={String(stats.pending.count)} sub="transactions" color="bg-gray-50 text-gray-600" />
            </div>

            {/* Summary card */}
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

            {/* Security */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Sécurité & Accès</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-600">Plateforme opérationnelle</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>{stats.blacklist.count} numéro(s) blacklisté(s)</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
