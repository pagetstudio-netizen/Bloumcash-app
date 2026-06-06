import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import moovLogo from "@assets/op-moov_1780731707633.png";

const BG = "h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

export default function ConfigMoov() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  const [phone, setPhone] = useState("99 65 43 21");
  const [name, setName] = useState("Mon compte Moov");
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleSave = () => {
    if (phone.length < 8) {
      showModal({ type: "error", title: "Numéro invalide", message: "Entrez un numéro Moov Money valide." });
      return;
    }
    setSaved(true);
    showModal({ type: "success", title: "Configuration sauvegardée !", message: "Votre numéro Moov Money est bien configuré." });
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => setLocation("/encaisser")} className="text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-white flex-1 text-center pr-7">Configuration Moov</h1>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-5 gap-4 overflow-y-auto">
        {/* Logo + statut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg"
        >
          <img src={moovLogo} alt="Moov Money" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
          <div>
            <h2 className="font-bold text-gray-900 text-base">Moov Money</h2>
            <p className="text-xs text-gray-500 mt-0.5">Moov Africa — Togo</p>
            {saved && (
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Configuré
              </span>
            )}
          </div>
        </motion.div>

        {/* Formulaire */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-4 shadow-lg flex flex-col gap-4"
        >
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Numéro Moov Money
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : 99 65 43 21"
              className="w-full border border-gray-200 rounded-xl px-4 h-11 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Nom du compte
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Ma boutique"
              className="w-full border border-gray-200 rounded-xl px-4 h-11 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/15 rounded-2xl px-4 py-3 border border-white/20"
        >
          <p className="text-white/80 text-xs leading-relaxed">
            Ce numéro sera utilisé pour recevoir les paiements Moov Money. Assurez-vous qu'il est actif et accessible.
          </p>
        </motion.div>

        <div className="flex-1 min-h-0" />

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex-shrink-0 w-full h-12 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl text-sm font-bold shadow-lg"
        >
          Sauvegarder la configuration
        </motion.button>
      </div>
    </div>
  );
}
