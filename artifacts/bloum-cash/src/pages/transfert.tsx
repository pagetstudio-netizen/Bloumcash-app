import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowLeftRight,
  HelpCircle,
  ChevronDown,
  X,
  BookUser,
  Send,
  CheckCircle2,
  Zap,
  ArrowRight,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatAmount, validateTogoPhone } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import { useCreateTransfer } from "@workspace/api-client-react";

import tmoneyLogo from "@assets/op-tmoney_1780731707604.jpeg";
import moovLogo from "@assets/op-moov_1780731707633.png";

type Operator = "tmoney" | "moov";
type Step = "step1" | "step2" | "success";

const OPS: Record<Operator, { name: string; logo: string }> = {
  tmoney: { name: "TMoney",     logo: tmoneyLogo },
  moov:   { name: "Moov Money", logo: moovLogo   },
};

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

function fmt(n: number) {
  return n.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
}

/* ────────────────────────────────────────────────────────────────── */
/*  Modal choix opérateur — centré, style maquette                   */
/* ────────────────────────────────────────────────────────────────── */
function OpModal({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (op: Operator) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Fond flouté */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(40,50,140,0.35)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Carte modale centrée */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] max-w-[300px] bg-white rounded-3xl shadow-2xl p-6"
          >
            {/* Titre + croix */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-gray-900">Choisir l'opérateur</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:scale-90 transition-transform"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Deux cartes opérateurs */}
            <div className="grid grid-cols-2 gap-3">
              {(["tmoney", "moov"] as Operator[]).map((op) => (
                <button
                  key={op}
                  onClick={() => { onSelect(op); onClose(); }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-200 bg-white active:scale-[0.96] hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                >
                  <img
                    src={OPS[op].logo}
                    alt={OPS[op].name}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                  <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                    {OPS[op].name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  Page principale                                                   */
/* ────────────────────────────────────────────────────────────────── */
export default function Transfert() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();
  const createTransfer = useCreateTransfer();

  const [fromOp, setFromOp] = useState<Operator>("tmoney");
  const [toOp,   setToOp]   = useState<Operator>("moov");
  const [fromPhone, setFromPhone] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [amount,  setAmount]  = useState("");
  const [step,    setStep]    = useState<Step>("step1");
  const [modalFor, setModalFor] = useState<"from" | "to" | null>(null);
  const [transferRef, setTransferRef] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const amountNum  = parseFloat(amount.replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
  const feeRate    = 0.035;
  const fees       = amountNum > 0 ? Math.round(amountNum * feeRate) : 0;
  const total      = amountNum + fees;

  const phoneInfo  = validateTogoPhone(toPhone);
  const canNext    = fromPhone.replace(/\s/g, "").length >= 8 && toPhone.replace(/\s/g, "").length >= 8 && amountNum >= 100;

  const handleChangeFrom = (op: Operator) => setFromOp(op);
  const handleChangeTo   = (op: Operator) => setToOp(op);

  const handleSwap = () => {
    setFromOp(toOp);
    setToOp(fromOp);
    const tmp = fromPhone;
    setFromPhone(toPhone);
    setToPhone(tmp);
  };

  const handleNext = () => {
    if (!canNext) {
      showModal({
        type: "warning",
        title: "Informations requises",
        message: "Vérifiez votre numéro, le numéro destinataire (8 chiffres min.) et le montant (100 FCFA min.).",
      });
      return;
    }
    setStep("step2");
  };

  const handleConfirm = async () => {
    try {
      const result = await createTransfer.mutateAsync({
        data: {
          fromOperator: fromOp as "tmoney" | "moov",
          toOperator: toOp as "tmoney" | "moov",
          fromPhone: fromPhone.replace(/\s/g, ""),
          toPhone: toPhone.replace(/\s/g, ""),
          amount: amountNum,
        },
      });
      setTransferRef(result.reference ?? "");
      setStep("success");
    } catch {
      showModal({
        type: "error",
        title: "Transfert échoué",
        message: "Une erreur est survenue lors du transfert. Veuillez réessayer.",
      });
    }
  };

  const handleWhatsAppSupport = () => {
    const msg = [
      `Salut, j'ai besoin d'aide pour ma transaction 🙏`,
      ``,
      `📋 Référence : ${transferRef || "N/A"}`,
      `💰 Montant : ${formatAmount(amountNum)}`,
      `💸 Frais (3,5%) : ${formatAmount(fees)}`,
      `📊 Total débité : ${formatAmount(total)}`,
      `📱 De : +228 ${fromPhone} (${OPS[fromOp].name})`,
      `📱 Vers : +228 ${toPhone} (${OPS[toOp].name})`,
    ].join("\n");
    window.open(`https://wa.me/22892299772?text=${encodeURIComponent(msg)}`, "_blank");
  };

  /* ────── Écran succès ────────────────────────────────────────── */
  if (step === "success") {
    return (
      <div
        className="h-[100dvh] w-full flex flex-col items-center justify-center px-5 md:max-w-md md:mx-auto"
        style={{ background: "linear-gradient(160deg,#3B4FC5 0%,#2b3aa8 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
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
          <p className="text-gray-500 text-sm mb-4">
            <span className="font-bold text-gray-800">{formatAmount(amountNum)}</span> vers
          </p>
          <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <img src={OPS[toOp].logo} alt="" className="w-10 h-10 rounded-xl object-cover shadow" />
            <div className="text-left">
              <p className="text-xs text-gray-400">{OPS[toOp].name}</p>
              <p className="text-sm font-bold text-gray-800">{toPhone}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Montant</span>
              <span className="font-semibold text-gray-800">{formatAmount(amountNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frais (3,5%)</span>
              <span className="font-semibold text-orange-500">{formatAmount(fees)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="font-semibold text-gray-700">Total débité</span>
              <span className="font-bold" style={{ color: "#3B4FC5" }}>{formatAmount(total)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Traitement instantané
          </div>
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-full py-4 text-white rounded-2xl text-sm font-bold shadow-lg active:scale-[0.98] transition-transform mb-3"
            style={{ background: "linear-gradient(90deg,#3B4FC5,#2b3aa8)" }}
          >
            Retour à l'accueil
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleWhatsAppSupport}
            className="w-full rounded-2xl overflow-hidden shadow-md active:brightness-95 transition-all"
            style={{ background: "linear-gradient(135deg,#25D366 0%,#128C7E 100%)" }}
          >
            <div className="flex items-center px-5 py-4 gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.524 5.855L0 24l6.338-1.499A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.031-1.375l-.36-.214-3.733.883.934-3.622-.235-.373A9.867 9.867 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118S21.882 6.533 21.882 12 17.467 21.882 12 21.882z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-[13px] leading-tight">Un souci avec ce paiement ?</p>
                <p className="text-white/75 text-[11px] mt-0.5">Contactez le support via WhatsApp</p>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/60 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
              </svg>
            </div>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* ────── Écran étape 2 — Résumé ─────────────────────────────── */
  if (step === "step2") {
    return (
      <div
        className="h-[100dvh] w-full flex flex-col md:max-w-md md:mx-auto overflow-hidden"
        style={{ background: "#EAECF8" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between" style={{ background: "#3B4FC5" }}>
          <button
            onClick={() => setStep("step1")}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-[17px] font-bold text-white">Transférer</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3" style={{ background: "#EAECF8" }}>
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "#3B4FC5" }}>1</div>
            <div className="flex-1 h-0.5 mx-1" style={{ background: "#3B4FC5" }} />
            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#3B4FC5", borderColor: "#3B4FC5" }}>2</div>
          </div>
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-[11px] text-gray-400">Informations de transfert</span>
            <span className="text-[11px] font-bold" style={{ color: "#3B4FC5" }}>Résumé & Conversion</span>
          </div>
        </div>

        {/* Carte blanche */}
        <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
          <div className="flex-1 bg-white rounded-3xl shadow-lg flex flex-col overflow-hidden min-h-0 px-5 py-5 gap-4">

            {/* Récap opérateurs */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
              <img src={OPS[fromOp].logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">De</p>
                <p className="text-xs font-bold text-gray-800 truncate">{OPS[fromOp].name}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] text-gray-400 font-medium">Vers</p>
                <p className="text-xs font-bold text-gray-800 truncate">{OPS[toOp].name}</p>
              </div>
              <img src={OPS[toOp].logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
            </div>

            {/* Expéditeur */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#3B4FC520" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B4FC5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Numéro expéditeur</p>
                <p className="text-sm font-bold text-gray-800">🇹🇬 +228 {fromPhone}</p>
              </div>
            </div>

            {/* Destinataire */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <Send className="w-4 h-4 flex-shrink-0" style={{ color: "#3B4FC5" }} />
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Numéro destinataire</p>
                <p className="text-sm font-bold text-gray-800">🇹🇬 +228 {toPhone}</p>
              </div>
            </div>


            {/* Résumé */}
            <div className="rounded-2xl overflow-hidden border border-gray-100">
              <div className="flex">
                <div className="flex-1 py-3 text-center bg-gray-50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Montant</p>
                  <p className="text-xs font-bold text-gray-800">{amountNum > 0 ? `${fmt(amountNum)} F` : "—"}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1 py-3 text-center bg-gray-50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Frais 3,5%</p>
                  <p className="text-xs font-bold text-orange-500">{amountNum > 0 ? `${fmt(fees)} F` : "—"}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1 py-3 text-center bg-gray-50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-xs font-bold" style={{ color: "#3B4FC5" }}>{amountNum > 0 ? `${fmt(total)} F` : "—"}</p>
                </div>
              </div>
            </div>

            {/* Bouton Continuer — pleine largeur */}
            <div className="mt-auto">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={createTransfer.isPending}
                className="w-full py-4 rounded-2xl text-[15px] font-bold text-white shadow-lg active:brightness-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(90deg,#3B4FC5 0%,#2b3aa8 100%)" }}
              >
                {createTransfer.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours…</>
                ) : "Confirmer le transfert →"}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ────── Étape 1 — Formulaire (pixel-perfect maquette) ───────── */
  return (
    <div
      className="h-[100dvh] w-full flex flex-col md:max-w-md md:mx-auto overflow-hidden"
      style={{ background: "#EAECF8" }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ background: "#3B4FC5" }}
      >
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-[17px] font-bold text-white">Transférer</h1>
        <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ── Stepper ── */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3" style={{ background: "#EAECF8" }}>
        <div className="flex items-center">
          {/* Étape 1 — active */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "#3B4FC5" }}
          >
            1
          </div>
          {/* Ligne */}
          <div className="flex-1 h-0.5 mx-1" style={{ background: "#C8CCEB" }} />
          {/* Étape 2 — inactive */}
          <div
            className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ borderColor: "#C8CCEB", color: "#B0B5D8" }}
          >
            2
          </div>
        </div>
        <div className="flex justify-between mt-1.5 px-1">
          <span className="text-[11px] font-bold" style={{ color: "#3B4FC5" }}>
            Informations de transfert
          </span>
          <span className="text-[11px] text-gray-400">Résumé & Conversion</span>
        </div>
      </div>

      {/* ── Carte blanche ── */}
      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
        <div className="flex-1 bg-white rounded-3xl shadow-lg flex flex-col overflow-hidden min-h-0 px-5 pt-5 pb-4 gap-4">

          {/* ══ DE ══ */}
          <div>
            {/* Label */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#3B4FC5" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>
                </svg>
              </div>
              <span className="text-[13px] font-bold" style={{ color: "#3B4FC5" }}>De</span>
            </div>

            {/* Sélecteur + champ numéro */}
            <div className="flex items-center gap-3">
              {/* Logo opérateur + chevron */}
              <button
                onClick={() => setModalFor("from")}
                className="flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
              >
                <img
                  src={OPS[fromOp].logo}
                  alt={OPS[fromOp].name}
                  className="w-12 h-12 rounded-full object-cover shadow"
                />
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Pill numéro expéditeur avec input */}
              <div
                className="flex-1 flex items-center gap-1.5 rounded-full px-4 py-2.5"
                style={{ background: "#F0F1FA" }}
              >
                <span className="text-[18px] leading-none">🇹🇬</span>
                <span className="text-[13px] font-medium text-gray-500">+228</span>
                <span className="text-gray-400 text-sm mx-0.5">·</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={fromPhone}
                  onChange={(e) => setFromPhone(e.target.value)}
                  placeholder="Votre numéro"
                  maxLength={11}
                  autoComplete="off"
                  className="flex-1 bg-transparent text-[13px] font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal focus:outline-none min-w-0"
                  style={{ userSelect: "text", WebkitUserSelect: "text", touchAction: "manipulation", pointerEvents: "auto" }}
                />
              </div>
            </div>
          </div>

          {/* ══ MONTANT ══ */}
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant à envoyer  (CFA)"
              className="w-full rounded-full border-2 px-6 py-3 text-[13px] font-medium placeholder:text-gray-400 text-gray-800 focus:outline-none transition-colors"
              style={{
                borderColor: amount && amountNum >= 100 ? "#3B4FC5" : "#F5A0A0",
                background: "white",
              }}
            />
          </div>

          {/* ══ BOUTON INVERSER ══ */}
          <div className="flex justify-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={handleSwap}
              className="flex items-center gap-2 px-7 py-2.5 rounded-full border-2 border-gray-200 bg-white text-[13px] font-bold text-gray-700 shadow-sm active:bg-gray-50 transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" style={{ color: "#3B4FC5" }} />
              Inverser
            </motion.button>
          </div>

          {/* ══ VERS ══ */}
          <div>
            {/* Label */}
            <div className="flex items-center gap-1.5 mb-3">
              <Send className="w-4 h-4" style={{ color: "#3B4FC5" }} />
              <span className="text-[13px] font-bold" style={{ color: "#3B4FC5" }}>Vers</span>
            </div>

            {/* Sélecteur + champ numéro */}
            <div className="flex items-center gap-3">
              {/* Logo opérateur + chevron */}
              <button
                onClick={() => setModalFor("to")}
                className="flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
              >
                <img
                  src={OPS[toOp].logo}
                  alt={OPS[toOp].name}
                  className="w-12 h-12 rounded-full object-cover shadow"
                />
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Pill numéro destinataire avec input + contacts */}
              <div
                className="flex-1 flex items-center gap-1.5 rounded-full px-4 py-2.5"
                style={{ background: "#F0F1FA" }}
              >
                <span className="text-[18px] leading-none">🇹🇬</span>
                <span className="text-[13px] font-medium text-gray-500">+228</span>
                <span className="text-gray-400 text-sm mx-0.5">·</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={toPhone}
                  onChange={(e) => setToPhone(e.target.value)}
                  placeholder="00 00 00 00"
                  maxLength={11}
                  autoComplete="off"
                  className="flex-1 bg-transparent text-[13px] font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal focus:outline-none min-w-0"
                  style={{ userSelect: "text", WebkitUserSelect: "text", touchAction: "manipulation", pointerEvents: "auto" }}
                />
                {/* Bouton contacts */}
                <button className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform" style={{ background: "#3B4FC520" }}>
                  <BookUser className="w-4 h-4" style={{ color: "#3B4FC5" }} />
                </button>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ══ BOUTON SUIVANT (droite, pill) ══ */}
          <div className="flex justify-end">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-bold text-white shadow-lg active:brightness-90 transition-all"
              style={{ background: "#2D3AB8" }}
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Modales opérateur ── */}
      <OpModal
        open={modalFor === "from"}
        onSelect={handleChangeFrom}
        onClose={() => setModalFor(null)}
      />
      <OpModal
        open={modalFor === "to"}
        onSelect={handleChangeTo}
        onClose={() => setModalFor(null)}
      />
    </div>
  );
}
