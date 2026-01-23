import { db } from '../../db/database.js';

/**
 * Create a test team
 */
export async function createTestTeam(
  displayName?: string,
  slug?: string,
  metadata?: Record<string, any>,
  seasonId?: number | null,
  parentTeamId?: number | null,
  isActive: boolean = true
) {
  const timestamp = Date.now();
  const testDisplayName = displayName || `Test Team ${timestamp}`;
  const testSlug = slug || `test-team-${timestamp}`;
  
  // Default structured fields for new schema
  const defaultGender = 'boys';
  const defaultLevel = 'U13';
  const defaultVariant = 'volt';
  const defaultBirthYearStart = 2013;
  const defaultBirthYearEnd = 2014;
  
  const now = new Date().toISOString();
  let result;
  try {
    result = await db
      .insertInto('teams')
      .values({
        display_name: testDisplayName,
        slug: testSlug,
        metadata: JSON.stringify(metadata || {}),
        season_id: seasonId || null,
        parent_team_id: parentTeamId || null,
        gender: defaultGender,
        level: defaultLevel,
        variant: defaultVariant,
        birth_year_start: defaultBirthYearStart,
        birth_year_end: defaultBirthYearEnd,
        is_active: isActive ? 1 : 0,
        created_at: now,
        updated_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
  } catch (error: any) {
    throw new Error(`Failed to create test team: ${error.message}`);
  }
  
  return {
    id: result.id,
    displayName: testDisplayName,
    slug: testSlug,
    metadata: metadata || {},
    seasonId: seasonId || null,
    parentTeamId: parentTeamId || null,
    isActive,
  };
}

/**
 * Create a test match
 */
export async function createTestMatch(
  teamId: number | null,
  opponentName?: string,
  matchDate?: string,
  competitionType?: string,
  matchResult?: string,
  statsJson?: Record<string, any>,
  createdBy?: number
) {
  const timestamp = Date.now();
  const testOpponentName = opponentName || `Test Opponent ${timestamp}`;
  const testMatchDate = matchDate || new Date().toISOString().split('T')[0];
  
  // If teamId is provided, verify team exists
  if (teamId !== null) {
    const team = await db
      .selectFrom('teams')
      .select('id')
      .where('id', '=', teamId)
      .executeTakeFirst();
    
    if (!team) {
      throw new Error(`Team with ID ${teamId} does not exist`);
    }
  }
  
  const now = new Date().toISOString();
  let result;
  try {
    result = await db
      .insertInto('matches')
      .values({
        team_id: teamId,
        opponent_name: testOpponentName,
        match_date: testMatchDate,
        competition_type: competitionType || null,
        result: matchResult || null,
        stats_json: statsJson ? JSON.stringify(statsJson) : null,
        stats_source: null,
        stats_computed_at: null,
        stats_manual_fields: null,
        notes: null,
        venue: null,
        referee: null,
        created_by: createdBy || null,
        last_modified_by: null,
        created_at: now,
        updated_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
  } catch (error: any) {
    throw new Error(`Failed to create test match: ${error.message}. TeamId: ${teamId}`);
  }
  
  return {
    id: result.id,
    teamId,
    opponentName: testOpponentName,
    matchDate: testMatchDate,
    competitionType: competitionType || null,
    result: matchResult || null,
    statsJson: statsJson || null,
  };
}

/**
 * Create a test game event
 */
export async function createTestGameEvent(
  matchId: number,
  eventType: string,
  eventCategory?: string,
  timestamp?: number,
  period?: number,
  minute?: number,
  second?: number,
  fieldPosition?: string,
  xCoordinate?: number,
  yCoordinate?: number,
  eventData?: Record<string, any>,
  isJogaTeam: boolean = true,
  playerName?: string,
  notes?: string,
  tags?: string[]
) {
  const nowTimestamp = timestamp || Date.now();
  const nowDate = new Date().toISOString();
  const result = await db
    .insertInto('game_events')
    .values({
      match_id: matchId,
      event_type: eventType,
      event_category: eventCategory || null,
      timestamp: nowTimestamp,
      period: period || null,
      minute: minute || null,
      second: second || null,
      field_position: fieldPosition || null,
      x_coordinate: xCoordinate || null,
      y_coordinate: yCoordinate || null,
      event_data: eventData ? JSON.stringify(eventData) : null,
      is_joga_team: isJogaTeam ? 1 : 0,
      player_name: playerName || null,
      notes: notes || null,
      tags: tags ? JSON.stringify(tags) : null,
      created_at: nowDate,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  
  return {
    id: result.id,
    matchId,
    eventType,
    eventCategory: eventCategory || null,
    timestamp: nowTimestamp,
    period: period || null,
    minute: minute || null,
    second: second || null,
    fieldPosition: fieldPosition || null,
    xCoordinate: xCoordinate || null,
    yCoordinate: yCoordinate || null,
    eventData: eventData || null,
    isJogaTeam,
    playerName: playerName || null,
    notes: notes || null,
    tags: tags || null,
  };
}

/**
 * Assign a team to a user
 */
export async function assignTeamToUser(
  userId: number,
  teamId: number,
  assignedBy?: number
) {
  const now = new Date().toISOString();
  await db
    .insertInto('user_teams')
    .values({
      user_id: userId,
      team_id: teamId,
      assigned_at: now,
      assigned_by: assignedBy || null,
    })
    .execute();
}

/**
 * Extended cleanup for all test data types
 */
export async function cleanupTestData() {
  try {
    // Delete in correct order to respect foreign key constraints
    // Use individual try-catch blocks to handle partial failures gracefully
    
    // 1. Delete test game events first (references matches)
    try {
      // Delete events for test matches
      const testMatchIds = await db
        .selectFrom('matches')
        .select('id')
        .where('opponent_name', 'like', 'Test Opponent%')
        .execute();
      
      if (testMatchIds.length > 0) {
        await db
          .deleteFrom('game_events')
          .where('match_id', 'in', testMatchIds.map(m => m.id))
          .execute();
      }
      
      // Also delete events for matches referencing test teams
      const testTeamIds = await db
        .selectFrom('teams')
        .select('id')
        .where('display_name', 'like', 'Test Team%')
        .execute();
      
      if (testTeamIds.length > 0) {
        const teamMatchIds = await db
          .selectFrom('matches')
          .select('id')
          .where('team_id', 'in', testTeamIds.map(t => t.id))
          .execute();
        
        if (teamMatchIds.length > 0) {
          await db
            .deleteFrom('game_events')
            .where('match_id', 'in', teamMatchIds.map(m => m.id))
            .execute();
        }
      }
    } catch (error) {
      // Continue even if game events cleanup fails
    }
    
    // 2. Delete test matches (references teams and users)
    try {
      await db
        .deleteFrom('matches')
        .where('opponent_name', 'like', 'Test Opponent%')
        .execute();
    } catch (error) {
      // Continue
    }
    
    try {
      const testTeamIds = await db
        .selectFrom('teams')
        .select('id')
        .where('display_name', 'like', 'Test Team%')
        .execute();
      
      if (testTeamIds.length > 0) {
        await db
          .deleteFrom('matches')
          .where('team_id', 'in', testTeamIds.map(t => t.id))
          .execute();
      }
    } catch (error) {
      // Continue
    }
    
    // 3. Delete test team assignments (references users and teams)
    try {
      const testTeamIds = await db
        .selectFrom('teams')
        .select('id')
        .where('display_name', 'like', 'Test Team%')
        .execute();
      
      if (testTeamIds.length > 0) {
        await db
          .deleteFrom('user_teams')
          .where('team_id', 'in', testTeamIds.map(t => t.id))
          .execute();
      }
    } catch (error) {
      // Continue
    }
    
    try {
      const testUserIds = await db
        .selectFrom('users')
        .select('id')
        .where('email', 'like', 'test-%')
        .execute();
      
      if (testUserIds.length > 0) {
        await db
          .deleteFrom('user_teams')
          .where('user_id', 'in', testUserIds.map(u => u.id))
          .execute();
      }
    } catch (error) {
      // Continue
    }
    
    // 4. Delete test sessions (references users)
    try {
      const testUserIds = await db
        .selectFrom('users')
        .select('id')
        .where('email', 'like', 'test-%')
        .execute();
      
      if (testUserIds.length > 0) {
        await db
          .deleteFrom('sessions')
          .where('user_id', 'in', testUserIds.map(u => u.id))
          .execute();
      }
    } catch (error) {
      // Continue
    }
    
    // 5. Delete test teams (no dependencies after assignments are deleted)
    try {
      await db
        .deleteFrom('teams')
        .where('display_name', 'like', 'Test Team%')
        .execute();
    } catch (error) {
      // Continue
    }
    
    // 6. Delete test users last (after all references are removed)
    try {
      await db
        .deleteFrom('users')
        .where('email', 'like', 'test-%')
        .execute();
    } catch (error) {
      // Continue - this is the final step
    }
  } catch (error) {
    // Log but don't throw - cleanup errors shouldn't fail tests
    console.error('Error cleaning up test data:', error);
  }
}
