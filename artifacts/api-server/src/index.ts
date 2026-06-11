import app from "./app";
import { logger } from "./lib/logger";
import { runStartupMigration } from "./lib/startup-migrate";
import { runStartupSeed } from "./lib/startup-seed";
import { startPendingExpiryScheduler } from "./lib/pending-expiry";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  /* Migration d'abord, seed ensuite */
  runStartupMigration()
    .then(() => runStartupSeed())
    .then(() => startPendingExpiryScheduler())
    .catch(e => logger.error({ e }, "Startup migration/seed failed"));
});
