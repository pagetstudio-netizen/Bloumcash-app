import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const sections = [
  {
    title: "1. Acceptation des conditions",
    content:
      "En utilisant Bloum Cash, vous acceptez les présentes conditions générales d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.",
  },
  {
    title: "2. Description du service",
    content:
      "Bloum Cash est une application de paiement mobile permettant d'effectuer et de recevoir des paiements via les réseaux TMoney et Moov Money au Togo. Le service est fourni tel quel.",
  },
  {
    title: "3. Compte utilisateur",
    content:
      "Vous êtes responsable de la confidentialité de vos identifiants de connexion (e-mail et code PIN). Toute activité effectuée depuis votre compte est de votre responsabilité.",
  },
  {
    title: "4. Transactions",
    content:
      "Les transactions sont irrévocables une fois confirmées. Bloum Cash n'est pas responsable des erreurs de saisie de la part de l'utilisateur. Vérifiez toujours les informations avant de valider.",
  },
  {
    title: "5. Frais et tarifs",
    content:
      "Des frais de service peuvent s'appliquer selon le type et le montant de la transaction. Ces frais sont affichés avant chaque validation. Bloum Cash se réserve le droit de modifier ses tarifs.",
  },
  {
    title: "6. Limitation de responsabilité",
    content:
      "Bloum Cash ne saurait être tenu responsable des pertes résultant d'une utilisation frauduleuse de votre compte si vous n'avez pas pris les précautions nécessaires pour protéger vos accès.",
  },
  {
    title: "7. Modification des conditions",
    content:
      "Bloum Cash se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants par e-mail ou notification dans l'application.",
  },
  {
    title: "8. Droit applicable",
    content:
      "Les présentes conditions sont régies par le droit togolais. Tout litige sera soumis à la juridiction compétente de Lomé, Togo.",
  },
];

export default function Conditions() {
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
        <h1 className="text-lg font-bold flex-1">Conditions d'utilisation</h1>
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
