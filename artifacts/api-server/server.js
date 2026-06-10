/**
 * Entry point for Node.js hosting (Plesk, cPanel, etc.)
 *
 * All npm dependencies are pre-bundled in dist/index.mjs by esbuild.
 * No additional npm install is needed at runtime — just run: node server.js
 *
 * Required environment variables:
 *   DATABASE_URL   — PostgreSQL connection string
 *   PORT           — Port to listen on (set automatically by Plesk)
 *   NODE_ENV       — Set to "production"
 *
 * Optional:
 *   TELEGRAM_BOT_TOKEN, ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, etc.
 */
await import('./dist/index.mjs');
