import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import { formatAmount } from "@/lib/utils";

const BG = "h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

interface Produit {
  id: string;
  nom: string;
  prix: number;
  description: string;
}

const initialProduits: Produit[] = [
  { id: "1", nom: "Recharge téléphone", prix: 1000, description: "Recharge mobile tous opérateurs" },
  { id: "2", nom: "Transfert rapide", prix: 500, description: "Frais de transfert standard" },
];

export default function Produits() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  const [produits, setProduits] = useState<Produit[]>(initialProduits);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [description, setDescription] = useState("");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleAdd = () => {
    if (!nom || !prix) {
      showModal({ type: "warning", title: "Champs requis", message: "Nom et prix sont obligatoires." });
      return;
    }
    const newProduit: Produit = {
      id: Date.now().toString(),
      nom,
      prix: parseFloat(prix),
      description,
    };
    setProduits((p) => [newProduit, ...p]);
    setNom(""); setPrix(""); setDescription("");
    setShowForm(false);
    showModal({ type: "success", title: "Produit ajouté !", message: "Le produit a été ajouté à votre catalogue." });
  };

  const handleDelete = (id: string) => {
    setProduits((p) => p.filter((x) => x.id !== id));
    showModal({ type: "info", title: "Produit supprimé", message: "Le produit a été retiré de votre catalogue." });
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => setLocation("/encaisser")} className="text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-white flex-1 text-center pr-7">Produits / Boutique</h1>
      </div>

      {/* Barre d'action */}
      <div className="px-4 mb-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm((v) => !v)}
          className="w-full h-10 bg-white/20 border border-white/30 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Annuler" : "Ajouter un produit"}
        </motion.button>
      </div>

      {/* Formulaire ajout */}
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
                placeholder="Nom du produit *"
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                placeholder="Prix en FCFA *"
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleAdd}
                className="w-full h-10 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-xl text-sm font-bold"
              >
                Ajouter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste produits */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-2.5 overflow-y-auto">
        {produits.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-10">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-white/70 text-sm font-medium">Aucun produit ajouté</p>
            <p className="text-white/50 text-xs">Appuyez sur "Ajouter un produit" pour commencer</p>
          </div>
        ) : (
          produits.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 leading-tight truncate">{p.nom}</p>
                {p.description && <p className="text-xs text-gray-400 truncate">{p.description}</p>}
                <p className="text-xs font-semibold text-blue-600 mt-0.5">{formatAmount(p.prix)}</p>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
