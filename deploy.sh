#!/bin/bash
# ============================================================
#  Bloum Cash — Script de déploiement production (Plesk)
#
#  Sur Plesk : configurez "Deploy Now" pour exécuter ce script,
#  puis cliquez Restart pour redémarrer l'app Node.js.
#
#  En ligne de commande :  bash deploy.sh
# ============================================================
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bloum Cash — Déploiement production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Vérifier / installer pnpm ───────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "→ pnpm non trouvé — installation..."
  npm install -g pnpm@10
fi

echo "→ node  $(node --version)"
echo "→ pnpm  $(pnpm --version)"

# ── Dossier uploads (images admin) — persistant entre déploiements ──
mkdir -p uploads

# ── Installation des dépendances ────────────────────────────
echo ""
echo "→ Installation des dépendances..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

# ── Build du frontend React/Vite → artifacts/api-server/public/ ─
echo ""
echo "→ Build frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API → artifacts/api-server/dist/ ───────
echo ""
echo "→ Build API serveur..."
pnpm --filter @workspace/api-server run build

# ── Les migrations DB sont appliquées automatiquement ────────
# au démarrage du serveur (startup-migrate.ts)
# Aucune commande drizzle-kit ici.

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Build terminé !"
echo "  → Cliquez Restart dans Plesk pour redémarrer."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
