import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const _appDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const UPLOADS_DIR = path.resolve(_appDir, "..", "..", "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app: Express = express();

/* ── Sécurité : headers HTTP ── */
app.disable("x-powered-by");

/* ── Logging ── */
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

/* ── CORS : restreint aux origines connues ── */
const ALLOWED_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:3001",
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
  // Domaine de prod
  "https://bloumcash.com",
  "https://www.bloumcash.com",
];

app.use(
  cors({
    origin(origin, callback) {
      // Requêtes sans origine (mobile webview, Postman, même serveur)
      if (!origin) return callback(null, true);
      // Sous-domaines Replit (développement)
      if (origin.endsWith(".replit.dev") || origin.endsWith(".repl.co") || origin.endsWith(".replit.app")) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error("CORS : origine non autorisée"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

/* ── Body parsing : limite réduite (2 Mo suffisent pour images base64 ≤ 1,5 Mo) ── */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* ── Uploads statiques (images uniquement) ── */
app.use("/uploads", express.static(UPLOADS_DIR, {
  index: false,
  dotfiles: "deny",
}));

app.use("/api", router);

/* ── SPA fallback ── */
const _serverDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const FRONTEND_DIST = path.resolve(_serverDir, "..", "public");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.get("/{*path}", (_req, res) => {
    const indexPath = path.join(FRONTEND_DIST, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send("Frontend not built. Run: pnpm --filter @workspace/bloum-cash run build");
    }
  });
}

export default app;
