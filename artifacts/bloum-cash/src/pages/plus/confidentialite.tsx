import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const sections = [
  {
    title: "1. Données collectées",
    content:
      "Bloum Cash collecte les informations suivantes : nom complet, adresse e-mail, numéros de téléphone mobile money associés, et historique des transactions réalisées via l'application.",
  },
  {
    title: "2. Utilisation des données",
    content:
      "Vos données sont utilisées uniquement pour : fournir le service de paiement, améliorer l'expérience utilisateur, vous contacter en cas de problème sur votre compte, et respecter les obligations légales.",
  },
  {
    title: "3. Partage des données",
    content:
      "Vos données personnelles ne sont jamais vendues à des tiers. Elles peuvent être partagées avec les opérateurs TMoney et Moov Money uniquement dans le cadre du traitement de vos transactions.",
  },
  {
    title: "4. Sécurité des données",
    content:
      "Nous utilisons des protocoles de chiffrement de niveau bancaire (TLS 1.3) pour protéger toutes les communications entre l'application et nos serveurs. Vos mots de passe ne sont jamais stockés en clair.",
  },
  {
    title: "5. Conservation des données",
    content:
      "Vos données de transaction sont conservées pendant 5 ans conformément aux obligations légales togolaises. Vous pouvez demander la suppression de votre compte à tout moment.",
  },
  {
    title: "6. Vos droits",
    content:
      "Vous avez le droit d'accéder, de corriger et de supprimer vos données personnelles. Pour exercer ces droits, contactez-nous via Support WhatsApp ou à l'adresse privacy@bloumcash.com.",
  },
  {
    title: "7. Cookies et tracking",
    content:
      "L'application utilise des cookies techniques essentiels au fonctionnement du service. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.",
  },
  {
    title: "8. Contact",
    content:
      "Pour toute question relative à la protection de vos données, contactez notre délégué à la protection des données : privacy@bloumcash.com.",
  },
];

export default function Confidentialite() {
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
        <h1 className="text-lg font-bold flex-1">Politique de confidentialité</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground px-1"
        >
          Dernière mise à jour : Juin 2026
        </motion.p>

        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-4"
          >
            <h3 className="font-bold text-sm text-foreground mb-2">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </motion.div>
        ))}

        <div className="pb-4" />
      </div>
    </div>
  );
}
