import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const faqs = [
  {
    q: "Qu'est-ce que Bloum Cash ?",
    a: "Bloum Cash est une application de paiement mobile conçue pour le Togo, permettant d'encaisser et transférer de l'argent via TMoney et Moov Money rapidement et en toute sécurité.",
  },
  {
    q: "Comment créer mon compte ?",
    a: "Téléchargez l'application, appuyez sur « S'inscrire » et renseignez votre nom complet, adresse e-mail et créez un code PIN à 8 chiffres. C'est gratuit et instantané.",
  },
  {
    q: "Quels opérateurs sont acceptés ?",
    a: "Bloum Cash supporte TMoney et Moov Money. D'autres opérateurs seront ajoutés prochainement selon la disponibilité au Togo.",
  },
  {
    q: "Les transactions sont-elles sécurisées ?",
    a: "Oui. Toutes les transactions sont chiffrées et protégées par votre code PIN personnel. Bloum Cash ne stocke jamais vos données bancaires directement.",
  },
  {
    q: "Quels sont les frais de transfert ?",
    a: "Les frais varient selon l'opérateur et le montant. Ils sont affichés clairement avant chaque confirmation de transaction.",
  },
  {
    q: "J'ai oublié mon code PIN, que faire ?",
    a: "Depuis l'écran de connexion, appuyez sur « Code PIN oublié ». Vous recevrez un lien de réinitialisation par e-mail.",
  },
  {
    q: "Comment générer un QR Code de paiement ?",
    a: "Allez dans Encaisser → Créer une Nouvelle Configuration. Entrez votre numéro mobile money, choisissez l'opérateur et donnez un nom à votre boutique. Votre QR Code est généré instantanément.",
  },
  {
    q: "Puis-je avoir plusieurs configurations de paiement ?",
    a: "Oui, vous pouvez créer plusieurs configurations QR correspondant à différents produits ou boutiques. Chaque configuration a une référence unique.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Vous pouvez nous joindre via Support WhatsApp dans la section Plus, ou par email à support@bloumcash.com. Notre équipe répond dans les 24 heures.",
  },
];

export default function Faq() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState<number | null>(null);

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
        <h1 className="text-lg font-bold flex-1">FAQ</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-sm text-muted-foreground px-1 mb-1">
          Questions fréquemment posées sur Bloum Cash.
        </p>

        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="font-semibold text-sm text-foreground flex-1 leading-snug">{faq.q}</span>
              {open === i ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
