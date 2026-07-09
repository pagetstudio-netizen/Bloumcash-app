---
name: Force-update gate
description: How the app-wide update notification (optional/mandatory) is wired, and the lockout pitfall to avoid.
---

The app has an admin-configurable update system: `update_mode` (disabled/optional/mandatory), `min_required_version`, `update_download_url`, `update_title`, `update_message`, stored as keys in the existing `admin_settings` table and exposed publicly via `GET /api/config` (no auth needed, since it must run before login).

**Why:** the app has no native update mechanism (it's a PWA wrapped for stores), so version enforcement has to be done at runtime by comparing a hardcoded frontend `APP_VERSION` constant against a server-controlled minimum.

**How to apply:**
- A mandatory update must block rendering *before* the router mounts, not just overlay on top of it — otherwise users can navigate during the async config fetch. Gate on a "checking" state with a short timeout fallback (~4s) so a slow/down API never permanently locks the app.
- Never allow saving `update_mode: mandatory` without a non-empty `update_download_url` and a valid `x.y.z` version — validate this server-side (not just in the admin UI), or admins can lock out all users with no recovery path.
- The mandatory screen must not reference `/admin` or any admin terminology — it's user-facing only ("Mettre à jour maintenant" + external link).
