#!/bin/bash
# ============================================================
#  Bloum Cash — Script de déploiement production (Plesk)
#  Exécuté par Plesk après un git pull, ou manuellement :
#    bash deploy.sh
#
#  NOTE : les fichiers dist/ et public/ sont déjà buildés et
#  committés dans git. Ce script n'est nécessaire QUE si vous
#  voulez rebuilder depuis Plesk (rare).
#  Dans la plupart des cas : git pull → restart suffit.
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

echo "→ pnpm $(pnpm --version)"
echo "→ node $(node --version)"

# ── Dossier uploads (images admin) ──────────────────────────
mkdir -p uploads
mkdir -p artifacts/api-server/uploads

# ── Installation des dépendances ────────────────────────────
echo ""
echo "→ Installation des dépendances..."
pnpm install --no-frozen-lockfile

# ── Build du frontend React/Vite ────────────────────────────
echo ""
echo "→ Build frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API (esbuild → dist/index.mjs) ─────────
echo ""
echo "→ Build API serveur..."
pnpm --filter @workspace/api-server run build

# ── NE PAS exécuter drizzle-kit push ────────────────────────
# Les migrations sont gérées automatiquement au démarrage du
# serveur via startup-migrate.ts (CREATE TABLE IF NOT EXISTS).
# drizzle-kit push est incompatible avec Supabase pgbouncer
# (port 6543, transaction mode) et peut planter le déploiement.

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Build terminé avec succès !"
echo "  → Redémarrez l'application Node.js dans Plesk."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
