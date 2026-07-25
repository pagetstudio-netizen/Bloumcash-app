import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpdateIcon } from "@/components/ui/cloud-update-icon";
import { APP_VERSION, isVersionOlder } from "@/lib/app-version";

interface UpdateConfig {
  updateMode?: "disabled" | "optional" | "mandatory";
  minRequiredVersion?: string;
  updateDownloadUrl?: string;
  updateTitle?: string;
  updateMessage?: string;
  updateButtonEnabled?: boolean;
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
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: "#141414" }}
    >
      {/* Contenu scrollable centré */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 pt-12 pb-4">
        {/* Icône — grand cercle bleu dégradé */}
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #2b50e8 0%, #1a3fc4 55%, #1230a0 100%)",
            boxShadow: "0 8px 40px rgba(43,80,232,0.45)",
          }}
        >
          <CloudUpdateIcon className="w-14 h-14" style={{ color: "#ffffff" }} strokeWidth={1.6} />
        </div>

        {/* Titre */}
        <h1 className="text-[2rem] font-extrabold text-white text-center leading-tight mb-3">
          {config.updateTitle || "Mise à jour\ndisponible"}
        </h1>

        {/* Message */}
        <p className="text-[0.9rem] text-gray-400 text-center leading-relaxed mb-8 max-w-xs">
          {config.updateMessage ||
            "Une nouvelle version est requise pour continuer à utiliser l'application."}
        </p>

        {/* Bloc infos version */}
        <div
          className="w-full rounded-2xl px-5 py-4 mb-3"
          style={{ background: "#1f1f1f" }}
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version actuelle</span>
              <span className="font-semibold text-red-400">v{APP_VERSION}</span>
            </div>
            <div className="w-full h-px" style={{ background: "#2a2a2a" }} />
            <div className="flex justify-between">
              <span className="text-gray-500">Version requise</span>
              <span className="font-semibold text-green-400">v{config.minRequiredVersion}</span>
            </div>
          </div>
        </div>

        {/* Séparateur "Cette mise à jour inclut" */}
        <div className="w-full flex items-center gap-3 mt-2 mb-3">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Cette mise à jour inclut
          </span>
          <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
        </div>

        {/* Description de la mise à jour */}
        <div
          className="w-full rounded-2xl px-5 py-4"
          style={{ background: "#1f1f1f" }}
        >
          <p className="text-sm font-semibold text-white mb-1">Sécurité &amp; performances</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Corrections de sécurité, améliorations de stabilité et optimisations générales de l'application.
          </p>
        </div>
      </div>

      {/* Bouton pill — ancré en bas, masqué si l'admin le désactive */}
      {config.updateButtonEnabled !== false && (
        <div className="px-6 pb-10 pt-4">
          <button
            onClick={() => goToUpdate(config.updateDownloadUrl || "")}
            className="w-full py-4 rounded-full font-bold text-base text-gray-900 bg-white active:scale-95 transition-transform shadow-lg"
          >
            Mettre à jour
          </button>
        </div>
      )}
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
            <CloudUpdateIcon className="w-9 h-9" style={{ color: "#2b50e8" }} strokeWidth={1.8} />
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

  // Les routes admin ne sont jamais bloquées par la gate de mise à jour
  if (window.location.pathname.startsWith("/admin")) return null;

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
