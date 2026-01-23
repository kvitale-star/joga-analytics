import type { Team } from '../types/auth';

export function generateTeamSlug(input: {
  gender: 'boys' | 'girls';
  level: string;
  variant: 'volt' | 'valor' | 'black';
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

export function normalizeLevel(level: string): string {
  const trimmed = level.trim().toUpperCase();
  if (trimmed.startsWith('U')) return trimmed;
  return `U${trimmed}`;
}

/**
 * Option B label disambiguation:
 * - Use slug by default
 * - If same slug appears more than once, append (year) for collisions
 */
export function buildTeamLabelMap(teams: Array<Team & { seasonYear?: number | null }>): Map<number, string> {
  const slugCounts = new Map<string, number>();
  for (const t of teams) {
    const slug = t.slug;
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }

  const labels = new Map<number, string>();
  for (const t of teams) {
    const count = slugCounts.get(t.slug) || 0;
    if (count > 1 && t.seasonYear) {
      labels.set(t.id, `${t.slug} (${t.seasonYear})`);
    } else {
      labels.set(t.id, t.slug);
    }
  }
  return labels;
}

