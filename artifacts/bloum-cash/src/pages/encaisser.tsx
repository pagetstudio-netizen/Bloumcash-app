import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Search, ChevronRight, QrCode,
  ShoppingBag, ShoppingCart, MessageCircle,
  Share2, Copy, Download, Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type View = "menu" | "config" | "qr";
type Operator = "tmoney" | "moov";

const BG = "h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center px-5 pt-6 pb-3 flex-shrink-0">
      <button onClick={onBack} className="text-white p-1 -ml-1">
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h1 className="text-lg font-bold text-white flex-1 text-center pr-8">{title}</h1>
    </div>
  );
}

export default function Encaisser() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [view, setView] = useState<View>("menu");
  const [operator, setOperator] = useState<Operator>("tmoney");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [qrRef, setQrRef] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleCreate = () => {
    if (!phone || phone.length < 8 || !shopName || shopName.length < 2) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir tous les champs correctement." });
      return;
    }
    const ref = "QR" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setQrRef(ref);
    setView("qr");
  };

  const qrValue = qrRef ? `${window.location.origin}/paiement/${qrRef}` : "";

  /* ════════════════════════════════════
     VUE : MENU DE PAIEMENT
  ════════════════════════════════════ */
  if (view === "menu") {
    const menuItems = [
      {
        icon: <QrCode className="w-5 h-5 text-white" />,
        bg: "bg-green-500",
        title: "Générer un Code QR",
        subtitle: "Créez un QR code pour encaisser un paiement.",
        action: () => setView("config"),
      },
      {
        iconImg: tmoneyLogo,
        title: "Configuration Tmoney",
        subtitle: "Gérer le numéro Tmoney configuré.",
        action: () => setView("config"),
      },
      {
        iconImg: moovLogo,
        title: "Configuration Moov",
        subtitle: "Gérer le numéro Moov configuré.",
        action: () => setView("config"),
      },
      {
        icon: <ShoppingBag className="w-5 h-5 text-white" />,
        bg: "bg-green-500",
        title: "Produits / Boutique",
        subtitle: "Liste des produits et boutiques.",
        action: () => toast({ title: "Bientôt disponible" }),
      },
      {
        icon: <ShoppingCart className="w-5 h-5 text-white" />,
        bg: "bg-green-500",
        title: "Boutiques configurées",
        subtitle: "Liste des produits et boutiques configurés.",
        action: () => toast({ title: "Bientôt disponible" }),
      },
      {
        icon: <MessageCircle className="w-5 h-5 text-white" />,
        bg: "bg-[#25D366]",
        title: "Support Paiements via WhatsApp",
        subtitle: "Aide rapide pour vos encaissements.",
        action: () => toast({ title: "Bientôt disponible" }),
      },
    ];

    const filtered = menuItems.filter(
      (item) =>
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className={BG}>
        <Header onBack={() => setLocation("/")} title="Menu de Paiement" />

        {/* Search bar */}
        <div className="px-4 mb-3 flex-shrink-0">
          <div className="bg-white/95 rounded-full flex items-center px-4 py-2.5 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher produits ou configurations"
              className="flex-1 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Menu list */}
        <div className="flex-1 px-4 flex flex-col gap-2 overflow-hidden min-h-0">
          {filtered.map((item, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={item.action}
              className="w-full bg-white rounded-xl flex items-center px-3 py-3 gap-3 shadow-sm text-left flex-shrink-0"
            >
              {item.iconImg ? (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={item.iconImg} alt={item.title} className="w-10 h-10 object-cover rounded-xl" />
                </div>
              ) : (
                <div className={`${item.bg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5 truncate">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </motion.button>
          ))}
        </div>

        <div className="pb-3 flex-shrink-0" />
      </div>
    );
  }

  /* ════════════════════════════════════
     VUE : NOUVELLE CONFIGURATION
  ════════════════════════════════════ */
  if (view === "config") {
    const canGenerate = phone.length >= 8 && shopName.length >= 2;

    return (
      <div className={BG}>
        <Header onBack={() => setView("menu")} title="Nouvelle Configuration" />

        <div className="flex-1 flex flex-col px-4 overflow-hidden min-h-0">
          <div className="bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-5">

            {/* Numéro de réception */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Numéro de réception (Tmoney ou Moov) :
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 h-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Opérateur segmented */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Opérateur</label>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden h-12">
                <button
                  type="button"
                  onClick={() => setOperator("tmoney")}
                  className={`flex-1 h-full text-sm font-semibold transition-colors ${
                    operator === "tmoney" ? "bg-gray-100 text-gray-900" : "text-gray-400"
                  }`}
                >
                  Tmoney
                </button>
                <div className="w-px h-7 bg-gray-300" />
                <button
                  type="button"
                  onClick={() => setOperator("moov")}
                  className={`flex-1 h-full text-sm font-semibold transition-colors ${
                    operator === "moov" ? "bg-gray-100 text-gray-900" : "text-gray-400"
                  }`}
                >
                  Moov
                </button>
                <div className="w-px h-7 bg-gray-300" />
                <div className="px-3 flex items-center text-gray-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Nom boutique */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Nom de la boutique ou produit :
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 h-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Inline QR button (disabled state) */}
            <div className="text-center">
              <button
                type="button"
                disabled={!canGenerate}
                onClick={canGenerate ? handleCreate : undefined}
                className={`w-full h-11 rounded-xl text-sm font-bold transition-all ${
                  canGenerate
                    ? "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white shadow"
                    : "bg-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                Générer Code QR
              </button>
              {!canGenerate && (
                <p className="text-xs text-gray-400 mt-2 text-center leading-snug">
                  Enregistrez la configuration pour générer le code QR
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="px-4 pb-6 pt-4 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            className="w-full h-14 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl text-base font-bold shadow-lg"
          >
            Créer la configuration
          </motion.button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════
     VUE : QR CODE GÉNÉRÉ
  ════════════════════════════════════ */
  return (
    <div className={BG}>
      <Header onBack={() => setView("config")} title="Mon QR Code" />

      <div className="flex-1 flex flex-col px-4 overflow-hidden min-h-0">
        {/* QR card */}
        <div className="bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3 flex-shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bloum Cash</p>
          <h2 className="text-base font-bold text-gray-900 text-center">{shopName}</h2>

          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <QRCodeSVG value={qrValue} size={150} level="H" />
          </div>

          <p className="text-xs text-gray-400 font-medium">Scanner pour payer</p>

          {/* Reference */}
          <div className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Référence</p>
            <p className="font-mono font-bold text-sm text-gray-800 tracking-widest">{qrRef}</p>
          </div>

          {/* Operator + phone */}
          <div className="w-full flex items-center gap-2 px-1">
            <img
              src={operator === "tmoney" ? tmoneyLogo : moovLogo}
              alt=""
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gray-700">
              {operator === "tmoney" ? "TMoney" : "Moov Money"}
            </span>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="text-sm text-gray-500">{phone}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2.5 mt-3 flex-shrink-0">
          {[
            { icon: <Share2 className="w-5 h-5" />, label: "Partager",    fn: () => toast({ title: "Lien partagé !" }) },
            { icon: <Copy className="w-5 h-5" />,   label: "Copier",      fn: () => { navigator.clipboard?.writeText(qrValue); toast({ title: "Lien copié !" }); } },
            { icon: <Download className="w-5 h-5" />,label: "Enregistrer",fn: () => toast({ title: "Téléchargement en cours..." }) },
            { icon: <Printer className="w-5 h-5" />, label: "Imprimer",   fn: () => window.print() },
          ].map((btn, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={btn.fn}
              className="bg-white/20 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-1.5 py-3 text-white border border-white/25"
            >
              {btn.icon}
              <span className="text-[10px] font-semibold">{btn.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* New QR */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setView("config"); setPhone(""); setShopName(""); setQrRef(null); }}
          className="w-full h-12 bg-white/20 backdrop-blur-sm text-white rounded-2xl text-sm font-semibold border border-white/30"
        >
          Générer un autre QR Code
        </motion.button>
      </div>
    </div>
  );
}
