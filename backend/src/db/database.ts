import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database as AppDatabase } from './schema.js';

// IMPORTANT: This module is imported very early (often before server.ts executes),
// so it must be able to load env vars for local dev on its own.
// Railway provides env vars directly, so this is primarily for local runs.
dotenv.config(); // load from cwd if present

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // backend/.env is at ../../.env from src/db/database.ts
  dotenv.config({ path: join(__dirname, '..', '..', '.env') });
}

export const isPostgres = true;

let pgPool: pg.Pool | null = null;
// In test environment, prefer DATABASE_URL_TEST, fall back to DATABASE_URL
const connectionString = process.env.NODE_ENV === 'test' 
  ? (process.env.DATABASE_URL_TEST || process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Postgres is the only supported database for this project.');
}

function shouldUseSslForDatabaseUrl(databaseUrl: string): boolean {
  // If user explicitly disables SSL, respect it.
  // Common values: 'disable' | 'require' | 'prefer' | 'verify-ca' | 'verify-full'
  if (process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === 'disable') {
    return false;
  }

  // Local Postgres (Docker/native) typically does NOT support SSL by default.
  // Hosted providers (Railway/Supabase/etc) almost always require it.
  const lower = databaseUrl.toLowerCase();
  return !(
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0')
  );
}

pgPool = new pg.Pool({
  connectionString,
  // Railway/managed Postgres providers almost always require SSL.
  // Local Postgres typically does not. We auto-detect, and you can override with PGSSLMODE=disable.
  ssl: shouldUseSslForDatabaseUrl(connectionString) ? { rejectUnauthorized: false } : false,
});

const dialect = new PostgresDialect({
  pool: pgPool as pg.Pool,
});

// Create Kysely instance with type-safe database (shared export)
export const db = new Kysely<AppDatabase>({
  dialect,
});

// Helper function for compatibility (if needed)
export function getDatabase() {
  return db;
}

export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
  } catch {
    // ignore
  }

  if (pgPool) {
    try {
      await pgPool.end();
    } catch {
      // ignore
    }
  }
}
