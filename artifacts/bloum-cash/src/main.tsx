import "median-js-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { isMedianApp } from "./lib/utils";

/* Injecter le token utilisateur dans tous les appels API générés */
setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

/* Exposer isMedianApp globalement pour un accès depuis n'importe quel script */
declare global {
  interface Window {
    isMedianApp: boolean;
  }
}
window.isMedianApp = isMedianApp;

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <App />
);
