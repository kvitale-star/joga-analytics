import { db, getSqliteDb, isPostgres } from './database.js';
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
  if (isPostgres) {
    await runPostgresMigrations();
    return;
  }

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
          getSqliteDb().prepare(statement).run();
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
        applied_at: new Date().toISOString(),
      })
      .execute();
    
    console.log('✓ Migration 001 completed successfully');
  }

  // Run migration 002 if needed - Add email_verification_expires column
  if (version < 2) {
    console.log('Running migration 002: Add email_verification_expires column...');
    
    try {
      // Add email_verification_expires column to users table
      getSqliteDb().prepare(`
        ALTER TABLE users 
        ADD COLUMN email_verification_expires TIMESTAMP
      `).run();
      
      // Set expiry for existing unverified tokens (7 days from now)
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      getSqliteDb().prepare(`
        UPDATE users 
        SET email_verification_expires = ?
        WHERE email_verification_token IS NOT NULL 
        AND email_verified = 0
        AND email_verification_expires IS NULL
      `).run(sevenDaysFromNow);
      
      // Record migration
      await db
        .insertInto('schema_migrations')
        .values({
          version: 2,
          description: 'Add email_verification_expires column for token expiry',
          applied_at: new Date().toISOString(),
        })
        .execute();
      
      console.log('✓ Migration 002 completed successfully');
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (errorMsg.includes('duplicate column name') || errorMsg.includes('already exists')) {
        console.log('Column already exists, skipping...');
        // Record migration anyway to mark it as applied
        try {
          await db
            .insertInto('schema_migrations')
            .values({
              version: 2,
              description: 'Add email_verification_expires column for token expiry',
              applied_at: new Date().toISOString(),
            })
            .execute();
        } catch (e) {
          // Migration already recorded, ignore
        }
      } else {
        console.error('Migration 002 failed:', errorMsg);
        throw error;
      }
    }
  }

  // Run migration 003 if needed - Add structured team fields for season/year-based teams
  if (version < 3) {
    console.log('Running migration 003: Add structured team fields...');

    try {
      // Teams: add required structured fields (nullable initially for backfill)
      // Note: SQLite supports adding columns but not altering constraints easily.
      // We'll add columns as nullable, then enforce in app-level validation.
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN gender TEXT
      `).run();
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN level TEXT
      `).run();
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN variant TEXT DEFAULT 'volt'
      `).run();
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN birth_year_start INTEGER
      `).run();
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN birth_year_end INTEGER
      `).run();

      // Seasons: ensure name is treated as year label (no schema change, but index helps lookup)
      // Add index on seasons.name for fast year lookup
      try {
        getSqliteDb().prepare(`
          CREATE INDEX IF NOT EXISTS idx_seasons_name ON seasons(name)
        `).run();
      } catch {
        // ignore if unsupported
      }

      // Optional: backfill variant for existing rows that may have NULL
      getSqliteDb().prepare(`
        UPDATE teams SET variant = 'volt' WHERE variant IS NULL OR variant = ''
      `).run();

      // Record migration
      await db
        .insertInto('schema_migrations')
        .values({
          version: 3,
          description: 'Add structured team fields (gender, level, variant, birth year range) and season name index',
          applied_at: new Date().toISOString(),
        })
        .execute();

      console.log('✓ Migration 003 completed successfully');
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (
        errorMsg.includes('duplicate column name') ||
        errorMsg.includes('already exists')
      ) {
        console.log('One or more columns already exist, skipping...');
        // Record migration anyway to mark it as applied
        try {
          await db
            .insertInto('schema_migrations')
            .values({
              version: 3,
              description:
                'Add structured team fields (gender, level, variant, birth year range) and season name index',
              applied_at: new Date().toISOString(),
            })
            .execute();
        } catch {
          // Migration already recorded, ignore
        }
      } else {
        console.error('Migration 003 failed:', errorMsg);
        throw error;
      }
    }
  }

  // Run migration 004 if needed - Add age_group field to teams
  if (version < 4) {
    console.log('Running migration 004: Add age_group field to teams...');

    try {
      // Add age_group column to teams table (nullable, informational only)
      getSqliteDb().prepare(`
        ALTER TABLE teams ADD COLUMN age_group TEXT
      `).run();

      // Record migration
      await db
        .insertInto('schema_migrations')
        .values({
          version: 4,
          description: 'Add age_group field for flexible age group display (month range or single year)',
          applied_at: new Date().toISOString(),
        })
        .execute();

      console.log('✓ Migration 004 completed successfully');
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (
        errorMsg.includes('duplicate column name') ||
        errorMsg.includes('already exists')
      ) {
        console.log('Column already exists, skipping...');
        // Record migration anyway to mark it as applied
        try {
          await db
            .insertInto('schema_migrations')
            .values({
              version: 4,
              description: 'Add age_group field for flexible age group display (month range or single year)',
              applied_at: new Date().toISOString(),
            })
            .execute();
        } catch {
          // Migration already recorded, ignore
        }
      } else {
        console.error('Migration 004 failed:', errorMsg);
        throw error;
      }
    }
  }

  // Run migration 005 if needed - Add metric_definitions table for glossary
  if (version < 5) {
    console.log('Running migration 005: Add metric_definitions table...');

    try {
      // Create metric_definitions table
      getSqliteDb().prepare(`
        CREATE TABLE IF NOT EXISTS metric_definitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_name TEXT NOT NULL UNIQUE,
          category TEXT,
          description TEXT,
          units TEXT,
          calculation TEXT,
          notes TEXT,
          example TEXT,
          data_type TEXT,
          availability TEXT,
          source TEXT DEFAULT 'google_sheets',
          last_synced_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Create indexes
      getSqliteDb().prepare(`
        CREATE INDEX IF NOT EXISTS idx_metric_definitions_category ON metric_definitions(category)
      `).run();
      getSqliteDb().prepare(`
        CREATE INDEX IF NOT EXISTS idx_metric_definitions_name ON metric_definitions(metric_name)
      `).run();

      // Record migration
      await db
        .insertInto('schema_migrations')
        .values({
          version: 5,
          description: 'Add metric_definitions table for glossary feature',
          applied_at: new Date().toISOString(),
        })
        .execute();

      console.log('✓ Migration 005 completed successfully');
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (
        errorMsg.includes('duplicate column name') ||
        errorMsg.includes('already exists')
      ) {
        console.log('Table already exists, skipping...');
        // Record migration anyway to mark it as applied
        try {
          await db
            .insertInto('schema_migrations')
            .values({
              version: 5,
              description: 'Add metric_definitions table for glossary feature',
              applied_at: new Date().toISOString(),
            })
            .execute();
        } catch {
          // Migration already recorded, ignore
        }
      } else {
        console.error('Migration 005 failed:', errorMsg);
        throw error;
      }
    }
  }

  // Run migration 006 if needed - Add custom_charts table for Phase 1 Custom Charts
  if (version < 6) {
    console.log('Running migration 006: Add custom_charts table...');

    try {
      // Create custom_charts table
      getSqliteDb().prepare(`
        CREATE TABLE IF NOT EXISTS custom_charts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          chart_type TEXT NOT NULL CHECK(chart_type IN ('line', 'bar', 'area', 'scatter')),
          config_json TEXT NOT NULL,
          is_public BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        )
      `).run();

      // Create indexes
      getSqliteDb().prepare(`
        CREATE INDEX IF NOT EXISTS idx_custom_charts_user_id ON custom_charts(user_id)
      `).run();
      getSqliteDb().prepare(`
        CREATE INDEX IF NOT EXISTS idx_custom_charts_chart_type ON custom_charts(chart_type)
      `).run();

      // Record migration
      await db
        .insertInto('schema_migrations')
        .values({
          version: 6,
          description: 'Add custom_charts table for Phase 1 Custom Charts feature',
          applied_at: new Date().toISOString(),
        })
        .execute();

      console.log('✓ Migration 006 completed successfully');
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (
        errorMsg.includes('duplicate column name') ||
        errorMsg.includes('already exists')
      ) {
        console.log('Table already exists, skipping...');
        // Record migration anyway to mark it as applied
        try {
          await db
            .insertInto('schema_migrations')
            .values({
              version: 6,
              description: 'Add custom_charts table for Phase 1 Custom Charts feature',
              applied_at: new Date().toISOString(),
            })
            .execute();
        } catch {
          // Migration already recorded, ignore
        }
      } else {
        console.error('Migration 006 failed:', errorMsg);
        throw error;
      }
    }
  }

  console.log('All migrations completed!');
}

async function runPostgresMigrations(): Promise<void> {
  // Create migrations table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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

  if (version < 1) {
    console.log('Running migration 001 (Postgres): Initial schema...');

    // Core tables
    await sql`
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        display_name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        metadata TEXT,
        season_id INTEGER REFERENCES seasons(id),
        parent_team_id INTEGER REFERENCES teams(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS team_aliases (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, alias)
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'viewer')),
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token TEXT,
        email_verification_sent_at TIMESTAMPTZ,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMPTZ,
        preferences TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMPTZ
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        PRIMARY KEY (user_id, team_id)
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id),
        opponent_name TEXT NOT NULL,
        match_date DATE NOT NULL,
        competition_type TEXT,
        result TEXT,
        stats_json TEXT,
        stats_source TEXT,
        stats_computed_at TIMESTAMPTZ,
        stats_manual_fields TEXT,
        notes TEXT,
        venue TEXT,
        referee TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_modified_by INTEGER REFERENCES users(id)
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_category TEXT,
        timestamp DOUBLE PRECISION,
        period INTEGER,
        minute INTEGER,
        second INTEGER,
        field_position TEXT,
        x_coordinate DOUBLE PRECISION,
        y_coordinate DOUBLE PRECISION,
        event_data TEXT,
        is_joga_team BOOLEAN DEFAULT TRUE,
        player_name TEXT,
        notes TEXT,
        tags TEXT,
        is_processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_team_aliases_alias ON team_aliases(alias)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_team_date ON matches(team_id, match_date)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_match ON game_events(match_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_type ON game_events(event_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_category ON game_events(event_category)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_match_type ON game_events(match_id, event_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_processed ON game_events(is_processed)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON game_events(match_id, timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_images_match ON images(match_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_images_team ON images(team_id)`.execute(db);

    await db
      .insertInto('schema_migrations')
      .values({
        version: 1,
        description: 'Initial schema - users, teams, matches, sessions',
        applied_at: new Date().toISOString(),
      })
      .execute();

    console.log('✓ Migration 001 (Postgres) completed successfully');
  }

  if (version < 2) {
    console.log('Running migration 002 (Postgres): Add email_verification_expires column...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ`.execute(db);
    await db
      .insertInto('schema_migrations')
      .values({
        version: 2,
        description: 'Add email_verification_expires column for token expiry',
        applied_at: new Date().toISOString(),
      })
      .execute();
    console.log('✓ Migration 002 (Postgres) completed successfully');
  }

  if (version < 3) {
    console.log('Running migration 003 (Postgres): Add structured team fields...');
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender TEXT`.execute(db);
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS level TEXT`.execute(db);
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'volt'`.execute(db);
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS birth_year_start INTEGER`.execute(db);
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS birth_year_end INTEGER`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_seasons_name ON seasons(name)`.execute(db);
    await sql`UPDATE teams SET variant = 'volt' WHERE variant IS NULL OR variant = ''`.execute(db);
    await db
      .insertInto('schema_migrations')
      .values({
        version: 3,
        description: 'Add structured team fields (gender, level, variant, birth year range) and season name index',
        applied_at: new Date().toISOString(),
      })
      .execute();
    console.log('✓ Migration 003 (Postgres) completed successfully');
  }

  if (version < 4) {
    console.log('Running migration 004 (Postgres): Add age_group field to teams...');
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS age_group TEXT`.execute(db);
    await db
      .insertInto('schema_migrations')
      .values({
        version: 4,
        description: 'Add age_group field for flexible age group display (month range or single year)',
        applied_at: new Date().toISOString(),
      })
      .execute();
    console.log('✓ Migration 004 (Postgres) completed successfully');
  }

  if (version < 5) {
    console.log('Running migration 005 (Postgres): Add metric_definitions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS metric_definitions (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        metric_name TEXT NOT NULL UNIQUE,
        category TEXT,
        description TEXT,
        units TEXT,
        calculation TEXT,
        notes TEXT,
        example TEXT,
        data_type TEXT,
        availability TEXT,
        source TEXT DEFAULT 'google_sheets',
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_metric_definitions_category ON metric_definitions(category)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_metric_definitions_name ON metric_definitions(metric_name)`.execute(db);
    await db
      .insertInto('schema_migrations')
      .values({
        version: 5,
        description: 'Add metric_definitions table for glossary feature',
        applied_at: new Date().toISOString(),
      })
      .execute();
    console.log('✓ Migration 005 (Postgres) completed successfully');
  }

  if (version < 6) {
    console.log('Running migration 006 (Postgres): Add custom_charts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS custom_charts (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL CHECK (chart_type IN ('line', 'bar', 'area', 'scatter')),
        config_json TEXT NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_charts_user_id ON custom_charts(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_charts_chart_type ON custom_charts(chart_type)`.execute(db);
    await db
      .insertInto('schema_migrations')
      .values({
        version: 6,
        description: 'Add custom_charts table for Phase 1 Custom Charts feature',
        applied_at: new Date().toISOString(),
      })
      .execute();
    console.log('✓ Migration 006 (Postgres) completed successfully');
  }

  console.log('All migrations completed!');
}
