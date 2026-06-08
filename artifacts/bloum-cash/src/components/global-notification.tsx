import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  imageUrl: string | null;
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

  const handleButton = () => {
    handleClose();
    if (notif?.buttonUrl) {
      if (notif.buttonUrl.startsWith("http")) {
        window.open(notif.buttonUrl, "_blank");
      } else {
        setLocation(notif.buttonUrl);
      }
    }
  };

  if (!notif) return null;

  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <div className="flex justify-end pt-3 px-4">
              <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Icône / Image centrée */}
            <div className="flex flex-col items-center px-6 pb-2">
              {notif.imageUrl ? (
                <img
                  src={notif.imageUrl}
                  alt=""
                  className="w-24 h-24 object-contain rounded-2xl mb-1"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className={`w-20 h-20 ${cfg.bg} rounded-2xl flex items-center justify-center mb-1`}>
                  <Icon className={`w-10 h-10 ${cfg.text}`} />
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="px-6 pb-6 text-center">
              <h3 className="font-bold text-gray-900 text-lg mb-2">{notif.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>

              {/* Boutons centrés */}
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
                  className={`py-2.5 text-sm font-medium transition-colors text-gray-500 hover:text-gray-700 ${notif.buttonText ? "w-full bg-gray-100 hover:bg-gray-200 rounded-xl" : "w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"}`}
                >
                  {notif.buttonText ? "Fermer" : "D'accord"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
