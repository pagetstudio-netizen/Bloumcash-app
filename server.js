// Point d'entrée Plesk Node.js — démarre le serveur Express compilé
// APP_BASE_URL : URL publique de l'app (pour les callbacks PayDunya/GomboPlus)
if (!process.env.APP_BASE_URL) {
  process.env.APP_BASE_URL = "https://app.wendysapp.sbs";
}

import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("[Bloum Cash] Impossible de démarrer le serveur :", err);
  process.exit(1);
});
