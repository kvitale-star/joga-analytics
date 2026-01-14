import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Database as AppDatabase } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/joga.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database instance
const sqliteDb = new Database(dbPath);

// Enable foreign keys and optimize for production
sqliteDb.pragma('foreign_keys = ON');
sqliteDb.pragma('journal_mode = WAL'); // Better concurrency
sqliteDb.pragma('synchronous = NORMAL'); // Good balance of speed and safety

// Create Kysely instance with type-safe database
export const db = new Kysely<AppDatabase>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
});

// Helper function for compatibility (if needed)
export function getDatabase() {
  return db;
}

// Export the SQLite instance for raw SQL if needed
// Use a getter function to avoid TS4023 export type error
// Using InstanceType to avoid type naming issues
export function getSqliteDb(): InstanceType<typeof Database> {
  return sqliteDb;
}
