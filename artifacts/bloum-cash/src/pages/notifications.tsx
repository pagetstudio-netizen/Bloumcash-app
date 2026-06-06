import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, Trash2, ArrowRightLeft, QrCode, ShieldCheck, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

type Notif = {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const INITIAL: Notif[] = [
  {
    id: "1",
    icon: <ArrowRightLeft className="w-5 h-5 text-blue-600" />,
    iconBg: "bg-blue-50",
    title: "Transfert reçu",
    body: "Vous avez reçu 150 000 FCFA via TMoney de +228 90 11 22 33.",
    time: "Il y a 5 min",
    read: false,
  },
  {
    id: "2",
    icon: <QrCode className="w-5 h-5 text-green-600" />,
    iconBg: "bg-green-50",
    title: "Paiement QR Code",
    body: "Paiement de 25 000 FCFA encaissé via votre QR Code (Réf. QRBT7A).",
    time: "Il y a 32 min",
    read: false,
  },
  {
    id: "3",
    icon: <ArrowRightLeft className="w-5 h-5 text-purple-600" />,
    iconBg: "bg-purple-50",
    title: "Transfert envoyé",
    body: "Vous avez transféré 75 000 FCFA à +228 99 44 55 66 via Moov Money.",
    time: "Hier, 18:20",
    read: true,
  },
  {
    id: "4",
    icon: <ShieldCheck className="w-5 h-5 text-orange-600" />,
    iconBg: "bg-orange-50",
    title: "Connexion détectée",
    body: "Nouvelle connexion à votre compte Bloum Cash depuis un appareil Android.",
    time: "Hier, 09:04",
    read: true,
  },
  {
    id: "5",
    icon: <QrCode className="w-5 h-5 text-green-600" />,
    iconBg: "bg-green-50",
    title: "Paiement QR Code",
    body: "Paiement de 320 000 FCFA encaissé via votre QR Code (Réf. QRXY12).",
    time: "04 Juin, 14:10",
    read: true,
  },
  {
    id: "6",
    icon: <Info className="w-5 h-5 text-gray-500" />,
    iconBg: "bg-gray-100",
    title: "Mise à jour Bloum Cash",
    body: "La version 1.0.1 est disponible. Nouvelles fonctionnalités et corrections.",
    time: "03 Juin",
    read: true,
  },
];

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const deleteNotif = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 shadow-md z-50">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
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
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Aucune notification</p>
            <p className="text-sm text-muted-foreground">Vos alertes de paiement et actualités apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifs.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-4 cursor-pointer active:bg-muted/60 transition-colors ${
                  notif.read ? "bg-background" : "bg-blue-50/60"
                }`}
              >
                {/* Icon */}
                <div className={`${notif.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {notif.icon}
                </div>

                {/* Content */}
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

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
