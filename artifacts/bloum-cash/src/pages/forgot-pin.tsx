import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Smartphone, KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { validateTogoPhone } from "@/lib/utils";

const BLUE = "#2d52e8";

type Step = "phone" | "code" | "done";

export default function ForgotPin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phoneValidation = validateTogoPhone(phone);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phoneValidation.valid) {
      setError("Numéro Togo invalide (TMoney: 90-93, Moov: 96-99)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneValidation.normalized }),
      });
      let d: Record<string, string> = {};
      try { d = await res.json(); } catch { /* */ }
      if (!res.ok) {
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
    if (newPin !== confirmPin) { setError("Les mots de passe ne correspondent pas"); return; }
    if (newPin.length < 4) { setError("Le mot de passe doit avoir au moins 4 caractères"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneValidation.normalized, code, newPin }),
      });
      let d: Record<string, string> = {};
      try { d = await res.json(); } catch { /* */ }
      if (!res.ok) { setError(d.error ?? "Code invalide ou expiré"); return; }
      setStep("done");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phone.length >= 4
    ? "🇹🇬 +228 " + phone.slice(0, 2) + " ** ** " + phone.slice(-2)
    : "🇹🇬 +228 " + phone;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col"
      style={{ background: "#eff2f7" }}
    >
      <div className="md:max-w-md md:mx-auto w-full flex flex-col min-h-[100dvh]">

        {/* ── En-tête bleue ── */}
        <div
          style={{
            background: BLUE,
            paddingTop: 52,
            paddingBottom: 56,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            padding: "52px 24px 56px",
          }}
        >
          <button
            onClick={() => step === "code" ? setStep("phone") : setLocation("/login")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255,255,255,0.28)",
              cursor: "pointer",
              marginBottom: 20,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              transition: "background 0.15s",
              padding: 0,
              flexShrink: 0,
            }}
            onMouseDown={e => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onMouseUp={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onTouchStart={e => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onTouchEnd={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            aria-label="Retour"
          >
            <ArrowLeft size={20} color="white" strokeWidth={2.5} />
          </button>

          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
            {step === "phone" ? "Code PIN oublié ?" : step === "code" ? "Réinitialiser le PIN" : "PIN réinitialisé !"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.78)", marginTop: 6, fontSize: 14 }}>
            {step === "phone"
              ? "Entrez votre numéro pour recevoir un code par SMS"
              : step === "code"
              ? `Code envoyé par SMS au ${maskedPhone}`
              : "Votre nouveau mot de passe est actif"}
          </p>
        </div>

        {/* ── Carte formulaire ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            margin: "0 16px",
            marginTop: -28,
            padding: "24px 24px 20px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.11)",
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── Étape 1 : numéro de téléphone ── */}
            {step === "phone" && (
              <motion.div key="phone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 14px", background: "#f0f4ff", borderRadius: 14, border: "1px solid #d8e2ff" }}>
                  <Smartphone size={18} color={BLUE} />
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                    Un code à 6 chiffres vous sera envoyé par <strong>SMS</strong> sur votre numéro.
                  </p>
                </div>

                <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>
                      Numéro de téléphone
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 52,
                        borderRadius: 12,
                        border: error ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
                        background: error ? "#fef2f2" : "#f9fafb",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: "100%", background: "#f1f3f7", borderRight: "1.5px solid #e5e7eb", flexShrink: 0 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🇹🇬</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>+228</span>
                      </div>
                      <input
                        placeholder="XX XX XX XX"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        style={{ flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", padding: "0 14px", fontSize: 15, color: "#111827", letterSpacing: 1 }}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, borderRadius: 12, padding: "12px 14px" }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 8}
                    style={{ width: "100%", height: 52, borderRadius: 14, background: loading || phone.length !== 8 ? "#7a90f0" : BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: loading || phone.length !== 8 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Envoi du SMS…</> : "Recevoir le code par SMS"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Étape 2 : code + nouveau mot de passe ── */}
            {step === "code" && (
              <motion.div key="code" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <div style={{ background: "#f0f4ff", border: "1px solid #d8e2ff", borderRadius: 14, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#374151" }}>
                  📱 Code envoyé au <strong>{maskedPhone}</strong> — valable <strong>15 minutes</strong>.
                </div>

                <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Code SMS */}
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>
                      Code reçu par SMS
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="_ _ _ _ _ _"
                      maxLength={6}
                      required
                      style={{ width: "100%", height: 60, borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#f9fafb", textAlign: "center", fontSize: 30, fontWeight: 800, letterSpacing: 12, color: BLUE, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>
                      Nouveau mot de passe
                    </label>
                    <div style={{ position: "relative" }}>
                      <KeyRound size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        type={showPin ? "text" : "password"}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="Min. 4 caractères"
                        required
                        style={{ width: "100%", height: 50, borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#f9fafb", padding: "0 48px 0 40px", fontSize: 15, color: "#111827", outline: "none", boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmer mot de passe */}
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>
                      Confirmer le mot de passe
                    </label>
                    <div style={{ position: "relative" }}>
                      <KeyRound size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        type={showPin ? "text" : "password"}
                        value={confirmPin}
                        onChange={e => setConfirmPin(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        required
                        style={{ width: "100%", height: 50, borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#f9fafb", padding: "0 48px 0 40px", fontSize: 15, color: "#111827", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, borderRadius: 12, padding: "12px 14px" }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6 || !newPin || !confirmPin}
                    style={{ width: "100%", height: 52, borderRadius: 14, background: loading || code.length !== 6 || !newPin || !confirmPin ? "#7a90f0" : BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Réinitialisation…</> : "Réinitialiser mon mot de passe"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Étape 3 : succès ── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 72, height: 72, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle2 size={36} color="#22c55e" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
                  Mot de passe réinitialisé !
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>
                  Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
                </p>
                <button
                  onClick={() => setLocation("/login")}
                  style={{ width: "100%", height: 52, borderRadius: 14, background: BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  Se connecter
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />
      </div>
    </div>
  );
}
