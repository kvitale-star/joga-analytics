/**
 * Team service router
 * 
 * Switches between browser database (SQL.js) and backend API based on
 * VITE_USE_BACKEND_API environment variable.
 * 
 * Default: browser mode (for backward compatibility)
 * To use backend API: set VITE_USE_BACKEND_API=true in .env
 */

import * as browserTeamService from './teamService.browser';
import * as apiTeamService from './teamService.api';

const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

// Select the appropriate implementation
const teamService = USE_BACKEND_API ? apiTeamService : browserTeamService;

// Re-export all functions from the selected implementation
export const getAllTeams = teamService.getAllTeams;
export const getUserTeams = teamService.getUserTeams;
export const assignTeamToUser = teamService.assignTeamToUser;
export const removeTeamFromUser = teamService.removeTeamFromUser;
export const getUserTeamAssignments = teamService.getUserTeamAssignments;

// Admin-only team management (backend API only)
export const getTeamById = (apiTeamService as any).getTeamById || (async () => {
  throw new Error('getTeamById is only available in backend API mode');
});
export const createTeam = (apiTeamService as any).createTeam || (async () => {
  throw new Error('createTeam is only available in backend API mode');
});
export const updateTeam = (apiTeamService as any).updateTeam || (async () => {
  throw new Error('updateTeam is only available in backend API mode');
});
export const deactivateTeam = (apiTeamService as any).deactivateTeam || (async () => {
  throw new Error('deactivateTeam is only available in backend API mode');
});
