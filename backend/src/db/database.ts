import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database as AppDatabase } from './schema.js';

export const isPostgres = true;

let pgPool: pg.Pool | null = null;
const connectionString = process.env.DATABASE_URL;
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
  pool: pgPool,
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
