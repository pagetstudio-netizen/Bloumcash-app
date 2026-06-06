import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Clock, CheckCircle2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";
const WA_NUMBER = "22891000000";
const WA_MESSAGE = encodeURIComponent("Bonjour, j'ai besoin d'aide avec Bloum Cash.");

export default function SupportWhatsApp() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Support WhatsApp</h1>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 gap-6 py-8">
        {/* WhatsApp icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-[#25D366] rounded-3xl flex items-center justify-center shadow-lg"
        >
          <MessageCircle className="w-12 h-12 text-white fill-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h2 className="text-xl font-bold text-foreground mb-2">Support en temps réel</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Notre équipe est disponible sur WhatsApp pour vous aider avec tous vos problèmes liés à Bloum Cash.
          </p>
        </motion.div>

        {/* Infos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-4 w-full space-y-3"
        >
          {[
            { icon: <Clock className="w-4 h-4 text-blue-500" />, label: "Disponibilité", value: "Lun–Sam, 8h–20h (GMT+0)" },
            { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: "Temps de réponse", value: "< 30 minutes en général" },
            { icon: <Phone className="w-4 h-4 text-purple-500" />, label: "Numéro", value: `+${WA_NUMBER}` },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-14 bg-[#25D366] text-white rounded-2xl text-base font-bold shadow-lg flex items-center justify-center gap-3"
        >
          <MessageCircle className="w-5 h-5 fill-white" />
          Ouvrir WhatsApp
        </motion.a>

        <p className="text-xs text-muted-foreground text-center">
          Vous serez redirigé vers WhatsApp avec un message pré-rempli.
        </p>
      </div>
    </div>
  );
}
