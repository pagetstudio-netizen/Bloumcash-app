import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { ArrowLeft, Search, Download, X, Copy, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useModal } from "@/components/app-modal";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type OpKey = "tmoney" | "moov";
type Tx = {
  id: string;
  type: "incoming" | "outgoing";
  title: string;
  fromOp: OpKey; fromPhone: string;
  toOp: OpKey;   toPhone: string;
  amount: number; fees: number;
  date: string; time: string;
  status: "success" | "failed";
  ref: string;
};

const OP: Record<OpKey, { name: string; logo: string }> = {
  tmoney: { name: "TMoney",     logo: tmoneyLogo },
  moov:   { name: "Moov Money", logo: moovLogo   },
};

const TXNS: Tx[] = [
  { id:"1", type:"incoming", title:"Paiement reçu",  fromOp:"tmoney", fromPhone:"90 12 34 56", toOp:"moov",   toPhone:"99 88 77 66", amount:150000, fees:1500,  date:"05 Juin 2026", time:"10:45", status:"success", ref:"TX98765" },
  { id:"2", type:"incoming", title:"Paiement reçu",  fromOp:"moov",   fromPhone:"99 65 43 21", toOp:"tmoney", toPhone:"90 12 34 56", amount:250000, fees:2500,  date:"05 Juin 2026", time:"09:30", status:"success", ref:"TX98764" },
  { id:"3", type:"outgoing", title:"Transfert émis", fromOp:"tmoney", fromPhone:"90 12 34 56", toOp:"moov",   toPhone:"91 23 45 67", amount:75000,  fees:1500,  date:"04 Juin 2026", time:"18:20", status:"success", ref:"TX98763" },
  { id:"4", type:"incoming", title:"Paiement reçu",  fromOp:"moov",   fromPhone:"97 88 12 34", toOp:"tmoney", toPhone:"90 12 34 56", amount:325000, fees:3250,  date:"04 Juin 2026", time:"14:10", status:"success", ref:"TX98762" },
  { id:"5", type:"outgoing", title:"Achat crédit",   fromOp:"tmoney", fromPhone:"90 12 34 56", toOp:"tmoney", toPhone:"90 12 34 56", amount:5000,   fees:50,    date:"03 Juin 2026", time:"11:15", status:"failed",  ref:"TX98761" },
  { id:"6", type:"outgoing", title:"Transfert émis", fromOp:"moov",   fromPhone:"90 12 34 56", toOp:"moov",   toPhone:"99 00 11 22", amount:120000, fees:2400,  date:"02 Juin 2026", time:"16:40", status:"success", ref:"TX98760" },
];

function InfoRow({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-bold text-right ${valueClass || "text-gray-800"}`}>{value}</span>
    </div>
  );
}

export default function Historique() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tx | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const filtered = TXNS.filter(tx =>
    tx.title.toLowerCase().includes(search.toLowerCase()) ||
    tx.ref.toLowerCase().includes(search.toLowerCase())
  );

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    showModal({ type: "success", title: "Référence copiée !", message: ref });
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden relative">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 shadow-md z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="mr-4"><ArrowLeft className="w-6 h-6" /></Link>
            <h1 className="text-xl font-bold">Historique</h1>
          </div>
          <button className="p-2 bg-white/10 rounded-full">
            <Download className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une transaction..."
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-10 h-11 rounded-xl focus-visible:ring-white/30"
          />
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3">
        {filtered.length > 0 ? filtered.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm"
          >
            <div className="flex justify-between items-start gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden">
                    <img src={OP[tx.fromOp].logo} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${tx.type === "incoming" ? "bg-green-500" : "bg-red-500"}`}>
                    {tx.type === "incoming"
                      ? <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
                      : <ArrowUpRight  className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm whitespace-nowrap">{tx.title}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{tx.date} · {tx.time}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-base whitespace-nowrap ${tx.type === "incoming" ? "text-green-600" : "text-red-500"}`}>
                  {tx.type === "incoming" ? "+" : "-"}{formatAmount(tx.amount)}
                </p>
                <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tx.status === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                }`}>
                  {tx.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {tx.status === "success" ? "Effectué" : "Échoué"}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground font-mono">Réf : {tx.ref}</span>
              <button
                onClick={() => setSelected(tx)}
                className="text-xs font-semibold text-[#1a3fc4] bg-blue-50 px-3 py-1 rounded-full"
              >
                Détails
              </button>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Aucune transaction trouvée</p>
          </div>
        )}
      </div>

      {/* ══════════════ MODAL DÉTAILS ══════════════ */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/50 z-40"
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 overflow-hidden"
            >
              {/* Poignée */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Titre */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900">Détails de la Transaction</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 pt-4 pb-6 space-y-4">

                {/* ── DEPUIS ── */}
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Depuis</p>
                  <div className="flex items-center gap-3">
                    <img src={OP[selected.fromOp].logo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{OP[selected.fromOp].name}</p>
                      <p className="text-xs text-gray-500">+228 {selected.fromPhone}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      selected.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {selected.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {selected.status === "success" ? "Effectué" : "Échoué"}
                    </div>
                  </div>
                </div>

                {/* ── VERS ── */}
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Vers</p>
                  <div className="flex items-center gap-3">
                    <img src={OP[selected.toOp].logo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{OP[selected.toOp].name}</p>
                      <p className="text-xs text-gray-500">+228 {selected.toPhone}</p>
                    </div>
                    <img src={OP[selected.fromOp].logo} alt="" className="w-8 h-8 rounded-full object-cover opacity-40" />
                  </div>
                </div>

                {/* ── Infos ── */}
                <div className="bg-gray-50 rounded-2xl px-4 py-2">
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">ID de transaction</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-gray-700">{selected.ref}</span>
                      <button onClick={() => copyRef(selected.ref)} className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-[#1a3fc4]">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <InfoRow label="Date" value={`${selected.date} ${selected.time}`} />
                  <InfoRow label="Montant transféré" value={formatAmount(selected.amount)} />
                  <InfoRow label="Frais" value={formatAmount(selected.fees)} />
                  <InfoRow label="Total estimé" value={formatAmount(selected.amount + selected.fees)} />
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm text-gray-500">Statut</span>
                    <div className="text-right">
                      <p className={`text-sm font-black ${selected.status === "success" ? "text-green-600" : "text-red-500"}`}>
                        {selected.status === "success" ? "Succès" : "Échec"}
                      </p>
                      <p className="text-xs text-gray-400">{selected.status === "success" ? "Effectué" : "Non effectué"}</p>
                    </div>
                  </div>
                </div>

                {/* ── Bouton ── */}
                <button
                  onClick={() => setSelected(null)}
                  className="w-full h-13 py-4 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl text-sm font-bold shadow-lg"
                >
                  Retour à la liste
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
