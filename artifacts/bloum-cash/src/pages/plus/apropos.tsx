import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, Zap, Globe, Smartphone, Star, MessageCircle, AlertTriangle, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const features = [
  { icon: <Zap className="w-5 h-5 text-yellow-500" />, bg: "bg-yellow-50", label: "Paiements instantanés" },
  { icon: <Shield className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", label: "Sécurité renforcée" },
  { icon: <Globe className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50", label: "TMoney & Moov Money" },
  { icon: <Smartphone className="w-5 h-5 text-purple-500" />, bg: "bg-purple-50", label: "Solutions Fintech" },
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

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 pb-8">

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
            <p className="text-xs text-muted-foreground mt-0.5">par ashtech Sarl</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </motion.div>

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

        {/* Infos entreprise */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Informations légales</span>
          </div>
          {[
            { label: "Société",     value: "ashtech Sarl" },
            { label: "Pays",        value: "Cameroun 🇨🇲" },
            { label: "Secteur",     value: "Fintech / Paiement numérique" },
            { label: "Marchés",     value: "Afrique de l'Ouest & Centrale" },
            { label: "Monnaie",     value: "FCFA (XOF / XAF)" },
            { label: "Contact",     value: "contact@bloumcash.com" },
          ].map((item, i, arr) => (
            <div key={i} className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-semibold text-foreground text-right max-w-[55%]">{item.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Avertissement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-orange-200 bg-orange-50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="font-bold text-sm text-orange-800">⚠️ Avertissement important</h3>
          </div>
          <div className="space-y-3 text-[12px] text-orange-700 leading-relaxed">
            <p>
              <strong>Bloum Cash n'est PAS une banque</strong> ni une institution financière. Bloum Cash agit uniquement comme une société FINTECH facilitant ses services en partenariat avec des partenaires agréés et licenciés dans leurs juridictions respectives.
            </p>
            <p>
              En utilisant les plateformes de Bloum Cash, vous reconnaissez que toutes les transactions financières sont fournies via des <strong>partenaires tiers autorisés</strong>.
            </p>
            <p>
              <strong>ashtech Sarl</strong> est une société enregistrée légalement au Cameroun, spécialisée dans les infrastructures de paiement numérique et les solutions fintech destinées à l'Afrique de l'Ouest et Centrale.
            </p>
            <p>
              Les services proposés peuvent inclure : collecte de paiements Mobile Money, envoi de paiements (Pay-out), outils marchands et solutions fintech. Toutes les opérations sont soumises aux réglementations locales applicables, aux politiques <strong>AML/CFT</strong>.
            </p>
            <p>
              En utilisant Bloum Cash, vous acceptez les Conditions Générales d'Utilisation, la Politique de Confidentialité et les règles de conformité de la plateforme. Bloum Cash se réserve le droit de <strong>suspendre, limiter ou refuser</strong> tout compte ou transaction suspecte.
            </p>
          </div>
        </motion.div>

        {/* Support */}
        <motion.a
          href="https://wa.me/22891000000"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
