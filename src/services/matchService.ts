/**
 * Match Service - Frontend API client for match operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface Match {
  id: number;
  teamId?: number | null;
  opponentName: string;
  matchDate: string;
  competitionType?: string | null;
  result?: string | null;
  statsJson?: any;
  statsSource?: string | null;
  statsComputedAt?: Date | null;
  statsManualFields?: any;
  notes?: string | null;
  venue?: string | null;
  referee?: string | null;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: number | null;
}

export interface CreateMatchData {
  teamId?: number | null;
  opponentName: string;
  matchDate: string;
  competitionType?: string | null;
  result?: string | null;
  isHome?: boolean | null;
  rawStats?: Record<string, any>; // Raw form data - will be computed automatically
  notes?: string | null;
  venue?: string | null;
  referee?: string | null;
}

export interface UpdateMatchData {
  teamId?: number | null;
  opponentName?: string;
  matchDate?: string;
  competitionType?: string | null;
  result?: string | null;
  rawStats?: Record<string, any>;
  notes?: string | null;
  venue?: string | null;
  referee?: string | null;
}

export interface MatchFilters {
  teamId?: number;
  opponentName?: string;
  startDate?: string;
  endDate?: string;
  competitionType?: string;
}

/**
 * Get all matches with optional filters
 */
export async function getMatches(filters?: MatchFilters): Promise<Match[]> {
  const params = new URLSearchParams();
  if (filters?.teamId) params.append('teamId', filters.teamId.toString());
  if (filters?.opponentName) params.append('opponentName', filters.opponentName);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.competitionType) params.append('competitionType', filters.competitionType);

  const queryString = params.toString();
  const endpoint = queryString ? `/matches?${queryString}` : '/matches';
  
  const matches = await apiGet<Match[]>(endpoint);
  
  // Convert date strings to Date objects
  return matches.map(match => ({
    ...match,
    statsComputedAt: match.statsComputedAt ? new Date(match.statsComputedAt as any) : null,
    createdAt: new Date(match.createdAt as any),
    updatedAt: new Date(match.updatedAt as any),
  }));
}

/**
 * Get a match by ID
 */
export async function getMatchById(matchId: number): Promise<Match> {
  const match = await apiGet<Match>(`/matches/${matchId}`);
  
  return {
    ...match,
    statsComputedAt: match.statsComputedAt ? new Date(match.statsComputedAt as any) : null,
    createdAt: new Date(match.createdAt as any),
    updatedAt: new Date(match.updatedAt as any),
  };
}

/**
 * Create a new match
 * Raw stats will be automatically computed by the backend
 */
export async function createMatch(data: CreateMatchData): Promise<Match> {
  const match = await apiPost<Match>('/matches', {
    teamId: data.teamId,
    opponentName: data.opponentName,
    matchDate: data.matchDate,
    competitionType: data.competitionType,
    result: data.result,
    isHome: data.isHome,
    rawStats: data.rawStats, // Backend will compute derived metrics
    notes: data.notes,
    venue: data.venue,
    referee: data.referee,
  });
  
  return {
    ...match,
    statsComputedAt: match.statsComputedAt ? new Date(match.statsComputedAt as any) : null,
    createdAt: new Date(match.createdAt as any),
    updatedAt: new Date(match.updatedAt as any),
  };
}

/**
 * Update a match
 */
export async function updateMatch(matchId: number, data: UpdateMatchData): Promise<Match> {
  const match = await apiPut<Match>(`/matches/${matchId}`, {
    teamId: data.teamId,
    opponentName: data.opponentName,
    matchDate: data.matchDate,
    competitionType: data.competitionType,
    result: data.result,
    rawStats: data.rawStats,
    notes: data.notes,
    venue: data.venue,
    referee: data.referee,
  });
  
  return {
    ...match,
    statsComputedAt: match.statsComputedAt ? new Date(match.statsComputedAt as any) : null,
    createdAt: new Date(match.createdAt as any),
    updatedAt: new Date(match.updatedAt as any),
  };
}

/**
 * Delete a match
 */
export async function deleteMatch(matchId: number): Promise<void> {
  await apiDelete(`/matches/${matchId}`);
}
