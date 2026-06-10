/**
 * Entry point for Node.js hosting (Plesk, cPanel, etc.)
 *
 * All npm dependencies are pre-bundled in dist/index.mjs by esbuild.
 *
 * Required environment variables:
 *   DATABASE_URL   — PostgreSQL connection string
 *   PORT           — Port to listen on (set automatically by Plesk)
 *   NODE_ENV       — Set to "production"
 *
 * Optional:
 *   TELEGRAM_BOT_TOKEN, ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, etc.
 */

try {
  await import('./dist/index.mjs');
} catch (startupErr) {
  // Fallback server: keeps the process alive and returns JSON errors for API
  // calls (instead of crashing and having Passenger show an HTML error page).
  console.error('[Bloum Cash] Erreur au démarrage du serveur :', startupErr?.message ?? startupErr);

  const http = await import('node:http');
  const fs   = await import('node:fs');
  const path = await import('node:path');
  const url  = await import('node:url');

  const __dir    = path.dirname(url.fileURLToPath(import.meta.url));
  const publicDir = path.join(__dir, 'public');
  const indexPath = path.join(publicDir, 'index.html');
  const port      = Number(process.env.PORT ?? 3000);

  const errMsg = String(startupErr?.message ?? startupErr);

  http.createServer((req, res) => {
    if (req.url?.startsWith('/api') || req.url?.startsWith('/uploads')) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `Service indisponible — ${errMsg}` }));
      return;
    }
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(indexPath));
    } else {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Service indisponible : ${errMsg}`);
    }
  }).listen(port, () => {
    console.error(`[Bloum Cash] Serveur de secours démarré sur le port ${port}`);
    console.error('[Bloum Cash] Vérifiez que DATABASE_URL est bien configuré sur Plesk.');
  });
}
