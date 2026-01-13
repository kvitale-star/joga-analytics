# Backend Setup with Kysely (Type-Safe Query Builder)

This guide shows how to set up your backend using Kysely, a type-safe SQL query builder.

## Why Kysely?

- ✅ **Type-safe**: TypeScript knows your query results
- ✅ **SQL-like**: Feels like writing SQL, but type-safe
- ✅ **Database agnostic**: Works with SQLite, MySQL, PostgreSQL
- ✅ **No magic**: You see the SQL it generates
- ✅ **Lightweight**: Not a full ORM, just a query builder

## Installation

```bash
cd backend
npm install kysely better-sqlite3
npm install -D @types/better-sqlite3
```

For MySQL later:
```bash
npm install mysql2  # When you migrate to MySQL
```

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── database.ts          # Kysely database instance
│   │   ├── schema.ts            # Database schema types
│   │   └── migrations.ts        # Migration runner
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── teams.ts
│   └── server.ts
└── package.json
```

## Database Schema Definition

**src/db/schema.ts:**
```typescript
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Define your database schema as TypeScript types
export interface Database {
  schema_migrations: SchemaMigrationsTable;
  seasons: SeasonsTable;
  teams: TeamsTable;
  team_aliases: TeamAliasesTable;
  users: UsersTable;
  user_teams: UserTeamsTable;
  sessions: SessionsTable;
  matches: MatchesTable;
  game_events: GameEventsTable;
  images: ImagesTable;
}

// Schema Migrations
export interface SchemaMigrationsTable {
  version: number;
  applied_at: string;
  description: string;
}

// Seasons
export interface SeasonsTable {
  id: Generated<number>;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: Generated<number>;
  created_at: Generated<string>;
}

// Teams
export interface TeamsTable {
  id: Generated<number>;
  display_name: string;
  slug: string;
  metadata: string; // JSON stored as string
  season_id: number | null;
  parent_team_id: number | null;
  is_active: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// Team Aliases
export interface TeamAliasesTable {
  id: Generated<number>;
  team_id: number;
  alias: string;
  created_at: Generated<string>;
}

// Users
export interface UsersTable {
  id: Generated<number>;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'coach' | 'viewer';
  email_verified: Generated<number>;
  email_verification_token: string | null;
  email_verification_sent_at: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  preferences: string; // JSON stored as string
  is_active: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  last_login_at: string | null;
}

// User Teams (many-to-many)
export interface UserTeamsTable {
  user_id: number;
  team_id: number;
  assigned_at: Generated<string>;
  assigned_by: number | null;
}

// Sessions
export interface SessionsTable {
  id: string;
  user_id: number;
  expires_at: string;
  last_activity_at: Generated<string>;
  created_at: Generated<string>;
}

// Matches
export interface MatchesTable {
  id: Generated<number>;
  team_id: number | null;
  opponent_name: string;
  match_date: string;
  competition_type: string | null;
  result: string | null;
  stats_json: string | null; // JSON stored as string
  stats_source: string | null;
  stats_computed_at: string | null;
  stats_manual_fields: string | null; // JSON stored as string
  notes: string | null;
  venue: string | null;
  referee: string | null;
  created_by: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  last_modified_by: number | null;
}

// Game Events
export interface GameEventsTable {
  id: Generated<number>;
  match_id: number;
  event_type: string;
  event_category: string | null;
  timestamp: number | null;
  period: number | null;
  minute: number | null;
  second: number | null;
  field_position: string | null;
  x_coordinate: number | null;
  y_coordinate: number | null;
  event_data: string | null; // JSON stored as string
  is_joga_team: Generated<number>;
  player_name: string | null;
  notes: string | null;
  tags: string | null;
  is_processed: Generated<number>;
  processed_at: string | null;
  created_at: Generated<string>;
}

// Images
export interface ImagesTable {
  id: Generated<number>;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  match_id: number | null;
  team_id: number | null;
  description: string | null;
  uploaded_by: number | null;
  created_at: Generated<string>;
}

// Helper types for inserts/updates
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type Team = Selectable<TeamsTable>;
export type NewTeam = Insertable<TeamsTable>;
export type TeamUpdate = Updateable<TeamsTable>;

export type Match = Selectable<MatchesTable>;
export type NewMatch = Insertable<MatchesTable>;
export type MatchUpdate = Updateable<MatchesTable>;
```

## Database Connection

**src/db/database.ts:**
```typescript
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

// Create SQLite database
const sqliteDb = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
sqliteDb.pragma('foreign_keys = ON');
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('synchronous = NORMAL');

// Create Kysely instance
export const db = new Kysely<AppDatabase>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
});

// Helper to get database instance (for compatibility)
export function getDatabase() {
  return db;
}
```

## Example: Refactored Auth Service

**src/services/authService.ts:**
```typescript
import { db } from '../db/database.js';
import type { UsersTable } from '../db/schema.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;
const SESSION_ID_LENGTH = 32;

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Get user by ID (clean with Kysely!)
export async function getUserById(userId: number) {
  const user = await db
    .selectFrom('users')
    .select([
      'id',
      'email',
      'name',
      'role',
      'email_verified',
      'preferences',
      'is_active',
      'created_at',
      'updated_at',
      'last_login_at',
    ])
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) return null;

  // Map database row to your app's User type
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}

// Get user by email (with password hash)
export async function getUserByEmailForAuth(email: string) {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email.toLowerCase().trim())
    .executeTakeFirst();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    passwordHash: user.password_hash,
    emailVerified: Boolean(user.email_verified),
    emailVerificationToken: user.email_verification_token,
    emailVerificationSentAt: user.email_verification_sent_at
      ? new Date(user.email_verification_sent_at)
      : null,
    passwordResetToken: user.password_reset_token,
    passwordResetExpires: user.password_reset_expires
      ? new Date(user.password_reset_expires)
      : null,
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}

// Create user
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'coach' | 'viewer'
) {
  const passwordHash = await hashPassword(password);
  const emailVerificationToken = generateToken();
  const now = new Date().toISOString();

  const result = await db
    .insertInto('users')
    .values({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
      email_verified: role === 'admin' ? 1 : 0,
      email_verification_token: emailVerificationToken,
      email_verification_sent_at: role === 'admin' ? null : now,
      preferences: JSON.stringify({}),
      is_active: 1,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return getUserById(result.id);
}

// Login
export async function login(email: string, password: string) {
  const user = await getUserByEmailForAuth(email);

  if (!user || !user.isActive) {
    return null;
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified. Please check your email and verify your account.');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await db
    .updateTable('users')
    .set({ last_login_at: new Date().toISOString() })
    .where('id', '=', user.id)
    .execute();

  // Create session
  const sessionId = generateToken(SESSION_ID_LENGTH);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .execute();

  // Return user without sensitive data
  const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;

  return {
    user: safeUser,
    session: {
      id: sessionId,
      userId: user.id,
      expiresAt,
      lastActivityAt: new Date(),
      createdAt: new Date(),
    },
  };
}

// Create session
export async function createSession(userId: number) {
  const sessionId = generateToken(SESSION_ID_LENGTH);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      last_activity_at: now.toISOString(),
    })
    .execute();

  return {
    id: sessionId,
    userId,
    expiresAt,
    lastActivityAt: now,
    createdAt: now,
  };
}

// Get session
export async function getSession(sessionId: string) {
  const session = await db
    .selectFrom('sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .where('expires_at', '>', new Date().toISOString())
    .executeTakeFirst();

  if (!session) return null;

  // Update last activity
  await db
    .updateTable('sessions')
    .set({ last_activity_at: new Date().toISOString() })
    .where('id', '=', sessionId)
    .execute();

  return {
    id: session.id,
    userId: session.user_id,
    expiresAt: new Date(session.expires_at),
    lastActivityAt: new Date(session.last_activity_at),
    createdAt: new Date(session.created_at),
  };
}

// Delete session
export async function deleteSession(sessionId: string) {
  await db
    .deleteFrom('sessions')
    .where('id', '=', sessionId)
    .execute();
}

// Delete all user sessions
export async function deleteUserSessions(userId: number) {
  await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .execute();
}

// Verify email
export async function verifyEmail(token: string): Promise<boolean> {
  const result = await db
    .updateTable('users')
    .set({
      email_verified: 1,
      email_verification_token: null,
    })
    .where('email_verification_token', '=', token)
    .execute();

  return result.numUpdatedRows > 0;
}

// Generate password reset token
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email.toLowerCase().trim())
    .where('is_active', '=', 1)
    .executeTakeFirst();

  if (!user) return null; // Don't reveal if user exists

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .updateTable('users')
    .set({
      password_reset_token: token,
      password_reset_expires: expiresAt.toISOString(),
    })
    .where('id', '=', user.id)
    .execute();

  return token;
}

// Reset password
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const user = await db
    .selectFrom('users')
    .select('id')
    .where('password_reset_token', '=', token)
    .where('password_reset_expires', '>', new Date().toISOString())
    .where('is_active', '=', 1)
    .executeTakeFirst();

  if (!user) return false;

  const passwordHash = await hashPassword(newPassword);

  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', user.id)
    .execute();

  // Delete all existing sessions (force re-login)
  await deleteUserSessions(user.id);

  return true;
}

// Change password
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await db
    .selectFrom('users')
    .select('password_hash')
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .updateTable('users')
    .set({
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', userId)
    .execute();
}

// Update user preferences
export async function updateUserPreferences(
  userId: number,
  preferences: Record<string, any>
): Promise<void> {
  await db
    .updateTable('users')
    .set({
      preferences: JSON.stringify(preferences),
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', userId)
    .execute();
}

// Check if users exist
export async function hasUsers(): Promise<boolean> {
  const result = await db
    .selectFrom('users')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirst();

  return (result?.count as number || 0) > 0;
}
```

## Example: User Service with Kysely

**src/services/userService.ts:**
```typescript
import { db } from '../db/database.js';
import type { UsersTable } from '../db/schema.js';
import { hashPassword } from './authService.js';

// Get all users
export async function getAllUsers() {
  const users = await db
    .selectFrom('users')
    .select([
      'id',
      'email',
      'name',
      'role',
      'email_verified',
      'preferences',
      'is_active',
      'created_at',
      'updated_at',
      'last_login_at',
    ])
    .orderBy('created_at', 'desc')
    .execute();

  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  }));
}

// Update user
export async function updateUser(
  userId: number,
  updates: {
    name?: string;
    email?: string;
    role?: 'admin' | 'coach' | 'viewer';
    isActive?: boolean;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email.toLowerCase().trim();
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

  await db
    .updateTable('users')
    .set(updateData)
    .where('id', '=', userId)
    .execute();
}

// Delete user
export async function deleteUser(userId: number) {
  await db
    .deleteFrom('users')
    .where('id', '=', userId)
    .execute();
}

// Create user (admin)
export async function createUserByAdmin(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'coach' | 'viewer'
) {
  const passwordHash = await hashPassword(password);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  const result = await db
    .insertInto('users')
    .values({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
      email_verified: role === 'admin' ? 1 : 0,
      email_verification_token: emailVerificationToken,
      email_verification_sent_at: role === 'admin' ? null : now,
      preferences: JSON.stringify({}),
      is_active: 1,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  // Return the created user
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', result.id)
    .executeTakeFirstOrThrow();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}

// Reset user password (admin)
export async function resetUserPassword(userId: number, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);

  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', userId)
    .execute();

  // Delete all existing sessions (force re-login)
  await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .execute();
}
```

## Example: Team Service with Kysely

**src/services/teamService.ts:**
```typescript
import { db } from '../db/database.js';
import type { TeamsTable } from '../db/schema.js';

// Get all teams
export async function getAllTeams() {
  const teams = await db
    .selectFrom('teams')
    .selectAll()
    .orderBy('display_name', 'asc')
    .execute();

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

// Get teams assigned to user
export async function getUserTeams(userId: number) {
  const teams = await db
    .selectFrom('teams')
    .innerJoin('user_teams', 'teams.id', 'user_teams.team_id')
    .selectAll('teams')
    .where('user_teams.user_id', '=', userId)
    .orderBy('teams.display_name', 'asc')
    .execute();

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

// Assign team to user
export async function assignTeamToUser(
  userId: number,
  teamId: number,
  assignedBy: number
) {
  try {
    await db
      .insertInto('user_teams')
      .values({
        user_id: userId,
        team_id: teamId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
      })
      .execute();
  } catch (error: any) {
    // Ignore if already assigned (unique constraint)
    if (!error?.message?.includes('UNIQUE constraint')) {
      throw error;
    }
  }
}

// Remove team from user
export async function removeTeamFromUser(userId: number, teamId: number) {
  await db
    .deleteFrom('user_teams')
    .where('user_id', '=', userId)
    .where('team_id', '=', teamId)
    .execute();
}

// Get user team assignments
export async function getUserTeamAssignments(userId: number): Promise<number[]> {
  const assignments = await db
    .selectFrom('user_teams')
    .select('team_id')
    .where('user_id', '=', userId)
    .execute();

  return assignments.map(a => a.team_id);
}
```

## Migrations with Kysely

**src/db/migrations.ts:**
```typescript
import { db } from './database.js';
import { sql } from 'kysely';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
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

  const version = currentVersion?.version || 0;

  // Run migration 001 if needed
  if (version < 1) {
    console.log('Running migration 001...');
    
    // Read SQL from your existing migration file
    const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the SQL (Kysely can execute raw SQL)
    await sql.raw(migrationSQL).execute(db);
    
    // Record migration
    await db
      .insertInto('schema_migrations')
      .values({
        version: 1,
        description: 'Initial schema - users, teams, matches, sessions',
      })
      .execute();
    
    console.log('Migration 001 completed');
  }
}
```

## Benefits You'll See

1. **Type Safety:**
   ```typescript
   // TypeScript knows the exact return type!
   const user = await db.selectFrom('users').selectAll().where('id', '=', 1).executeTakeFirst();
   // user is typed as UsersTable | undefined
   ```

2. **Cleaner Code:**
   ```typescript
   // Before: Raw SQL string
   await execute(db, 'UPDATE users SET name = ? WHERE id = ?', [name, id]);
   
   // After: Type-safe query builder
   await db.updateTable('users').set({ name }).where('id', '=', id).execute();
   ```

3. **Better Refactoring:**
   - Change column name? TypeScript will show all places that need updating
   - Add new column? TypeScript will remind you to update queries

4. **SQL Injection Protection:**
   - Built-in parameterization
   - No need to manually escape values

## Next Steps

1. Install Kysely: `npm install kysely better-sqlite3`
2. Create schema.ts with your database types
3. Update database.ts to use Kysely
4. Refactor services one at a time
5. Test thoroughly

The code will be much cleaner and type-safe!
