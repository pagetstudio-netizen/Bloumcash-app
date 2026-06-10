import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const userFeedbackTable = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("nouveau"),
  userPhone: text("user_phone"),
  userName: text("user_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserFeedback = typeof userFeedbackTable.$inferSelect;
