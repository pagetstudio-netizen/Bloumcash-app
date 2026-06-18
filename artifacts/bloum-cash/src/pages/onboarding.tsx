import { useLocation } from "wouter";

export default function Onboarding() {
  const [, navigate] = useLocation();

  function handleStart() {
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div style={{ flexShrink: 0, paddingTop: 36, paddingBottom: 4 }}>
        <img
          src="/logo-bloum.png"
          alt="Bloum Cash"
          style={{
            width: 60,
            height: 60,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Collage — taille fixe pour laisser la place au texte et au bouton */}
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <img
          src="/onboarding-collage.png"
          alt="Personnes utilisant Bloum Cash"
          style={{
            width: "100%",
            maxWidth: 320,
            height: 260,
            objectFit: "contain",
            objectPosition: "center",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Texte — prend l'espace restant */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 28px",
          textAlign: "center",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#1a3fc4",
            letterSpacing: 0.3,
            margin: 0,
            fontFamily: "Inter, sans-serif",
            textTransform: "uppercase",
          }}
        >
          Bienvenue sur Bloum Cash
        </p>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.3,
            margin: "8px 0 0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Transférez votre argent en toute simplicité.
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "#6b7280",
            lineHeight: 1.6,
            margin: "10px 0 0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Bloum Cash ouvre la voie à des services financiers modernes, rapides
          et sécurisés pour tous. Grâce aux transferts entre Mixx by yas et
          Moov Money.
        </p>
      </div>

      {/* Bouton toujours visible en bas */}
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          padding: "16px 28px 40px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={handleStart}
          style={{
            width: "100%",
            height: 52,
            background: "linear-gradient(135deg, #1a3fc4 0%, #2b50e8 100%)",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            letterSpacing: 0.2,
            boxShadow: "none",
            outline: "none",
          }}
          onPointerDown={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")}
          onPointerUp={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          onPointerLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
        >
          Démarrer
        </button>
      </div>
    </div>
  );
}
