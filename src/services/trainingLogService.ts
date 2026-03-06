/**
 * Training Log Service - Frontend API client for training log operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface TrainingFocusTag {
  id: number;
  name: string;
  category: string;
  display_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface TrainingLog {
  id: number;
  team_id: number;
  user_id: number;
  session_date: string;
  session_type: string;
  focus_tags: string;
  notes: string | null;
  insight_id: number | null;
  recommendation_id: number | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingLogRequest {
  teamId: number;
  sessionDate: string;
  sessionType: string;
  focusTags: number[]; // Training focus tag IDs
  notes?: string | null;
  insightId?: number | null;
  recommendationId?: number | null;
  durationMinutes?: number | null;
}

/**
 * Get all focus tags
 */
export async function getFocusTags(category?: string): Promise<TrainingFocusTag[]> {
  const endpoint = category
    ? `/training-logs/focus-tags?category=${encodeURIComponent(category)}`
    : '/training-logs/focus-tags';
  return await apiGet<TrainingFocusTag[]>(endpoint);
}

/**
 * Get training logs for a team
 */
export async function getTrainingLogsForTeam(
  teamId: number,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<TrainingLog[]> {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.limit) params.append('limit', options.limit.toString());
  const qs = params.toString();
  const endpoint = qs
    ? `/training-logs/team/${teamId}?${qs}`
    : `/training-logs/team/${teamId}`;
  return await apiGet<TrainingLog[]>(endpoint);
}

/**
 * Get training logs for user's teams (all)
 */
export async function getTrainingLogs(teamId?: number): Promise<TrainingLog[]> {
  const endpoint = teamId ? `/training-logs?teamId=${teamId}` : '/training-logs';
  return await apiGet<TrainingLog[]>(endpoint);
}

/**
 * Create a training log entry
 * focusTags: array of training_focus_tag IDs
 */
export async function createTrainingLog(request: CreateTrainingLogRequest): Promise<TrainingLog> {
  return await apiPost<TrainingLog>('/training-logs', {
    teamId: request.teamId,
    sessionDate: request.sessionDate,
    sessionType: request.sessionType,
    focusTags: request.focusTags,
    notes: request.notes ?? null,
    insightId: request.insightId ?? null,
    recommendationId: request.recommendationId ?? null,
    durationMinutes: request.durationMinutes ?? null,
  });
}

/**
 * Update a training log entry
 */
export async function updateTrainingLog(
  id: number,
  updates: Partial<Omit<TrainingLog, 'id' | 'team_id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<TrainingLog> {
  return await apiPut<TrainingLog>(`/training-logs/${id}`, updates);
}

/**
 * Delete a training log entry
 */
export async function deleteTrainingLog(id: number): Promise<void> {
  await apiDelete(`/training-logs/${id}`);
}
