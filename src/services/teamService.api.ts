/**
 * API-based team service
 * Uses backend API instead of direct database access
 */

import { apiGet, apiPost, apiDelete } from './apiClient';
import { Team, TeamMetadata } from '../types/auth';

/**
 * Get all teams
 */
export async function getAllTeams(): Promise<Team[]> {
  const teams = await apiGet<Team[]>('/teams');
  
  // Convert date strings to Date objects and parse metadata
  return teams.map(team => ({
    ...team,
    metadata: (typeof team.metadata === 'string' 
      ? JSON.parse(team.metadata) 
      : team.metadata) as TeamMetadata,
    createdAt: new Date(team.createdAt),
    updatedAt: new Date(team.updatedAt),
  }));
}

/**
 * Get teams assigned to a user
 */
export async function getUserTeams(userId: number): Promise<Team[]> {
  const teams = await apiGet<Team[]>(`/teams/users/${userId}/teams`);
  
  // Convert date strings to Date objects and parse metadata
  return teams.map(team => ({
    ...team,
    metadata: (typeof team.metadata === 'string' 
      ? JSON.parse(team.metadata) 
      : team.metadata) as TeamMetadata,
    createdAt: new Date(team.createdAt),
    updatedAt: new Date(team.updatedAt),
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
  await apiPost(`/teams/users/${userId}/teams`, { teamId });
}

/**
 * Remove team assignment from user
 */
export async function removeTeamFromUser(userId: number, teamId: number): Promise<void> {
  await apiDelete(`/teams/users/${userId}/teams/${teamId}`);
}

/**
 * Get all team assignments for a user
 * This is a helper function that gets team IDs from getUserTeams
 */
export async function getUserTeamAssignments(userId: number): Promise<number[]> {
  const teams = await getUserTeams(userId);
  return teams.map(team => team.id);
}
