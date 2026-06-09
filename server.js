// Point d'entrée Plesk Node.js — démarre le serveur Express compilé
import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("[Bloum Cash] Impossible de démarrer le serveur :", err);
  process.exit(1);
});
