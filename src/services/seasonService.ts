import * as apiSeasonService from './seasonService.api';

// Seasons are backend-only (SQLite). No browser-db fallback.
export const getAllSeasons = apiSeasonService.getAllSeasons;
export const createSeason = apiSeasonService.createSeason;
export const activateSeason = apiSeasonService.activateSeason;

