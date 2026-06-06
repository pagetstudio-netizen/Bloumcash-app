import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowDownUp, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatAmount } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Operator = "tmoney" | "moov";

const OPS: Record<Operator, { name: string; logo: string; color: string; bg: string }> = {
  tmoney:  { name: "TMoney",     logo: tmoneyLogo, color: "text-yellow-700",  bg: "bg-yellow-50"  },
  moov:    { name: "Moov Money", logo: moovLogo,   color: "text-blue-700",    bg: "bg-blue-50"    },
};

function OpSelector({
  label, value, onChange,
}: { label: string; value: Operator; onChange: (op: Operator) => void }) {
  return (
    <div className="flex gap-2">
      {(["tmoney", "moov"] as Operator[]).map((op) => {
        const { name, logo, color, bg } = OPS[op];
        const sel = value === op;
        return (
          <button
            key={op}
            type="button"
            onClick={() => onChange(op)}
            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 transition-all ${
              sel
                ? `border-[#1a3fc4] ${bg}`
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <img src={logo} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm" />
            <div className="text-left min-w-0">
              <p className={`text-xs font-bold leading-tight ${sel ? color : "text-gray-400"}`}>{name}</p>
              <p className={`text-[10px] leading-tight ${sel ? "text-gray-500" : "text-gray-300"}`}>
                {sel ? "Sélectionné" : "Appuyer"}
              </p>
            </div>
            {sel && (
              <div className="ml-auto w-4 h-4 bg-[#1a3fc4] rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function Transfert() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fromOp, setFromOp] = useState<Operator>("tmoney");
  const [toOp,   setToOp]   = useState<Operator>("moov");
  const [fromPhone, setFromPhone] = useState("");
  const [toPhone,   setToPhone]   = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const amountNum = parseFloat(amount.replace(/\s/g, "")) || 0;
  const isCross   = fromOp !== toOp;
  const fees      = amountNum > 0 ? Math.round(amountNum * (isCross ? 0.02 : 0.01)) : 0;
  const total     = amountNum + fees;
  const canConfirm = fromPhone.length >= 8 && toPhone.length >= 8 && amountNum >= 100;

  const handleSwap = () => {
    const [o, p] = [fromOp, fromPhone];
    setFromOp(toOp); setFromPhone(toPhone);
    setToOp(o);     setToPhone(p);
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      toast({ variant: "destructive", title: "Champs incomplets", description: "Remplissez les numéros et un montant ≥ 100 FCFA." });
      return;
    }
    setStep("success");
  };

  /* ═══════════════════════ SUCCESS ═══════════════════════ */
  if (step === "success") {
    return (
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] to-[#0d9488] flex flex-col items-center justify-center px-6 md:max-w-md md:mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Transfert initié !</h2>
          <p className="text-gray-500 text-sm mb-2">
            <span className="font-bold text-gray-800">{formatAmount(amountNum)}</span> envoyé vers
          </p>
          <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-6">
            <img src={OPS[toOp].logo} alt="" className="w-8 h-8 rounded-full object-cover" />
            <div className="text-left">
              <p className="text-xs text-gray-400">{OPS[toOp].name}</p>
              <p className="text-sm font-bold text-gray-800">{toPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-6">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Traitement instantané
          </div>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-4 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl text-sm font-bold shadow-lg"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════ FORM ═══════════════════════ */
  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 flex items-center justify-between">
        <button onClick={() => setLocation("/")} className="w-9 h-9 flex items-center justify-center bg-white/15 rounded-full text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-white">Transfert d'argent</h1>
          <p className="text-white/60 text-[11px]">Sécurisé &amp; instantané</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Carte principale */}
      <div className="flex-1 flex flex-col px-4 pb-4 gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-0">

          {/* ── DEPUIS ── */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">Depuis</p>
            <OpSelector label="Depuis" value={fromOp} onChange={setFromOp} />
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Numéro source</label>
              <input
                type="tel"
                value={fromPhone}
                onChange={(e) => setFromPhone(e.target.value)}
                placeholder="Ex : 90 12 34 56"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/40 focus:border-[#1a3fc4]"
              />
            </div>
          </div>

          {/* ── SWAP ── */}
          <div className="flex justify-center -my-0.5 z-10">
            <motion.button
              type="button"
              whileTap={{ rotate: 180, scale: 0.85 }}
              transition={{ duration: 0.22 }}
              onClick={handleSwap}
              className="w-9 h-9 bg-[#1a3fc4] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white"
            >
              <ArrowDownUp className="w-4 h-4" />
            </motion.button>
          </div>

          {/* ── VERS ── */}
          <div className="px-5 pt-4 pb-4 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">Vers</p>
            <OpSelector label="Vers" value={toOp} onChange={setToOp} />
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Numéro destinataire</label>
              <input
                type="tel"
                value={toPhone}
                onChange={(e) => setToPhone(e.target.value)}
                placeholder="Ex : 99 65 43 21"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/40 focus:border-[#1a3fc4]"
              />
            </div>
          </div>

          {/* ── MONTANT ── */}
          <div className="px-5 py-4 flex-1 flex flex-col justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Montant</p>
            <div className="flex items-end gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="flex-1 text-4xl font-black text-gray-900 placeholder:text-gray-200 focus:outline-none min-w-0 bg-transparent leading-none"
              />
              <span className="text-base font-bold text-gray-400 mb-1 flex-shrink-0">FCFA</span>
            </div>
            <AnimatePresence>
              {amountNum >= 100 && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[#1a3fc4] font-semibold mt-1"
                >
                  {formatAmount(amountNum)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="flex-shrink-0 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/25 flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Frais</p>
            <p className="text-white font-bold text-sm mt-0.5">{amountNum > 0 ? formatAmount(fees) : "—"}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Total débité</p>
            <p className="text-white font-bold text-sm mt-0.5">{amountNum > 0 ? formatAmount(total) : "—"}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Délai</p>
            <p className="text-white font-bold text-sm mt-0.5 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300" /> Instant
            </p>
          </div>
        </div>

        {/* Bouton confirmer */}
        <motion.button
          type="button"
          whileTap={canConfirm ? { scale: 0.97 } : {}}
          onClick={handleConfirm}
          className={`flex-shrink-0 w-full h-14 rounded-2xl text-base font-bold shadow-xl transition-all ${
            canConfirm
              ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white"
              : "bg-white/20 text-white/50"
          }`}
        >
          {canConfirm ? "Confirmer le transfert" : "Remplissez tous les champs"}
        </motion.button>
      </div>
    </div>
  );
}
