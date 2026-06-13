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

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
