import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverBundle = path.join(__dirname, "..", "api-server", "dist", "index.mjs");

import(serverBundle).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
