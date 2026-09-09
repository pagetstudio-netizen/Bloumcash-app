import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

export default function WhatsappRegister() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(value);
    setStatus(value ? "ready" : "error");
    if (!value) setError("Ce lien de création de compte est incomplet.");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (!/^\d{4,20}$/.test(pin)) {
      setError("Le PIN doit contenir entre 4 et 20 chiffres.");
      setStatus("error");
      return;
    }
    if (pin !== confirmPin) {
      setError("Les deux PIN ne correspondent pas.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/whatsapp/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = await response.json() as {
        token?: string;
        user?: { id: string; fullName: string; email: string; phone?: string | null };
        error?: string;
      };
      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error ?? "Le lien est invalide ou expiré.");
      }
      login({ ...data.user, phone: data.user.phone ?? "" }, data.token);
      setStatus("success");
      window.setTimeout(() => setLocation("/dashboard"), 700);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d'activer le compte.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <div style={pageStyle}><p>Vérification du lien sécurisé…</p></div>;
  }

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 72, height: 72 }} />
          <h1 style={titleStyle}>Compte activé ✅</h1>
          <p style={mutedStyle}>Vous allez être redirigé vers votre espace Bloum Cash.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 72, height: 72 }} />
        <h1 style={titleStyle}>Créer votre PIN Bloum Cash</h1>
        <p style={mutedStyle}>
          Choisissez un PIN confidentiel. Ne le partagez jamais dans WhatsApp.
        </p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14, width: "100%" }}>
          <label style={labelStyle}>
            PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              minLength={4}
              maxLength={20}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="4 à 20 chiffres"
              style={inputStyle}
              disabled={!token || status === "saving"}
            />
          </label>
          <label style={labelStyle}>
            Confirmer le PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              minLength={4}
              maxLength={20}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
              placeholder="Répétez votre PIN"
              style={inputStyle}
              disabled={!token || status === "saving"}
            />
          </label>
          {error && <p style={{ color: "#b42318", fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" style={buttonStyle} disabled={!token || status === "saving"}>
            {status === "saving" ? "Activation…" : "Activer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#eff2f7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  width: "min(100%, 420px)",
  background: "#fff",
  borderRadius: 24,
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  boxShadow: "0 8px 40px rgba(17, 24, 39, 0.12)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 24,
  textAlign: "center",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.6,
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  color: "#374151",
  fontSize: 14,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  height: 50,
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "0 14px",
  fontSize: 16,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  height: 52,
  border: 0,
  borderRadius: 14,
  background: "#2d52e8",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};