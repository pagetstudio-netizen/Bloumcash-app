import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Phone, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useWhatsAppSupportNumber } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const faqs = [
  { q: "Comment recevoir un paiement ?", r: "Générez un QR code depuis l'onglet Encaisser, puis partagez-le au client." },
  { q: "Mon paiement n'arrive pas ?", r: "Vérifiez votre numéro configuré et assurez-vous que votre compte est actif." },
  { q: "Quels opérateurs sont supportés ?", r: "Bloum Cash supporte TMoney (Togocel) et Moov Money (Moov Africa)." },
];

export default function WhatsAppSupport() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const waNumber = useWhatsAppSupportNumber();

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const displayNumber = waNumber.length === 11
    ? `+${waNumber.slice(0, 3)} ${waNumber.slice(3, 5)} ${waNumber.slice(5, 7)} ${waNumber.slice(7, 9)} ${waNumber.slice(9)}`
    : `+${waNumber}`;

  const openWhatsApp = () => {
    const msg = encodeURIComponent("Bonjour, j'ai besoin d'aide avec mes paiements Bloum Cash.");
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => setLocation("/encaisser")} className="text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-white flex-1 text-center pr-7">Support Paiements</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-4">
        {/* Carte principale */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-lg flex flex-col items-center text-center gap-3"
        >
          <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-md">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Support via WhatsApp</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Notre équipe répond à vos questions sur les encaissements et paiements directement sur WhatsApp.
            </p>
          </div>

          <div className="w-full bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-[#25D366] flex-shrink-0" />
              <span className="font-semibold">{displayNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Lun – Sam, 8h00 – 20h00</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openWhatsApp}
            className="w-full h-12 bg-[#25D366] text-white rounded-2xl text-sm font-bold shadow-md flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contacter sur WhatsApp
          </motion.button>
        </motion.div>

        {/* Statut service */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/15 rounded-2xl px-4 py-3 border border-white/20 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Service opérationnel</p>
            <p className="text-white/60 text-xs">Temps de réponse moyen : 5 min</p>
          </div>
        </motion.div>

        {/* FAQ rapide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] font-extrabold text-white/60 uppercase tracking-widest mb-2 ml-1">Questions fréquentes</p>
          <div className="flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-gray-800 mb-1">{faq.q}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{faq.r}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
