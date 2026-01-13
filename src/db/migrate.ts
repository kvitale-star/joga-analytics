import { getDatabase, getCurrentVersion, recordMigration, runMigration, execute } from './database';
import { migration as migration001 } from './migrations/001_initial_schema';

interface Migration {
  version: number;
  description: string;
  up: string;
  down?: string;
}

// Register all migrations here (in order)
const migrations: Migration[] = [
  migration001,
  // Add more migrations here as needed
];

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const db = await getDatabase();
  
  // Try to get current version, but if schema_migrations doesn't exist yet, start from 0
  let currentVersion = 0;
  try {
    currentVersion = await getCurrentVersion(db);
  } catch (error) {
    // If schema_migrations table doesn't exist, that's fine - we'll create it in the first migration
    console.log('schema_migrations table does not exist yet. Will create it in first migration.');
    currentVersion = 0;
  }

  console.log(`Current database version: ${currentVersion}`);
  console.log(`Latest migration version: ${migrations.length}`);

  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date. No migrations needed.');
    return;
  }

  console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`Running migration ${migration.version}: ${migration.description}`);
      await runMigration(db, migration.up);
      
      // Only record migration if schema_migrations table exists (it should after first migration)
      try {
        await recordMigration(db, migration.version, migration.description);
      } catch (recordError: any) {
        // If recording fails, the migration still ran, so log but don't fail
        console.warn(`Could not record migration ${migration.version} (this is OK if it's the first migration):`, recordError);
      }
      
      console.log(`✓ Migration ${migration.version} completed successfully`);
    } catch (error) {
      console.error(`✗ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
}

/**
 * Rollback last migration (if down migration exists)
 */
export async function rollbackLastMigration(): Promise<void> {
  const db = await getDatabase();
  const currentVersion = await getCurrentVersion(db);

  if (currentVersion === 0) {
    console.log('No migrations to rollback.');
    return;
  }

  const migration = migrations.find(m => m.version === currentVersion);

  if (!migration) {
    throw new Error(`Migration version ${currentVersion} not found`);
  }

  if (!migration.down) {
    throw new Error(`Migration version ${currentVersion} does not support rollback`);
  }

  try {
    console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
    await runMigration(db, migration.down);

    // Remove migration record
    await execute(db, 'DELETE FROM schema_migrations WHERE version = ?', [currentVersion]);
    console.log(`✓ Migration ${migration.version} rolled back successfully`);
  } catch (error) {
    console.error(`✗ Rollback of migration ${migration.version} failed:`, error);
    throw error;
  }
}
