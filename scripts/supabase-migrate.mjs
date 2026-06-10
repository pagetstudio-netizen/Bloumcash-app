/**
 * Script de migration directe vers Supabase.
 * Usage: node scripts/supabase-migrate.mjs
 */
import pg from "pg";
const { Pool } = pg;

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error("❌ SUPABASE_DATABASE_URL non défini");
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function migrate() {
  const client = await pool.connect();
  console.log("✅ Connecté à Supabase");

  try {
    // Lister les tables existantes
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log("Tables existantes:", rows.map(r => r.tablename).join(", ") || "(aucune)");

    await client.query("BEGIN");

    /* ── USERS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        full_name   TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        pin         TEXT NOT NULL,
        phone       TEXT,
        operator    TEXT,
        status      TEXT NOT NULL DEFAULT 'active',
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP,
        onesignal_external_user_id VARCHAR(255),
        village     TEXT,
        city        TEXT,
        region      TEXT,
        country     TEXT DEFAULT 'Togo'
      )
    `);
    for (const col of [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS operator TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_external_user_id VARCHAR(255)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS village TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Togo'",
      "CREATE INDEX IF NOT EXISTS idx_onesignal_external_user_id ON users (onesignal_external_user_id)",
    ]) await client.query(col);

    /* ── TRANSACTIONS ── */
    await client.query(`
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
    for (const col of [
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paydunya_token TEXT",
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_sent BOOLEAN NOT NULL DEFAULT FALSE",
    ]) await client.query(col);

    /* ── QR_CODES ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id            SERIAL PRIMARY KEY,
        reference     TEXT UNIQUE NOT NULL,
        business_name TEXT NOT NULL,
        phone         TEXT NOT NULL,
        operator      TEXT NOT NULL,
        amount        INTEGER NOT NULL,
        qr_data       TEXT NOT NULL,
        description   TEXT,
        status        TEXT NOT NULL DEFAULT 'active',
        user_id       INTEGER,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS user_id INTEGER");

    /* ── ADMIN_USERS ── */
    await client.query(`
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
    for (const col of [
      "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT",
      "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT",
    ]) await client.query(col);

    /* ── ADMIN_SETTINGS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id         SERIAL PRIMARY KEY,
        key        TEXT UNIQUE NOT NULL,
        value      TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── ADMIN_NOTIFICATIONS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id          SERIAL PRIMARY KEY,
        title       TEXT NOT NULL,
        message     TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'info',
        image_url   TEXT,
        button_text TEXT,
        button_url  TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── BLACKLIST ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id         SERIAL PRIMARY KEY,
        phone      TEXT UNIQUE NOT NULL,
        reason     TEXT,
        blocked_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── BLOCKED_IPS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id         SERIAL PRIMARY KEY,
        ip         TEXT UNIQUE NOT NULL,
        reason     TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── WHITELISTED_IPS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS whitelisted_ips (
        id         SERIAL PRIMARY KEY,
        ip         TEXT UNIQUE NOT NULL,
        label      TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── SECURITY_EVENTS ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id         SERIAL PRIMARY KEY,
        type       TEXT NOT NULL,
        ip         TEXT,
        details    TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* ── VERIFICATION_CODES ── */
    await client.query(`
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

    /* ── ADMIN_DEVICES ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_devices (
        id           SERIAL PRIMARY KEY,
        admin_email  TEXT NOT NULL,
        device_hash  TEXT NOT NULL,
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT admin_devices_email_hash_unique UNIQUE (admin_email, device_hash)
      )
    `);

    /* ── COUNTRIES_CONFIG ── */
    await client.query(`
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

    /* ── OPERATORS_CONFIG ── */
    await client.query(`
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
    for (const col of [
      "ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_all BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_deposit BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_withdraw BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_payment_link BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE operators_config ADD COLUMN IF NOT EXISTS maintenance_api_payment BOOLEAN NOT NULL DEFAULT FALSE",
    ]) await client.query(col);

    /* ── PROMOTIONS ── */
    await client.query(`
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

    /* ── DASHBOARD_BANNERS ── */
    await client.query(`
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

    /* ── USER_FEEDBACK ── */
    await client.query(`
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

    await client.query("COMMIT");
    console.log("\n✅ Migration Supabase terminée avec succès !");

    // Lister les tables après migration
    const after = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log("Tables après migration:", after.rows.map(r => r.tablename).join(", "));

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur migration:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
