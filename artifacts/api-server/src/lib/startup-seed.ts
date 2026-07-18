import { db } from "@workspace/db";
import {
  adminUsersTable, countriesConfigTable, operatorsConfigTable,
  adminSettingsTable, adminNotificationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";
import { startTelegram } from "./telegram";

export async function runStartupSeed() {
  try {
    // Admin user — créer uniquement s'il n'existe pas encore
    const ADMIN_EMAIL = "pagetstudio@gmail.com";
    const admins = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, ADMIN_EMAIL)).limit(1);
    if (!admins.length) {
      // Utiliser ADMIN_DEFAULT_PASSWORD si défini, sinon fallback (à changer en prod)
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? "AAbb11##";
      const hash = await bcrypt.hash(adminPassword, 10);
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
    // Always enforce current fee values + social links (force-update on every startup)
    const feeUpdates = [
      { key: "fee_deposit_percent", value: "5" },
      { key: "fee_withdraw_percent", value: "5" },
      { key: "whatsapp_url", value: "https://whatsapp.com/channel/0029VbCMbIu6buMMsZq5zH2U" },
      { key: "facebook_url", value: "https://www.facebook.com/profile.php?id=61590489849381" },
      { key: "youtube_url", value: "https://youtube.com/@bloumcash?si=wTxmV34QWgyMxDRq" },
    ];
    for (const s of feeUpdates) {
      const ex = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, s.key)).limit(1);
      if (ex.length) {
        await db.update(adminSettingsTable).set({ value: s.value }).where(eq(adminSettingsTable.key, s.key));
      } else {
        await db.insert(adminSettingsTable).values(s);
      }
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

    // Démarrer le bot Telegram en background (non-bloquant)
    startTelegram().catch(err => logger.error({ err }, "Telegram start error"));
  } catch (err) {
    logger.error({ err }, "Startup seed error");
  }
}
