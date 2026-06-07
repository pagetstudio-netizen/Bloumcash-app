import React from "react";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Signal } from "lucide-react";

export default function Offline() {
  const [retrying, setRetrying] = React.useState(false);
  const [dots, setDots] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setRetrying(false);
      }
    }, 1500);
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col items-center justify-center md:max-w-md md:mx-auto px-6 select-none">
      {/* Animated background blob */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-[#1a3fc4] rounded-full"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2b50e8] rounded-full"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="w-28 h-28 bg-gradient-to-br from-[#1a3fc4]/10 to-[#2b50e8]/10 border-2 border-[#1a3fc4]/20 rounded-3xl flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-[#1a3fc4]" strokeWidth={1.5} />
          </div>
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-3xl border-2 border-[#1a3fc4]/30"
          />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-foreground">Pas de connexion</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vérifiez votre réseau Wi-Fi ou vos données mobiles, puis réessayez.
          </p>
        </motion.div>

        {/* Animated signal bars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-end gap-1.5 h-8"
        >
          {[1, 2, 3, 4].map((bar) => (
            <motion.div
              key={bar}
              animate={{
                opacity: bar <= dots ? 1 : 0.2,
                scaleY: bar <= dots ? 1 : 0.6,
              }}
              transition={{ duration: 0.2 }}
              style={{ height: `${bar * 6 + 8}px` }}
              className="w-2.5 bg-[#1a3fc4] rounded-sm origin-bottom"
            />
          ))}
          <Signal className="w-5 h-5 text-muted-foreground ml-1 self-center" />
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-muted/60 rounded-2xl p-4 space-y-2"
        >
          {[
            "Activez vos données mobiles",
            "Connectez-vous à un Wi-Fi",
            "Désactivez le mode avion",
          ].map((tip, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a3fc4]/60 flex-shrink-0" />
              {tip}
            </div>
          ))}
        </motion.div>

        {/* Retry button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleRetry}
          disabled={retrying}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#1a3fc4]/30 disabled:opacity-60 active:shadow-none transition-shadow"
        >
          <motion.span
            animate={retrying ? { rotate: 360 } : { rotate: 0 }}
            transition={retrying ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.span>
          {retrying ? "Vérification en cours…" : "Réessayer"}
        </motion.button>
      </div>
    </div>
  );
}
