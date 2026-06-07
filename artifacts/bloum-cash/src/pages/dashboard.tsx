import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import {
  Bell, Gift, ArrowLeftRight, Clock, Grid, ChevronRight, ChevronDown,
  HelpCircle, MessageCircleQuestion, Phone, Settings,
  FileText, Shield, Info, LogOut, X, Loader2,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  useGetRecentTransactions,
  useGetStatsSummary,
  useGetStatsChart,
} from "@workspace/api-client-react";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const STAT_PERIODS = ["Semaine", "Mois", "Année"] as const;
type StatPeriod = (typeof STAT_PERIODS)[number];

const PERIOD_API: Record<StatPeriod, "week" | "month" | "year"> = {
  Semaine: "week",
  Mois:    "month",
  Année:   "year",
};
const PERIOD_LABEL: Record<StatPeriod, string> = {
  Semaine: "Cette semaine",
  Mois:    "Ce mois",
  Année:   "Cette année",
};

const menuGroups = [
  {
    title: "Assistance",
    items: [
      { icon: <HelpCircle className="w-5 h-5" />, label: "Centre d'aide", href: "/plus/aide" },
      { icon: <MessageCircleQuestion className="w-5 h-5" />, label: "FAQ", href: "/plus/faq" },
      { icon: <Phone className="w-5 h-5" />, label: "Support WhatsApp", href: "/plus/whatsapp", color: "text-green-500" },
    ],
  },
  {
    title: "Préférences & Légal",
    items: [
      { icon: <Settings className="w-5 h-5" />, label: "Paramètres", href: "/plus/parametres" },
      { icon: <FileText className="w-5 h-5" />, label: "Conditions d'utilisation", href: "/plus/conditions" },
      { icon: <Shield className="w-5 h-5" />, label: "Confidentialité", href: "/plus/confidentialite" },
      { icon: <Info className="w-5 h-5" />, label: "À propos", href: "/plus/apropos" },
    ],
  },
];

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statPeriod, setStatPeriod] = useState<StatPeriod>("Mois");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const apiPeriod = PERIOD_API[statPeriod];

  const { data: recentTxs, isLoading: txLoading } = useGetRecentTransactions({ query: { enabled: isAuthenticated } });
  const { data: statsSummary } = useGetStatsSummary({ period: apiPeriod }, { query: { enabled: isAuthenticated } });
  const { data: chartData } = useGetStatsChart({ period: apiPeriod }, { query: { enabled: isAuthenticated } });

  const unreadCount = React.useMemo(() => {
    if (!recentTxs) return 0;
    const lastSeen = localStorage.getItem("bloum_last_seen_tx");
    if (!lastSeen) return recentTxs.filter((t) => t.type === "incoming").length;
    return recentTxs.filter((t) => t.type === "incoming" && t.id > lastSeen).length;
  }, [recentTxs]);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    setLocation("/login");
  };

  const chartPoints = chartData?.map((p) => ({ value: p.value })) ?? [];
  const totalAmount = statsSummary?.incoming ?? 0;

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden relative">

      {/* ── DRAWER OVERLAY ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 z-40"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute top-0 left-0 h-full w-[78%] max-w-xs bg-background z-50 flex flex-col shadow-2xl"
            >
              <div className="bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] px-5 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-bold text-base">Menu</span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 flex items-center justify-center bg-white/15 rounded-full text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                    {user?.fullName?.substring(0, 2).toUpperCase() || "BC"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">{user?.fullName || "Utilisateur"}</p>
                    <p className="text-white/60 text-xs truncate">{user?.email || "email@exemple.com"}</p>
                    <span className="inline-block mt-1 bg-green-400/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Vérifié
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-4 space-y-5">
                {menuGroups.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
                      {group.title}
                    </p>
                    <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                      {group.items.map((item, i) => (
                        <Link key={i} href={item.href} onClick={() => setDrawerOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors cursor-pointer">
                            <div className={`p-1.5 rounded-xl bg-muted ${item.color || "text-foreground"}`}>
                              {item.icon}
                            </div>
                            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 font-bold py-3 px-4 rounded-2xl border border-red-100 flex items-center justify-center gap-2 active:bg-red-100 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>

                <p className="text-center text-[11px] text-muted-foreground pb-2">Bloum Cash v1.0.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] px-6 py-4 flex items-center justify-between shadow-md rounded-b-3xl z-30">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 flex flex-col justify-center gap-1.5 active:opacity-70 transition-opacity"
        >
          <div className="w-6 h-0.5 bg-white rounded-full" />
          <div className="w-6 h-0.5 bg-white rounded-full" />
          <div className="w-4 h-0.5 bg-white rounded-full" />
        </button>

        <h1 className="text-xl font-bold text-white tracking-wide">Bloum Cash</h1>

        <button
          onClick={() => {
            localStorage.setItem("bloum_last_seen_tx", recentTxs?.[0]?.id ?? "");
            setLocation("/notifications");
          }}
          className="relative w-10 h-10 flex items-center justify-center bg-white/10 rounded-full active:bg-white/20 transition-colors"
        >
          <Bell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <div className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-[#2b50e8] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold px-0.5">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </div>
          )}
        </button>
      </div>

      {/* ── CONTENU SCROLLABLE ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32 space-y-6">

        {/* Boutons d'action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-sm border border-border p-4 flex justify-between items-start"
        >
          <ActionBtn icon={<Gift />} label="Promotions" to="/promotions" />
          <ActionBtn icon={<ArrowLeftRight />} label="Transférer" to="/transfert" />
          <ActionBtn icon={<Clock />} label="Historique" to="/historique" />
          <ActionBtn icon={<Grid />} label="Plus" to="/plus" />
        </motion.div>

        {/* Transactions récentes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
        >
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">Transactions récentes</h2>
            <Link href="/historique" className="text-sm font-medium text-primary flex items-center">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {txLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !recentTxs || recentTxs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucune transaction pour l'instant
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTxs.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center bg-muted overflow-hidden">
                      <img
                        src={tx.operator === "tmoney" ? tmoneyLogo : moovLogo}
                        alt={tx.operator}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground whitespace-nowrap">{tx.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-nowrap">{tx.date}{tx.time ? `, ${tx.time}` : ""}</p>
                    </div>
                  </div>
                  <p className={`font-bold flex-shrink-0 whitespace-nowrap ${tx.type === "incoming" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "incoming" ? "+" : "-"}{formatAmount(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] rounded-3xl shadow-lg p-5 text-white relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-1 relative z-10">
            <button
              onClick={() => setLocation("/plus/statistiques")}
              className="text-white/80 font-semibold text-sm flex items-center gap-1 active:text-white"
            >
              Statistiques <ChevronRight className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowPeriodMenu((v) => !v)}
                className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold active:bg-white/30 transition-colors"
              >
                {PERIOD_LABEL[statPeriod]} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showPeriodMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-8 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[130px]"
                  >
                    {STAT_PERIODS.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setStatPeriod(p); setShowPeriodMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          statPeriod === p
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-gray-700 active:bg-gray-50"
                        }`}
                      >
                        {PERIOD_LABEL[p]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <h3 className="text-2xl font-bold relative z-10">
            +{formatAmount(totalAmount)}
          </h3>
          <p className="text-white/50 text-xs mb-3 relative z-10">
            Encaissements nets · {statsSummary?.transactionCount ?? 0} transactions
          </p>

          <div className="h-[90px] w-full -mx-2 relative z-10">
            {chartPoints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </div>
            )}
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
        </motion.div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link href={to}>
      <div className="flex flex-col items-center gap-3 cursor-pointer group w-[72px]">
        <div className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <span className="text-xs font-medium text-foreground text-center">{label}</span>
      </div>
    </Link>
  );
}
