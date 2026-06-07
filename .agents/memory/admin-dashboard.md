---
name: Admin Dashboard
description: Tableau de bord admin complet Bloum Cash — architecture, compte, routes, pages.
---

## Compte admin
- Email: pagetstudio@gmail.com
- Password: AAbb11## (bcrypt hashé dans admin_users table)
- Rôle: superadmin

## Architecture
- Frontend: `/admin/*` routes dans App.tsx (wouter), pages dans `artifacts/bloum-cash/src/pages/admin/`
- Backend: `/api/admin/*` routes dans `artifacts/api-server/src/routes/admin.ts`
- Auth: token HMAC-SHA256 signé, storé dans `bloum_admin_token` localStorage, durée 24h
- Middleware: `artifacts/api-server/src/middleware/admin-auth.ts`

## DB Tables (nouvelles)
admin_users, admin_notifications, blacklist, blocked_ips, whitelisted_ips, security_events, admin_settings, countries_config, operators_config

## Seed
Seed automatique au démarrage du serveur API via `artifacts/api-server/src/lib/startup-seed.ts` (importé dans index.ts).

**Why:** tsx non disponible globalement; seed dans le démarrage du serveur garantit l'existence du compte admin au premier lancement.

## Pages admin
login, dashboard, users, transactions, operators (pays+opérateurs), messages (popup global), broadcast (email), blacklist, security (IPs), settings

## Notification popup utilisateur
`GlobalNotification` component dans `artifacts/bloum-cash/src/components/global-notification.tsx`, importé dans `dashboard.tsx`. Lit `/api/admin-notifications/active` (endpoint public). Respecte la liste des notifications déjà fermées via localStorage (`bloum_dismissed_notifications`).

## Route API publique
`GET /api/admin-notifications/active` — retourne la notification active la plus récente (pour le dashboard utilisateur).
