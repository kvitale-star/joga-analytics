import { db } from '../db/database.js';

/**
 * Get all teams
 */
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

/**
 * Get teams assigned to a user
 */
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

/**
 * Assign team to user
 */
export async function assignTeamToUser(
  userId: number,
  teamId: number,
  assignedBy: number
): Promise<void> {
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

/**
 * Remove team assignment from user
 */
export async function removeTeamFromUser(userId: number, teamId: number): Promise<void> {
  await db
    .deleteFrom('user_teams')
    .where('user_id', '=', userId)
    .where('team_id', '=', teamId)
    .execute();
}

/**
 * Get all team assignments for a user
 */
export async function getUserTeamAssignments(userId: number): Promise<number[]> {
  const assignments = await db
    .selectFrom('user_teams')
    .select('team_id')
    .where('user_id', '=', userId)
    .execute();

  return assignments.map(a => a.team_id);
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: number) {
  const team = await db
    .selectFrom('teams')
    .selectAll()
    .where('id', '=', teamId)
    .executeTakeFirst();

  if (!team) return null;

  return {
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  };
}

/**
 * Create a new team
 */
export async function createTeam(teamData: {
  displayName: string;
  slug: string;
  metadata?: any;
  seasonId?: number | null;
  parentTeamId?: number | null;
}) {
  const now = new Date().toISOString();

  const result = await db
    .insertInto('teams')
    .values({
      display_name: teamData.displayName,
      slug: teamData.slug,
      metadata: teamData.metadata ? JSON.stringify(teamData.metadata) : '{}',
      season_id: teamData.seasonId || null,
      parent_team_id: teamData.parentTeamId || null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return getTeamById(result.id);
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: number,
  updates: {
    displayName?: string;
    slug?: string;
    metadata?: any;
    seasonId?: number | null;
    parentTeamId?: number | null;
    isActive?: boolean;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.slug !== undefined) updateData.slug = updates.slug;
  if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
  if (updates.seasonId !== undefined) updateData.season_id = updates.seasonId;
  if (updates.parentTeamId !== undefined) updateData.parent_team_id = updates.parentTeamId;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

  await db
    .updateTable('teams')
    .set(updateData)
    .where('id', '=', teamId)
    .execute();

  return getTeamById(teamId);
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: number): Promise<void> {
  await db
    .deleteFrom('teams')
    .where('id', '=', teamId)
    .execute();
}
