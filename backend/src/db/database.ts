import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pg from 'pg';
import type { Database as AppDatabase } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = Boolean(process.env.DATABASE_URL);
export const isSqlite = !isPostgres;

// Database file path
// On Railway, use persistent volume if available, otherwise use DATABASE_PATH or default
// Railway provides RAILWAY_VOLUME_MOUNT_PATH for persistent storage
const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const customDbPath = process.env.DATABASE_PATH;
const defaultDbPath = path.join(__dirname, '../../data/joga.db');
const defaultTestDbPath = path.join(__dirname, '../../data/joga.test.db');

// If using Postgres, we don't need a local file path at all.
// Keep the existing SQLite logic for local dev/tests.
// Priority: Railway volume > Custom DATABASE_PATH > Default
// If Railway volume is mounted, it sets RAILWAY_VOLUME_MOUNT_PATH automatically
// If DATABASE_PATH is set, use it (can be relative or absolute)
// Otherwise use default local path
const dbPath = railwayVolumePath 
  ? path.join(railwayVolumePath, 'joga.db')  // Use Railway persistent volume (absolute path)
  : (customDbPath 
      ? (path.isAbsolute(customDbPath) ? customDbPath : path.resolve(process.cwd(), customDbPath))
      : (process.env.NODE_ENV === 'test' ? defaultTestDbPath : defaultDbPath)); // Separate DB for tests

let sqliteDb: InstanceType<typeof Database> | null = null;
let pgPool: pg.Pool | null = null;
let dialect: PostgresDialect | SqliteDialect;

if (isPostgres) {
  // Postgres (recommended for production)
  const connectionString = process.env.DATABASE_URL as string;
  pgPool = new pg.Pool({
    connectionString,
    // Railway/managed Postgres providers almost always require SSL.
    // pg will ignore this if not needed.
    ssl: { rejectUnauthorized: false },
  });
  dialect = new PostgresDialect({
    pool: pgPool,
  });
} else {
  // SQLite (local/dev/tests)
  // Ensure data directory exists
  // Use try-catch to handle permission errors gracefully
  const dataDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created database directory: ${dataDir}`);
    }
  } catch (dirError) {
    console.error(`⚠️  Failed to create database directory ${dataDir}:`, dirError);
    // Continue anyway - database creation might still work if directory exists
    // Or it will fail with a clearer error message
  }

  console.log(`💾 Database path: ${dbPath}`);

  // Wrap in try-catch to prevent crashes during module import
  try {
    sqliteDb = new Database(dbPath);

    // Enable foreign keys and optimize for production
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.pragma('journal_mode = WAL'); // Better concurrency
    sqliteDb.pragma('synchronous = NORMAL'); // Good balance of speed and safety
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to create database connection:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  dialect = new SqliteDialect({
    database: sqliteDb,
  });
}

// Create Kysely instance with type-safe database (shared export)
export const db = new Kysely<AppDatabase>({
  dialect,
});

// Helper function for compatibility (if needed)
export function getDatabase() {
  return db;
}

// Export the SQLite instance for raw SQL if needed
// Use a getter function to avoid TS4023 export type error
// Using InstanceType to avoid type naming issues
export function getSqliteDb(): InstanceType<typeof Database> {
  if (!sqliteDb) {
    throw new Error('SQLite database is not initialized (running in Postgres mode).');
  }
  return sqliteDb;
}

export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
  } catch {
    // ignore
  }

  if (sqliteDb) {
    try {
      sqliteDb.close();
    } catch {
      // ignore
    }
  }

  if (pgPool) {
    try {
      await pgPool.end();
    } catch {
      // ignore
    }
  }
}
