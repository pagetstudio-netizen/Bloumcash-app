import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

// Chemin stable quelle que soit le cwd — on se base sur __dirname injecté par esbuild
const _appDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const UPLOADS_DIR = path.resolve(_appDir, "..", "..", "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/api", router);

/* ── SPA fallback — serve built React frontend for all non-API routes ── */
// __dirname est injecté par le banner esbuild → pointe vers artifacts/api-server/dist/
// Quelque soit le cwd au démarrage (racine du dépôt ou sous-dossier), ce chemin est stable.
const _serverDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const FRONTEND_DIST = path.resolve(_serverDir, "..", "..", "..", "artifacts", "bloum-cash", "dist", "public");
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
