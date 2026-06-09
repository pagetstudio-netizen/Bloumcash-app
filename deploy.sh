#!/bin/bash
# ============================================================
#  Bloum Cash — Script de déploiement production (Plesk)
#  Exécuté automatiquement par Plesk après un pull GitHub.
#  Usage manuel : bash deploy.sh
# ============================================================
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bloum Cash — Déploiement production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Vérifier / installer pnpm ───────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "→ pnpm non trouvé — installation..."
  npm install -g pnpm@latest
fi

echo "→ pnpm $(pnpm --version)"
echo "→ node $(node --version)"

# ── Dossier uploads (images admin) ──────────────────────────
mkdir -p artifacts/api-server/uploads

# ── Installation des dépendances ────────────────────────────
echo ""
echo "→ Installation des dépendances..."
pnpm install --frozen-lockfile

# ── Build du frontend React/Vite ────────────────────────────
echo ""
echo "→ Build frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API (esbuild → dist/index.mjs) ─────────
echo ""
echo "→ Build API serveur..."
pnpm --filter @workspace/api-server run build

# ── Migration base de données ────────────────────────────────
echo ""
echo "→ Migration base de données..."
pnpm --filter @workspace/db run push

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Build terminé avec succès !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
