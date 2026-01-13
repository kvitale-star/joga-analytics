/**
 * Migration 001: Initial schema
 * Creates all base tables for users, teams, matches, sessions, etc.
 */

export const migration = {
  version: 1,
  description: 'Initial schema - users, teams, matches, sessions',
  up: `
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
      metadata TEXT, -- JSON: flexible team info (gender, age_group, variant, etc.)
      season_id INTEGER REFERENCES seasons(id),
      parent_team_id INTEGER REFERENCES teams(id), -- For continuity across seasons
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
      preferences TEXT, -- JSON
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
      competition_type TEXT, -- "League", "Friendly", "Tournament"
      result TEXT, -- "W", "L", "D", or score like "3-1"
      stats_json TEXT, -- JSON object with all metrics
      stats_source TEXT, -- "manual", "computed", "mixed"
      stats_computed_at TIMESTAMP,
      stats_manual_fields TEXT, -- JSON array of manually overridden fields
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
      event_type TEXT NOT NULL, -- "shot", "possession_string", "pass", etc.
      event_category TEXT, -- "shooting", "possession", "defensive", etc.
      timestamp REAL, -- Seconds into the match
      period INTEGER, -- 1 (first half), 2 (second half), etc.
      minute INTEGER,
      second INTEGER,
      field_position TEXT, -- "inside_box", "outside_box", etc.
      x_coordinate REAL,
      y_coordinate REAL,
      event_data TEXT, -- JSON: flexible data for different event types
      is_joga_team BOOLEAN DEFAULT 1,
      player_name TEXT,
      notes TEXT,
      tags TEXT, -- Comma-separated tags
      is_processed BOOLEAN DEFAULT 0,
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Images table (file system references)
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER, -- bytes
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
    -- Note: sql.js may not support IF NOT EXISTS for indexes, so we'll catch errors
    CREATE INDEX idx_teams_season ON teams(season_id);
    CREATE INDEX idx_teams_active ON teams(is_active);
    CREATE INDEX idx_team_aliases_alias ON team_aliases(alias);
    CREATE INDEX idx_user_teams_user ON user_teams(user_id);
    CREATE INDEX idx_user_teams_team ON user_teams(team_id);
    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX idx_matches_team_date ON matches(team_id, match_date);
    CREATE INDEX idx_matches_date ON matches(match_date);
    CREATE INDEX idx_events_match ON game_events(match_id);
    CREATE INDEX idx_events_type ON game_events(event_type);
    CREATE INDEX idx_events_category ON game_events(event_category);
    CREATE INDEX idx_events_match_type ON game_events(match_id, event_type);
    CREATE INDEX idx_events_processed ON game_events(is_processed);
    CREATE INDEX idx_events_timestamp ON game_events(match_id, timestamp);
    CREATE INDEX idx_images_match ON images(match_id);
    CREATE INDEX idx_images_team ON images(team_id);
  `,
  down: `
    -- Drop in reverse order (respecting foreign keys)
    DROP INDEX IF EXISTS idx_images_team;
    DROP INDEX IF EXISTS idx_images_match;
    DROP INDEX IF EXISTS idx_events_timestamp;
    DROP INDEX IF EXISTS idx_events_processed;
    DROP INDEX IF EXISTS idx_events_match_type;
    DROP INDEX IF EXISTS idx_events_category;
    DROP INDEX IF EXISTS idx_events_type;
    DROP INDEX IF EXISTS idx_events_match;
    DROP INDEX IF EXISTS idx_matches_date;
    DROP INDEX IF EXISTS idx_matches_team_date;
    DROP INDEX IF EXISTS idx_sessions_expires;
    DROP INDEX IF EXISTS idx_sessions_user;
    DROP INDEX IF EXISTS idx_user_teams_team;
    DROP INDEX IF EXISTS idx_user_teams_user;
    DROP INDEX IF EXISTS idx_team_aliases_alias;
    DROP INDEX IF EXISTS idx_teams_active;
    DROP INDEX IF EXISTS idx_teams_season;
    
    DROP TABLE IF EXISTS images;
    DROP TABLE IF EXISTS game_events;
    DROP TABLE IF EXISTS matches;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS user_teams;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS team_aliases;
    DROP TABLE IF EXISTS teams;
    DROP TABLE IF EXISTS seasons;
    DROP TABLE IF EXISTS schema_migrations;
  `
};

