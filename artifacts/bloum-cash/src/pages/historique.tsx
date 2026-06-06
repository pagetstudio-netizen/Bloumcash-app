import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import {
  ArrowLeft, Search, Download, X, Copy,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle,
  Calendar, Clock, Hash, Smartphone, Zap,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Tx = {
  id: string; type: "incoming" | "outgoing"; title: string;
  operator: "tmoney" | "moov"; amount: number; date: string;
  time: string; status: "success" | "failed"; ref: string;
  phone?: string; description?: string;
};

const mockTransactions: Tx[] = [
  { id: "1", type: "incoming", title: "Paiement reçu",  operator: "tmoney", amount: 150000, date: "05 Juin 2026", time: "10:45", status: "success", ref: "TX98765", phone: "90 12 34 56", description: "Vente produit – Boutique Kotam" },
  { id: "2", type: "incoming", title: "Paiement reçu",  operator: "moov",   amount: 250000, date: "05 Juin 2026", time: "09:30", status: "success", ref: "TX98764", phone: "99 65 43 21", description: "Règlement client" },
  { id: "3", type: "outgoing", title: "Transfert émis", operator: "tmoney", amount: 75000,  date: "04 Juin 2026", time: "18:20", status: "success", ref: "TX98763", phone: "91 23 45 67", description: "Remboursement fournisseur" },
  { id: "4", type: "incoming", title: "Paiement reçu",  operator: "moov",   amount: 325000, date: "04 Juin 2026", time: "14:10", status: "success", ref: "TX98762", phone: "97 88 12 34", description: "Commande en ligne #4021" },
  { id: "5", type: "outgoing", title: "Achat crédit",   operator: "tmoney", amount: 5000,   date: "03 Juin 2026", time: "11:15", status: "failed",  ref: "TX98761", phone: "90 12 34 56", description: "Recharge téléphone" },
  { id: "6", type: "outgoing", title: "Transfert émis", operator: "moov",   amount: 120000, date: "02 Juin 2026", time: "16:40", status: "success", ref: "TX98760", phone: "99 00 11 22", description: "Paiement prestataire" },
];

const OP_NAME: Record<string, string> = { tmoney: "TMoney", moov: "Moov Money" };

function DetailRow({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-gray-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 mt-0.5 ${mono ? "font-mono tracking-wider" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

export default function Historique() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const filtered = mockTransactions.filter(tx =>
    tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    toast({ title: "Référence copiée !" });
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden relative">

      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 shadow-md z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">Historique</h1>
          </div>
          <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une transaction..."
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-10 h-11 rounded-xl focus-visible:ring-white/30"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-muted overflow-hidden">
                      <img src={tx.operator === "tmoney" ? tmoneyLogo : moovLogo} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${tx.type === "incoming" ? "bg-green-500" : "bg-red-500"}`}>
                      {tx.type === "incoming"
                        ? <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
                        : <ArrowUpRight className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{tx.title}</p>
                    <p className="text-xs text-muted-foreground">{tx.date} · {tx.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-base ${tx.type === "incoming" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type === "incoming" ? "+" : "-"}{formatAmount(tx.amount)}
                  </p>
                  <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tx.status === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                  }`}>
                    {tx.status === "success"
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />}
                    {tx.status === "success" ? "Succès" : "Échoué"}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground font-mono">Réf : {tx.ref}</span>
                <button
                  onClick={() => setSelectedTx(tx)}
                  className="text-xs font-semibold text-[#1a3fc4] bg-blue-50 px-3 py-1 rounded-full active:bg-blue-100 transition-colors"
                >
                  Voir détails
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Aucune transaction trouvée</p>
          </div>
        )}
      </div>

      {/* ── MODAL DÉTAILS ── */}
      <AnimatePresence>
        {selectedTx && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/50 z-40"
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 overflow-hidden"
            >
              {/* Poignée */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* En-tête modal */}
              <div className={`px-5 py-4 flex items-center gap-4 ${selectedTx.type === "incoming" ? "bg-green-50" : "bg-red-50"}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm">
                    <img src={selectedTx.operator === "tmoney" ? tmoneyLogo : moovLogo} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow ${selectedTx.type === "incoming" ? "bg-green-500" : "bg-red-500"}`}>
                    {selectedTx.type === "incoming"
                      ? <ArrowDownLeft className="w-3 h-3 text-white" />
                      : <ArrowUpRight className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{selectedTx.title}</p>
                  <p className={`text-3xl font-black mt-0.5 ${selectedTx.type === "incoming" ? "text-green-600" : "text-red-500"}`}>
                    {selectedTx.type === "incoming" ? "+" : "-"}{formatAmount(selectedTx.amount)}
                  </p>
                  <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTx.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {selectedTx.status === "success"
                      ? <><CheckCircle2 className="w-3 h-3" /> Succès</>
                      : <><XCircle className="w-3 h-3" /> Échoué</>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-8 h-8 bg-white/70 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Détails */}
              <div className="px-5 pt-2 pb-6">
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date" value={`${selectedTx.date} à ${selectedTx.time}`} />
                <DetailRow icon={<Smartphone className="w-4 h-4" />} label="Opérateur" value={OP_NAME[selectedTx.operator]} />
                {selectedTx.phone && (
                  <DetailRow icon={<Smartphone className="w-4 h-4" />} label="Numéro" value={selectedTx.phone} />
                )}
                {selectedTx.description && (
                  <DetailRow icon={<Clock className="w-4 h-4" />} label="Description" value={selectedTx.description} />
                )}
                <DetailRow icon={<Zap className="w-4 h-4" />} label="Délai" value="Instantané" />

                {/* Référence avec copie */}
                <div className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-gray-500">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Référence</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 mt-0.5 tracking-wider">{selectedTx.ref}</p>
                  </div>
                  <button
                    onClick={() => copyRef(selectedTx.ref)}
                    className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#1a3fc4]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bouton fermer */}
                <button
                  onClick={() => setSelectedTx(null)}
                  className="mt-2 w-full h-12 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl text-sm font-bold shadow"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
