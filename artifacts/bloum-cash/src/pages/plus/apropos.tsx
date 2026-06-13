import { useLocation } from "wouter";
import { ArrowLeft, BookOpen, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";

export default function Apropos() {
  const { isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    setLocation("/welcome");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Fond photo + overlay bleu ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          maxWidth: 430,
          margin: "0 auto",
          zIndex: 0,
        }}
      >
        <img
          src="/opengraph.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
        {/* overlay bleu royal profond */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,30,120,0.88) 0%, rgba(26,63,196,0.93) 40%, rgba(18,44,160,0.97) 100%)",
          }}
        />
      </div>

      {/* ── Contenu scrollable ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          position: "relative",
          zIndex: 1,
          paddingBottom: 96,
        }}
      >
        {/* Bouton retour */}
        <div style={{ padding: "52px 20px 0" }}>
          <button
            onClick={() => setLocation("/plus")}
            style={{
              width: 38,
              height: 38,
              background: "rgba(255,255,255,0.18)",
              border: "none",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
        </div>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 24, padding: "0 24px" }}>
          <div
            style={{
              width: 84,
              height: 84,
              background: "#fff",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 70, height: 70, objectFit: "contain" }} />
          </div>

          {/* Titre */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#fff",
              textAlign: "center",
              marginTop: 18,
              lineHeight: 1.2,
              fontFamily: "Inter, sans-serif",
            }}
          >
            À propos de{"\n"}Bloum Cash
          </h1>

          {/* Ligne décorative */}
          <div
            style={{
              width: 48,
              height: 3,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 2,
              marginTop: 12,
            }}
          />

          {/* Description */}
          <p
            style={{
              fontSize: 14.5,
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
              marginTop: 18,
              lineHeight: 1.65,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Nous simplifions les transferts d'argent au Togo pour que chaque togolais puisse gérer son argent
            facilement, rapidement et en toute sécurité.
          </p>
        </div>

        {/* Section Notre Histoire */}
        <div style={{ margin: "28px 20px 0", background: "rgba(255,255,255,0.10)", borderRadius: 18, padding: "18px 16px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          {/* En-tête section */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>
              Notre Histoire
            </span>
          </div>

          {/* Texte */}
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, fontFamily: "Inter, sans-serif", margin: 0 }}>
            Bloum Cash est né d'une vision simple : permettre à chaque togolais d'envoyer de l'argent entre
            TMoney et Moov Money sans se déplacer, sans attente, en quelques secondes depuis son téléphone.
          </p>

          <div style={{ height: 12 }} />

          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, fontFamily: "Inter, sans-serif", margin: 0 }}>
            Fondée par une équipe passionnée par la fintech africaine, notre application a été conçue pour
            répondre aux réalités des Togolais, avec une interface simple et une sécurité sans compromis.
          </p>
        </div>

        {/* Copyright */}
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 24, fontFamily: "Inter, sans-serif" }}>
          © 2026 Ashtech Sarl — Tous droits réservés
        </p>
      </div>

      {/* ── Bouton Déconnecter — fixe en bas ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          padding: "12px 20px 28px",
          background: "linear-gradient(180deg, transparent 0%, rgba(18,44,160,0.95) 40%)",
          zIndex: 10,
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            height: 54,
            background: "#e11d48",
            border: "none",
            borderRadius: 16,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 4px 20px rgba(225,29,72,0.45)",
            transition: "transform 0.12s, box-shadow 0.12s",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <LogOut size={20} color="#fff" />
          Déconnecter
        </button>
      </div>
    </div>
  );
}
