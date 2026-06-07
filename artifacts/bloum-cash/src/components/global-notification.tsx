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

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  success: { icon: CheckCircle, bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  error: { icon: AlertCircle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
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
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
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
            {notif.imageUrl && (
              <img src={notif.imageUrl} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.text}`} />
                </div>
                <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{notif.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>

              <div className="flex gap-2 mt-4">
                <button onClick={handleClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                  Fermer
                </button>
                {notif.buttonText && (
                  <button onClick={handleButton} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                    {notif.buttonText}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
