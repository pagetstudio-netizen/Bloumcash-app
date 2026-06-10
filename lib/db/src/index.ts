import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "❌ DATABASE_URL ou SUPABASE_DATABASE_URL doit être défini.",
  );
}

const isSupabase =
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co");

const isPooler = connectionString.includes(":6543/");

if (isSupabase) {
  console.log("[DB] 🔌 Connexion Supabase détectée" + (isPooler ? " (pgbouncer pooler)" : " (direct)"));
}

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: isPooler ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (err) => {
  console.error("[DB] ❌ Erreur pool PostgreSQL:", err.message, err.stack);
});

pool.on("connect", () => {
  console.log("[DB] ✅ Nouvelle connexion PostgreSQL établie");
});

pool.query("SELECT 1 AS ping")
  .then(() => console.log("[DB] ✅ Connexion PostgreSQL vérifiée OK"))
  .catch((err) => console.error("[DB] ❌ Échec vérification connexion:", err.message));

export const db = drizzle(pool, { schema });

export * from "./schema";
