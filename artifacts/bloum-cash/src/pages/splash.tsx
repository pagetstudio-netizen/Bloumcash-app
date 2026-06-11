import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

export default function Splash() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        setLocation("/dashboard");
      } else {
        setLocation("/login");
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] overflow-hidden">
      <div className="flex flex-col items-center" style={{ animation: "splashIn 0.6s cubic-bezier(0,0.71,0.2,1.01) both" }}>
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 overflow-hidden">
          <img
            src="/logo-512.png"
            alt="Bloum Cash"
            className="w-full h-full object-contain"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Bloum Cash</h1>
      </div>

      <div className="absolute bottom-12 flex items-center justify-center" style={{ animation: "fadeIn 0.3s 0.4s both" }}>
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>

      <style>{`
        @keyframes splashIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
