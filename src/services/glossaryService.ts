import { apiGet, apiPost } from './apiClient';

export interface MetricDefinition {
  id?: number;
  metric_name: string;
  category: string | null;
  description: string | null;
  units: string | null;
  calculation: string | null;
  notes: string | null;
  example: string | null;
  data_type: string | null;
  availability: string | null;
  source?: string;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all metric definitions, optionally filtered by category
 */
export async function getMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
  const url = category 
    ? `/glossary?category=${encodeURIComponent(category)}`
    : '/glossary';
  return await apiGet<MetricDefinition[]>(url);
}

/**
 * Get all unique categories
 */
export async function getMetricCategories(): Promise<string[]> {
  const categories = await apiGet<string[]>('/glossary/categories');
  // UI label normalization
  return categories.map((c) => (c === 'Other' ? 'Game Info' : c));
}

/**
 * Get metric definition by name
 */
export async function getMetricDefinitionByName(metricName: string): Promise<MetricDefinition | null> {
  try {
    return await apiGet<MetricDefinition>(`/glossary/${encodeURIComponent(metricName)}`);
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Sync metric definitions from Google Sheets (admin only)
 */
export async function syncMetricDefinitions(): Promise<{ success: boolean; message: string; count: number }> {
  return await apiPost<{ success: boolean; message: string; count: number }>('/glossary/sync', {});
}
