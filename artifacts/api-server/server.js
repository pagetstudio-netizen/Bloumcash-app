'use strict';
/**
 * Entry point for Plesk / Phusion Passenger
 *
 * CJS module — no top-level await — fully Passenger-compatible.
 * All dependencies are pre-bundled inside dist/index.mjs (esbuild).
 *
 * Required env vars (set in Plesk → Node.js → Environment Variables):
 *   SUPABASE_DATABASE_URL  — PostgreSQL Supabase connection string
 *   USER_JWT_SECRET        — secret for user tokens
 *   ADMIN_JWT_SECRET       — secret for admin tokens
 *   NODE_ENV               — "production"
 *   PORT                   — set automatically by Passenger/Plesk
 */

var path = require('path');
var http = require('http');
var fs   = require('fs');

(async function start() {
  try {
    // dist/index.mjs is an esbuild ESM bundle — dynamic import works from CJS
    await import('./dist/index.mjs');
  } catch (startupErr) {
    var errMsg = (startupErr && startupErr.message) ? startupErr.message : String(startupErr);
    console.error('[Bloum Cash] ERREUR DEMARRAGE:', errMsg);
    console.error('[Bloum Cash] Stack:', startupErr && startupErr.stack);

    // Fallback server: keeps Passenger alive and serves the frontend SPA.
    // API calls return 503 with the error message so you can diagnose remotely.
    var publicDir = path.join(__dirname, 'public');
    var indexPath = path.join(publicDir, 'index.html');
    var port      = Number(process.env.PORT || 3000);

    http.createServer(function (req, res) {
      var url = req.url || '/';

      // Health check — always accessible for debugging
      if (url === '/api/health' || url === '/api/health/') {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'ERROR',
          error: errMsg,
          hint: 'Verifiez SUPABASE_DATABASE_URL, USER_JWT_SECRET, ADMIN_JWT_SECRET dans Plesk env vars'
        }, null, 2));
        return;
      }

      // API / uploads → JSON error
      if (url.startsWith('/api') || url.startsWith('/uploads')) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Service indisponible — ' + errMsg }));
        return;
      }

      // Everything else → serve index.html (SPA fallback)
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(indexPath));
      } else {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Service indisponible : ' + errMsg + '\n(public/index.html introuvable)');
      }
    }).listen(port, function () {
      console.error('[Bloum Cash] Serveur de SECOURS actif sur le port ' + port);
      console.error('[Bloum Cash] Cause: ' + errMsg);
      console.error('[Bloum Cash] → Ouvrez /api/health pour diagnostiquer');
    });
  }
})();
