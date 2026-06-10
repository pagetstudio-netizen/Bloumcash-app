const path = require("path");
const serverBundle = path.join(__dirname, "..", "api-server", "dist", "index.mjs");

import(serverBundle).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
