/**
 * Insights Service - Frontend API client for insight operations
 */

import { apiGet, apiPatch, apiPost } from './apiClient';

export interface Insight {
  id: number;
  team_id: number;
  match_id: number | null;
  season_id: number | null;
  insight_type: 'anomaly' | 'trend' | 'half_split' | 'correlation' | 'benchmark';
  category: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  severity: number;
  title: string;
  detail_json: string;
  narrative: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get insights for a specific team
 */
export async function getInsightsForTeam(teamId: number): Promise<Insight[]> {
  return await apiGet<Insight[]>(`/insights/team/${teamId}`);
}

/**
 * Get insights for all of the user's teams
 */
export async function getInsights(teamId?: number): Promise<Insight[]> {
  const endpoint = teamId ? `/insights?teamId=${teamId}` : '/insights';
  return await apiGet<Insight[]>(endpoint);
}

/**
 * Get insights for a specific match
 */
export async function getInsightsForMatch(matchId: number): Promise<Insight[]> {
  return await apiGet<Insight[]>(`/insights/match/${matchId}`);
}

/**
 * Mark an insight as read
 */
export async function markInsightAsRead(insightId: number): Promise<void> {
  await apiPatch(`/insights/${insightId}/read`, {});
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(insightId: number): Promise<void> {
  await apiPatch(`/insights/${insightId}/dismiss`, {});
}

/**
 * Generate insights for a team
 */
export async function generateInsightsForTeam(teamId: number): Promise<{ success: boolean }> {
  const result = await apiPost<{ success?: boolean; message?: string }>(`/insights/generate/${teamId}`, {});
  return { success: result.success ?? true };
}
