#!/bin/bash
# ============================================================
#  Bloum Cash — Script de déploiement production (Plesk)
#  Exécuté par Plesk après un git pull, ou manuellement :
#    bash deploy.sh
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
# --no-frozen-lockfile pour éviter les conflits de plateforme sur Plesk
pnpm install --no-frozen-lockfile

# ── Build du frontend React/Vite ────────────────────────────
echo ""
echo "→ Build frontend..."
pnpm --filter @workspace/bloum-cash run build

# ── Build du serveur API (esbuild → dist/index.mjs) ─────────
echo ""
echo "→ Build API serveur..."
pnpm --filter @workspace/api-server run build

# ── Migration base de données (seulement si DATABASE_URL défini) ──
echo ""
if [ -n "$DATABASE_URL" ] || [ -n "$SUPABASE_DATABASE_URL" ]; then
  echo "→ Migration base de données..."
  pnpm --filter @workspace/db run push
  echo "✓ Migration terminée"
else
  echo "⚠️  DATABASE_URL non défini — migration ignorée."
  echo "   Configurez DATABASE_URL dans les variables d'environnement Plesk."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Build terminé avec succès !"
echo "  → Redémarrez l'application Node.js dans Plesk."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
