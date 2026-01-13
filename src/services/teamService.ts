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
