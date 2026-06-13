import { useLocation } from "wouter";
import { Shield, Zap, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* Gradient décoratif haut */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 380,
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(26,63,196,0.10) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 80% 0%, rgba(34,197,94,0.10) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", padding: "52px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0, 0.71, 0.2, 1] }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
        >
          <img
            src="/logo-512.png"
            alt="Bloum Cash"
            style={{ width: 90, height: 90, objectFit: "contain" }}
            fetchPriority="high"
          />
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", letterSpacing: 2, fontFamily: "Inter, sans-serif" }}>
              BLOUM
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 2 }}>
              <div style={{ flex: 1, height: 2, background: "#16a34a", borderRadius: 2, maxWidth: 32 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", letterSpacing: 4, fontFamily: "Inter, sans-serif" }}>
                CASH
              </div>
              <div style={{ flex: 1, height: 2, background: "#16a34a", borderRadius: 2, maxWidth: 32 }} />
            </div>
          </div>
        </motion.div>

        {/* ── Tagline ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          style={{ marginTop: 20, textAlign: "center" }}
        >
          <p style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.35, fontFamily: "Inter, sans-serif" }}>
            Transférez votre argent{" "}
            <span style={{ color: "#1a3fc4" }}>instantanément</span>{" "}
            entre Mixx by Yas et Moov Money au Togo.
          </p>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
            Simple, rapide et sécurisé. Gérez vos transferts depuis une seule application.
          </p>
        </motion.div>

        {/* ── Mockup téléphone ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          style={{ marginTop: 28, position: "relative", width: "100%", display: "flex", justifyContent: "center" }}
        >
          {/* Carte Mixx derrière à gauche */}
          <div
            style={{
              position: "absolute",
              left: "4%",
              top: 40,
              width: 110,
              height: 70,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(249,115,22,0.3)",
              transform: "rotate(-8deg)",
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mixx</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>by Yas</div>
            <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.5)", marginTop: 4, borderRadius: 2 }} />
          </div>

          {/* Carte Moov derrière à droite */}
          <div
            style={{
              position: "absolute",
              right: "4%",
              top: 40,
              width: 110,
              height: 70,
              background: "linear-gradient(135deg, #1a3fc4 0%, #2b50e8 100%)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(26,63,196,0.3)",
              transform: "rotate(8deg)",
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 }}>Moov</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>Money</div>
            <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.5)", marginTop: 4, borderRadius: 2 }} />
          </div>

          {/* Téléphone principal */}
          <div
            style={{
              width: 180,
              height: 310,
              background: "#0f172a",
              borderRadius: 30,
              padding: 6,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)",
              zIndex: 2,
              position: "relative",
            }}
          >
            {/* Encoche */}
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 50, height: 10, background: "#0f172a", borderRadius: 6, zIndex: 10 }} />

            {/* Écran */}
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#eff2f7",
                borderRadius: 26,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header app */}
              <div style={{ background: "linear-gradient(135deg, #1a3fc4, #2b50e8)", padding: "18px 12px 10px", flexShrink: 0 }}>
                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif" }}>Bonjour 👋</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", marginTop: 1 }}>Bienvenue sur Bloum Cash</div>
              </div>

              {/* Solde */}
              <div style={{ background: "#fff", margin: "8px 8px 0", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 6, color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>Solde disponible</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", fontFamily: "Inter, sans-serif", marginTop: 2 }}>125 500 FCFA</div>
              </div>

              {/* Transfert rapide */}
              <div style={{ background: "#fff", margin: "6px 8px 0", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ fontSize: 6, color: "#64748b", fontFamily: "Inter, sans-serif", marginBottom: 6 }}>Transfert rapide</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 26, height: 18, background: "linear-gradient(135deg,#f97316,#ea580c)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 5, fontWeight: 700, color: "#fff" }}>Mixx</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#1a3fc4" }}>⇄</div>
                  <div style={{ width: 26, height: 18, background: "linear-gradient(135deg,#1a3fc4,#2b50e8)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 4, fontWeight: 700, color: "#fff" }}>Moov</span>
                  </div>
                </div>
              </div>

              {/* Services icons */}
              <div style={{ margin: "6px 8px 0", display: "flex", gap: 8, justifyContent: "center" }}>
                {["Transférer", "Épargne", "Historique", "Plus"].map((label) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: 20, height: 20, background: "#e8eeff", borderRadius: 6 }} />
                    <span style={{ fontSize: 4.5, color: "#64748b", fontFamily: "Inter, sans-serif" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkmark badge */}
            <div
              style={{
                position: "absolute",
                top: 40,
                right: -10,
                width: 28,
                height: 28,
                background: "#16a34a",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(22,163,74,0.4)",
                border: "2px solid #fff",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </motion.div>

        {/* ── Caractéristiques ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.4 }}
          style={{ marginTop: 28, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
        >
          {[
            { icon: <Zap size={18} color="#1a3fc4" />, label: "Rapide", sub: "Transferts en quelques secondes" },
            { icon: <Shield size={18} color="#16a34a" />, label: "Sécurisé", sub: "Vos transactions 100% protégées" },
            { icon: <Smartphone size={18} color="#7c3aed" />, label: "Simple", sub: "Une application facile à utiliser" },
          ].map(({ icon, label, sub }) => (
            <div
              key={label}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                textAlign: "center",
              }}
            >
              <div style={{ width: 36, height: 36, background: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                {icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", fontFamily: "Inter, sans-serif" }}>{label}</div>
              <div style={{ fontSize: 9.5, color: "#64748b", fontFamily: "Inter, sans-serif", lineHeight: 1.4 }}>{sub}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Boutons ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, duration: 0.4 }}
          style={{ marginTop: 28, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {/* Bouton principal — Nouveau */}
          <button
            onClick={() => setLocation("/register")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 4px 20px rgba(22,163,74,0.35)",
              transition: "transform 0.12s, box-shadow 0.12s",
              textAlign: "left",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Inter, sans-serif" }}>Nouveau sur Bloum Cash</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1, fontFamily: "Inter, sans-serif" }}>Créer un compte gratuitement</div>
            </div>
          </button>

          {/* Bouton secondaire — J'ai déjà un compte */}
          <button
            onClick={() => setLocation("/login")}
            style={{
              width: "100%",
              background: "#ffffff",
              color: "#0f172a",
              border: "1.5px solid #e2e8f0",
              borderRadius: 16,
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "transform 0.12s, background 0.12s",
              textAlign: "left",
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; e.currentTarget.style.background = "#f8fafc"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#fff"; }}
            onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; e.currentTarget.style.background = "#f8fafc"; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#fff"; }}
          >
            <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>J'ai déjà un compte</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1, fontFamily: "Inter, sans-serif" }}>Se connecter</div>
            </div>
          </button>
        </motion.div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{ marginTop: 24, marginBottom: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: 11.5, color: "#475569", fontFamily: "Inter, sans-serif" }}>Vos transactions sont protégées et sécurisées.</span>
          </div>
          <div style={{ fontSize: 11, color: "#1a3fc4", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
            Bloum Cash – Rapide • Simple • Sécurisé
          </div>
        </motion.div>
      </div>
    </div>
  );
}
