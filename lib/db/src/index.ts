import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL ou SUPABASE_DATABASE_URL doit être défini.",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") || connectionString.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
