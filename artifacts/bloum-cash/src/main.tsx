import "median-js-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { isMedianApp } from "./lib/utils";

setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

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
  loader.classList.add("hidden");
  /* Supprimer du DOM après la transition CSS (350ms) */
  setTimeout(() => loader.remove(), 400);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

/* React ne fournit pas de callback "rendu terminé" pour les renders initiaux.
   On utilise requestAnimationFrame × 2 pour attendre le premier paint. */
requestAnimationFrame(() => {
  requestAnimationFrame(hideLoader);
});
