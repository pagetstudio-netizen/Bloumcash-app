import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

type Step = "email" | "code" | "done";

export default function ForgotPin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erreur serveur");
        return;
      }
      setStep("code");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPin !== confirmPin) { setError("Les PIN ne correspondent pas"); return; }
    if (!/^\d{6}$/.test(newPin)) { setError("Le PIN doit être 6 chiffres"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Code invalide ou expiré"); return; }
      setStep("done");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      {/* Header */}
      <div className="h-44 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col p-6 text-white rounded-b-[2rem] pt-12">
        <button onClick={() => step === "code" ? setStep("email") : setLocation("/login")}
          className="flex items-center text-white mb-4">
          <ArrowLeft className="w-6 h-6 mr-2" />
          {step === "code" ? "Retour" : "Retour à la connexion"}
        </button>
        <h1 className="text-2xl font-bold">
          {step === "email" ? "Code PIN oublié ?" : step === "code" ? "Réinitialiser le PIN" : "PIN réinitialisé !"}
        </h1>
        <p className="text-white/80 mt-1 text-sm">
          {step === "email" ? "Entrez votre e-mail pour recevoir un code"
            : step === "code" ? `Code envoyé à ${email}`
            : "Votre nouveau PIN est actif"}
        </p>
      </div>

      <div className="flex-1 p-6 -mt-8 pb-12">
        <AnimatePresence mode="wait">
          {/* ── Étape 1 : email ── */}
          {step === "email" && (
            <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500">Un code à 6 chiffres vous sera envoyé par email</p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="nom@exemple.com" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : "Envoyer le code"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Étape 2 : code + nouveau PIN ── */}
          {step === "code" && (
            <motion.div key="code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-5">

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                📩 Code envoyé à <strong>{email}</strong> — vérifiez vos emails (et spams). Valable <strong>15 minutes</strong>.
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
                  <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="_ _ _ _ _ _" maxLength={6} required pattern="\d{6}"
                    className="w-full text-center text-2xl font-bold tracking-[0.4em] py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Nouveau PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau PIN (6 chiffres)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPin ? "text" : "password"} value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••" maxLength={6} required
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmer PIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau PIN</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPin ? "text" : "password"} value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••" maxLength={6} required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

                <button type="submit" disabled={loading || code.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Réinitialisation…</> : "Réinitialiser mon PIN"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Étape 3 : succès ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">PIN réinitialisé !</h2>
              <p className="text-gray-500 text-sm mb-8">
                Votre nouveau PIN est actif. Vous pouvez maintenant vous connecter.
              </p>
              <button onClick={() => setLocation("/login")}
                className="w-full py-3.5 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white rounded-xl font-semibold text-sm">
                Se connecter
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
