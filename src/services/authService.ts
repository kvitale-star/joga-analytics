/**
 * Authentication service router
 * 
 * Switches between browser database (SQL.js) and backend API based on
 * VITE_USE_BACKEND_API environment variable.
 * 
 * Default: browser mode (for backward compatibility)
 * To use backend API: set VITE_USE_BACKEND_API=true in .env
 */

import * as browserAuth from './authService.browser';
import * as apiAuth from './authService.api';

const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

// Select the appropriate implementation
const authService = USE_BACKEND_API ? apiAuth : browserAuth;

// Re-export all functions from the selected implementation
export const hasUsers = authService.hasUsers;
export const getUserById = authService.getUserById;
export const login = authService.login;
export const getSession = authService.getSession;
export const deleteSession = authService.deleteSession;
export const createInitialAdmin = authService.createInitialAdmin;
export const verifyEmail = authService.verifyEmail;
export const generatePasswordResetToken = authService.generatePasswordResetToken;
export const resetPassword = authService.resetPassword;
export const changePassword = authService.changePassword;
export const updateUserPreferences = authService.updateUserPreferences;
export const generateToken = authService.generateToken;
export const generateSessionId = authService.generateSessionId;
export const hashPassword = authService.hashPassword;
export const verifyPassword = authService.verifyPassword;
export const createSession = authService.createSession;
export const deleteUserSessions = authService.deleteUserSessions;
export const cleanupExpiredSessions = authService.cleanupExpiredSessions;
export const resetAuthDatabase = authService.resetAuthDatabase;
export const createUser = authService.createUser;
export const getUserByEmailForAuth = authService.getUserByEmailForAuth;
