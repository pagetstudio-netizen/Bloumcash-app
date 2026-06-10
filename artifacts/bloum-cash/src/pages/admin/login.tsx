import React, { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, Mail, Loader2, ShieldCheck, KeyRound, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

type Step = "credentials" | "setup-totp" | "verify-totp";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
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

      if (data.requiresTotpSetup) {
        setTotpUri(data.totpUri ?? "");
        setStep("setup-totp");
        return;
      }

      if (data.requiresTotp) {
        setStep("verify-totp");
        return;
      }

      localStorage.setItem("bloum_admin_token", data.token);
      localStorage.setItem("bloum_admin_user", JSON.stringify(data.admin));
      setLocation("/admin");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/confirm-totp-setup", {
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

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/verify-totp", {
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
            {step === "setup-totp"
              ? <Smartphone className="w-8 h-8 text-white" />
              : step === "verify-totp"
              ? <KeyRound className="w-8 h-8 text-white" />
              : <ShieldCheck className="w-8 h-8 text-white" />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "setup-totp" ? "Configuration 2FA" : step === "verify-totp" ? "Vérification" : "Administration"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === "setup-totp"
              ? "Scannez le QR code avec Google Authenticator"
              : step === "verify-totp"
              ? "Bloum Cash — Code Google Authenticator"
              : "Bloum Cash — Accès restreint"}
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Étape 1 : identifiants ── */}
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

          {/* ── Étape 2a : configuration TOTP (première fois) ── */}
          {step === "setup-totp" && (
            <motion.form key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleConfirmSetup} className="space-y-5">

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Configuration unique requise</p>
                <p className="text-xs opacity-80">
                  Ouvrez <strong>Google Authenticator</strong>, appuyez sur <strong>+</strong> puis <strong>Scanner un QR code</strong>.
                </p>
              </div>

              {totpUri && (
                <div className="flex justify-center py-2">
                  <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                    <QRCodeSVG value={totpUri} size={180} level="M" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code de confirmation (6 chiffres)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  maxLength={6}
                  required
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 text-center mt-1">
                  Entrez le code affiché dans Google Authenticator
                </p>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</> : <><ShieldCheck className="w-4 h-4" /> Activer Google Authenticator</>}
              </button>

              <button type="button" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                ← Retour
              </button>
            </motion.form>
          )}

          {/* ── Étape 2b : vérification TOTP (connexions suivantes) ── */}
          {step === "verify-totp" && (
            <motion.form key="totp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyTotp} className="space-y-5">

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 items-center text-sm text-gray-700">
                <Smartphone className="w-5 h-5 flex-shrink-0 text-blue-500" />
                <p>Ouvrez <strong>Google Authenticator</strong> et entrez le code à 6 chiffres pour <strong>Bloum Cash</strong>.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code Google Authenticator</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 text-center mt-1">Code valable 30 secondes</p>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</> : <><KeyRound className="w-4 h-4" /> Valider</>}
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
