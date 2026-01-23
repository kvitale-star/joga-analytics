import { db } from '../db/database.js';

export type TeamGender = 'boys' | 'girls';
export type TeamVariant = 'volt' | 'valor' | 'black';

function normalizeLevel(level: string): string {
  const trimmed = level.trim().toUpperCase();
  if (!trimmed.startsWith('U')) return `U${trimmed.replace(/^U/, '')}`;
  return trimmed;
}

/**
 * Calculate default age group from level and season year
 * Returns format: "Aug YYYY - July YYYY" (e.g., "Aug 2014 - July 2015")
 * 
 * Age group calculation:
 * - U13 in 2026 means players are 13 years old during the 2026 season
 * - They were born in 2013 (2026 - 13 = 2013)
 * - Age group spans Aug 2013 - July 2014 (the year they turn 13)
 */
export function calculateAgeGroupFromLevel(level: string, seasonYear: number | string): string {
  const levelNum = parseInt(level.replace(/^U/i, ''), 10);
  if (isNaN(levelNum)) {
    throw new Error(`Invalid level format: ${level}`);
  }
  
  const year = typeof seasonYear === 'string' ? parseInt(seasonYear, 10) : seasonYear;
  if (isNaN(year)) {
    throw new Error(`Invalid season year: ${seasonYear}`);
  }
  
  // Calculate birth year: season year - age
  const birthYear = year - levelNum;
  
  // Age group is Aug [birthYear] - July [birthYear + 1]
  // e.g., U13 in 2026: Aug 2013 - July 2014
  return `Aug ${birthYear} - July ${birthYear + 1}`;
}

/**
 * Validate age group format
 * Accepts:
 * - Month range: "Aug YYYY - July YYYY" (e.g., "Aug 2014 - July 2015")
 * - Single year: "YYYY" (e.g., "2014")
 * 
 * Returns true if valid, false otherwise
 */
export function isValidAgeGroup(ageGroup: string | null | undefined): boolean {
  if (!ageGroup || !ageGroup.trim()) return false;
  
  const trimmed = ageGroup.trim();
  
  // Check for single year format (4 digits)
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed, 10);
    return year >= 2000 && year <= 2100; // Reasonable range
  }
  
  // Check for month range format: "Aug YYYY - July YYYY"
  // Allow flexible spacing around the dash
  // Pattern: MonthName + space + Year + optional spaces + dash + optional spaces + MonthName + space + Year
  const monthRangePattern = /^([A-Za-z]{3,})\s+(\d{4})\s*-\s*([A-Za-z]{3,})\s+(\d{4})$/;
  if (monthRangePattern.test(trimmed)) {
    const match = trimmed.match(monthRangePattern);
    if (match) {
      const startMonth = match[1].toLowerCase();
      const endMonth = match[3].toLowerCase();
      const startYear = parseInt(match[2], 10);
      const endYear = parseInt(match[4], 10);
      
      // Validate months are valid (optional - could be more strict)
      const validMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const isValidMonth = (m: string) => validMonths.some(vm => m.startsWith(vm));
      
      return isValidMonth(startMonth) && isValidMonth(endMonth) &&
             startYear >= 2000 && startYear <= 2100 && 
             endYear >= 2000 && endYear <= 2100 &&
             endYear === startYear + 1; // End year should be start year + 1
    }
  }
  
  return false;
}

/**
 * Normalize age group string (trim and validate format)
 */
export function normalizeAgeGroup(ageGroup: string | null | undefined): string | null {
  if (!ageGroup || !ageGroup.trim()) return null;
  
  const trimmed = ageGroup.trim();
  
  // Validate format
  if (!isValidAgeGroup(trimmed)) {
    throw new Error(`Invalid age group format: ${trimmed}. Must be "Aug YYYY - July YYYY" or "YYYY"`);
  }
  
  return trimmed;
}

function normalizeGender(gender: string): TeamGender {
  const g = gender.trim().toLowerCase();
  if (g !== 'boys' && g !== 'girls') {
    throw new Error('Invalid gender (must be boys or girls)');
  }
  return g;
}

function normalizeVariant(variant: string | undefined | null): TeamVariant {
  const v = (variant ?? 'volt').toString().trim().toLowerCase();
  if (v !== 'volt' && v !== 'valor' && v !== 'black') {
    throw new Error('Invalid variant (must be volt, valor, or black)');
  }
  return v;
}

export function generateTeamSlug(input: {
  gender: TeamGender;
  level: string;
  variant: TeamVariant;
  seasonYear?: string | number; // Optional season year to append (e.g., "2026")
}): string {
  const genderPrefix = input.gender === 'boys' ? 'B' : 'G';
  const levelNorm = normalizeLevel(input.level);
  const base = `${genderPrefix}${levelNorm}`;
  // Rule: Volt appends -VT; Valor appends -VR; Black appends -BL
  const variantSuffix = 
    input.variant === 'volt' ? '-VT' :
    input.variant === 'valor' ? '-VR' :
    input.variant === 'black' ? '-BL' :
    '';
  const baseWithVariant = `${base}${variantSuffix}`;
  
  // Append season year if provided (e.g., "BU13-VT-2026" or "BU13-VR-2026" or "BU13-BL-2026")
  if (input.seasonYear !== undefined && input.seasonYear !== null) {
    return `${baseWithVariant}-${input.seasonYear}`;
  }
  
  return baseWithVariant;
}

async function ensureUniqueTeamSlug(slug: string, excludeTeamId?: number): Promise<void> {
  let query = db
    .selectFrom('teams')
    .select(['id'])
    .where('slug', '=', slug);
  if (excludeTeamId !== undefined) {
    query = query.where('id', '!=', excludeTeamId);
  }
  const existing = await query.executeTakeFirst();
  if (existing) {
    throw new Error(`Team slug already exists: ${slug}`);
  }
}

/**
 * Get all teams
 */
export async function getAllTeams() {
  const teams = await db
    .selectFrom('teams')
    .selectAll()
    .orderBy('display_name', 'asc')
    .execute();

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    gender: team.gender,
    level: team.level,
    variant: team.variant,
    birthYearStart: team.birth_year_start,
    birthYearEnd: team.birth_year_end,
    ageGroup: team.age_group,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

/**
 * Get teams assigned to a user
 */
export async function getUserTeams(userId: number) {
  const teams = await db
    .selectFrom('teams')
    .innerJoin('user_teams', 'teams.id', 'user_teams.team_id')
    .selectAll('teams')
    .where('user_teams.user_id', '=', userId)
    .orderBy('teams.display_name', 'asc')
    .execute();

  return teams.map(team => ({
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    gender: team.gender,
    level: team.level,
    variant: team.variant,
    birthYearStart: team.birth_year_start,
    birthYearEnd: team.birth_year_end,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  }));
}

/**
 * Assign team to user
 */
export async function assignTeamToUser(
  userId: number,
  teamId: number,
  assignedBy: number
): Promise<void> {
  try {
    await db
      .insertInto('user_teams')
      .values({
        user_id: userId,
        team_id: teamId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
      })
      .execute();
  } catch (error: any) {
    // Ignore if already assigned (unique constraint)
    if (!error?.message?.includes('UNIQUE constraint')) {
      throw error;
    }
  }
}

/**
 * Remove team assignment from user
 */
export async function removeTeamFromUser(userId: number, teamId: number): Promise<void> {
  await db
    .deleteFrom('user_teams')
    .where('user_id', '=', userId)
    .where('team_id', '=', teamId)
    .execute();
}

/**
 * Get all team assignments for a user
 */
export async function getUserTeamAssignments(userId: number): Promise<number[]> {
  const assignments = await db
    .selectFrom('user_teams')
    .select('team_id')
    .where('user_id', '=', userId)
    .execute();

  return assignments.map(a => a.team_id);
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: number) {
  const team = await db
    .selectFrom('teams')
    .selectAll()
    .where('id', '=', teamId)
    .executeTakeFirst();

  if (!team) return null;

  return {
    id: team.id,
    displayName: team.display_name,
    slug: team.slug,
    metadata: JSON.parse(team.metadata || '{}'),
    seasonId: team.season_id,
    gender: team.gender,
    level: team.level,
    variant: team.variant,
    birthYearStart: team.birth_year_start,
    birthYearEnd: team.birth_year_end,
    ageGroup: team.age_group,
    parentTeamId: team.parent_team_id,
    isActive: Boolean(team.is_active),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  };
}

/**
 * Create a new team
 */
export async function createTeam(teamData: {
  displayName?: string;
  seasonId: number;
  gender: TeamGender;
  level: string;
  variant?: TeamVariant;
  birthYearStart?: number | null;
  birthYearEnd?: number | null;
  ageGroup?: string | null;
  metadata?: any;
  parentTeamId?: number | null;
}) {
  const now = new Date().toISOString();

  const gender = normalizeGender(teamData.gender);
  const level = normalizeLevel(teamData.level);
  const variant = normalizeVariant(teamData.variant);

  if (!Number.isFinite(teamData.seasonId)) {
    throw new Error('seasonId is required');
  }
  
  // Validate birth years if provided
  if (teamData.birthYearStart !== undefined && teamData.birthYearStart !== null) {
    if (!Number.isFinite(teamData.birthYearStart)) {
      throw new Error('birthYearStart must be a valid number if provided');
    }
  }
  if (teamData.birthYearEnd !== undefined && teamData.birthYearEnd !== null) {
    if (!Number.isFinite(teamData.birthYearEnd)) {
      throw new Error('birthYearEnd must be a valid number if provided');
    }
  }
  if (teamData.birthYearStart !== undefined && teamData.birthYearStart !== null &&
      teamData.birthYearEnd !== undefined && teamData.birthYearEnd !== null) {
    if (teamData.birthYearStart > teamData.birthYearEnd) {
      throw new Error('birthYearStart cannot be greater than birthYearEnd');
    }
  }

  // Get season year for slug
  const season = await db
    .selectFrom('seasons')
    .select(['name'])
    .where('id', '=', teamData.seasonId)
    .executeTakeFirst();
  
  if (!season) {
    throw new Error('Season not found');
  }

  const slug = generateTeamSlug({ gender, level, variant, seasonYear: season.name });
  await ensureUniqueTeamSlug(slug);

  // Auto-calculate ageGroup if not provided
  let ageGroup: string | null = null;
  if (teamData.ageGroup !== undefined && teamData.ageGroup !== null) {
    ageGroup = normalizeAgeGroup(teamData.ageGroup);
  } else {
    // Auto-calculate from level and season
    try {
      ageGroup = calculateAgeGroupFromLevel(level, season.name);
    } catch (error) {
      // If calculation fails, leave as null (optional field)
      console.warn('Could not calculate age group:', error);
    }
  }

  // Generate display name
  let displayName = teamData.displayName?.trim();
  if (!displayName) {
    const variantSuffix = variant === 'valor' ? ' Valor' : variant === 'black' ? ' Black' : '';
    if (teamData.birthYearStart !== undefined && teamData.birthYearStart !== null &&
        teamData.birthYearEnd !== undefined && teamData.birthYearEnd !== null) {
      displayName = `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix} (${teamData.birthYearStart}-${teamData.birthYearEnd})`;
    } else {
      displayName = `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix}`;
    }
  }

  const result = await db
    .insertInto('teams')
    .values({
      display_name: displayName,
      slug,
      metadata: teamData.metadata ? JSON.stringify(teamData.metadata) : '{}',
      season_id: teamData.seasonId,
      gender,
      level,
      variant,
      birth_year_start: teamData.birthYearStart ?? null,
      birth_year_end: teamData.birthYearEnd ?? null,
      age_group: ageGroup,
      parent_team_id: teamData.parentTeamId || null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return getTeamById(result.id);
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: number,
  updates: {
    displayName?: string;
    metadata?: any;
    seasonId?: number | null;
    gender?: TeamGender;
    level?: string;
    variant?: TeamVariant;
    birthYearStart?: number;
    birthYearEnd?: number;
    ageGroup?: string | null;
    parentTeamId?: number | null;
    isActive?: boolean;
  }
) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
  if (updates.seasonId !== undefined) updateData.season_id = updates.seasonId;
  if (updates.parentTeamId !== undefined) updateData.parent_team_id = updates.parentTeamId;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

  // If any of the structured identity fields are being updated, recompute slug (and displayName if not explicitly set)
  const willUpdateIdentity =
    updates.gender !== undefined ||
    updates.level !== undefined ||
    updates.variant !== undefined ||
    updates.birthYearStart !== undefined ||
    updates.birthYearEnd !== undefined;

  if (updates.gender !== undefined) updateData.gender = normalizeGender(updates.gender);
  if (updates.level !== undefined) updateData.level = normalizeLevel(updates.level);
  if (updates.variant !== undefined) updateData.variant = normalizeVariant(updates.variant);
  if (updates.birthYearStart !== undefined) updateData.birth_year_start = updates.birthYearStart;
  if (updates.birthYearEnd !== undefined) updateData.birth_year_end = updates.birthYearEnd;
  
  // Handle ageGroup: normalize if provided, or auto-calculate if level/season changed
  if (updates.ageGroup !== undefined) {
    if (updates.ageGroup === null || updates.ageGroup === '') {
      updateData.age_group = null;
    } else {
      updateData.age_group = normalizeAgeGroup(updates.ageGroup);
    }
  }

  if (willUpdateIdentity || updates.seasonId !== undefined) {
    const current = await db
      .selectFrom('teams')
      .select(['gender', 'level', 'variant', 'birth_year_start', 'birth_year_end', 'season_id'])
      .where('id', '=', teamId)
      .executeTakeFirstOrThrow();

    const gender: TeamGender = normalizeGender(
      (updateData.gender ?? current.gender ?? 'boys') as string
    );
    const level = normalizeLevel((updateData.level ?? current.level ?? 'U0') as string);
    const variant: TeamVariant = normalizeVariant((updateData.variant ?? current.variant) as string);

    // Birth years are optional - only validate if both are provided
    const birthYearStart = updateData.birth_year_start !== undefined 
      ? (updateData.birth_year_start !== null ? Number(updateData.birth_year_start) : null)
      : (current.birth_year_start !== null ? Number(current.birth_year_start) : null);
    const birthYearEnd = updateData.birth_year_end !== undefined
      ? (updateData.birth_year_end !== null ? Number(updateData.birth_year_end) : null)
      : (current.birth_year_end !== null ? Number(current.birth_year_end) : null);
    
    if (birthYearStart !== null && birthYearEnd !== null) {
      if (!Number.isFinite(birthYearStart) || !Number.isFinite(birthYearEnd)) {
        throw new Error('birthYearStart and birthYearEnd must be valid numbers if provided');
      }
      if (birthYearStart > birthYearEnd) {
        throw new Error('birthYearStart cannot be greater than birthYearEnd');
      }
    }

    // Get season year for slug (use updated seasonId if provided, otherwise current)
    const finalSeasonId = updates.seasonId ?? current.season_id;
    let seasonYear: string | undefined;
    if (finalSeasonId) {
      const season = await db
        .selectFrom('seasons')
        .select(['name'])
        .where('id', '=', finalSeasonId)
        .executeTakeFirst();
      if (season) {
        seasonYear = season.name;
      }
    }

    const slug = generateTeamSlug({ gender, level, variant, seasonYear });
    await ensureUniqueTeamSlug(slug, teamId);
    updateData.slug = slug;

    if (updates.displayName === undefined) {
      const variantSuffix = variant === 'valor' ? ' Valor' : variant === 'black' ? ' Black' : '';
      if (birthYearStart !== null && birthYearEnd !== null) {
        updateData.display_name =
          `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix} (${birthYearStart}-${birthYearEnd})`;
      } else {
        updateData.display_name =
          `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix}`;
      }
    }
    
    // Auto-calculate ageGroup if level or season changed and ageGroup wasn't explicitly set
    if (updates.ageGroup === undefined && seasonYear && (updates.level !== undefined || updates.seasonId !== undefined)) {
      try {
        updateData.age_group = calculateAgeGroupFromLevel(level, seasonYear);
      } catch (error) {
        // If calculation fails, leave as is (don't overwrite existing)
        console.warn('Could not calculate age group:', error);
      }
    }
  }

  await db
    .updateTable('teams')
    .set(updateData)
    .where('id', '=', teamId)
    .execute();

  return getTeamById(teamId);
}

/**
 * Deactivate a team (delete is not supported)
 */
export async function deleteTeam(teamId: number): Promise<void> {
  await db
    .updateTable('teams')
    .set({
      is_active: 0,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', teamId)
    .execute();
}
