/**
 * User service router
 * 
 * Switches between browser database (SQL.js) and backend API based on
 * VITE_USE_BACKEND_API environment variable.
 * 
 * Default: browser mode (for backward compatibility)
 * To use backend API: set VITE_USE_BACKEND_API=true in .env
 */

import * as browserUserService from './userService.browser';
import * as apiUserService from './userService.api';

const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

// Select the appropriate implementation
const userService = USE_BACKEND_API ? apiUserService : browserUserService;

// Re-export all functions from the selected implementation
export const getAllUsers = userService.getAllUsers;
export const updateUser = userService.updateUser;
export const deleteUser = userService.deleteUser;
export const createUserByAdmin = userService.createUserByAdmin;
export const resetUserPassword = userService.resetUserPassword;
