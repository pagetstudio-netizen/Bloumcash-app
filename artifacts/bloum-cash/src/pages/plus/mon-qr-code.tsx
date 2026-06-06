import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Share2, Download, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

export default function MonQrCode() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const qrValue = `bloumcash://pay/${user?.email ?? "utilisateur"}`;

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Mon QR Code</h1>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl shadow-xl border border-border p-6 w-full flex flex-col items-center gap-4"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bloum Cash</p>
          <h2 className="text-base font-bold text-foreground text-center">{user?.fullName || "Mon QR Code"}</h2>

          <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
            <QRCodeSVG value={qrValue} size={180} level="H" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Partagez ce code pour recevoir des paiements directement sur votre compte Bloum Cash.
          </p>

          <div className="w-full bg-muted rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Compte</p>
            <p className="font-semibold text-sm text-foreground">{user?.email || "—"}</p>
          </div>
        </motion.div>

        <div className="flex gap-3 w-full">
          {[
            { icon: <Share2 className="w-5 h-5" />, label: "Partager",    fn: () => showModal({ type: "success", title: "Lien partagé !", message: "Votre QR Code a été partagé avec succès." }) },
            { icon: <Download className="w-5 h-5" />, label: "Enregistrer", fn: () => showModal({ type: "info", title: "Téléchargement", message: "Votre QR Code est en cours de téléchargement." }) },
            { icon: <Printer className="w-5 h-5" />, label: "Imprimer",   fn: () => window.print() },
          ].map((btn, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.93 }}
              onClick={btn.fn}
              className="flex-1 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 py-3"
            >
              {btn.icon}
              <span className="text-[10px] font-semibold">{btn.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
