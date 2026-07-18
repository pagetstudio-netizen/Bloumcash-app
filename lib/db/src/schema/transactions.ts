import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  operator: text("operator").notNull(),
  fromPhone: text("from_phone"),
  toPhone: text("to_phone"),
  toOperator: text("to_operator"),
  fees: integer("fees").default(0),
  description: text("description"),
  userId: integer("user_id"),
  paydunyaToken: text("paydunya_token"),
  payoutSent: boolean("payout_sent").default(false).notNull(),
  adminNote: text("admin_note"),           // Détail interne — jamais exposé à l'utilisateur
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
