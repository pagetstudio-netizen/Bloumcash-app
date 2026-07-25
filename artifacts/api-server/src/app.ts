import express, { type Express, type Request, type Response, type NextFunction } from "express";
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

app.set("trust proxy", 1);
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

/* ── CORS ── */
const ALLOWED_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:3001",
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
  "https://bloumcash.com",
  "https://www.bloumcash.com",
  "https://app.wendysapp.sbs",
  "https://www.app.wendysapp.sbs",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
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

/* ── Body parsing ── */
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

/* ── Uploads admin — cache 24h ── */
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  next();
}, express.static(UPLOADS_DIR, {
  index: false,
  dotfiles: "deny",
}));

app.use("/api", router);

/* ── Frontend statique avec headers de cache optimisés ── */
const _serverDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const FRONTEND_DIST = path.resolve(_serverDir, "..", "public");

if (fs.existsSync(FRONTEND_DIST)) {
  /* assets/ avec hash dans le nom → cache 1 an immutable */
  app.use("/assets", (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  }, express.static(path.join(FRONTEND_DIST, "assets"), { index: false }));

  /* PWA worker + manifest → pas de cache (doit être toujours à jour) */
  app.use(["/sw.js", "/OneSignalSDKWorker.js", "/manifest.json"], (_req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    next();
  });

  /* Reste des statiques (icons, images public/) → cache 7 jours */
  app.use(express.static(FRONTEND_DIST, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2|woff|ttf)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800"); /* 7 jours */
      }
    },
  }));

  /* SPA fallback — toujours index.html sans cache */
  app.get("/{*path}", (_req, res) => {
    const indexPath = path.join(FRONTEND_DIST, "index.html");
    if (fs.existsSync(indexPath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(indexPath);
    } else {
      res.status(503).send("Frontend not built. Run: pnpm --filter @workspace/bloum-cash run build");
    }
  });
}

/* ── Middleware d'erreur global ── */
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status ?? (err as any).statusCode ?? 500;
  // Loguer le détail côté serveur mais ne jamais exposer le message interne au client
  logger.error({ err: err.message, stack: err.stack, url: req.url, method: req.method }, "Erreur Express non gérée");
  if (!res.headersSent) {
    res.status(status).json({ success: false, error: "Erreur serveur interne" });
  }
});

export default app;
