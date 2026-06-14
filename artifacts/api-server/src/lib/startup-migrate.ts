/**
 * Migration automatique au démarrage.
 * Crée les tables manquantes et ajoute les colonnes manquantes.
 * IMPORTANT : chaque DDL est exécuté individuellement (sans BEGIN/COMMIT global)
 * pour compatibilité avec pgbouncer transaction mode (Supabase pooler port 6543).
 */
import { pool } from "@workspace/db";
import { logger } from "./logger";

async function run(client: import("pg").PoolClient, sql: string): Promise<void> {
  try {
    await client.query(sql);
  } catch (err: any) {
    logger.error({ err: err.message, sql: sql.slice(0, 120) }, "❌ DDL statement failed");
    throw err;
  }
}

export async function runStartupMigration(): Promise<void> {
  logger.info("[Migration] Démarrage...");
  const client = await pool.connect();
  try {

    /* ─── TABLE users ─────────────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS users (
        id                         SERIAL PRIMARY KEY,
        full_name                  TEXT NOT NULL,
        email                      TEXT UNIQUE NOT NULL,
        pin                        TEXT NOT NULL,
        phone                      TEXT,
        operator                   TEXT,
        status                     TEXT NOT NULL DEFAULT 'active',
        created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at              TIMESTAMP,
        onesignal_external_user_id VARCHAR(255),
        village                    TEXT,
        city                       TEXT,
        region                     TEXT,
        country                    TEXT DEFAULT 'Togo'
      )
    `);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_external_user_id VARCHAR(255)`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS village TEXT`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Togo'`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`);
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS operator TEXT`);
    await run(client, `CREATE INDEX IF NOT EXISTS idx_onesignal_external_user_id ON users (onesignal_external_user_id)`);

    /* ─── TABLE transactions ──────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS transactions (
        id              SERIAL PRIMARY KEY,
        reference       TEXT UNIQUE NOT NULL,
        type            TEXT NOT NULL,
        title           TEXT NOT NULL,
        amount          INTEGER NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        operator        TEXT NOT NULL,
        from_phone      TEXT,
        to_phone        TEXT,
        to_operator     TEXT,
        fees            INTEGER DEFAULT 0,
        description     TEXT,
        user_id         INTEGER,
        paydunya_token  TEXT,
        payout_sent     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await run(client, `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paydunya_token TEXT`);
    await run(client, `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await run(client, `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER`);

    /* ─── TABLE qr_codes ──────────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS qr_codes (
        id             SERIAL PRIMARY KEY,
        reference      TEXT UNIQUE NOT NULL,
        business_name  TEXT NOT NULL,
        phone          TEXT NOT NULL,
        operator       TEXT NOT NULL,
        amount         INTEGER NOT NULL,
        qr_data        TEXT NOT NULL,
        description    TEXT,
        status         TEXT NOT NULL DEFAULT 'active',
        user_id        INTEGER,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await run(client, `ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS user_id INTEGER`);

    /* ─── TABLE admin_users ───────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS admin_users (
        id            SERIAL PRIMARY KEY,
        full_name     TEXT NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        phone         TEXT,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'admin',
        totp_secret   TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await run(client, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT`);
    await run(client, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT`);

    /* ─── TABLE admin_settings ────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS admin_settings (
        id         SERIAL PRIMARY KEY,
        key        TEXT UNIQUE NOT NULL,
        value      TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE admin_notifications ───────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id           SERIAL PRIMARY KEY,
        display_mode TEXT NOT NULL DEFAULT 'classic',
        title        TEXT,
        message      TEXT,
        type         TEXT NOT NULL DEFAULT 'info',
        image_url    TEXT,
        action_type  TEXT NOT NULL DEFAULT 'none',
        action_url   TEXT,
        button_text  TEXT,
        button_url   TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    /* ─── Colonnes ajoutées après la création initiale ─────── */
    await run(client, `ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'classic'`);
    await run(client, `ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'none'`);
    await run(client, `ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS action_url TEXT`);
    await run(client, `ALTER TABLE admin_notifications ALTER COLUMN title DROP NOT NULL`);
    await run(client, `ALTER TABLE admin_notifications ALTER COLUMN message DROP NOT NULL`);

    /* ─── TABLE blacklist ─────────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS blacklist (
        id         SERIAL PRIMARY KEY,
        phone      TEXT UNIQUE NOT NULL,
        reason     TEXT,
        blocked_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE blocked_ips ───────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id         SERIAL PRIMARY KEY,
        ip         TEXT UNIQUE NOT NULL,
        reason     TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE whitelisted_ips ───────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS whitelisted_ips (
        id         SERIAL PRIMARY KEY,
        ip         TEXT UNIQUE NOT NULL,
        label      TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE security_events ───────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS security_events (
        id         SERIAL PRIMARY KEY,
        type       TEXT NOT NULL,
        ip         TEXT,
        details    TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE verification_codes ────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS verification_codes (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL,
        code       TEXT NOT NULL,
        type       TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at    TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE admin_devices ─────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS admin_devices (
        id           SERIAL PRIMARY KEY,
        admin_email  TEXT NOT NULL,
        device_hash  TEXT NOT NULL,
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT admin_devices_email_hash_unique UNIQUE (admin_email, device_hash)
      )
    `);

    /* ─── TABLE countries_config ──────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS countries_config (
        id           SERIAL PRIMARY KEY,
        code         TEXT UNIQUE NOT NULL,
        name         TEXT NOT NULL,
        currency     TEXT NOT NULL DEFAULT 'XOF',
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        fee_deposit  REAL NOT NULL DEFAULT 5.0,
        fee_withdraw REAL NOT NULL DEFAULT 5.0,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE operators_config ──────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS operators_config (
        id                        SERIAL PRIMARY KEY,
        name                      TEXT NOT NULL,
        type                      TEXT NOT NULL DEFAULT 'mobile_money',
        country_code              TEXT NOT NULL,
        gateway                   TEXT NOT NULL DEFAULT 'PayDunya',
        daily_limit               INTEGER NOT NULL DEFAULT 1000000,
        is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
        maintenance_all           BOOLEAN NOT NULL DEFAULT FALSE,
        maintenance_deposit       BOOLEAN NOT NULL DEFAULT FALSE,
        maintenance_withdraw      BOOLEAN NOT NULL DEFAULT FALSE,
        maintenance_payment_link  BOOLEAN NOT NULL DEFAULT FALSE,
        maintenance_api_payment   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at                TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await run(client, `ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_all BOOLEAN NOT NULL DEFAULT FALSE`);
    await run(client, `ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_deposit BOOLEAN NOT NULL DEFAULT FALSE`);
    await run(client, `ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_withdraw BOOLEAN NOT NULL DEFAULT FALSE`);
    await run(client, `ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_payment_link BOOLEAN NOT NULL DEFAULT FALSE`);
    await run(client, `ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_api_payment BOOLEAN NOT NULL DEFAULT FALSE`);

    /* ─── TABLE promotions ────────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS promotions (
        id          SERIAL PRIMARY KEY,
        icon        TEXT NOT NULL DEFAULT '🎁',
        title       TEXT NOT NULL,
        description TEXT NOT NULL,
        badge       TEXT NOT NULL DEFAULT 'active',
        color       TEXT NOT NULL DEFAULT '#1a3fc4',
        bg_color    TEXT NOT NULL DEFAULT '#eff2ff',
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        expires_at  TIMESTAMP,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE dashboard_banners ─────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS dashboard_banners (
        id          SERIAL PRIMARY KEY,
        title       TEXT,
        image_url   TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'none',
        action_url  TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ─── TABLE user_feedback ─────────────────────────────────── */
    await run(client, `
      CREATE TABLE IF NOT EXISTS user_feedback (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER,
        type       TEXT NOT NULL,
        title      TEXT NOT NULL,
        message    TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'nouveau',
        user_phone TEXT,
        user_name  TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    logger.info("✅ Migration démarrage terminée (toutes les tables sont à jour)");
  } catch (err: any) {
    logger.error({ err: err.message }, "❌ Erreur migration démarrage");
    throw err;
  } finally {
    client.release();
  }
}
