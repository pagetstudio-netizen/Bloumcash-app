/**
 * Expiration automatique des transactions en attente.
 * Toute transaction `pending` de plus de EXPIRY_MINUTES est basculée en `failed`.
 * Lance un contrôle toutes les CHECK_INTERVAL_MS millisecondes.
 */

import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { and, eq, lte } from "drizzle-orm";
import { logger } from "./logger";

const EXPIRY_MINUTES = 120;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

async function expirePendingTransactions(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    const expired = await db
      .update(transactionsTable)
      .set({ status: "failed" })
      .where(
        and(
          eq(transactionsTable.status, "pending"),
          lte(transactionsTable.createdAt, cutoff)
        )
      )
      .returning({ reference: transactionsTable.reference });

    if (expired.length > 0) {
      logger.warn(
        { count: expired.length, refs: expired.map(r => r.reference) },
        `⏱ ${expired.length} transaction(s) en attente expirée(s) → échoué (délai > ${EXPIRY_MINUTES} min)`
      );
    }
  } catch (err) {
    logger.error({ err }, "Erreur lors de l'expiration des transactions pending");
  }
}

export function startPendingExpiryScheduler(): void {
  expirePendingTransactions().catch(() => {});
  setInterval(() => {
    expirePendingTransactions().catch(() => {});
  }, CHECK_INTERVAL_MS);
  logger.info(
    { expiryMinutes: EXPIRY_MINUTES, checkEveryMinutes: CHECK_INTERVAL_MS / 60_000 },
    "⏱ Scheduler expiration pending démarré"
  );
}
