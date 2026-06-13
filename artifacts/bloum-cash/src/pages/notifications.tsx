import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, ArrowDownLeft, ArrowUpRight, Loader2, Info, AlertTriangle, Gift, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

type AdminNotif = {
  id: number;
  title: string;
  message: string;
  type: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  createdAt: string;
};

function adminTypeIcon(type: string) {
  switch (type) {
    case "warning": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    case "success": return <Gift className="w-5 h-5 text-emerald-600" />;
    default:        return <Info className="w-5 h-5 text-blue-600" />;
  }
}
function adminTypeBg(type: string) {
  switch (type) {
    case "warning": return "bg-amber-50";
    case "success": return "bg-emerald-50";
    default:        return "bg-blue-50";
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      {/* Cloche animée avec anneaux de pulse */}
      <div style={{ position: "relative", width: 100, height: 100 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid #1a3fc4",
            }}
            animate={{ scale: [1, 1.5 + i * 0.25], opacity: [0.4, 0] }}
            transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #e8eeff 0%, #d0daff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          animate={{ rotate: [0, -14, 14, -10, 10, -6, 6, 0] }}
          transition={{
            duration: 1.8,
            delay: 1,
            repeat: Infinity,
            repeatDelay: 3.2,
            ease: "easeInOut",
          }}
        >
          <Bell className="w-11 h-11" style={{ color: "#1a3fc4" }} />
        </motion.div>
      </div>

      <div>
        <motion.p
          className="font-bold text-lg text-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Tout est calme ici
        </motion.p>
        <motion.p
          className="text-sm text-muted-foreground mt-2 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Vos alertes de paiement et les annonces<br />de l'équipe Bloum Cash apparaîtront ici.
        </motion.p>
      </div>

      {/* Points clignotants */}
      <motion.div
        style={{ display: "flex", gap: 8 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a3fc4", display: "block" }}
            animate={{ opacity: [0.15, 1, 0.15] }}
            transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </motion.div>
    </div>
  );
}

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [adminNotifs, setAdminNotifs] = useState<AdminNotif[]>([]);

  const { data: transactions, isLoading: txLoading } = useListTransactions(
    {},
    { query: { enabled: isAuthenticated } as any }
  );

  useEffect(() => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    fetch("/api/admin-notifications/all")
      .then((r) => r.json())
      .then((data) => setAdminNotifs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  /* ── Fusionner transactions + notifications admin ── */
  const txItems = (transactions ?? []).map((tx) => ({
    id: `tx-${tx.id}`,
    icon: tx.type === "incoming"
      ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
      : <ArrowUpRight  className="w-5 h-5 text-blue-600"  />,
    iconBg: tx.type === "incoming" ? "bg-green-50" : "bg-blue-50",
    title: tx.title,
    body: tx.type === "incoming"
      ? `Vous avez reçu ${formatAmount(tx.amount)} via ${tx.operator === "tmoney" ? "TMoney" : "Moov Money"}${tx.fromPhone ? ` de +228 ${tx.fromPhone}` : ""}.`
      : `Vous avez transféré ${formatAmount(tx.amount)} via ${tx.operator === "tmoney" ? "TMoney" : "Moov Money"}${tx.toPhone ? ` vers +228 ${tx.toPhone}` : ""}.`,
    time: tx.time ? `${tx.date}, ${tx.time}` : tx.date,
    sortKey: (tx as any).createdAt ?? tx.date ?? "",
    kind: "tx" as const,
    imageUrl: null as string | null,
    buttonText: null as string | null,
    buttonUrl: null as string | null,
  }));

  const adminItems = adminNotifs.map((n) => ({
    id: `admin-${n.id}`,
    icon: adminTypeIcon(n.type),
    iconBg: adminTypeBg(n.type),
    title: n.title,
    body: n.message,
    time: new Date(n.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    sortKey: n.createdAt,
    kind: "admin" as const,
    imageUrl: n.imageUrl ?? null,
    buttonText: n.buttonText ?? null,
    buttonUrl: n.buttonUrl ?? null,
  }));

  const allNotifs = [...txItems, ...adminItems].sort(
    (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime()
  );

  const unreadCount = allNotifs.filter((n) => !readIds.has(n.id)).length;

  const markRead = (id: string) => {
    const next = new Set(readIds).add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const markAllRead = () => {
    const next = new Set(allNotifs.map((n) => n.id));
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
            className="p-1 -mr-1 opacity-80 hover:opacity-100 disabled:opacity-30"
            title="Tout marquer comme lu"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        {txLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : allNotifs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {allNotifs.map((notif, i) => {
                const isRead = readIds.has(notif.id);
                const isAdmin = notif.kind === "admin";
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 px-4 py-4 cursor-pointer active:bg-muted/60 transition-colors ${
                      isRead
                        ? "bg-background"
                        : isAdmin
                        ? "bg-violet-50/50"
                        : "bg-blue-50/60"
                    }`}
                  >
                    <div className={`${notif.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {notif.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {isAdmin && (
                            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                              Bloum
                            </span>
                          )}
                          <p className={`text-sm leading-snug truncate ${isRead ? "font-medium text-foreground" : "font-bold text-foreground"}`}>
                            {notif.title}
                          </p>
                        </div>
                        {!isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>

                      {/* Image admin */}
                      {isAdmin && notif.imageUrl && (
                        <img
                          src={notif.imageUrl}
                          alt=""
                          className="mt-2 rounded-lg w-full max-h-36 object-cover"
                          loading="lazy"
                        />
                      )}

                      {/* Bouton CTA admin */}
                      {isAdmin && notif.buttonText && notif.buttonUrl && (
                        <a
                          href={notif.buttonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 underline underline-offset-2"
                        >
                          {notif.buttonText}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <p className="text-[10px] text-muted-foreground/70 mt-1">{notif.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
