import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  real,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminNotificationsTable = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  displayMode: text("display_mode").notNull().default("classic"),
  title: text("title"),
  message: text("message"),
  type: text("type").notNull().default("info"),
  imageUrl: text("image_url"),
  actionType: text("action_type").notNull().default("none"),
  actionUrl: text("action_url"),
  buttonText: text("button_text"),
  buttonUrl: text("button_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blacklistTable = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  reason: text("reason"),
  blockedBy: text("blocked_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blockedIpsTable = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whitelistedIpsTable = pgTable("whitelisted_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityEventsTable = pgTable("security_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  ip: text("ip"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const countriesConfigTable = pgTable("countries_config", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("XOF"),
  isActive: boolean("is_active").notNull().default(true),
  feeDeposit: real("fee_deposit").notNull().default(5.0),
  feeWithdraw: real("fee_withdraw").notNull().default(5.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const operatorsConfigTable = pgTable("operators_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("mobile_money"),
  countryCode: text("country_code").notNull(),
  gateway: text("gateway").notNull().default("PayDunya"),
  dailyLimit: integer("daily_limit").notNull().default(1000000),
  isActive: boolean("is_active").notNull().default(true),
  maintenanceAll: boolean("maintenance_all").notNull().default(false),
  maintenanceDeposit: boolean("maintenance_deposit").notNull().default(false),
  maintenanceWithdraw: boolean("maintenance_withdraw").notNull().default(false),
  maintenancePaymentLink: boolean("maintenance_payment_link").notNull().default(false),
  maintenanceApiPayment: boolean("maintenance_api_payment").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  icon: text("icon").notNull().default("🎁"),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  badge: text("badge").notNull().default("active"),
  color: text("color").notNull().default("#1a3fc4"),
  bgColor: text("bg_color").notNull().default("#eff2ff"),
  buttonText: text("button_text"),
  buttonActionType: text("button_action_type").default("none"),
  buttonUrl: text("button_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* Codes de vérification : reset PIN utilisateur + vérif admin */
export const verificationCodesTable = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), /* "pin_reset" | "admin_login" */
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* Empreintes d'appareils admin pour détection nouveau device */
export const adminDevicesTable = pgTable("admin_devices", {
  id: serial("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  deviceHash: text("device_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("admin_devices_email_hash_unique").on(table.adminEmail, table.deviceHash),
]);

export const dashboardBannersTable = pgTable("dashboard_banners", {
  id: serial("id").primaryKey(),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  actionType: text("action_type").notNull().default("none"),
  actionUrl: text("action_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DashboardBanner = typeof dashboardBannersTable.$inferSelect;
export type AdminUser = typeof adminUsersTable.$inferSelect;
export type VerificationCode = typeof verificationCodesTable.$inferSelect;
export type AdminDevice = typeof adminDevicesTable.$inferSelect;
export type AdminNotification = typeof adminNotificationsTable.$inferSelect;
export type Blacklist = typeof blacklistTable.$inferSelect;
export type BlockedIp = typeof blockedIpsTable.$inferSelect;
export type WhitelistedIp = typeof whitelistedIpsTable.$inferSelect;
export type SecurityEvent = typeof securityEventsTable.$inferSelect;
export type AdminSetting = typeof adminSettingsTable.$inferSelect;
export type CountryConfig = typeof countriesConfigTable.$inferSelect;
export type OperatorConfig = typeof operatorsConfigTable.$inferSelect;
