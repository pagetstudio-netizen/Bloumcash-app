import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatAmount } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const PERIODS = ["Semaine", "Mois", "Année"] as const;
type Period = (typeof PERIODS)[number];

const DATA: Record<Period, { label: string; entrees: number; sorties: number }[]> = {
  Semaine: [
    { label: "Lun", entrees: 120000, sorties: 45000 },
    { label: "Mar", entrees: 200000, sorties: 80000 },
    { label: "Mer", entrees: 150000, sorties: 60000 },
    { label: "Jeu", entrees: 320000, sorties: 100000 },
    { label: "Ven", entrees: 280000, sorties: 75000 },
    { label: "Sam", entrees: 410000, sorties: 130000 },
    { label: "Dim", entrees: 190000, sorties: 50000 },
  ],
  Mois: [
    { label: "S1", entrees: 850000, sorties: 320000 },
    { label: "S2", entrees: 1200000, sorties: 450000 },
    { label: "S3", entrees: 950000, sorties: 380000 },
    { label: "S4", entrees: 1500000, sorties: 520000 },
  ],
  Année: [
    { label: "Jan", entrees: 2500000, sorties: 900000 },
    { label: "Fév", entrees: 1800000, sorties: 700000 },
    { label: "Mar", entrees: 3200000, sorties: 1100000 },
    { label: "Avr", entrees: 2900000, sorties: 950000 },
    { label: "Mai", entrees: 4100000, sorties: 1300000 },
    { label: "Juin", entrees: 3700000, sorties: 1200000 },
  ],
};

export default function Statistiques() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>("Semaine");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const data = DATA[period];
  const totalEntrees = data.reduce((s, d) => s + d.entrees, 0);
  const totalSorties = data.reduce((s, d) => s + d.sorties, 0);
  const solde = totalEntrees - totalSorties;

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Mes statistiques</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Period selector */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Entrées", amount: totalEntrees, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600", bg: "bg-green-50" },
            { label: "Sorties", amount: totalSorties, icon: <TrendingDown className="w-4 h-4" />, color: "text-red-500", bg: "bg-red-50" },
            { label: "Solde net", amount: solde, icon: <ArrowRightLeft className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-3 shadow-sm"
            >
              <div className={`${kpi.bg} ${kpi.color} w-8 h-8 rounded-xl flex items-center justify-center mb-2`}>
                {kpi.icon}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
              <p className={`text-xs font-bold ${kpi.color} leading-tight mt-0.5`}>
                {formatAmount(kpi.amount)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-sm"
        >
          <h3 className="font-bold text-sm text-foreground mb-3">Flux financiers</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradEntrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSorties" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number, name: string) => [formatAmount(v), name]}
                contentStyle={{ fontSize: 11, borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#22c55e" strokeWidth={2} fill="url(#gradEntrees)" />
              <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#ef4444" strokeWidth={2} fill="url(#gradSorties)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Transaction summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] rounded-2xl p-4 text-white shadow-lg"
        >
          <p className="text-white/70 text-xs font-medium mb-1">Solde net ({period.toLowerCase()})</p>
          <p className="text-2xl font-bold">{solde >= 0 ? "+" : ""}{formatAmount(solde)}</p>
          <p className="text-white/60 text-xs mt-1">
            {data.length} période{data.length > 1 ? "s" : ""} analysée{data.length > 1 ? "s" : ""}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
