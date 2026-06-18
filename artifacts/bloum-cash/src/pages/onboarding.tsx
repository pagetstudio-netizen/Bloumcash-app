import { useEffect } from "react";
import { useLocation } from "wouter";

const ONBOARDING_KEY = "bloum_onboarding_done";

export default function Onboarding() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleStart() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div style={{ marginTop: 52, marginBottom: 8, zIndex: 2 }}>
        <img
          src="/logo-bloum.png"
          alt="Bloum Cash"
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            objectFit: "cover",
            boxShadow: "0 4px 20px rgba(26,63,196,0.18)",
          }}
        />
      </div>

      {/* Collage photo */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          marginTop: 8,
          flex: "0 0 auto",
        }}
      >
        <img
          src="/onboarding-collage.png"
          alt="Personnes utilisant Bloum Cash"
          style={{
            width: "100%",
            maxWidth: 360,
            height: "auto",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Text block */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 28px 0",
          textAlign: "center",
          width: "100%",
          maxWidth: 420,
          gap: 0,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#1a3fc4",
            letterSpacing: 0.3,
            margin: 0,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Bienvenue sur Bloum Cash
        </p>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.25,
            margin: "10px 0 0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Transférez votre argent en toute simplicité.
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.65,
            margin: "14px 0 0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Bloum Cash ouvre la voie à des services financiers modernes, rapides
          et sécurisés pour tous. Grâce aux transferts entre Mixx by yas et
          Moov Money.
        </p>
      </div>

      {/* CTA */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "28px 28px 44px",
        }}
      >
        <button
          onClick={handleStart}
          style={{
            width: "100%",
            height: 54,
            background: "linear-gradient(135deg, #1a3fc4 0%, #2b50e8 100%)",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 16,
            border: "none",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            letterSpacing: 0.3,
            boxShadow: "0 6px 24px rgba(26,63,196,0.35)",
            transition: "opacity 0.15s",
          }}
          onMouseDown={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
          onMouseUp={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          onTouchStart={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
          onTouchEnd={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
        >
          Démarrer
        </button>
      </div>
    </div>
  );
}
