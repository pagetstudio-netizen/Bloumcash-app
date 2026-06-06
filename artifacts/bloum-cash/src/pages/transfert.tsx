import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowDownUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatAmount } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Operator = "tmoney" | "moov";

function OperatorBtn({
  op,
  selected,
  onClick,
}: {
  op: Operator;
  selected: boolean;
  onClick: () => void;
}) {
  const name = op === "tmoney" ? "TMoney" : "Moov Money";
  const logo = op === "tmoney" ? tmoneyLogo : moovLogo;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
        selected
          ? "border-green-500 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <img
        src={logo}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
      <span
        className={`text-xs font-bold leading-tight ${
          selected ? "text-green-700" : "text-gray-600"
        }`}
      >
        {name}
      </span>
    </button>
  );
}

export default function Transfert() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fromOperator, setFromOperator] = useState<Operator>("tmoney");
  const [toOperator, setToOperator] = useState<Operator>("tmoney");
  const [fromPhone, setFromPhone] = useState("+228 90 12 34 56");
  const [toPhone, setToPhone] = useState("+228 99 65 43 21");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const amountNum = parseFloat(amount) || 0;
  const isCross = fromOperator !== toOperator;
  const feeRate = isCross ? 0.02 : 0.01;
  const fees = amountNum > 0 ? Math.round(amountNum * feeRate) : 0;
  const total = amountNum + fees;

  const handleSwap = () => {
    const tmpOp = fromOperator;
    const tmpPhone = fromPhone;
    setFromOperator(toOperator);
    setFromPhone(toPhone);
    setToOperator(tmpOp);
    setToPhone(tmpPhone);
  };

  const handleConfirm = () => {
    if (!fromPhone || !toPhone || amountNum < 100) {
      toast({
        variant: "destructive",
        title: "Champs incomplets",
        description: "Veuillez remplir tous les champs. Montant minimum : 100 FCFA.",
      });
      return;
    }
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col items-center justify-center p-6 md:max-w-md md:mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-green-500 text-5xl font-bold">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfert Initié !</h2>
          <p className="text-gray-500 text-sm mb-8">
            Votre transfert de {formatAmount(amountNum)} vers {toPhone} est en cours de traitement.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="w-full h-13 py-3.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl text-base font-bold shadow-md"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1558b0] to-[#0d9488] flex flex-col md:max-w-md md:mx-auto overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3 flex-shrink-0">
        <Link href="/" className="text-white p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">Transfert d'argent</h1>
          <p className="text-white/60 text-[11px]">Sécurisé et instantané</p>
        </div>
        <button className="text-white p-1">
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 flex flex-col px-4 gap-3 overflow-hidden pb-5">

        {/* DEPUIS card */}
        <div className="bg-white rounded-2xl p-4 shadow-xl flex-shrink-0">
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">
            DEPUIS
          </p>
          <div className="flex gap-2 mb-3">
            <OperatorBtn op="tmoney" selected={fromOperator === "tmoney"} onClick={() => setFromOperator("tmoney")} />
            <OperatorBtn op="moov"   selected={fromOperator === "moov"}   onClick={() => setFromOperator("moov")} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1.5">
            Compte source (Numéro de téléphone)
          </p>
          <input
            type="tel"
            value={fromPhone}
            onChange={(e) => setFromPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Swap arrow */}
        <div className="flex justify-center flex-shrink-0 -my-1">
          <motion.button
            type="button"
            whileTap={{ rotate: 180, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            onClick={handleSwap}
            className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/30 shadow-md"
          >
            <ArrowDownUp className="w-4 h-4" />
          </motion.button>
        </div>

        {/* VERS card */}
        <div className="bg-white rounded-2xl p-4 shadow-xl flex-shrink-0">
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">
            VERS
          </p>
          <div className="flex gap-2 mb-3">
            <OperatorBtn op="moov"   selected={toOperator === "moov"}   onClick={() => setToOperator("moov")} />
            <OperatorBtn op="tmoney" selected={toOperator === "tmoney"} onClick={() => setToOperator("tmoney")} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1.5">
            Compte de destination (Numéro de téléphone)
          </p>
          <input
            type="tel"
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* MONTANT */}
        <div className="flex-shrink-0">
          <p className="text-[11px] font-extrabold text-white uppercase tracking-widest mb-2">
            MONTANT
          </p>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl border border-white/25 flex items-center px-4 py-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Entrez le montant à transférer"
              className="flex-1 bg-transparent text-white placeholder:text-white/50 text-sm focus:outline-none min-w-0"
            />
            <span className="text-white font-bold text-sm ml-2 flex-shrink-0">
              {amountNum > 0 ? `${formatAmount(amountNum)}` : "X OF"}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-shrink-0 bg-white/10 rounded-2xl px-4 py-3 space-y-1.5 border border-white/20">
          <div className="flex justify-between items-center">
            <span className="text-white/70 text-sm">Frais de transfert :</span>
            <span className="text-white font-semibold text-sm">
              {amountNum > 0 ? formatAmount(fees) : "X OF"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70 text-sm">Montant total :</span>
            <span className="text-white font-semibold text-sm">
              {amountNum > 0 ? formatAmount(total) : "X OF"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70 text-sm">Délai estimé :</span>
            <span className="text-white font-bold text-sm">Instantané</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Confirm button */}
        <div className="flex-shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            className="w-full h-14 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl text-base font-bold shadow-lg tracking-wide"
          >
            Confirmer le transfert
          </motion.button>
        </div>
      </div>
    </div>
  );
}
