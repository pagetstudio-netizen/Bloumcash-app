import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  Smartphone,
  Facebook,
  Instagram,
  Send,
  Music2,
  Youtube,
  MessageCircle,
  Phone,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { phoneToWaNumber } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const topics = [
  {
    icon: <QrCode className="w-5 h-5 text-blue-600" />,
    bg: "bg-blue-50",
    title: "Encaisser un paiement",
    content:
      "Pour encaisser, allez dans la section Encaisser → Générer un QR Code. Configurez votre numéro TMoney ou Moov Money, puis partagez le QR Code avec votre client. Le paiement est instantané.",
  },
  {
    icon: <ArrowRightLeft className="w-5 h-5 text-purple-600" />,
    bg: "bg-purple-50",
    title: "Effectuer un transfert",
    content:
      "Accédez à Transférer depuis le tableau de bord. Saisissez le numéro du destinataire, choisissez l'opérateur (TMoney ou Moov), entrez le montant et confirmez. Les frais sont affichés avant validation.",
  },
  {
    icon: <CreditCard className="w-5 h-5 text-green-600" />,
    bg: "bg-green-50",
    title: "Consulter mon historique",
    content:
      "Vos transactions sont accessibles via l'onglet Historique. Vous pouvez filtrer par type (entrées/sorties), rechercher par référence et exporter vos relevés.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-orange-600" />,
    bg: "bg-orange-50",
    title: "Sécurité de mon compte",
    content:
      "Votre compte est protégé par un code PIN à 8 chiffres. Ne partagez jamais votre PIN. En cas de perte ou d'oubli, utilisez la fonctionnalité 'Code PIN oublié' sur l'écran de connexion.",
  },
  {
    icon: <Smartphone className="w-5 h-5 text-teal-600" />,
    bg: "bg-teal-50",
    title: "Opérateurs supportés",
    content:
      "Bloum Cash prend en charge TMoney et Moov Money au Togo. Assurez-vous que votre numéro est actif et enregistré auprès de l'opérateur avant de configurer votre compte.",
  },
];

type PublicSettings = {
  facebook_url?: string;
  instagram_url?: string;
  telegram_url?: string;
  tiktok_url?: string;
  whatsapp_url?: string;
  youtube_url?: string;
  support_phone?: string;
};

const socialNetworks = [
  { key: "facebook_url", label: "Facebook", icon: Facebook, className: "text-blue-600 bg-blue-50" },
  { key: "instagram_url", label: "Instagram", icon: Instagram, className: "text-pink-600 bg-pink-50" },
  { key: "telegram_url", label: "Telegram", icon: Send, className: "text-sky-600 bg-sky-50" },
  { key: "tiktok_url", label: "TikTok", icon: Music2, className: "text-slate-900 bg-slate-100" },
  { key: "youtube_url", label: "YouTube", icon: Youtube, className: "text-red-600 bg-red-50" },
  { key: "whatsapp_url", label: "WhatsApp", icon: MessageCircle, className: "text-green-600 bg-green-50" },
] as const;

function isHttpUrl(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Aide() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState<number | null>(null);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({});

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/public-settings")
      .then((response) => response.ok ? response.json() : null)
      .then((data: PublicSettings | null) => {
        if (data) setPublicSettings(data);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const supportPhone = publicSettings.support_phone?.trim() ?? "";
  const supportWhatsappNumber = phoneToWaNumber(supportPhone);
  const supportWhatsappUrl = supportWhatsappNumber.length >= 8
    ? `https://wa.me/${supportWhatsappNumber}?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide avec Bloum Cash.")}`
    : null;
  const configuredSocials = socialNetworks.filter(({ key }) => isHttpUrl(publicSettings[key]));

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Centre d'aide</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-sm text-muted-foreground px-1">
          Trouvez rapidement les réponses à vos questions sur l'utilisation de Bloum Cash.
        </p>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4"
        >
          <div>
            <h2 className="font-bold text-foreground">Besoin d'aide ?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Contactez le support ou retrouvez Bloum Cash sur nos réseaux sociaux.
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-green-50/70 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-green-700">Support WhatsApp</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {supportPhone || "Numéro non configuré"}
              </p>
            </div>
            {supportWhatsappUrl && (
              <a
                href={supportWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-green-700 whitespace-nowrap"
              >
                Contacter
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {configuredSocials.map(({ key, label, icon: Icon, className }) => (
              <a
                key={key}
                href={publicSettings[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${className}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </a>
            ))}
          </div>

          {!supportPhone && configuredSocials.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Les coordonnées de support et les réseaux sociaux seront affichés ici dès qu'ils seront configurés par l'administrateur.
            </p>
          )}
        </motion.section>

        {topics.map((topic, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className={`${topic.bg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                {topic.icon}
              </div>
              <span className="font-semibold text-sm text-foreground flex-1">{topic.title}</span>
              {open === i ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
                    {topic.content}
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
