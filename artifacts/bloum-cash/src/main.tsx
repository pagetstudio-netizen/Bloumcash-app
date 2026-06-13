import "median-js-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { isMedianApp } from "./lib/utils";

setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

/* ── Désactiver tout service worker existant ───────────────────────────────
 * Le SW causait des pages blanches en servant d'anciens fichiers JS/CSS cachés
 * après chaque rebuild. On désenregistre tout et on ne réenregistre pas.
 * ──────────────────────────────────────────────────────────────────────────── */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
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
