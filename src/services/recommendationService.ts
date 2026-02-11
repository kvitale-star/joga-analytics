/**
 * Recommendation Service - Frontend API client for recommendation operations
 */

import { apiGet, apiPost, apiPatch } from './apiClient';

export interface Recommendation {
  id: number;
  team_id: number;
  insight_id: number | null;
  recommendation_type: 'tactical' | 'training' | 'general';
  category: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  action_items: string | null; // JSON array stored as string
  training_plan_json: string | null; // JSON object stored as string
  framework_alignment: string | null;
  club_philosophy_alignment: string | null;
  is_applied: boolean;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateRecommendationRequest {
  teamId: number;
  insightId?: number | null;
  category?: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  recommendationType?: 'tactical' | 'training' | 'general';
}

export interface GetRecommendationsOptions {
  isApplied?: boolean;
  category?: 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
  recommendationType?: 'tactical' | 'training' | 'general';
  limit?: number;
}

/**
 * Get recommendations for a team
 */
export async function getRecommendationsForTeam(
  teamId: number,
  options?: GetRecommendationsOptions
): Promise<Recommendation[]> {
  const params = new URLSearchParams();
  if (options?.isApplied !== undefined) {
    params.append('isApplied', options.isApplied.toString());
  }
  if (options?.category) {
    params.append('category', options.category);
  }
  if (options?.recommendationType) {
    params.append('recommendationType', options.recommendationType);
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }

  const queryString = params.toString();
  const endpoint = queryString 
    ? `/recommendations/team/${teamId}?${queryString}` 
    : `/recommendations/team/${teamId}`;
  
  return await apiGet<Recommendation[]>(endpoint);
}

/**
 * Get a single recommendation by ID
 */
export async function getRecommendationById(recommendationId: number): Promise<Recommendation> {
  return await apiGet<Recommendation>(`/recommendations/${recommendationId}`);
}

/**
 * Generate recommendations for a team
 */
export async function generateRecommendations(
  request: GenerateRecommendationRequest
): Promise<Recommendation[]> {
  return await apiPost<Recommendation[]>('/recommendations/generate', {
    teamId: request.teamId,
    insightId: request.insightId || null,
    category: request.category,
    recommendationType: request.recommendationType,
  });
}

/**
 * Mark a recommendation as applied
 */
export async function markRecommendationAsApplied(recommendationId: number): Promise<Recommendation> {
  return await apiPatch<Recommendation>(`/recommendations/${recommendationId}/apply`, {});
}

/**
 * Parse action items from JSON string
 */
export function parseActionItems(actionItems: string | null): string[] {
  if (!actionItems) return [];
  try {
    return JSON.parse(actionItems);
  } catch {
    return [];
  }
}

/**
 * Parse training plan from JSON string
 */
export function parseTrainingPlan(trainingPlanJson: string | null): any | null {
  if (!trainingPlanJson) return null;
  try {
    return JSON.parse(trainingPlanJson);
  } catch {
    return null;
  }
}

/**
 * Get priority color for UI
 */
export function getPriorityColor(priority: Recommendation['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'blue';
    case 'low':
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Get priority badge text
 */
export function getPriorityBadge(priority: Recommendation['priority']): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}
