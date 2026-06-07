import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
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
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.8,
          ease: [0, 0.71, 0.2, 1.01],
        }}
        className="flex flex-col items-center"
      >
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 overflow-hidden">
          <img src="/logo-512.png" alt="Bloum Cash" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Bloum Cash</h1>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-12 flex items-center justify-center"
      >
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </motion.div>
    </div>
  );
}
