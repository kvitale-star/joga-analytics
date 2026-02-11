import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Database schema definition for Kysely
 * This defines the structure of your database tables as TypeScript types
 */

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
  metric_definitions: MetricDefinitionsTable;
  custom_charts: CustomChartsTable;
  insights: InsightsTable;
  training_focus_tags: TrainingFocusTagsTable;
  training_logs: TrainingLogsTable;
  ai_context_cache: AIContextCacheTable;
  recommendations: RecommendationsTable;
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
  gender: string | null;
  level: string | null;
  variant: string | null;
  birth_year_start: number | null;
  birth_year_end: number | null;
  age_group: string | null;
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
  email_verification_expires: string | null;
  email_verification_sent_at: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  preferences: string; // JSON stored as string
  is_active: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  last_login_at: string | null;
}

// User Teams (many-to-many junction table)
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
  is_home: boolean | null;
  match_id_external: string | null; // External Match ID (e.g., from Google Sheets: "M10001")
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

// Metric Definitions (for Glossary)
export interface MetricDefinitionsTable {
  id: Generated<number>;
  metric_name: string;
  category: string | null;
  description: string | null;
  units: string | null;
  calculation: string | null;
  notes: string | null;
  example: string | null;
  data_type: string | null;
  availability: string | null;
  source: string;
  last_synced_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// Custom Charts
export interface CustomChartsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  description: string | null;
  chart_type: 'line' | 'bar' | 'area' | 'scatter';
  config_json: string; // JSON stored as string
  is_public: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// Helper types for common operations
export type UserRow = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type TeamRow = Selectable<TeamsTable>;
export type NewTeam = Insertable<TeamsTable>;
export type TeamUpdate = Updateable<TeamsTable>;

export type MatchRow = Selectable<MatchesTable>;
export type NewMatch = Insertable<MatchesTable>;
export type MatchUpdate = Updateable<MatchesTable>;

export type SessionRow = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;

export type CustomChartRow = Selectable<CustomChartsTable>;
export type NewCustomChart = Insertable<CustomChartsTable>;
export type CustomChartUpdate = Updateable<CustomChartsTable>;

// Insights
export interface InsightsTable {
  id: Generated<number>;
  team_id: number;
  match_id: number | null;
  season_id: number | null;
  insight_type: 'anomaly' | 'trend' | 'half_split' | 'correlation' | 'benchmark';
  category: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  severity: number;
  title: string;
  detail_json: string;   // JSON stored as string
  narrative: string | null;
  is_read: Generated<boolean>;
  is_dismissed: Generated<boolean>;
  expires_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type InsightRow = Selectable<InsightsTable>;
export type NewInsight = Insertable<InsightsTable>;
export type InsightUpdate = Updateable<InsightsTable>;

// Training Focus Tags
export interface TrainingFocusTagsTable {
  id: Generated<number>;
  name: string;
  category: string;
  display_name: string;
  sort_order: Generated<number>;
  is_active: Generated<boolean>;
}

// Training Logs
export interface TrainingLogsTable {
  id: Generated<number>;
  team_id: number;
  user_id: number;
  session_date: string;
  session_type: string;
  focus_tags: string;       // JSON array stored as string
  notes: string | null;
  insight_id: number | null;
  recommendation_id: number | null;
  duration_minutes: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type TrainingFocusTagRow = Selectable<TrainingFocusTagsTable>;
export type NewTrainingFocusTag = Insertable<TrainingFocusTagsTable>;
export type TrainingFocusTagUpdate = Updateable<TrainingFocusTagsTable>;

export type TrainingLogRow = Selectable<TrainingLogsTable>;
export type NewTrainingLog = Insertable<TrainingLogsTable>;
export type TrainingLogUpdate = Updateable<TrainingLogsTable>;

// AI Context Cache
export interface AIContextCacheTable {
  id: Generated<number>;
  team_id: number;
  cache_type: 'combined' | 'framework_only' | 'data_only';
  cache_id: string; // Gemini's cachedContent name
  data_hash: string; // Hash of match data to detect changes
  expires_at: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type AIContextCacheRow = Selectable<AIContextCacheTable>;
export type NewAIContextCache = Insertable<AIContextCacheTable>;
export type AIContextCacheUpdate = Updateable<AIContextCacheTable>;

// Recommendations
export interface RecommendationsTable {
  id: Generated<number>;
  team_id: number;
  insight_id: number | null;
  recommendation_type: 'tactical' | 'training' | 'general';
  category: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  action_items: string | null; // JSON array
  training_plan_json: string | null; // JSON object
  framework_alignment: string | null;
  club_philosophy_alignment: string | null;
  is_applied: Generated<boolean>;
  applied_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type RecommendationRow = Selectable<RecommendationsTable>;
export type NewRecommendation = Insertable<RecommendationsTable>;
export type RecommendationUpdate = Updateable<RecommendationsTable>;
