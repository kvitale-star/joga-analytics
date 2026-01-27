import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type {
  CustomChart,
  CreateChartRequest,
  UpdateChartRequest,
  RenderChartRequest,
  ChartRenderData,
} from '../types/customCharts';

/**
 * Get all custom charts for the current user
 */
export async function getCustomCharts(): Promise<CustomChart[]> {
  return apiGet<CustomChart[]>('/custom-charts');
}

/**
 * Get all custom charts in the system (admin only)
 */
export async function getAllCustomCharts(): Promise<CustomChart[]> {
  return apiGet<CustomChart[]>('/custom-charts/all');
}

/**
 * Get a specific custom chart by ID
 */
export async function getCustomChart(chartId: number): Promise<CustomChart> {
  return apiGet<CustomChart>(`/custom-charts/${chartId}`);
}

/**
 * Create a new custom chart
 */
export async function createCustomChart(data: CreateChartRequest): Promise<CustomChart> {
  return apiPost<CustomChart>('/custom-charts', data);
}

/**
 * Update an existing custom chart
 */
export async function updateCustomChart(
  chartId: number,
  data: UpdateChartRequest
): Promise<CustomChart> {
  return apiPut<CustomChart>(`/custom-charts/${chartId}`, data);
}

/**
 * Delete a custom chart
 */
export async function deleteCustomChart(chartId: number): Promise<void> {
  await apiDelete(`/custom-charts/${chartId}`);
}

/**
 * Render chart data based on chart config and sheet data
 */
export async function renderChart(
  chartId: number,
  request: RenderChartRequest
): Promise<ChartRenderData> {
  return apiPost<ChartRenderData>(`/custom-charts/${chartId}/render`, request);
}
