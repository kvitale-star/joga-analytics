import { getDatabase, execute, queryAll } from '../db/database';
import { Team, TeamMetadata } from '../types/auth';

/**
 * Get all teams
 */
export async function getAllTeams(): Promise<Team[]> {
  const db = await getDatabase();
  const teams = await queryAll<{
    id: number;
    display_name: string;
    slug: string;
    metadata: string;
    season_id: number | null;
    parent_team_id: number | null;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>(
    db,
    `SELECT id, display_name, slug, metadata, season_id, parent_team_id,
            is_active, created_at, updated_at
     FROM teams
     ORDER BY display_name ASC`
  );

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}') as TeamMetadata,
    seasonId: team.season_id,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

/**
 * Get teams assigned to a user
 */
export async function getUserTeams(userId: number): Promise<Team[]> {
  const db = await getDatabase();
  const teams = await queryAll<{
    id: number;
    display_name: string;
    slug: string;
    metadata: string;
    season_id: number | null;
    parent_team_id: number | null;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>(
    db,
    `SELECT t.id, t.display_name, t.slug, t.metadata, t.season_id, t.parent_team_id,
            t.is_active, t.created_at, t.updated_at
     FROM teams t
     INNER JOIN user_teams ut ON t.id = ut.team_id
     WHERE ut.user_id = ?
     ORDER BY t.display_name ASC`,
    [userId]
  );

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}') as TeamMetadata,
    seasonId: team.season_id,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

/**
 * Assign team to user
 */
export async function assignTeamToUser(
  userId: number,
  teamId: number,
  assignedBy: number
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    await execute(
      db,
      `INSERT INTO user_teams (user_id, team_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?)`,
      [userId, teamId, now, assignedBy]
    );
  } catch (error: any) {
    // Ignore if already assigned (unique constraint)
    if (!error?.message?.includes('UNIQUE constraint')) {
      throw error;
    }
  }
}

/**
 * Remove team assignment from user
 */
export async function removeTeamFromUser(userId: number, teamId: number): Promise<void> {
  const db = await getDatabase();
  await execute(
    db,
    'DELETE FROM user_teams WHERE user_id = ? AND team_id = ?',
    [userId, teamId]
  );
}

/**
 * Get all team assignments for a user
 */
export async function getUserTeamAssignments(userId: number): Promise<number[]> {
  const db = await getDatabase();
  const assignments = await queryAll<{ team_id: number }>(
    db,
    'SELECT team_id FROM user_teams WHERE user_id = ?',
    [userId]
  );
  return assignments.map(a => a.team_id);
}
