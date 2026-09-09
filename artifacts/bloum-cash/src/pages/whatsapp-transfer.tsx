import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

type Status = "loading" | "success" | "error";

export default function WhatsappTransfer() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Vérification de votre lien sécurisé…");

  useEffect(() => {
    let cancelled = false;
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";

    if (!token) {
      setStatus("error");
      setMessage("Ce lien de transfert est incomplet.");
      return;
    }

    fetch("/api/whatsapp/transfer/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json() as {
          token?: string;
          user?: { id: string; fullName: string; email: string; phone?: string | null };
          error?: string;
        };
        if (!response.ok || !data.token || !data.user) {
          throw new Error(data.error ?? "Le lien est invalide ou expiré.");
        }
        if (cancelled) return;
        login({ ...data.user, phone: data.user.phone ?? "" }, data.token);
        setStatus("success");
        setMessage("Votre session sécurisée est prête. Ouverture du transfert…");
        window.setTimeout(() => setLocation("/transfert?whatsapp=1"), 700);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Impossible d'ouvrir le transfert sécurisé.");
      });

    return () => {
      cancelled = true;
    };
  }, [login, setLocation]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 72, height: 72 }} />
        <h1 style={titleStyle}>
          {status === "error" ? "Lien indisponible" : status === "success" ? "Transfert sécurisé" : "Bloum Cash"}
        </h1>
        <p style={mutedStyle}>{message}</p>
        {status === "error" && (
          <button type="button" style={buttonStyle} onClick={() => setLocation("/login")}>
            Se connecter autrement
          </button>
        )}
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

const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  border: 0,
  borderRadius: 14,
  background: "#2d52e8",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};