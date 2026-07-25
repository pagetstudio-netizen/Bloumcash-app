import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  adminUsersTable,
  adminNotificationsTable,
  countriesConfigTable,
  operatorsConfigTable,
  adminSettingsTable,
} from "./schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DB URL manquante");

const pool = new Pool({
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding admin data…");

  // Admin user
  // Le mot de passe admin est lu depuis ADMIN_DEFAULT_PASSWORD (jamais codé en dur)
  const adminEmail    = "pagetstudio@gmail.com";
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!adminPassword) {
    console.warn("⚠️  ADMIN_DEFAULT_PASSWORD non défini — hash admin non mis à jour");
  } else {
    const bcrypt = await import("bcryptjs");
    const hash   = await bcrypt.hash(adminPassword, 10);
    const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, adminEmail)).limit(1);
    if (!existing.length) {
      await db.insert(adminUsersTable).values({ fullName: "Administrateur Bloum", email: adminEmail, passwordHash: hash, role: "superadmin" });
      console.log("✅ Admin user créé");
    } else {
      await db.update(adminUsersTable).set({ passwordHash: hash }).where(eq(adminUsersTable.email, adminEmail));
      console.log("✅ Admin user mis à jour");
    }
  }

  // Countries
  const countries = [
    { code: "TG", name: "Togo", currency: "XOF", isActive: true, feeDeposit: 3.5, feeWithdraw: 3.5 },
    { code: "BJ", name: "Bénin", currency: "XOF", isActive: true, feeDeposit: 3.5, feeWithdraw: 4.0 },
    { code: "CI", name: "Côte d'Ivoire", currency: "XOF", isActive: false, feeDeposit: 4.0, feeWithdraw: 4.5 },
  ];
  for (const country of countries) {
    const ex = await db.select().from(countriesConfigTable).where(eq(countriesConfigTable.code, country.code)).limit(1);
    if (!ex.length) {
      await db.insert(countriesConfigTable).values(country);
      console.log(`✅ Pays ajouté: ${country.name}`);
    }
  }

  // Operators
  const operators = [
    { name: "TMoney", type: "mobile_money", countryCode: "TG", gateway: "PayDunya", dailyLimit: 1000000, isActive: true },
    { name: "Moov Money", type: "mobile_money", countryCode: "TG", gateway: "PayDunya", dailyLimit: 1000000, isActive: true },
    { name: "MTN Bénin", type: "mobile_money", countryCode: "BJ", gateway: "PayDunya", dailyLimit: 500000, isActive: true },
    { name: "Moov Bénin", type: "mobile_money", countryCode: "BJ", gateway: "PayDunya", dailyLimit: 500000, isActive: true },
  ];
  for (const op of operators) {
    await db.insert(operatorsConfigTable).values(op).onConflictDoNothing();
  }
  console.log(`✅ Opérateurs configurés`);

  // Default settings
  const defaults = [
    { key: "platform_name", value: "Bloum Cash" },
    { key: "support_email", value: "support@bloumcash.tg" },
    { key: "support_phone", value: "+228 92299772" },
    { key: "fee_deposit_percent", value: "3.5" },
    { key: "fee_withdraw_percent", value: "3.5" },
    { key: "fee_exchange_percent", value: "4" },
    { key: "maintenance_mode", value: "false" },
    { key: "withdrawals_enabled", value: "true" },
  ];
  for (const s of defaults) {
    const ex = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, s.key)).limit(1);
    if (!ex.length) {
      await db.insert(adminSettingsTable).values(s);
    }
  }
  console.log("✅ Paramètres par défaut configurés");

  // Welcome notification
  const notifs = await db.select().from(adminNotificationsTable).limit(1);
  if (!notifs.length) {
    await db.insert(adminNotificationsTable).values({
      title: "Bienvenue sur Bloum Cash 🎉",
      message: "Effectuez vos transferts d'argent facilement entre TMoney et Moov Money. Rapide, sécurisé et disponible 24h/24.",
      type: "info",
      buttonText: "Découvrir",
      buttonUrl: "/dashboard",
      isActive: false,
    });
    console.log("✅ Notification de bienvenue créée");
  }

  await pool.end();
  console.log("🎉 Seed terminé !");
}

seed().catch(err => { console.error("❌ Seed error:", err); process.exit(1); });
