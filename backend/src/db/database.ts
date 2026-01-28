import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Database as AppDatabase } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
// On Railway, use persistent volume if available, otherwise use DATABASE_PATH or default
// Railway provides RAILWAY_VOLUME_MOUNT_PATH for persistent storage
const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const customDbPath = process.env.DATABASE_PATH;
const defaultDbPath = path.join(__dirname, '../../data/joga.db');
const defaultTestDbPath = path.join(__dirname, '../../data/joga.test.db');

// Priority: Railway volume > Custom DATABASE_PATH > Default
// If Railway volume is mounted, it sets RAILWAY_VOLUME_MOUNT_PATH automatically
// If DATABASE_PATH is set, use it (can be relative or absolute)
// Otherwise use default local path
const dbPath = railwayVolumePath 
  ? path.join(railwayVolumePath, 'joga.db')  // Use Railway persistent volume (absolute path)
  : (customDbPath 
      ? (path.isAbsolute(customDbPath) ? customDbPath : path.resolve(process.cwd(), customDbPath))
      : (process.env.NODE_ENV === 'test' ? defaultTestDbPath : defaultDbPath)); // Separate DB for tests

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

// Create SQLite database instance with error handling
// Wrap in try-catch to prevent crashes during module import
let sqliteDb: InstanceType<typeof Database>;
try {
  sqliteDb = new Database(dbPath);
  
  // Enable foreign keys and optimize for production
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL'); // Better concurrency
  sqliteDb.pragma('synchronous = NORMAL'); // Good balance of speed and safety
  console.log('✅ Database connection established');
} catch (error) {
  console.error('❌ Failed to create database connection:', error);
  // Log error but don't crash - server can start and handle errors when database is used
  // This allows health checks to work even if database is temporarily unavailable
  // The error will be caught by server startup try-catch
  throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
}

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
