/**
 * API-based team service
 * Uses backend API instead of direct database access
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
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

export async function getTeamById(teamId: number): Promise<Team> {
  const team = await apiGet<Team>(`/teams/${teamId}`);
  return {
    ...team,
    metadata: (typeof team.metadata === 'string'
      ? JSON.parse(team.metadata)
      : team.metadata) as TeamMetadata,
    createdAt: new Date(team.createdAt),
    updatedAt: new Date(team.updatedAt),
  };
}

export async function createTeam(teamData: {
  seasonId: number;
  gender: 'boys' | 'girls';
  level: string;
  variant?: 'volt' | 'valor' | 'black';
  birthYearStart?: number | null;
  birthYearEnd?: number | null;
  ageGroup?: string | null;
  displayName?: string;
  metadata?: TeamMetadata;
  parentTeamId?: number | null;
}): Promise<Team> {
  const team = await apiPost<Team>('/teams', teamData);
  return {
    ...team,
    metadata: (typeof team.metadata === 'string'
      ? JSON.parse(team.metadata)
      : team.metadata) as TeamMetadata,
    createdAt: new Date(team.createdAt),
    updatedAt: new Date(team.updatedAt),
  };
}

export async function updateTeam(
  teamId: number,
  updates: {
    displayName?: string;
    metadata?: TeamMetadata;
    seasonId?: number | null;
    gender?: 'boys' | 'girls';
    level?: string;
    variant?: 'volt' | 'valor' | 'black';
    birthYearStart?: number;
    birthYearEnd?: number;
    ageGroup?: string | null;
    parentTeamId?: number | null;
    isActive?: boolean;
  }
): Promise<Team> {
  const team = await apiPut<Team>(`/teams/${teamId}`, updates);
  return {
    ...team,
    metadata: (typeof team.metadata === 'string'
      ? JSON.parse(team.metadata)
      : team.metadata) as TeamMetadata,
    createdAt: new Date(team.createdAt),
    updatedAt: new Date(team.updatedAt),
  };
}

export async function deactivateTeam(teamId: number): Promise<void> {
  await apiDelete(`/teams/${teamId}`);
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
  _assignedBy: number
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
