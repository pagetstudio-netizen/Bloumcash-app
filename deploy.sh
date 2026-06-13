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

# ── Les fichiers buildés sont inclus dans git ────────────────
# artifacts/api-server/public/  → frontend React (déjà compilé)
# artifacts/api-server/dist/    → API serveur  (déjà compilé)
# → git pull suffit, pas besoin de rebuilder sur Plesk.

# ── Les migrations DB sont appliquées automatiquement ────────
# au démarrage du serveur (startup-migrate.ts)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Prêt !"
echo "  → Cliquez Restart dans Plesk pour redémarrer."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
