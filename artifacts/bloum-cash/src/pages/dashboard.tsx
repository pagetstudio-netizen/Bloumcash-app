import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import GlobalNotification from "@/components/global-notification";
import ShareSheet from "@/components/share-sheet";
import { useAuth } from "@/components/auth-provider";
import {
  Bell, ChevronRight,
  LogOut, X, Loader2,
  ArrowDownLeft, ArrowUpRight, Share2,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useGetRecentTransactions } from "@workspace/api-client-react";
import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";


interface DashBanner { id: number; title: string | null; imageUrl: string; actionType: string; actionUrl: string | null; }
const LOCAL_BANNERS: DashBanner[] = [
  { id: -1, title: "Bannière 1", imageUrl: "/banners/banner1.jpg", actionType: "none", actionUrl: null },
  { id: -2, title: "Bannière 2", imageUrl: "/banners/banner2.jpg", actionType: "none", actionUrl: null },
  { id: -3, title: "Bannière 3", imageUrl: "/banners/banner3.jpg", actionType: "none", actionUrl: null },
];

interface SocialLinks { facebook_url: string; whatsapp_url: string; youtube_url: string; }

const SHARE_TEXT = `Salut ! Je vous recommande cette super application, elle permet de transférer de l'argent entre TMoney et Moov. Les paiements sont instantanés ! Téléchargez ici 👇\nhttps://bloumcash.com/télécharger`;

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [banners, setBanners] = useState<DashBanner[]>(LOCAL_BANNERS);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({ facebook_url: "", whatsapp_url: "", youtube_url: "" });
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: recentTxs, isLoading: txLoading } = useGetRecentTransactions({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: isAuthenticated } as any,
  });

  useEffect(() => {
    fetch("/api/banners")
      .then(r => r.ok ? r.json() : null)
      .then((data: DashBanner[] | null) => { if (data && data.length > 0) setBanners(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/public-settings")
      .then(r => r.ok ? r.json() : null)
      .then((data: SocialLinks | null) => { if (data) setSocialLinks(data); })
      .catch(() => {});
  }, []);

  const unreadCount = React.useMemo(() => {
    if (!recentTxs) return 0;
    const lastSeen = localStorage.getItem("bloum_last_seen_tx");
    if (!lastSeen) return recentTxs.filter((t) => t.type === "incoming").length;
    return recentTxs.filter((t) => t.type === "incoming" && t.id > lastSeen).length;
  }, [recentTxs]);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  const scrollTo = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: "smooth" });
    setActiveSlide(index);
  }, []);

  const resetTimer = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % banners.length;
        const el = carouselRef.current;
        if (el) el.scrollTo({ left: next * el.offsetWidth, behavior: "smooth" });
        return next;
      });
    }, 3500);
  }, [banners.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [resetTimer]);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx !== activeSlide) setActiveSlide(idx);
  };

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
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 z-40"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute top-0 left-0 h-full w-[78%] max-w-xs bg-background z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                <span className="text-foreground font-bold text-base">Menu</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-muted rounded-full text-muted-foreground active:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">

                {/* ── Recommander ── */}
                <button
                  onClick={() => { setDrawerOpen(false); setShareSheetOpen(true); }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card rounded-2xl border border-border active:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold text-foreground">Recommander à un ami</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* ── Réseaux sociaux ── */}
                <div className="pt-3 pb-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Nous suivre</p>
                  <div className="space-y-1">

                    {/* Facebook */}
                    <button
                      onClick={() => socialLinks.facebook_url ? window.open(socialLinks.facebook_url, "_system") : null}
                      disabled={!socialLinks.facebook_url}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card rounded-2xl border border-border active:bg-muted transition-colors disabled:opacity-40"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#1877F2" }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <span className="flex-1 text-left text-sm font-semibold text-foreground">Page Facebook</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => socialLinks.whatsapp_url ? window.open(socialLinks.whatsapp_url, "_system") : null}
                      disabled={!socialLinks.whatsapp_url}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card rounded-2xl border border-border active:bg-muted transition-colors disabled:opacity-40"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#25D366" }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <span className="flex-1 text-left text-sm font-semibold text-foreground">Chaîne WhatsApp</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>

                    {/* YouTube */}
                    <button
                      onClick={() => socialLinks.youtube_url ? window.open(socialLinks.youtube_url, "_system") : null}
                      disabled={!socialLinks.youtube_url}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card rounded-2xl border border-border active:bg-muted transition-colors disabled:opacity-40"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#FF0000" }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                      <span className="flex-1 text-left text-sm font-semibold text-foreground">Chaîne YouTube</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Déconnexion ── */}
              <div className="px-4 pb-5 pt-2 border-t border-border flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-red-50 rounded-2xl border border-red-100 active:bg-red-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-bold text-red-600">Se déconnecter</span>
                </button>
                <p className="text-center text-[11px] text-muted-foreground mt-3">Bloum Cash v1.0.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HEADER — fixe ── */}
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

      {/* ── CARTE 4 BOUTONS — fixe ── */}
      <div className="flex-shrink-0 bg-card mx-4 mt-4 rounded-2xl shadow-sm border border-border p-4 flex justify-between items-start z-20">
        <ActionBtn imgSrc="/icon-promotion.png" label="Promotions" to="/promotions" />
        <ActionBtn imgSrc="/icon-transfert.png" label="Transférer" to="/transfert" />
        <ActionBtn imgSrc="/icon-historique.png" label="Historique" to="/historique" />
        <ActionBtn imgSrc="/icon-plus.png" label="Plus" to="/plus" />
      </div>

      {/* ── CAROUSEL D'IMAGES — fixe, défilement horizontal ── */}
      <div className="flex-shrink-0 mt-3 mx-4 relative rounded-2xl overflow-hidden shadow-sm">
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          onTouchStart={() => { if (autoTimer.current) clearInterval(autoTimer.current); }}
          onTouchEnd={resetTimer}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {banners.map((banner, i) => {
            const hasAction = banner.actionType === "page" || banner.actionType === "link";
            const handleBannerClick = () => {
              if (banner.actionType === "page" && banner.actionUrl) {
                setLocation(banner.actionUrl);
              } else if (banner.actionType === "link" && banner.actionUrl) {
                window.open(banner.actionUrl, "_blank", "noopener,noreferrer");
              }
            };
            return (
              <div
                key={banner.id}
                onClick={hasAction ? handleBannerClick : undefined}
                className="flex-shrink-0 w-full snap-center bg-[#1a3fc4] overflow-hidden"
                style={{
                  height: "190px",
                  cursor: hasAction ? "pointer" : "default",
                }}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title ?? `Bannière ${i + 1}`}
                  className="w-full h-full"
                  style={{ objectFit: "cover", objectPosition: "center center" }}
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i === 0 ? "high" : "low"}
                />
              </div>
            );
          })}
        </div>

        {/* Indicateurs dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { scrollTo(i); resetTimer(); }}
              className="rounded-full transition-all"
              style={{
                width: activeSlide === i ? 20 : 6,
                height: 6,
                background: activeSlide === i ? "#ffffff" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── EN-TÊTE TRANSACTIONS — fixe ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2 bg-background z-10">
        <h2 className="text-[17px] font-black text-foreground">Transactions récentes</h2>
        <Link
          href="/historique"
          className="text-[15px] font-semibold text-[#1a3fc4] flex items-center gap-0.5"
        >
          Voir tout <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── LISTE DES TRANSACTIONS — scrollable ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : !recentTxs || recentTxs.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <img src="/nodata.png" alt="Aucune donnée" className="w-24 h-24 object-contain opacity-90" />
            <p className="text-muted-foreground text-sm font-medium">Aucune transaction pour l'instant</p>
          </div>
        ) : (
          recentTxs.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden">
                    <img
                      src={tx.operator === "tmoney" ? tmoneyLogo : moovLogo}
                      alt={tx.operator}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${tx.type === "incoming" ? "bg-green-500" : "bg-red-500"}`}>
                    {tx.type === "incoming"
                      ? <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
                      : <ArrowUpRight className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm whitespace-nowrap truncate">{tx.title}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{tx.date}{tx.time ? ` · ${tx.time}` : ""}</p>
                </div>
              </div>
              <p className={`font-bold flex-shrink-0 whitespace-nowrap text-sm ${tx.type === "incoming" ? "text-green-600" : "text-red-500"}`}>
                {tx.type === "incoming" ? "+" : "-"}{formatAmount(tx.amount)}
              </p>
            </motion.div>
          ))
        )}
      </div>
      <GlobalNotification />
      <ShareSheet open={shareSheetOpen} onClose={() => setShareSheetOpen(false)} />
    </div>
  );
}

function ActionBtn({ imgSrc, label, to }: { imgSrc: string; label: string; to: string }) {
  return (
    <Link href={to}>
      <div className="flex flex-col items-center gap-3 cursor-pointer group w-[72px]">
        <div className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors overflow-hidden p-1">
          <img src={imgSrc} alt={label} className="w-10 h-10 object-contain" />
        </div>
        <span className="text-xs font-medium text-foreground text-center">{label}</span>
      </div>
    </Link>
  );
}
