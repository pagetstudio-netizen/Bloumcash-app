import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const whatsappConversationsTable = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  whatsappPhone: text("whatsapp_phone").notNull().unique(),
  accountPhone: text("account_phone"),
  userId: integer("user_id"),
  fullName: text("full_name"),
  state: text("state").notNull().default("welcome"),
  pendingTokenHash: text("pending_token_hash"),
  pendingTokenExpiresAt: timestamp("pending_token_expires_at"),
  lastInboundId: text("last_inbound_id"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_whatsapp_conversations_user_id").on(table.userId),
  index("idx_whatsapp_conversations_pending_token").on(table.pendingTokenHash),
]);

export type WhatsappConversation = typeof whatsappConversationsTable.$inferSelect;