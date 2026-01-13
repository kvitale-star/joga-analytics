import { db } from '../db/database.js';
import type { MatchesTable, GameEventsTable } from '../db/schema.js';

/**
 * Get all matches with optional filters
 */
export async function getMatches(filters?: {
  teamId?: number;
  opponentName?: string;
  startDate?: string;
  endDate?: string;
  competitionType?: string;
}) {
  let query = db
    .selectFrom('matches')
    .selectAll()
    .orderBy('match_date', 'desc')
    .orderBy('id', 'desc');

  if (filters?.teamId) {
    query = query.where('team_id', '=', filters.teamId);
  }

  if (filters?.opponentName) {
    query = query.where('opponent_name', 'like', `%${filters.opponentName}%`);
  }

  if (filters?.startDate) {
    query = query.where('match_date', '>=', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.where('match_date', '<=', filters.endDate);
  }

  if (filters?.competitionType) {
    query = query.where('competition_type', '=', filters.competitionType);
  }

  const matches = await query.execute();

  return matches.map(match => ({
    id: match.id,
    teamId: match.team_id,
    opponentName: match.opponent_name,
    matchDate: match.match_date,
    competitionType: match.competition_type,
    result: match.result,
    statsJson: match.stats_json ? JSON.parse(match.stats_json) : null,
    statsSource: match.stats_source,
    statsComputedAt: match.stats_computed_at ? new Date(match.stats_computed_at) : null,
    statsManualFields: match.stats_manual_fields ? JSON.parse(match.stats_manual_fields) : null,
    notes: match.notes,
    venue: match.venue,
    referee: match.referee,
    createdBy: match.created_by,
    createdAt: new Date(match.created_at),
    updatedAt: new Date(match.updated_at),
    lastModifiedBy: match.last_modified_by,
  }));
}

/**
 * Get match by ID
 */
export async function getMatchById(matchId: number) {
  const match = await db
    .selectFrom('matches')
    .selectAll()
    .where('id', '=', matchId)
    .executeTakeFirst();

  if (!match) return null;

  return {
    id: match.id,
    teamId: match.team_id,
    opponentName: match.opponent_name,
    matchDate: match.match_date,
    competitionType: match.competition_type,
    result: match.result,
    statsJson: match.stats_json ? JSON.parse(match.stats_json) : null,
    statsSource: match.stats_source,
    statsComputedAt: match.stats_computed_at ? new Date(match.stats_computed_at) : null,
    statsManualFields: match.stats_manual_fields ? JSON.parse(match.stats_manual_fields) : null,
    notes: match.notes,
    venue: match.venue,
    referee: match.referee,
    createdBy: match.created_by,
    createdAt: new Date(match.created_at),
    updatedAt: new Date(match.updated_at),
    lastModifiedBy: match.last_modified_by,
  };
}

/**
 * Create a new match
 */
export async function createMatch(
  matchData: {
    teamId?: number | null;
    opponentName: string;
    matchDate: string;
    competitionType?: string | null;
    result?: string | null;
    statsJson?: any;
    statsSource?: string | null;
    statsComputedAt?: string | null;
    statsManualFields?: any;
    notes?: string | null;
    venue?: string | null;
    referee?: string | null;
    createdBy?: number | null;
  }
) {
  const now = new Date().toISOString();

  const result = await db
    .insertInto('matches')
    .values({
      team_id: matchData.teamId || null,
      opponent_name: matchData.opponentName,
      match_date: matchData.matchDate,
      competition_type: matchData.competitionType || null,
      result: matchData.result || null,
      stats_json: matchData.statsJson ? JSON.stringify(matchData.statsJson) : null,
      stats_source: matchData.statsSource || null,
      stats_computed_at: matchData.statsComputedAt || null,
      stats_manual_fields: matchData.statsManualFields ? JSON.stringify(matchData.statsManualFields) : null,
      notes: matchData.notes || null,
      venue: matchData.venue || null,
      referee: matchData.referee || null,
      created_by: matchData.createdBy || null,
      created_at: now,
      updated_at: now,
      last_modified_by: matchData.createdBy || null,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return getMatchById(result.id);
}

/**
 * Update a match
 */
export async function updateMatch(
  matchId: number,
  updates: {
    teamId?: number | null;
    opponentName?: string;
    matchDate?: string;
    competitionType?: string | null;
    result?: string | null;
    statsJson?: any;
    statsSource?: string | null;
    statsComputedAt?: string | null;
    statsManualFields?: any;
    notes?: string | null;
    venue?: string | null;
    referee?: string | null;
    lastModifiedBy?: number | null;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.teamId !== undefined) updateData.team_id = updates.teamId;
  if (updates.opponentName !== undefined) updateData.opponent_name = updates.opponentName;
  if (updates.matchDate !== undefined) updateData.match_date = updates.matchDate;
  if (updates.competitionType !== undefined) updateData.competition_type = updates.competitionType;
  if (updates.result !== undefined) updateData.result = updates.result;
  if (updates.statsJson !== undefined) updateData.stats_json = updates.statsJson ? JSON.stringify(updates.statsJson) : null;
  if (updates.statsSource !== undefined) updateData.stats_source = updates.statsSource;
  if (updates.statsComputedAt !== undefined) updateData.stats_computed_at = updates.statsComputedAt;
  if (updates.statsManualFields !== undefined) updateData.stats_manual_fields = updates.statsManualFields ? JSON.stringify(updates.statsManualFields) : null;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.venue !== undefined) updateData.venue = updates.venue;
  if (updates.referee !== undefined) updateData.referee = updates.referee;
  if (updates.lastModifiedBy !== undefined) updateData.last_modified_by = updates.lastModifiedBy;

  await db
    .updateTable('matches')
    .set(updateData)
    .where('id', '=', matchId)
    .execute();

  return getMatchById(matchId);
}

/**
 * Delete a match
 */
export async function deleteMatch(matchId: number): Promise<void> {
  await db
    .deleteFrom('matches')
    .where('id', '=', matchId)
    .execute();
}

/**
 * Get game events for a match
 */
export async function getMatchEvents(matchId: number) {
  const events = await db
    .selectFrom('game_events')
    .selectAll()
    .where('match_id', '=', matchId)
    .orderBy('timestamp', 'asc')
    .execute();

  return events.map(event => ({
    id: event.id,
    matchId: event.match_id,
    eventType: event.event_type,
    eventCategory: event.event_category,
    timestamp: event.timestamp,
    period: event.period,
    minute: event.minute,
    second: event.second,
    fieldPosition: event.field_position,
    xCoordinate: event.x_coordinate,
    yCoordinate: event.y_coordinate,
    eventData: event.event_data ? JSON.parse(event.event_data) : null,
    isJogaTeam: Boolean(event.is_joga_team),
    playerName: event.player_name,
    notes: event.notes,
    tags: event.tags,
    isProcessed: Boolean(event.is_processed),
    processedAt: event.processed_at ? new Date(event.processed_at) : null,
    createdAt: new Date(event.created_at),
  }));
}

/**
 * Create a game event
 */
export async function createGameEvent(
  eventData: {
    matchId: number;
    eventType: string;
    eventCategory?: string | null;
    timestamp?: number | null;
    period?: number | null;
    minute?: number | null;
    second?: number | null;
    fieldPosition?: string | null;
    xCoordinate?: number | null;
    yCoordinate?: number | null;
    eventData?: any;
    isJogaTeam?: boolean;
    playerName?: string | null;
    notes?: string | null;
    tags?: string | null;
  }
) {
  const result = await db
    .insertInto('game_events')
    .values({
      match_id: eventData.matchId,
      event_type: eventData.eventType,
      event_category: eventData.eventCategory || null,
      timestamp: eventData.timestamp || null,
      period: eventData.period || null,
      minute: eventData.minute || null,
      second: eventData.second || null,
      field_position: eventData.fieldPosition || null,
      x_coordinate: eventData.xCoordinate || null,
      y_coordinate: eventData.yCoordinate || null,
      event_data: eventData.eventData ? JSON.stringify(eventData.eventData) : null,
      is_joga_team: eventData.isJogaTeam !== undefined ? (eventData.isJogaTeam ? 1 : 0) : 1,
      player_name: eventData.playerName || null,
      notes: eventData.notes || null,
      tags: eventData.tags || null,
      is_processed: 0,
      created_at: new Date().toISOString(),
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const event = await db
    .selectFrom('game_events')
    .selectAll()
    .where('id', '=', result.id)
    .executeTakeFirstOrThrow();

  return {
    id: event.id,
    matchId: event.match_id,
    eventType: event.event_type,
    eventCategory: event.event_category,
    timestamp: event.timestamp,
    period: event.period,
    minute: event.minute,
    second: event.second,
    fieldPosition: event.field_position,
    xCoordinate: event.x_coordinate,
    yCoordinate: event.y_coordinate,
    eventData: event.event_data ? JSON.parse(event.event_data) : null,
    isJogaTeam: Boolean(event.is_joga_team),
    playerName: event.player_name,
    notes: event.notes,
    tags: event.tags,
    isProcessed: Boolean(event.is_processed),
    processedAt: event.processed_at ? new Date(event.processed_at) : null,
    createdAt: new Date(event.created_at),
  };
}
