// Test setup file
// .env is loaded by load-env.ts (via setupFiles) BEFORE this file runs
// Ensure password validation is enabled in tests (we want to test it!)
if (!process.env.ENABLE_PASSWORD_VALIDATION) {
  process.env.ENABLE_PASSWORD_VALIDATION = 'true';
}

// Ensure DB connections don't keep Jest alive
import { closeDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrations.js';
import { db } from '../db/database.js';

beforeAll(async () => {
  // Ensure schema exists for tests (pg-mem or real Postgres test DB)
  await runMigrations();
});

beforeEach(async () => {
  // Clear data between tests to avoid cross-test contamination.
  // Keep schema_migrations intact so migrations don't re-run every test.
  await db.deleteFrom('sessions').execute();
  await db.deleteFrom('user_teams').execute();
  await db.deleteFrom('custom_charts').execute();
  await db.deleteFrom('metric_definitions').execute();
  await db.deleteFrom('images').execute();
  await db.deleteFrom('game_events').execute();
  await db.deleteFrom('matches').execute();
  await db.deleteFrom('team_aliases').execute();
  await db.deleteFrom('teams').execute();
  await db.deleteFrom('seasons').execute();
  await db.deleteFrom('users').execute();
});

afterAll(async () => {
  await closeDatabase();
});
