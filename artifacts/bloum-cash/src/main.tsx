import { createRoot } from "react-dom/client";
import App from "./App";
import { AccessGuard } from "./components/access-guard";
import "./index.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <AccessGuard>
    <App />
  </AccessGuard>
);
