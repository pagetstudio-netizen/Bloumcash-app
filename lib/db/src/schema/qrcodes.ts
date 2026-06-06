import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qrCodesTable = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  businessName: text("business_name").notNull(),
  phone: text("phone").notNull(),
  operator: text("operator").notNull(),
  amount: integer("amount").notNull(),
  qrData: text("qr_data").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQrCodeSchema = createInsertSchema(qrCodesTable).omit({ id: true, createdAt: true });
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type QrCode = typeof qrCodesTable.$inferSelect;
