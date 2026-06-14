import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

async function clearAllCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* silent */ }
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("Loading chunk") ||
      error.name === "ChunkLoadError";
    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = async () => {
    await clearAllCaches();
    window.location.replace("/dashboard");
  };

  handleHardReload = async () => {
    await clearAllCaches();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { isChunkError, error } = this.state;

    return (
      <div className="h-[100dvh] w-full bg-background flex flex-col items-center justify-center md:max-w-md md:mx-auto px-6 select-none">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.07, 0.04] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-96 h-96 bg-[#1a3fc4] rounded-full"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.03, 0.07, 0.03] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-400 rounded-full"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-7 w-full max-w-xs text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative"
          >
            <div className="w-28 h-28 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-500" strokeWidth={1.5} />
            </div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-3xl border-2 border-red-300/40"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold text-foreground">
              {isChunkError ? "Mise à jour disponible" : "Quelque chose s'est mal passé"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isChunkError
                ? "Une nouvelle version de l'app est disponible. Appuyez pour mettre à jour."
                : "Une erreur inattendue s'est produite. Vos données sont en sécurité."}
            </p>
          </motion.div>

          {!isChunkError && error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="w-full bg-muted/60 rounded-2xl p-3 text-left"
            >
              <p className="text-xs font-mono text-muted-foreground break-words line-clamp-3">
                {error.message}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="w-full flex flex-col gap-3"
          >
            <button
              onClick={this.handleHardReload}
              className="w-full bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#1a3fc4]/30 active:shadow-none transition-shadow"
            >
              <RefreshCw className="w-5 h-5" />
              {isChunkError ? "Mettre à jour l'application" : "Recharger l'application"}
            </button>

            {!isChunkError && (
              <button
                onClick={this.handleReset}
                className="w-full text-sm text-muted-foreground py-2"
              >
                Retourner au tableau de bord
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }
}
