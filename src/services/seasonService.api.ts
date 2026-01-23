import { apiGet, apiPost } from './apiClient';
import { Season } from '../types/auth';

export async function getAllSeasons(): Promise<Season[]> {
  const seasons = await apiGet<Season[]>('/seasons');
  return seasons.map(s => ({
    ...s,
    createdAt: new Date(s.createdAt),
  }));
}

export async function createSeason(year: number): Promise<Season> {
  const season = await apiPost<Season>('/seasons', { year });
  return {
    ...season,
    createdAt: new Date(season.createdAt),
  };
}

export async function activateSeason(seasonId: number): Promise<void> {
  await apiPost(`/seasons/${seasonId}/activate`, {});
}

