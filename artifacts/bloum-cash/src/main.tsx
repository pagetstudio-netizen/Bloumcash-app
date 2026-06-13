import "median-js-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { isMedianApp } from "./lib/utils";

setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

/* ── Nettoyage des anciens service workers ─────────────────────────────────
 * Si un ancien SW (version précédente) est installé, on le désenregistre
 * immédiatement pour éviter qu'il serve des fichiers JS/CSS périmés.
 * Le nouveau sw.js se réinstalle tout seul via skipWaiting() + clients.claim().
 * ──────────────────────────────────────────────────────────────────────────── */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? "";
      /* On conserve uniquement le SW actuel ; tout autre est supprimé */
      if (scriptURL && !scriptURL.includes("/sw.js")) {
        registration.unregister();
      }
    }
  }).catch(() => {});

  /* Enregistrement du SW principal */
  navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
}

declare global {
  interface Window {
    isMedianApp: boolean;
  }
}
window.isMedianApp = isMedianApp;

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

/* ── Retirer l'écran de chargement natif une fois React monté ── */
function hideLoader() {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  /* Forcer la disparition via style inline (contourne tout problème CSS/cache) */
  loader.style.transition = "opacity 0.3s ease";
  loader.style.opacity = "0";
  loader.style.pointerEvents = "none";
  setTimeout(() => {
    loader.style.display = "none";
    loader.remove();
  }, 350);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

/* Attendre que React ait réellement peint quelque chose avant de retirer le loader.
   rAF×2 + 100ms de sécurité pour les chunks lazy chargés en production. */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    setTimeout(hideLoader, 100);
  });
});

/* Filet de sécurité : retirer le loader de force après 4 secondes maximum */
setTimeout(hideLoader, 4000);
