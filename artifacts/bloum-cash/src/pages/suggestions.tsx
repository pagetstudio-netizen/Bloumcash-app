import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lightbulb, MessageSquare, Bug, CheckCircle2, ChevronRight, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BLUE = "#2d52e8";
const BG = "h-[100dvh] w-full bg-[#f5f7ff] flex flex-col md:max-w-md md:mx-auto overflow-hidden";

const TYPES = [
  {
    key: "suggestion",
    label: "Suggestion d'amélioration",
    desc: "Proposez une nouvelle fonctionnalité",
    icon: Lightbulb,
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  {
    key: "retour",
    label: "Retour sur l'application",
    desc: "Partagez votre expérience utilisateur",
    icon: MessageSquare,
    color: "#2d52e8",
    bg: "#eff2ff",
    border: "#c7d2fe",
  },
  {
    key: "bug",
    label: "Signaler un problème",
    desc: "Décrivez un bug ou dysfonctionnement",
    icon: Bug,
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
  },
];

export default function Suggestions() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"type" | "form" | "done">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const chosenType = TYPES.find((t) => t.key === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("bloum_token");
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: selectedType, title: title.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur lors de l'envoi");
      }
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={BG}>
      {/* Header */}
      <div
        className="flex-shrink-0 text-white px-5 py-4 flex items-center gap-4 shadow-md z-10"
        style={{ background: `linear-gradient(135deg, #1a3fc4, ${BLUE})` }}
      >
        <button onClick={() => (step === "form" ? setStep("type") : setLocation("/plus"))} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Suggestions & Retours</h1>
          <p className="text-xs opacity-75">Aidez-nous à améliorer Bloum Cash</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── Étape 1 : Choisir le type ── */}
          {step === "type" && (
            <motion.div key="type" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-3">
              <p className="text-sm text-gray-500 text-center pt-2 pb-1">
                Que souhaitez-vous partager avec nous ?
              </p>

              {TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <motion.button
                    key={t.key}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedType(t.key); setStep("form"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white text-left transition-all shadow-sm hover:shadow-md"
                    style={{ borderColor: t.border }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bg }}>
                      <Icon className="w-6 h-6" style={{ color: t.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{t.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </motion.button>
                );
              })}

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-4">
                <p className="text-xs text-blue-700 text-center leading-relaxed">
                  Vos retours sont précieux. Chaque suggestion est lue et étudiée par notre équipe. Merci de contribuer à l'amélioration de Bloum Cash.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Étape 2 : Formulaire ── */}
          {step === "form" && chosenType && (
            <motion.form key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit} className="p-4 space-y-4">

              {/* Badge type */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: chosenType.bg, border: `1px solid ${chosenType.border}` }}>
                <chosenType.icon className="w-5 h-5 flex-shrink-0" style={{ color: chosenType.color }} />
                <span className="text-sm font-semibold" style={{ color: chosenType.color }}>{chosenType.label}</span>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    selectedType === "suggestion" ? "Ex: Ajouter la biométrie au login"
                    : selectedType === "retour" ? "Ex: L'application est rapide et intuitive"
                    : "Ex: Le QR code ne s'affiche pas"
                  }
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{title.length}/100</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    selectedType === "suggestion" ? "Décrivez en détail votre idée d'amélioration..."
                    : selectedType === "retour" ? "Partagez votre expérience avec l'application..."
                    : "Décrivez le problème et dans quelle situation il s'est produit..."
                  }
                  maxLength={1000}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white text-gray-900 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{message.length}/1000</p>
              </div>

              {/* Info utilisateur */}
              {user && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: BLUE }}>
                    {user.fullName?.[0] ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{user.fullName}</p>
                    <p className="text-xs text-gray-400">Envoyé depuis votre compte</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, #1a3fc4, ${BLUE})` }}
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours…</> : <><Send className="w-5 h-5" /> Envoyer</>}
              </button>
            </motion.form>
          )}

          {/* ── Étape 3 : Confirmation ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Merci pour votre retour !</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Votre {selectedType === "suggestion" ? "suggestion" : selectedType === "retour" ? "retour" : "signalement"} a bien été reçu. Notre équipe le prendra en compte pour améliorer Bloum Cash.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => { setStep("type"); setTitle(""); setMessage(""); setSelectedType(""); }}
                  className="w-full py-3.5 rounded-2xl text-white font-bold"
                  style={{ background: `linear-gradient(135deg, #1a3fc4, ${BLUE})` }}
                >
                  Envoyer un autre retour
                </button>
                <button
                  onClick={() => setLocation("/plus")}
                  className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold bg-white"
                >
                  Retour au menu
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
