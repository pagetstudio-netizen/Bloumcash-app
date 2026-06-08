import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Gift, Tag, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

type BadgeType = "new" | "active" | "soon" | "expired";

interface Promo {
  id: number;
  icon: string;
  title: string;
  description: string;
  badge: BadgeType;
  color: string;
  bgColor: string;
  isActive: boolean;
  sortOrder: number;
  expiresAt: string | null;
  createdAt: string;
}

const BADGE_CONFIG: Record<BadgeType, { label: string; color: string; bg: string }> = {
  new:     { label: "Nouveau",             color: "#1a3fc4", bg: "#dbeafe" },
  active:  { label: "En cours",            color: "#16a34a", bg: "#dcfce7" },
  soon:    { label: "Bientôt disponible",  color: "#d97706", bg: "#fef3c7" },
  expired: { label: "Expiré",             color: "#9ca3af", bg: "#f3f4f6" },
};

function Badge({ type }: { type: BadgeType }) {
  const cfg = BADGE_CONFIG[type] ?? BADGE_CONFIG.active;
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function PromoCard({ promo, delay }: { promo: Promo; delay: number }) {
  const isExpired = promo.badge === "expired";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="rounded-3xl overflow-hidden shadow-sm border border-gray-100"
      style={{ background: isExpired ? "#fafafa" : "white", opacity: isExpired ? 0.7 : 1 }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: promo.bgColor }}
            >
              {promo.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[14px] text-gray-900 leading-tight">{promo.title}</h3>
            </div>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <Badge type={promo.badge as BadgeType} />
          </div>
        </div>
        <p className="text-[13px] text-gray-500 leading-relaxed">{promo.description}</p>
        {!isExpired && promo.badge !== "soon" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="mt-4 w-full py-2.5 rounded-2xl text-[13px] font-bold text-white shadow-sm transition-all active:brightness-90"
            style={{ background: `linear-gradient(90deg, ${promo.color}, ${promo.color}cc)` }}
          >
            En profiter →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center flex-1 px-8 py-16 text-center"
    >
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-inner"
        style={{ background: "linear-gradient(135deg,#eff2ff,#dbeafe)" }}
      >
        <Gift className="w-12 h-12" style={{ color: "#1a3fc4" }} strokeWidth={1.5} />
      </div>
      <h3 className="font-bold text-[16px] text-gray-900 mb-2">Aucune promotion</h3>
      <p className="text-[13px] text-gray-400 leading-relaxed max-w-[260px]">
        Aucune promotion disponible pour le moment. Revenez bientôt pour découvrir nos nouvelles offres.
      </p>
    </motion.div>
  );
}

export default function Promotions() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    fetch("/api/promotions")
      .then(r => r.ok ? r.json() : [])
      .then(data => setPromos(Array.isArray(data) ? data : []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <div
      className="h-[100dvh] w-full flex flex-col md:max-w-md md:mx-auto overflow-hidden"
      style={{ background: "#EAECF8" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(90deg,#1a3fc4,#2b50e8)" }}
      >
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <h1 className="text-[17px] font-bold text-white">Promotions</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Tag className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Hero banner */}
      <div
        className="flex-shrink-0 mx-4 mt-4 rounded-3xl px-5 py-4 flex items-center gap-4 shadow-lg overflow-hidden relative"
        style={{ background: "linear-gradient(135deg,#1a3fc4 0%,#2b50e8 60%,#7c3aed 100%)" }}
      >
        <div className="flex-1 relative z-10">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">Offres exclusives</p>
          <h2 className="text-white font-bold text-[16px] leading-tight">Profitez de nos<br />meilleures offres 🎁</h2>
        </div>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 relative z-10"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          🎉
        </div>
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl translate-x-8 -translate-y-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full blur-xl -translate-x-6 translate-y-6" />
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : (
          <AnimatePresence>
            {promos.length > 0 ? (
              promos.map((promo, i) => (
                <PromoCard key={promo.id} promo={promo} delay={i * 0.07} />
              ))
            ) : (
              <EmptyState />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
