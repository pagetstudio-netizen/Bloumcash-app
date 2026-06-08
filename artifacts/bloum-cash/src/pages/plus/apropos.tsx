import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, MessageCircle, AlertTriangle, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useWhatsAppSupportNumber } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

export default function Apropos() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const waNumber = useWhatsAppSupportNumber();

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
        <h1 className="text-lg font-bold flex-1">À propos de Bloum Cash</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 pb-8">

        {/* Logo & version */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg">
            <img src="/logo-512.png" alt="Bloum Cash" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-foreground">Bloum Cash</h2>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            <p className="text-xs text-muted-foreground mt-0.5">par ashtech Sarl</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </motion.div>

        {/* Site officiel */}
        <motion.a
          href="https://bloumcash.com"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl px-4 py-3.5 shadow-md"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Site officiel</p>
            <p className="text-xs text-white/80">bloumcash.com</p>
          </div>
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </motion.a>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-4"
        >
          <h3 className="font-bold text-sm text-foreground mb-2">Notre mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bloum Cash simplifie les paiements mobiles en Afrique de l'Ouest et Centrale en offrant une plateforme sécurisée, rapide et intuitive pour transférer de l'argent via TMoney et Moov Money.
          </p>
        </motion.div>

        {/* Support */}
        <motion.a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 bg-[#25D366] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          Nous contacter sur WhatsApp
        </motion.a>

        <p className="text-center text-xs text-muted-foreground pb-4">
          © 2026 ashtech Sarl. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
