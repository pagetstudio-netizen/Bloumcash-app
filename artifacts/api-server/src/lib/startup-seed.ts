import { db } from "@workspace/db";
import {
  adminUsersTable, countriesConfigTable, operatorsConfigTable,
  adminSettingsTable, adminNotificationsTable, dashboardBannersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function runStartupSeed() {
  try {
    // Admin user — créer uniquement s'il n'existe pas encore
    const ADMIN_EMAIL = "pagetstudio@gmail.com";
    const admins = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, ADMIN_EMAIL)).limit(1);
    if (!admins.length) {
      const hash = await bcrypt.hash("AAbb11##", 10);
      await db.insert(adminUsersTable).values({
        fullName: "Administrateur Bloum",
        email: ADMIN_EMAIL,
        passwordHash: hash,
        role: "superadmin",
      });
      logger.info("✅ Admin user créé: " + ADMIN_EMAIL);
    }

    // Countries
    const countryData = [
      { code: "TG", name: "Togo", currency: "XOF", isActive: true, feeDeposit: 3.5, feeWithdraw: 3.5 },
      { code: "BJ", name: "Bénin", currency: "XOF", isActive: true, feeDeposit: 3.5, feeWithdraw: 4.0 },
      { code: "CI", name: "Côte d'Ivoire", currency: "XOF", isActive: false, feeDeposit: 4.0, feeWithdraw: 4.5 },
    ];
    for (const c of countryData) {
      const ex = await db.select().from(countriesConfigTable).where(eq(countriesConfigTable.code, c.code)).limit(1);
      if (!ex.length) { await db.insert(countriesConfigTable).values(c); }
    }

    // Operators
    const opData = [
      { name: "TMoney", type: "mobile_money", countryCode: "TG", gateway: "PayDunya", dailyLimit: 1000000, isActive: true },
      { name: "Moov Money", type: "mobile_money", countryCode: "TG", gateway: "PayDunya", dailyLimit: 1000000, isActive: true },
      { name: "MTN Bénin", type: "mobile_money", countryCode: "BJ", gateway: "PayDunya", dailyLimit: 500000, isActive: true },
      { name: "Moov Bénin", type: "mobile_money", countryCode: "BJ", gateway: "PayDunya", dailyLimit: 500000, isActive: true },
    ];
    for (const op of opData) {
      const ex = await db.select().from(operatorsConfigTable).where(eq(operatorsConfigTable.name, op.name)).limit(1);
      if (!ex.length) { await db.insert(operatorsConfigTable).values(op); }
    }

    // Default settings (insert if missing)
    const defaults = [
      { key: "platform_name", value: "Bloum Cash" },
      { key: "support_email", value: "support@bloumcash.tg" },
      { key: "support_phone", value: "+228 92299772" },
      { key: "fee_deposit_percent", value: "5" },
      { key: "fee_withdraw_percent", value: "5" },
      { key: "fee_exchange_percent", value: "4" },
      { key: "maintenance_mode", value: "false" },
      { key: "withdrawals_enabled", value: "true" },
    ];
    for (const s of defaults) {
      const ex = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, s.key)).limit(1);
      if (!ex.length) { await db.insert(adminSettingsTable).values(s); }
    }
    // Always enforce current fee values (force-update on every startup)
    const feeUpdates = [
      { key: "fee_deposit_percent", value: "5" },
      { key: "fee_withdraw_percent", value: "5" },
    ];
    for (const s of feeUpdates) {
      await db.update(adminSettingsTable).set({ value: s.value }).where(eq(adminSettingsTable.key, s.key));
    }

    // Banners — pré-seeder avec les 3 images de la PWA
    const banners = await db.select().from(dashboardBannersTable).limit(1);
    if (!banners.length) {
      await db.insert(dashboardBannersTable).values([
        { title: "Transfert sans déplacement", imageUrl: "/banners/banner1.jpg", actionType: "page", actionUrl: "/transfert", isActive: true, sortOrder: 0 },
        { title: "TMoney & Moov Money", imageUrl: "/banners/banner2.jpg", actionType: "page", actionUrl: "/transfert", isActive: true, sortOrder: 1 },
        { title: "Paiement QR Code", imageUrl: "/banners/banner3.jpg", actionType: "page", actionUrl: "/encaisser", isActive: true, sortOrder: 2 },
      ]);
      logger.info("✅ Bannières pré-seededées");
    }

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
    }

    logger.info("🌱 Startup seed terminé");
  } catch (err) {
    logger.error({ err }, "Startup seed error");
  }
}
