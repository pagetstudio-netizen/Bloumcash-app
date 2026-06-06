import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import {
  Bell, QrCode, ArrowLeftRight, Clock, Grid, ChevronRight, ChevronDown,
  BarChart3, HelpCircle, MessageCircleQuestion, Phone, Settings,
  FileText, Shield, Info, LogOut, X,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const mockTransactions = [
  { id: "1", type: "incoming", title: "Paiement reçu", operator: "tmoney", amount: 150000, date: "Aujourd'hui, 10:45" },
  { id: "2", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 250000, date: "Aujourd'hui, 09:30" },
  { id: "3", type: "outgoing", title: "Transfert émis", operator: "tmoney", amount: 75000, date: "Hier, 18:20" },
  { id: "4", type: "incoming", title: "Paiement reçu", operator: "moov", amount: 325000, date: "Hier, 14:10" },
];

const mockChartData = [
  { value: 400000 }, { value: 300000 }, { value: 550000 },
  { value: 450000 }, { value: 700000 }, { value: 600000 }, { value: 850000 },
];

const menuGroups = [
  {
    title: "Mon Activité",
    items: [
      { icon: <QrCode className="w-5 h-5" />, label: "Mon QR Code", href: "/plus/mon-qr-code" },
      { icon: <BarChart3 className="w-5 h-5" />, label: "Mes statistiques", href: "/plus/statistiques" },
    ],
  },
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

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    setLocation("/login");
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden relative">

      {/* ── DRAWER OVERLAY ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Fond semi-transparent */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 z-40"
            />

            {/* Panneau drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute top-0 left-0 h-full w-[78%] max-w-xs bg-background z-50 flex flex-col shadow-2xl"
            >
              {/* Drawer header */}
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
                {/* Profil */}
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

              {/* Drawer contenu scrollable */}
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

                {/* Déconnexion */}
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
          onClick={() => setLocation("/notifications")}
          className="relative w-10 h-10 flex items-center justify-center bg-white/10 rounded-full active:bg-white/20 transition-colors"
        >
          <Bell className="w-5 h-5 text-white" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-[#2b50e8]" />
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
          <ActionBtn icon={<QrCode />} label="Encaisser" to="/encaisser" />
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
          <div className="divide-y divide-border">
            {mockTransactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted overflow-hidden">
                    <img
                      src={tx.operator === "tmoney" ? tmoneyLogo : moovLogo}
                      alt={tx.operator}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tx.title}</p>
                    <p className="text-sm text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <p className={`font-bold ${tx.type === "incoming" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "incoming" ? "+" : "-"}{formatAmount(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] rounded-3xl shadow-lg p-6 text-white relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-white/80 font-medium">Statistiques</p>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm cursor-pointer hover:bg-white/30 transition-colors">
              Ce mois <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-6 relative z-10">+650 000 FCFA</h3>
          <div className="h-[100px] w-full mt-4 -mx-2 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={4}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
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
