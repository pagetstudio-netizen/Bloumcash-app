import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowDownUp, CheckCircle2, Zap, HelpCircle, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatAmount, validateTogoPhone } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Operator = "tmoney" | "moov";

const OPS: Record<Operator, { name: string; logo: string; accent: string }> = {
  tmoney: { name: "TMoney",     logo: tmoneyLogo, accent: "#f59e0b" },
  moov:   { name: "Moov Money", logo: moovLogo,   accent: "#1a3fc4" },
};

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

function fmt(n: number) {
  return n.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
}

/* ─── Modale sélecteur opérateur ─────────────────────────────────── */
function OpModal({
  open,
  excluded,
  onSelect,
  onClose,
}: {
  open: boolean;
  excluded: Operator;
  onSelect: (op: Operator) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-4 pb-10 max-w-md mx-auto shadow-2xl"
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Choisir l'opérateur</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["tmoney", "moov"] as Operator[]).map((op) => {
                const { name, logo, accent } = OPS[op];
                const isExcluded = op === excluded;
                return (
                  <button
                    key={op}
                    onClick={() => { if (!isExcluded) { onSelect(op); onClose(); } }}
                    disabled={isExcluded}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                      isExcluded
                        ? "border-gray-100 bg-gray-50 opacity-35 cursor-not-allowed"
                        : "border-gray-100 bg-white active:scale-95 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <img
                      src={logo}
                      alt={name}
                      className="w-14 h-14 rounded-2xl object-cover shadow-md"
                    />
                    <span className="text-sm font-bold text-gray-800 text-center leading-tight">{name}</span>
                    {isExcluded && (
                      <span className="text-[10px] text-gray-400 font-medium">Non disponible</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              Seuls les transferts entre opérateurs différents sont autorisés
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Page principale ────────────────────────────────────────────── */
export default function Transfert() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  const [fromOp, setFromOp] = useState<Operator>("tmoney");
  const [toOp,   setToOp]   = useState<Operator>("moov");
  const [toPhone, setToPhone] = useState("");
  const [amount,  setAmount]  = useState("");
  const [step,    setStep]    = useState<"form" | "success">("form");
  const [modalFor, setModalFor] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const amountNum = parseFloat(amount.replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
  const fees      = amountNum > 0 ? Math.round(amountNum * 0.02) : 0;
  const total     = amountNum + fees;

  const phoneInfo    = validateTogoPhone(toPhone);
  const detectedOp   = phoneInfo.valid ? phoneInfo.operator : null;
  const phoneMatches = !phoneInfo.valid || detectedOp === toOp;
  const canConfirm   = phoneInfo.valid && amountNum >= 100 && phoneMatches;

  const handleChangeFrom = (op: Operator) => {
    setFromOp(op);
    setToOp(op === "tmoney" ? "moov" : "tmoney");
  };

  const handleChangeTo = (op: Operator) => {
    setToOp(op);
    setFromOp(op === "tmoney" ? "moov" : "tmoney");
  };

  const handleSwap = () => {
    setFromOp(toOp);
    setToOp(fromOp);
    setToPhone("");
  };

  const handleQuick = (v: number) => setAmount(String(v));

  const handleConfirm = () => {
    if (!canConfirm) {
      showModal({
        type: "warning",
        title: "Informations requises",
        message: "Vérifiez le numéro destinataire et le montant (minimum 100 FCFA).",
      });
      return;
    }
    setStep("success");
  };

  /* ── Succès ── */
  if (step === "success") {
    return (
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#2344d4] to-[#1230a8] flex flex-col items-center justify-center px-5 md:max-w-md md:mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 220 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Transfert initié !</h2>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-bold text-gray-800">{formatAmount(amountNum)}</span> envoyé vers
          </p>
          <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 mb-4 mt-3">
            <img src={OPS[toOp].logo} alt="" className="w-10 h-10 rounded-xl object-cover shadow" />
            <div className="text-left">
              <p className="text-xs text-gray-400">{OPS[toOp].name}</p>
              <p className="text-sm font-bold text-gray-800">{toPhone}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 text-sm text-gray-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Montant</span>
              <span className="font-semibold text-gray-800">{formatAmount(amountNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frais (2%)</span>
              <span className="font-semibold text-gray-800">{formatAmount(fees)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="text-gray-700 font-semibold">Total débité</span>
              <span className="font-bold text-[#1a3fc4]">{formatAmount(total)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Traitement instantané
          </div>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-4 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-2xl text-sm font-bold shadow-lg active:scale-[0.98] transition-transform"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Formulaire ── */
  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a3fc4] via-[#1e47d8] to-[#1230a8] flex flex-col md:max-w-md md:mx-auto overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => setLocation("/")}
          className="w-10 h-10 flex items-center justify-center bg-white/15 rounded-full text-white backdrop-blur-sm border border-white/20 active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-white tracking-tight">Transférer</h1>
          <p className="text-white/55 text-[11px] font-medium">Sécurisé & instantané</p>
        </div>
        <button className="w-10 h-10 flex items-center justify-center bg-white/15 rounded-full text-white backdrop-blur-sm border border-white/20">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* ── Carte principale ── */}
      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
        <div className="flex-1 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-0">

          {/* ══ DE ══ */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2.5">De</p>
            <div className="flex items-center gap-3">
              {/* Bouton sélecteur opérateur source */}
              <button
                onClick={() => setModalFor("from")}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 min-w-0 flex-shrink-0 active:scale-95 transition-transform"
              >
                <img
                  src={OPS[fromOp].logo}
                  alt={OPS[fromOp].name}
                  className="w-9 h-9 rounded-xl object-cover shadow-sm flex-shrink-0"
                />
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black text-gray-800 leading-tight truncate">{OPS[fromOp].name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight font-medium">Appuyer</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>

              {/* Numéro source (affiché depuis le compte) */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold leading-tight mb-0.5">Votre compte</p>
                <p className="text-sm font-bold text-gray-800 leading-tight truncate">
                  {fromOp === "tmoney" ? "90 XX XX XX" : "96 XX XX XX"}
                </p>
              </div>
            </div>
          </div>

          {/* ══ BOUTON SWAP ══ */}
          <div className="flex items-center gap-3 px-5 -my-1 z-10">
            <div className="flex-1 h-px bg-gray-100" />
            <motion.button
              type="button"
              whileTap={{ rotate: 180, scale: 0.85 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onClick={handleSwap}
              className="w-10 h-10 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white flex-shrink-0"
            >
              <ArrowDownUp className="w-4 h-4" />
            </motion.button>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ══ VERS ══ */}
          <div className="px-5 pt-3 pb-4 border-b border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2.5">Vers</p>
            <div className="flex items-center gap-3 mb-3">
              {/* Bouton sélecteur opérateur destinataire */}
              <button
                onClick={() => setModalFor("to")}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 min-w-0 flex-shrink-0 active:scale-95 transition-transform"
              >
                <img
                  src={OPS[toOp].logo}
                  alt={OPS[toOp].name}
                  className="w-9 h-9 rounded-xl object-cover shadow-sm flex-shrink-0"
                />
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black text-gray-800 leading-tight truncate">{OPS[toOp].name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight font-medium">Appuyer</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>

              {/* Indicateur détection auto */}
              <div className="flex-1 flex items-center gap-2">
                {detectedOp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      phoneMatches ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {phoneMatches ? `✓ ${OPS[detectedOp].name}` : `≠ ${OPS[detectedOp].name}`}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Champ numéro destinataire */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-lg">🇹🇬</span>
                <span className="text-sm font-semibold text-gray-500">+228</span>
                <span className="text-gray-300 text-sm">|</span>
              </div>
              <input
                type="tel"
                value={toPhone}
                onChange={(e) => setToPhone(e.target.value)}
                placeholder="90 12 34 56"
                maxLength={12}
                className={`w-full bg-gray-50 border rounded-2xl pl-[5.5rem] pr-4 h-12 text-sm font-bold text-gray-900 placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 transition-all ${
                  toPhone && !phoneMatches
                    ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                    : toPhone && phoneInfo.valid
                    ? "border-green-300 focus:ring-green-200 focus:border-green-400"
                    : "border-gray-200 focus:ring-[#1a3fc4]/30 focus:border-[#1a3fc4]"
                }`}
              />
            </div>
            {toPhone && !phoneMatches && (
              <p className="text-[10px] text-red-500 font-semibold mt-1 ml-1">
                Ce numéro appartient à {detectedOp ? OPS[detectedOp].name : "un autre opérateur"}
              </p>
            )}
          </div>

          {/* ══ MONTANT ══ */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2">Montant</p>
            <div className="flex items-end gap-2.5">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="flex-1 text-[2.4rem] font-black text-gray-900 placeholder:text-gray-200 focus:outline-none min-w-0 bg-transparent leading-none"
              />
              <span className="text-sm font-bold text-gray-400 mb-2 flex-shrink-0">FCFA</span>
            </div>
            <AnimatePresence>
              {amountNum >= 100 && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] text-[#1a3fc4] font-bold mt-0.5"
                >
                  {formatAmount(amountNum)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ══ MONTANTS RAPIDES ══ */}
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  onClick={() => handleQuick(v)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                    amountNum === v
                      ? "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>

          {/* ══ RÉSUMÉ ══ */}
          <div className="px-5 py-3 flex-1">
            <div className="flex gap-0 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mb-1">Montant</p>
                <p className="text-sm font-bold text-gray-800 truncate">{amountNum > 0 ? `${fmt(amountNum)} F` : "—"}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mb-1">Frais 2%</p>
                <p className="text-sm font-bold text-orange-500 truncate">{amountNum > 0 ? `${fmt(fees)} F` : "—"}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mb-1">Total</p>
                <p className="text-sm font-bold text-[#1a3fc4] truncate">{amountNum > 0 ? `${fmt(total)} F` : "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bouton Continuer ── */}
        <motion.button
          type="button"
          whileTap={canConfirm ? { scale: 0.97 } : {}}
          onClick={handleConfirm}
          className={`flex-shrink-0 w-full h-14 rounded-2xl text-base font-bold shadow-xl transition-all mt-3 ${
            canConfirm
              ? "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white"
              : "bg-white/20 text-white/50"
          }`}
        >
          {canConfirm ? "Continuer →" : "Remplissez les champs"}
        </motion.button>
      </div>

      {/* ── Modales opérateur ── */}
      <OpModal
        open={modalFor === "from"}
        excluded={toOp}
        onSelect={handleChangeFrom}
        onClose={() => setModalFor(null)}
      />
      <OpModal
        open={modalFor === "to"}
        excluded={fromOp}
        onSelect={handleChangeTo}
        onClose={() => setModalFor(null)}
      />
    </div>
  );
}
