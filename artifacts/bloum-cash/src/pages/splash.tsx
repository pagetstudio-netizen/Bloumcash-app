import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

const DURATION = 4500;

export default function Splash() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let rafId: number;

    const frame = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        rafId = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (isAuthenticated) {
            setLocation("/dashboard");
          } else {
            setLocation("/login");
          }
        }, 200);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [isAuthenticated, setLocation]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <img
          src="/logo-512.png"
          alt="Bloum Cash"
          style={{ width: 120, height: 120, objectFit: "contain" }}
          fetchPriority="high"
          decoding="sync"
        />
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.5px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Bloum Cash
          </div>
        </div>
      </div>

      {/* Barre de progression bleue */}
      <div
        style={{
          position: "absolute",
          bottom: 52,
          left: "10%",
          width: "80%",
          height: 4,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #1a3fc4, #2b50e8)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
