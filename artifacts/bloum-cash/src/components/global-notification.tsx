import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  displayMode: string;
  title: string | null;
  message: string | null;
  type: string;
  imageUrl: string | null;
  actionType: string;
  actionUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  info:    { icon: Info,          bg: "bg-blue-100",   text: "text-blue-600" },
  success: { icon: CheckCircle,   bg: "bg-green-100",  text: "text-green-600" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-100", text: "text-yellow-600" },
  error:   { icon: AlertCircle,   bg: "bg-red-100",    text: "text-red-600" },
};

const DISMISSED_KEY = "bloum_dismissed_notifications";

function getDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function dismiss(id: number) {
  const set = getDismissed();
  set.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

export default function GlobalNotification() {
  const [notif, setNotif] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/admin-notifications/active");
        if (!r.ok) return;
        const data: Notification | null = await r.json();
        if (!data) return;
        const dismissed = getDismissed();
        if (dismissed.has(data.id)) return;
        setNotif(data);
        setVisible(true);
      } catch { /* silent */ }
    };
    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (notif) dismiss(notif.id);
    setVisible(false);
  };

  const handleAction = (url: string | null) => {
    if (!url) return;
    handleClose();
    setTimeout(() => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setLocation(url);
      }
    }, 200);
  };

  const handleButton = () => {
    handleClose();
    if (notif?.buttonUrl) handleAction(notif.buttonUrl);
  };

  if (!notif) return null;

  const isImageOnly = notif.displayMode === "image_only";

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── MODE IMAGE SEULE ───────────────────────────────────────── */}
          {isImageOnly && notif.imageUrl ? (
            <motion.div
              key="overlay-img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
              onClick={handleClose}
            >
              {/* Carte image */}
              <motion.div
                key="card-img"
                initial={{ opacity: 0, scale: 0.88, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
                className="relative w-[88vw] max-w-[360px] rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => {
                  e.stopPropagation();
                  if (notif.actionType !== "none" && notif.actionUrl) {
                    handleAction(notif.actionUrl);
                  }
                }}
                style={{
                  cursor: notif.actionType !== "none" && notif.actionUrl ? "pointer" : "default",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src={notif.imageUrl}
                  alt=""
                  className="w-full h-auto block"
                  style={{ display: "block", maxHeight: "70vh", objectFit: "contain" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </motion.div>

              {/* Bouton ✕ flottant */}
              <motion.button
                key="close-btn"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ delay: 0.15, type: "spring", damping: 20, stiffness: 300 }}
                onClick={e => { e.stopPropagation(); handleClose(); }}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-white" strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          ) : (
            /* ── MODE CLASSIQUE ──────────────────────────────────────────── */
            <motion.div
              key="overlay-classic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
              onClick={handleClose}
            >
              <motion.div
                key="card-classic"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-end pt-3 px-4">
                  <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center px-6 pb-2">
                  {notif.imageUrl ? (
                    <img
                      src={notif.imageUrl}
                      alt=""
                      className="w-24 h-24 object-contain rounded-2xl mb-1"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    (() => {
                      const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
                      const Icon = cfg.icon;
                      return (
                        <div className={`w-20 h-20 ${cfg.bg} rounded-2xl flex items-center justify-center mb-1`}>
                          <Icon className={`w-10 h-10 ${cfg.text}`} />
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="px-6 pb-6 text-center">
                  {notif.title && <h3 className="font-bold text-gray-900 text-lg mb-2">{notif.title}</h3>}
                  {notif.message && <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>}

                  <div className="mt-5 flex flex-col items-center gap-2">
                    {notif.buttonText && (
                      <button
                        onClick={handleButton}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {notif.buttonText}
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className={`py-2.5 text-sm font-medium transition-colors ${notif.buttonText ? "w-full text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl" : "w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"}`}
                    >
                      {notif.buttonText ? "Fermer" : "D'accord"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
