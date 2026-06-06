import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowDownUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatAmount } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Operator = "tmoney" | "moov";

function OperatorBtn({ op, selected, onClick }: { op: Operator; selected: boolean; onClick: () => void }) {
  const name = op === "tmoney" ? "TMoney" : "Moov Money";
  const logo = op === "tmoney" ? tmoneyLogo : moovLogo;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-colors ${
        selected ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
      }`}
    >
      <img src={logo} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
      <span className={`text-xs font-bold ${selected ? "text-green-700" : "text-gray-500"}`}>{name}</span>
    </button>
  );
}

export default function Transfert() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fromOp, setFromOp] = useState<Operator>("tmoney");
  const [toOp, setToOp] = useState<Operator>("moov");
  const [fromPhone, setFromPhone] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const amountNum = parseFloat(amount.replace(/\s/g, "")) || 0;
  const isCross = fromOp !== toOp;
  const fees = amountNum > 0 ? Math.round(amountNum * (isCross ? 0.02 : 0.01)) : 0;
  const total = amountNum + fees;
  const canConfirm = fromPhone.length >= 8 && toPhone.length >= 8 && amountNum >= 100;

  const handleSwap = () => {
    const tmpOp = fromOp; const tmpPhone = fromPhone;
    setFromOp(toOp); setFromPhone(toPhone);
    setToOp(tmpOp); setToPhone(tmpPhone);
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      toast({ variant: "destructive", title: "Champs incomplets", description: "Remplissez les numéros et un montant ≥ 100 FCFA." });
      return;
    }
    setStep("success");
  };

  /* ── SUCCESS ── */
  if (step === "success") {
    return (
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] to-[#0d9488] flex flex-col items-center justify-center px-6 md:max-w-md md:mx-auto">
        <div className="bg-white rounded-3xl p-8 w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-500 text-4xl font-bold">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Transfert initié !</h2>
          <p className="text-gray-500 text-sm mb-6">
            {formatAmount(amountNum)} vers {toPhone} est en cours de traitement.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-3.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl text-sm font-bold"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => setLocation("/")} className="text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-white">Transfert d'argent</h1>
          <p className="text-white/60 text-[11px]">Sécurisé et instantané</p>
        </div>
        <div className="w-8" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-4 gap-2 pb-3 overflow-hidden">

        {/* DEPUIS */}
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg flex-shrink-0">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Depuis</p>
          <div className="flex gap-2 mb-2">
            <OperatorBtn op="tmoney" selected={fromOp === "tmoney"} onClick={() => setFromOp("tmoney")} />
            <OperatorBtn op="moov"   selected={fromOp === "moov"}   onClick={() => setFromOp("moov")} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1">Numéro source</p>
          <input
            type="tel"
            value={fromPhone}
            onChange={(e) => setFromPhone(e.target.value)}
            placeholder="Ex : 90 12 34 56"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 h-9"
          />
        </div>

        {/* Swap */}
        <div className="flex justify-center flex-shrink-0 -my-0.5">
          <motion.button
            type="button"
            whileTap={{ rotate: 180, scale: 0.88 }}
            transition={{ duration: 0.2 }}
            onClick={handleSwap}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white border border-white/30 shadow"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* VERS */}
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg flex-shrink-0">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Vers</p>
          <div className="flex gap-2 mb-2">
            <OperatorBtn op="moov"   selected={toOp === "moov"}   onClick={() => setToOp("moov")} />
            <OperatorBtn op="tmoney" selected={toOp === "tmoney"} onClick={() => setToOp("tmoney")} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1">Numéro destinataire</p>
          <input
            type="tel"
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
            placeholder="Ex : 99 65 43 21"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 h-9"
          />
        </div>

        {/* MONTANT */}
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg flex-shrink-0">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Montant</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="flex-1 text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none min-w-0 bg-transparent"
            />
            <span className="text-sm font-bold text-gray-400 flex-shrink-0">FCFA</span>
          </div>
          {amountNum >= 100 && (
            <p className="text-xs text-blue-500 mt-1">{formatAmount(amountNum)}</p>
          )}
        </div>

        {/* Récapitulatif */}
        <div className="bg-white/15 rounded-2xl px-4 py-2 border border-white/20 flex-shrink-0">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-white/70 text-xs">Frais</span>
            <span className="text-white font-semibold text-xs">{amountNum > 0 ? formatAmount(fees) : "—"}</span>
          </div>
          <div className="h-px bg-white/10 my-0.5" />
          <div className="flex justify-between items-center py-0.5">
            <span className="text-white/70 text-xs">Total débité</span>
            <span className="text-white font-bold text-xs">{amountNum > 0 ? formatAmount(total) : "—"}</span>
          </div>
          <div className="h-px bg-white/10 my-0.5" />
          <div className="flex justify-between items-center py-0.5">
            <span className="text-white/70 text-xs">Délai</span>
            <span className="text-white font-semibold text-xs">Instantané</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Bouton confirmer */}
        <button
          type="button"
          onClick={handleConfirm}
          className={`flex-shrink-0 w-full h-13 py-4 rounded-2xl text-base font-bold shadow-lg transition-all ${
            canConfirm
              ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white"
              : "bg-white/20 text-white/50 cursor-not-allowed"
          }`}
        >
          {canConfirm ? "Confirmer le transfert" : "Remplissez tous les champs"}
        </button>
      </div>
    </div>
  );
}
