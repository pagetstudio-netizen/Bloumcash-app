import React, { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, Mail, Loader2, ShieldCheck, KeyRound, Clock, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "credentials" | "verify2fa";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("credentials");
  const [reason, setReason] = useState<"new_device" | "inactivity">("new_device");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Identifiants incorrects"); return; }

      if (data.requires2FA) {
        setReason(data.reason ?? "new_device");
        setStep("verify2fa");
        return;
      }

      /* Connexion directe sans 2FA */
      localStorage.setItem("bloum_admin_token", data.token);
      localStorage.setItem("bloum_admin_user", JSON.stringify(data.admin));
      setLocation("/admin");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Code invalide"); return; }
      localStorage.setItem("bloum_admin_token", data.token);
      localStorage.setItem("bloum_admin_user", JSON.stringify(data.admin));
      setLocation("/admin");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            {step === "verify2fa"
              ? <KeyRound className="w-8 h-8 text-white" />
              : <ShieldCheck className="w-8 h-8 text-white" />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "verify2fa" ? "Vérification" : "Administration"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === "verify2fa" ? "Bloum Cash — Confirmation identité" : "Bloum Cash — Accès restreint"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "credentials" && (
            <motion.form key="creds" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@bloumcash.tg" required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</> : "Se connecter"}
              </button>
            </motion.form>
          )}

          {step === "verify2fa" && (
            <motion.form key="2fa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handle2FA} className="space-y-5">

              {/* Alerte selon la raison */}
              <div className={`rounded-xl p-4 flex gap-3 items-start text-sm ${reason === "new_device" ? "bg-orange-50 border border-orange-200 text-orange-800" : "bg-blue-50 border border-blue-200 text-blue-800"}`}>
                {reason === "new_device"
                  ? <Smartphone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  : <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold mb-0.5">
                    {reason === "new_device" ? "Nouvel appareil détecté" : "Connexion après 3 jours d'inactivité"}
                  </p>
                  <p className="text-xs opacity-80">
                    Un code de vérification a été envoyé à <strong>{email}</strong>. Valable 10 minutes.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="_ _ _ _ _ _" maxLength={6} required pattern="\d{6}"
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-400 text-center mt-1">6 chiffres reçus par email</p>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</> : <><KeyRound className="w-4 h-4" /> Valider le code</>}
              </button>

              <button type="button" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                ← Retour à la connexion
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
