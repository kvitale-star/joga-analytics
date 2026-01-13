import { db, sqliteDb } from './database.js';
import { sql } from 'kysely';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  // Create migrations table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `.execute(db);

  // Get current version
  const currentVersion = await db
    .selectFrom('schema_migrations')
    .select(db.fn.max('version').as('version'))
    .executeTakeFirst();

  const version = (currentVersion?.version as number) || 0;

  console.log(`Current database version: ${version}`);

  // Run migration 001 if needed
  if (version < 1) {
    console.log('Running migration 001: Initial schema...');
    
    // Read SQL from your existing migration file
    // We'll copy the SQL from the frontend migration
    const migrationSQL = `
    -- Schema migrations tracking
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );

    -- Seasons table
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Teams table (flexible, versioned)
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      metadata TEXT,
      season_id INTEGER REFERENCES seasons(id),
      parent_team_id INTEGER REFERENCES teams(id),
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Team aliases (for name changes over time)
    CREATE TABLE IF NOT EXISTS team_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, alias)
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'coach', 'viewer')),
      email_verified BOOLEAN DEFAULT 0,
      email_verification_token TEXT,
      email_verification_sent_at TIMESTAMP,
      password_reset_token TEXT,
      password_reset_expires TIMESTAMP,
      preferences TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );

    -- User-Team assignments (many-to-many)
    CREATE TABLE IF NOT EXISTS user_teams (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER REFERENCES users(id),
      PRIMARY KEY (user_id, team_id)
    );

    -- Sessions (7-day expiration)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Matches table (one row per game)
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER REFERENCES teams(id),
      opponent_name TEXT NOT NULL,
      match_date DATE NOT NULL,
      competition_type TEXT,
      result TEXT,
      stats_json TEXT,
      stats_source TEXT,
      stats_computed_at TIMESTAMP,
      stats_manual_fields TEXT,
      notes TEXT,
      venue TEXT,
      referee TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_modified_by INTEGER REFERENCES users(id)
    );

    -- Game events table (BORIS-tagged events)
    CREATE TABLE IF NOT EXISTS game_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_category TEXT,
      timestamp REAL,
      period INTEGER,
      minute INTEGER,
      second INTEGER,
      field_position TEXT,
      x_coordinate REAL,
      y_coordinate REAL,
      event_data TEXT,
      is_joga_team BOOLEAN DEFAULT 1,
      player_name TEXT,
      notes TEXT,
      tags TEXT,
      is_processed BOOLEAN DEFAULT 0,
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Images table (file system references)
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      width INTEGER,
      height INTEGER,
      match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id),
      description TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
    CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
    CREATE INDEX IF NOT EXISTS idx_team_aliases_alias ON team_aliases(alias);
    CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_matches_team_date ON matches(team_id, match_date);
    CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_events_match ON game_events(match_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON game_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_category ON game_events(event_category);
    CREATE INDEX IF NOT EXISTS idx_events_match_type ON game_events(match_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_events_processed ON game_events(is_processed);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON game_events(match_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_images_match ON images(match_id);
    CREATE INDEX IF NOT EXISTS idx_images_team ON images(team_id);
    `;
    
    // Clean up and split SQL statements
    // Remove comments and split by semicolon
    const cleanSQL = migrationSQL
      .split('\n')
      .map(line => {
        // Remove inline comments (but keep the line if it has SQL before the comment)
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          const beforeComment = line.substring(0, commentIndex).trim();
          return beforeComment;
        }
        return line.trim();
      })
      .filter(line => line.length > 0 && !line.startsWith('--'))
      .join(' ');

    // Split by semicolon and execute each statement individually
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Use prepare/run for individual statements (better error handling)
          sqliteDb.prepare(statement).run();
        } catch (error: any) {
          // Ignore "already exists" errors for tables and indexes
          const errorMsg = error?.message || '';
          if (!errorMsg.includes('already exists') && 
              !errorMsg.includes('duplicate') &&
              !errorMsg.includes('UNIQUE constraint failed')) {
            console.error('Migration statement failed:');
            console.error('Statement:', statement.substring(0, 200));
            console.error('Error:', errorMsg);
            throw error;
          }
          // Otherwise, silently continue (table/index already exists)
        }
      }
    }
    
    // Record migration
    await db
      .insertInto('schema_migrations')
      .values({
        version: 1,
        description: 'Initial schema - users, teams, matches, sessions',
      })
      .execute();
    
    console.log('✓ Migration 001 completed successfully');
  }

  console.log('All migrations completed!');
}
