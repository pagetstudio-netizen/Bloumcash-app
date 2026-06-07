import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

/* Injecter le token utilisateur dans tous les appels API générés */
setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <App />
);
