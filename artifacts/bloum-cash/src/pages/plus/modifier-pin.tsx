import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

export default function ModifierPin() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (currentPin.length !== 6) {
      setError("Le PIN actuel doit comporter 6 chiffres");
      return;
    }
    if (newPin.length !== 6) {
      setError("Le nouveau PIN doit comporter 6 chiffres");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Les deux nouveaux PINs ne correspondent pas");
      return;
    }
    if (currentPin === newPin) {
      setError("Le nouveau PIN doit être différent de l'ancien");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("bloum_token") ?? "";
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du changement de PIN");
      } else {
        setSuccess(true);
        setTimeout(() => setLocation("/plus"), 2500);
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const PinField = ({
    label,
    value,
    onChange,
    show,
    onToggle,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={placeholder}
          className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-muted/30 text-foreground text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden">
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Modifier mot de passe</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-center pt-16"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground">PIN modifié !</h2>
              <p className="text-muted-foreground text-sm">Votre mot de passe a été mis à jour avec succès.</p>
              <p className="text-xs text-muted-foreground">Redirection en cours…</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Votre PIN est un code à <strong>6 chiffres</strong> utilisé pour vous connecter à Bloum Cash.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
                  <PinField
                    label="PIN actuel"
                    value={currentPin}
                    onChange={setCurrentPin}
                    show={showCurrent}
                    onToggle={() => setShowCurrent(!showCurrent)}
                    placeholder="Entrez votre PIN actuel"
                  />
                  <div className="border-t border-border" />
                  <PinField
                    label="Nouveau PIN"
                    value={newPin}
                    onChange={setNewPin}
                    show={showNew}
                    onToggle={() => setShowNew(!showNew)}
                    placeholder="Choisissez un nouveau PIN"
                  />
                  <PinField
                    label="Confirmer le nouveau PIN"
                    value={confirmPin}
                    onChange={setConfirmPin}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                    placeholder="Répétez le nouveau PIN"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  className="w-full h-13 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white font-bold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  {loading ? "Modification en cours…" : "Modifier le PIN"}
                </button>

                <button
                  type="button"
                  onClick={() => setLocation("/forgot-pin")}
                  className="w-full text-center text-sm text-primary font-medium py-2 hover:underline"
                >
                  PIN oublié ? Réinitialiser par email
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
