import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Store, Plus, Trash2, X, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

const BG = "h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

type Op = "tmoney" | "moov";

interface Boutique {
  id: string;
  nom: string;
  operateur: Op;
  numero: string;
  ref: string;
}

const initialBoutiques: Boutique[] = [
  { id: "1", nom: "Boutique Kotam", operateur: "tmoney", numero: "90 12 34 56", ref: "QR6GQZQ7" },
  { id: "2", nom: "Épicerie Centrale", operateur: "moov", numero: "99 65 43 21", ref: "QRX8BK2A" },
];

export default function Boutiques() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  const [boutiques, setBoutiques] = useState<Boutique[]>(initialBoutiques);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [operateur, setOperateur] = useState<Op>("tmoney");
  const [numero, setNumero] = useState("");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleAdd = () => {
    if (!nom || numero.length < 8) {
      showModal({ type: "warning", title: "Champs requis", message: "Nom et numéro valide obligatoires." });
      return;
    }
    const ref = "QR" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setBoutiques((b) => [{ id: Date.now().toString(), nom, operateur, numero, ref }, ...b]);
    setNom(""); setNumero(""); setShowForm(false);
    showModal({ type: "success", title: "Boutique ajoutée !", message: "Votre boutique a été configurée avec succès." });
  };

  const handleDelete = (id: string) => {
    setBoutiques((b) => b.filter((x) => x.id !== id));
    showModal({ type: "info", title: "Boutique supprimée", message: "La boutique a été retirée de votre liste." });
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => setLocation("/encaisser")} className="text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-white flex-1 text-center pr-7">Boutiques configurées</h1>
      </div>

      {/* Bouton ajouter */}
      <div className="px-4 mb-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm((v) => !v)}
          className="w-full h-10 bg-white/20 border border-white/30 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Annuler" : "Nouvelle boutique"}
        </motion.button>
      </div>

      {/* Formulaire */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 mb-3 flex-shrink-0 overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom de la boutique *"
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {/* Opérateur */}
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-10">
                {(["tmoney", "moov"] as Op[]).map((op, i) => (
                  <React.Fragment key={op}>
                    {i > 0 && <div className="w-px h-6 bg-gray-200" />}
                    <button
                      type="button"
                      onClick={() => setOperateur(op)}
                      className={`flex-1 h-full text-sm font-semibold transition-colors ${operateur === op ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
                    >
                      {op === "tmoney" ? "TMoney" : "Moov"}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <input
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Numéro de réception *"
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleAdd}
                className="w-full h-10 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-xl text-sm font-bold"
              >
                Créer la boutique
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-2.5 overflow-y-auto">
        {boutiques.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-10">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-white/70 text-sm font-medium">Aucune boutique configurée</p>
          </div>
        ) : (
          boutiques.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <img
                  src={b.operateur === "tmoney" ? tmoneyLogo : moovLogo}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{b.nom}</p>
                  <p className="text-xs text-gray-500">{b.operateur === "tmoney" ? "TMoney" : "Moov Money"} · {b.numero}</p>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-[11px] font-mono text-gray-400 tracking-wider">{b.ref}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
