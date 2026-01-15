/**
 * Authentication and user-related types
 */

export type UserRole = 'admin' | 'coach' | 'viewer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  preferences: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserWithPassword extends User {
  passwordHash: string;
  emailVerificationToken: string | null;
  emailVerificationSentAt: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
}

export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface TeamMetadata {
  gender?: 'boys' | 'girls';
  age_group?: string; // "U13", "U14", etc.
  birth_year?: number; // Legacy: 2014, 2011, etc.
  grade_level?: number;
  variant?: 'volt' | 'valor' | null;
  division?: string;
  coach_name?: string;
  roster_size?: number;
  [key: string]: any; // Allow additional fields
}

export interface Team {
  id: number;
  displayName: string;
  slug: string;
  metadata: TeamMetadata;
  seasonId: number | null;
  parentTeamId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SetupWizardData {
  email: string;
  password: string;
  name: string;
  bootstrapSecret?: string;
}

