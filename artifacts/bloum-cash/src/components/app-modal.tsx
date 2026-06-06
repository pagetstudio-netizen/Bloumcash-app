import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
export type ModalType = "success" | "error" | "warning" | "info";

export interface ModalConfig {
  type: ModalType;
  title: string;
  message?: string;
  buttonText?: string;
  onClose?: () => void;
}

interface ModalContextValue {
  showModal: (config: ModalConfig) => void;
}

/* ─── Context ────────────────────────────────────────────────────── */
const ModalContext = createContext<ModalContextValue | undefined>(undefined);

/* ─── Icônes & couleurs par type ─────────────────────────────────── */
const THEME: Record<
  ModalType,
  { icon: React.ReactNode; iconBg: string; iconBorder: string; btnClass: string; defaultBtn: string }
> = {
  error: {
    icon: (
      <XCircle
        className="w-16 h-16"
        strokeWidth={1.8}
        style={{ color: "#f26b6b" }}
      />
    ),
    iconBg: "bg-red-50",
    iconBorder: "border-2 border-red-300",
    btnClass: "bg-[#f26b6b] hover:bg-red-500 text-white",
    defaultBtn: "OK",
  },
  warning: {
    icon: (
      <AlertTriangle
        className="w-16 h-16"
        strokeWidth={1.8}
        style={{ color: "#f59c3c" }}
      />
    ),
    iconBg: "bg-orange-50",
    iconBorder: "border-2 border-orange-300",
    btnClass: "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white",
    defaultBtn: "Compris",
  },
  success: {
    icon: (
      <CheckCircle2
        className="w-16 h-16"
        strokeWidth={1.8}
        style={{ color: "#22c55e" }}
      />
    ),
    iconBg: "bg-green-50",
    iconBorder: "border-2 border-green-300",
    btnClass: "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white",
    defaultBtn: "Super !",
  },
  info: {
    icon: (
      <Info
        className="w-16 h-16"
        strokeWidth={1.8}
        style={{ color: "#1a3fc4" }}
      />
    ),
    iconBg: "bg-blue-50",
    iconBorder: "border-2 border-blue-300",
    btnClass: "bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white",
    defaultBtn: "OK",
  },
};

/* ─── Composant Modal ────────────────────────────────────────────── */
function AppModalDialog({
  config,
  onClose,
}: {
  config: ModalConfig;
  onClose: () => void;
}) {
  const theme = THEME[config.type];

  const handleClose = () => {
    config.onClose?.();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-8"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Carte modale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: "spring", damping: 24, stiffness: 340 }}
        className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corps */}
        <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Icône */}
          <div
            className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-5 ${theme.iconBg} ${theme.iconBorder}`}
          >
            {theme.icon}
          </div>

          {/* Titre */}
          <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
            {config.title}
          </h2>

          {/* Message */}
          {config.message && (
            <p className="text-sm text-gray-500 leading-relaxed">
              {config.message}
            </p>
          )}
        </div>

        {/* Séparateur */}
        <div className="h-px bg-gray-100 mx-6" />

        {/* Bouton */}
        <div className="px-6 py-4 flex justify-end">
          <button
            onClick={handleClose}
            className={`px-7 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${theme.btnClass}`}
          >
            {config.buttonText ?? theme.defaultBtn}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Provider ───────────────────────────────────────────────────── */
export function AppModalProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ModalConfig | null>(null);

  const showModal = useCallback((config: ModalConfig) => {
    setCurrent(config);
  }, []);

  const handleClose = useCallback(() => {
    setCurrent(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      <AnimatePresence>
        {current && (
          <AppModalDialog config={current} onClose={handleClose} />
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────── */
export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within AppModalProvider");
  return ctx;
}
