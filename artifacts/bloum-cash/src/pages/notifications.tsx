import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useListTransactions } from "@workspace/api-client-react";
import { formatAmount } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const LS_KEY = "bloum_read_notifs";

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveReadIds(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);

  const { data: transactions, isLoading } = useListTransactions(
    {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: isAuthenticated } as any }
  );

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const notifs = useMemo(() => {
    if (!transactions) return [];
    return transactions.map((tx) => ({
      id: tx.id,
      icon: tx.type === "incoming"
        ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
        : <ArrowUpRight  className="w-5 h-5 text-blue-600"  />,
      iconBg: tx.type === "incoming" ? "bg-green-50" : "bg-blue-50",
      title: tx.title,
      body: tx.type === "incoming"
        ? `Vous avez reçu ${formatAmount(tx.amount)} via ${tx.operator === "tmoney" ? "TMoney" : "Moov Money"}${tx.fromPhone ? ` de +228 ${tx.fromPhone}` : ""}.`
        : `Vous avez transféré ${formatAmount(tx.amount)} via ${tx.operator === "tmoney" ? "TMoney" : "Moov Money"}${tx.toPhone ? ` vers +228 ${tx.toPhone}` : ""}.`,
      time: tx.time ? `${tx.date}, ${tx.time}` : tx.date,
      read: readIds.has(tx.id),
      status: tx.status,
    }));
  }, [transactions, readIds]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    const next = new Set(readIds).add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const markAllRead = () => {
    const next = new Set(notifs.map((n) => n.id));
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 shadow-md z-50">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/dashboard")} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={markAllRead}
            className="p-1 -mr-1 opacity-80 hover:opacity-100"
            title="Tout marquer comme lu"
          >
            <CheckCheck className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Aucune notification</p>
            <p className="text-sm text-muted-foreground">Vos alertes de paiement apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifs.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-4 cursor-pointer active:bg-muted/60 transition-colors ${
                  notif.read ? "bg-background" : "bg-blue-50/60"
                }`}
              >
                <div className={`${notif.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {notif.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${notif.read ? "font-medium text-foreground" : "font-bold text-foreground"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{notif.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
