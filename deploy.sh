#!/bin/bash
# ============================================================
# Bloum Cash — Script de déploiement production (Plesk)
# Usage : bash deploy.sh
# ============================================================
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bloum Cash — Deploiement production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Vérifier pnpm ───────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "pnpm non trouve — installation en cours..."
  npm install -g pnpm
fi

# ── Installation des dépendances ────────────────────────────
echo "Installation des dependances..."
pnpm install --frozen-lockfile

# ── Migration base de données ────────────────────────────────
echo ""
echo "Mise a jour de la base de donnees..."
pnpm --filter @workspace/db run push

# ── Build du frontend (React/Vite) ──────────────────────────
echo ""
echo "Build du frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API (esbuild) ──────────────────────────
echo ""
echo "Build du serveur API..."
pnpm --filter @workspace/api-server run build

# ── Résumé ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Build termine avec succes !"
echo ""
echo "  Demarrage manuel : node artifacts/api-server/dist/index.mjs"
echo "  Ou via PM2       : pm2 start ecosystem.config.cjs"
echo "  Ou via pnpm      : pnpm start"
echo ""
echo "  Variables d'env requises dans Plesk -> Node.js -> Env vars :"
echo "    PORT                    (ex: 3001)"
echo "    SUPABASE_DATABASE_URL   (PostgreSQL Supabase)"
echo "    PAYDUNYA_MASTER_KEY"
echo "    PAYDUNYA_PRIVATE_KEY"
echo "    PAYDUNYA_PUBLIC_KEY"
echo "    PAYDUNYA_TOKEN"
echo "    GOMBOPLUS_PUBLIC_KEY"
echo "    GOMBOPLUS_PRIVATE_KEY"
echo "    ADMIN_JWT_SECRET"
echo "    USER_JWT_SECRET"
echo "    ONESIGNAL_APP_ID        (optionnel)"
echo "    ONESIGNAL_API_KEY       (optionnel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
