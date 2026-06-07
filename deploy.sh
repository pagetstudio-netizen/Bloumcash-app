#!/bin/bash
# ============================================================
# Bloum Cash — Script de déploiement production (Plesk)
# Usage : bash deploy.sh
# ============================================================
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Bloum Cash — Déploiement production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Vérifier pnpm ───────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "⚠️  pnpm non trouvé — installation en cours..."
  npm install -g pnpm
fi

# ── Installation des dépendances ────────────────────────────
echo "📦 Installation des dépendances..."
pnpm install --frozen-lockfile

# ── Migration base de données ────────────────────────────────
echo ""
echo "🗄️  Mise à jour de la base de données..."
pnpm --filter @workspace/db run push

# ── Build du frontend (React/Vite) ──────────────────────────
echo ""
echo "🔨 Build du frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API (esbuild) ──────────────────────────
echo ""
echo "🔨 Build du serveur API..."
pnpm --filter @workspace/api-server run build

# ── Résumé ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Build terminé avec succès !"
echo ""
echo "  Démarrage : node artifacts/api-server/dist/index.mjs"
echo "  Ou via :    pnpm start"
echo ""
echo "  Variables d'env requises (Plesk → Node.js → Env vars) :"
echo "    PORT                    (ex: 3001)"
echo "    DATABASE_URL            (PostgreSQL)"
echo "    PAYDUNYA_MASTER_KEY"
echo "    PAYDUNYA_PRIVATE_KEY"
echo "    PAYDUNYA_PUBLIC_KEY"
echo "    PAYDUNYA_TOKEN"
echo "    ADMIN_JWT_SECRET"
echo "    USER_JWT_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
