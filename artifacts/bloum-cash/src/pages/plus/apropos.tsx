import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, Zap, Globe, Heart, Star, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const features = [
  { icon: <Zap className="w-5 h-5 text-yellow-500" />, bg: "bg-yellow-50", label: "Paiements instantanés" },
  { icon: <Shield className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", label: "Sécurité bancaire" },
  { icon: <Globe className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50", label: "TMoney & Moov Money" },
  { icon: <Heart className="w-5 h-5 text-red-500" />, bg: "bg-red-50", label: "Conçu pour le Togo" },
];

export default function Apropos() {
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
        <h1 className="text-lg font-bold flex-1">À propos de Bloum Cash</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Logo & version */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-black">B</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-foreground">Bloum Cash</h2>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>

          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-4"
        >
          <h3 className="font-bold text-sm text-foreground mb-2">Notre mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bloum Cash simplifie les paiements mobiles au Togo en offrant une plateforme sécurisée, rapide et intuitive pour encaisser et transférer de l'argent via TMoney et Moov Money.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Nos atouts</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
                <div className={`${f.bg} w-10 h-10 rounded-xl flex items-center justify-center`}>
                  {f.icon}
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Info list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          {[
            { label: "Développeur", value: "Bloum Technologies" },
            { label: "Pays", value: "Togo 🇹🇬" },
            { label: "Monnaie", value: "FCFA (XOF)" },
            { label: "Contact", value: "contact@bloumcash.com" },
          ].map((item, i, arr) => (
            <div key={i} className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Support button */}
        <motion.a
          href="https://wa.me/22891000000"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 bg-[#25D366] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          Nous contacter sur WhatsApp
        </motion.a>

        <p className="text-center text-xs text-muted-foreground pb-4">
          © 2026 Bloum Technologies. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
