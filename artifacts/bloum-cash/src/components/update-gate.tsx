import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { APP_VERSION, isVersionOlder } from "@/lib/app-version";

interface UpdateConfig {
  updateMode?: "disabled" | "optional" | "mandatory";
  minRequiredVersion?: string;
  updateDownloadUrl?: string;
  updateTitle?: string;
  updateMessage?: string;
}

const DISMISS_KEY = "bloum_update_dismissed_version";

function goToUpdate(url: string) {
  if (!url) return;
  window.location.href = url;
}

/** Page plein écran bloquante — aucune mention d'admin, aucun moyen de la fermer. */
function MandatoryUpdateScreen({ config }: { config: UpdateConfig }) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "#ffffff" }}
    >
      <div className="w-24 h-24 rounded-3xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center mb-6">
        <RefreshCw className="w-12 h-12" style={{ color: "#2b50e8" }} strokeWidth={1.8} />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        {config.updateTitle || "Mise à jour disponible"}
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">
        {config.updateMessage ||
          "Une nouvelle version est disponible. Veuillez mettre à jour pour continuer à utiliser l'application."}
      </p>

      <div className="flex items-center gap-6 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3 mb-8">
        <div className="text-center">
          <div className="text-[10px] font-semibold text-gray-400 tracking-wide">VOTRE VERSION</div>
          <div className="text-sm font-bold text-red-500">v{APP_VERSION}</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center">
          <div className="text-[10px] font-semibold text-gray-400 tracking-wide">REQUISE</div>
          <div className="text-sm font-bold text-green-600">v{config.minRequiredVersion}</div>
        </div>
      </div>

      <button
        onClick={() => goToUpdate(config.updateDownloadUrl || "")}
        className="flex items-center justify-center gap-2 w-full max-w-xs py-3.5 rounded-xl font-bold text-sm text-white shadow-lg active:scale-95 transition-transform"
        style={{ background: "linear-gradient(90deg, #1a3fc4, #2b50e8)" }}
      >
        <Download className="w-4 h-4" /> Mettre à jour maintenant
      </button>
    </div>
  );
}

/** Modal fermable — l'utilisateur peut continuer à utiliser l'app sans mettre à jour. */
function OptionalUpdateModal({
  config,
  onClose,
}: {
  config: UpdateConfig;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 0 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center mb-5">
            <RefreshCw className="w-9 h-9" style={{ color: "#2b50e8" }} strokeWidth={1.8} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
            {config.updateTitle || "Mise à jour disponible"}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {config.updateMessage || "Une nouvelle version est disponible."}
          </p>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={() => goToUpdate(config.updateDownloadUrl || "")}
            className="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform"
            style={{ background: "linear-gradient(90deg, #1a3fc4, #2b50e8)" }}
          >
            Mettre à jour
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Vérifie au démarrage si une mise à jour est requise et affiche
 * soit une page bloquante (obligatoire), soit une modal fermable (optionnelle).
 * Ne dépend d'aucune session utilisateur — s'applique à tous les visiteurs de l'app.
 */
/**
 * Composant à monter tout en haut de l'arbre, avant le router.
 * `checking` bloque le rendu des enfants tant que /api/config n'a pas répondu,
 * pour empêcher toute navigation avant d'avoir pu détecter un mode obligatoire.
 * Un timeout de sécurité évite un blocage indéfini si l'API est indisponible.
 */
export function useUpdateCheck(): { checking: boolean } {
  const [checking, setChecking] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; setChecking(false); } };
    // Sécurité : ne jamais bloquer l'app plus de 4s si l'API ne répond pas
    const timeout = setTimeout(finish, 4000);

    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: UpdateConfig | null) => {
        if (cfg) cachedConfig = cfg;
      })
      .catch(() => {
        // Silencieux — pas de blocage si l'API est momentanément indisponible
      })
      .finally(() => {
        clearTimeout(timeout);
        finish();
        setTick((t) => t + 1);
      });

    return () => clearTimeout(timeout);
  }, []);

  return { checking };
}

let cachedConfig: UpdateConfig | null = null;

export function UpdateGate() {
  const [dismissed, setDismissed] = useState(false);
  const config = cachedConfig;

  if (!config || config.updateMode === "disabled" || !config.minRequiredVersion) return null;

  // Mode "mandatory" sans lien de mise à jour configuré = config invalide côté admin.
  // On refuse de bloquer l'app pour éviter un verrouillage sans issue.
  if (config.updateMode === "mandatory" && !config.updateDownloadUrl) return null;

  const needsUpdate = isVersionOlder(APP_VERSION, config.minRequiredVersion);
  if (!needsUpdate) return null;

  if (config.updateMode === "mandatory") {
    return <MandatoryUpdateScreen config={config} />;
  }

  if (config.updateMode === "optional") {
    if (dismissed) return null;
    const alreadyDismissedForVersion = sessionStorage.getItem(DISMISS_KEY) === config.minRequiredVersion;
    if (alreadyDismissedForVersion) return null;

    return (
      <AnimatePresence>
        <OptionalUpdateModal
          config={config}
          onClose={() => {
            sessionStorage.setItem(DISMISS_KEY, config.minRequiredVersion!);
            setDismissed(true);
          }}
        />
      </AnimatePresence>
    );
  }

  return null;
}
