/**
 * Team Migration Script
 * 
 * Uses the Teams sheet from Google Sheets to migrate existing teams
 * to the new structured format with season-based slugs.
 * 
 * Usage:
 *   Step 1 (Analysis): npm run migrate-teams:analyze
 *   Step 2 (Review): Edit team-migration-map.json if needed
 *   Step 3 (Execute): npm run migrate-teams:execute
 * 
 * Or run both: npm run migrate-teams
 */

import { db } from '../db/database.js';
import { fetchSheetData } from '../services/sheetsService.js';
import { generateTeamSlug } from '../services/teamService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Helper function to normalize level (same logic as in teamService)
function normalizeLevel(level: string): string {
  const trimmed = level.trim().toUpperCase();
  if (!trimmed.startsWith('U')) return `U${trimmed.replace(/^U/, '')}`;
  return trimmed;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TeamsSheetRow {
  Teams?: string;
  '2025_name'?: string;
  '2025_name_translated'?: string;
  '2026_name'?: string;
  Season?: string | number;
  Variant?: string;
  [key: string]: any;
}

interface TeamMigrationMapping {
  // For existing teams
  oldTeamId?: number;
  oldSlug?: string;
  oldDisplayName?: string;
  oldMetadata?: any;
  oldSeasonId?: number | null;
  
  // For new teams from sheet
  isNewTeam?: boolean;
  teamsSheetRow?: TeamsSheetRow;
  
  // Matched from Teams sheet
  teamsSheetMatch: {
    originalName: string;
    translatedName: string;
    season: number;
  } | null;
  
  // New structured fields
  newSeasonId: number;
  newGender: 'boys' | 'girls';
  newLevel: string; // e.g., "U13"
  newVariant: 'volt' | 'valor' | 'black';
  newBirthYearStart: number;
  newBirthYearEnd: number;
  newSlug: string;
  newDisplayName: string;
  
  // Analysis metadata
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
  notes: string[];
}

/**
 * Parse translated name (e.g., "BU12", "GU13VR", "BU12-Black") to extract structured data
 * Note: Variant should be read from the Variant column in the sheet, not parsed from name
 */
function parseTranslatedName(translatedName: string): {
  gender: 'boys' | 'girls' | null;
  level: string | null;
  notes: string[];
} {
  const upper = translatedName.toUpperCase().trim();
  const notes: string[] = [];
  
  // Extract gender
  const gender = upper.startsWith('B') ? 'boys' : upper.startsWith('G') ? 'girls' : null;
  
  // Extract level (U followed by digits, may have suffix like -Black, BL, etc.)
  const levelMatch = upper.match(/U(\d+)/);
  const level = levelMatch ? `U${levelMatch[1]}` : null;
  
  return { gender, level, notes };
}

/**
 * Parse variant from the Variant column value
 */
function parseVariant(variantValue: string | undefined | null): 'volt' | 'valor' | 'black' {
  if (!variantValue) return 'volt';
  
  const normalized = variantValue.toString().trim().toLowerCase();
  if (normalized === 'valor') return 'valor';
  if (normalized === 'black') return 'black';
  return 'volt'; // Default to volt
}

/**
 * Parse birth year from original name (e.g., "B2014", "G2015/16")
 */
function parseBirthYear(originalName: string): {
  birthYearStart: number | null;
  birthYearEnd: number | null;
} {
  // Pattern: B2014, G2014, B2015/16, G2014/15
  const match = originalName.match(/(?:B|G)(\d{4})(?:\/(\d{2}))?/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const endYear = match[2] ? parseInt(`20${match[2]}`, 10) : startYear;
    return {
      birthYearStart: startYear,
      birthYearEnd: endYear,
    };
  }
  return { birthYearStart: null, birthYearEnd: null };
}

/**
 * Step 1: Analyze existing teams and create migration mapping
 */
async function analyzeTeams(): Promise<void> {
  console.log('📊 Analyzing existing teams using Teams sheet...\n');
  
  // Load Teams sheet data
  let teamsSheetData: TeamsSheetRow[] = [];
  try {
    console.log('Reading Teams sheet from Google Sheets...');
    teamsSheetData = await fetchSheetData('Teams!A1:ZZ1000') as TeamsSheetRow[];
    console.log(`✓ Found ${teamsSheetData.length} team(s) in Teams sheet\n`);
  } catch (error: any) {
    console.error('⚠️  Could not read Teams sheet:', error.message);
    console.log('Continuing with slug-based parsing only...\n');
  }
  
  // Create lookup map from Teams sheet
  const teamsSheetMap = new Map<string, TeamsSheetRow>();
  for (const row of teamsSheetData) {
    const key = row.Teams || row['2025_name'] || '';
    if (key) {
      teamsSheetMap.set(key.trim(), row);
    }
    // Also index by translated name for reverse lookup
    if (row['2025_name_translated']) {
      teamsSheetMap.set(row['2025_name_translated'].trim(), row);
    }
  }
  
  // Get or create season 2025
  let season2025 = await db
    .selectFrom('seasons')
    .selectAll()
    .where('name', '=', '2025')
    .executeTakeFirst();
  
  if (!season2025) {
    console.log('Creating season 2025...');
    const now = new Date().toISOString();
    const result = await db
      .insertInto('seasons')
      .values({
        name: '2025',
        start_date: null,
        end_date: null,
        is_active: 1,
        created_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    
    season2025 = await db
      .selectFrom('seasons')
      .selectAll()
      .where('id', '=', result.id)
      .executeTakeFirstOrThrow();
  }
  
  const seasonYear = parseInt(season2025.name, 10);
  const seasonId = season2025.id;
  
  // Get all existing teams
  const existingTeams = await db
    .selectFrom('teams')
    .selectAll()
    .orderBy('id', 'asc')
    .execute();
  
  console.log(`Found ${existingTeams.length} existing team(s) in database`);
  console.log(`Found ${teamsSheetData.length} team(s) in Teams sheet\n`);
  
  // Create a map of existing teams by various identifiers
  const existingTeamsMap = new Map<string, typeof existingTeams[0]>();
  for (const team of existingTeams) {
    existingTeamsMap.set(team.slug, team);
    existingTeamsMap.set(team.display_name, team);
    if (team.metadata) {
      try {
        const metadata = JSON.parse(team.metadata);
        if (metadata.translatedName) {
          existingTeamsMap.set(metadata.translatedName, team);
        }
      } catch {}
    }
  }
  
  const mappings: TeamMigrationMapping[] = [];
  
  // First, process existing teams (migrate/update them)
  if (existingTeams.length > 0) {
    console.log('📋 Processing existing teams in database...\n');
    for (const team of existingTeams) {
    const metadata = team.metadata ? JSON.parse(team.metadata) : {};
    const notes: string[] = [];
    
    // Try to match with Teams sheet
    let teamsSheetMatch: TeamsSheetRow | null = null;
    
    // Try matching by display name first
    teamsSheetMatch = teamsSheetMap.get(team.display_name.trim()) || null;
    
    // Try matching by slug
    if (!teamsSheetMatch) {
      teamsSheetMatch = teamsSheetMap.get(team.slug.trim()) || null;
    }
    
    // Try matching by translated name if it exists in metadata
    if (!teamsSheetMatch && metadata.translatedName) {
      teamsSheetMatch = teamsSheetMap.get(metadata.translatedName.trim()) || null;
    }
    
    let gender: 'boys' | 'girls' = 'boys';
    let level: string = 'U13';
    let variant: 'volt' | 'valor' | 'black' = 'volt';
    let birthYearStart: number = 2013;
    let birthYearEnd: number = 2014;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let translatedName: string | null = null;
    
    if (teamsSheetMatch) {
      notes.push(`✓ Matched with Teams sheet: "${teamsSheetMatch.Teams || teamsSheetMatch['2025_name']}"`);
      
      // Use translated name to parse structured data
      translatedName = teamsSheetMatch['2025_name_translated'] || null;
      const originalName = teamsSheetMatch.Teams || teamsSheetMatch['2025_name'] || team.display_name;
      
      // Read variant from Variant column (preferred over parsing from name)
      if (teamsSheetMatch.Variant) {
        variant = parseVariant(teamsSheetMatch.Variant);
        notes.push(`  Variant from column: ${variant}`);
      }
      
      if (translatedName) {
        const parsed = parseTranslatedName(translatedName);
        if (parsed.gender) gender = parsed.gender;
        if (parsed.level) level = parsed.level;
        // If variant wasn't in column, try to infer from name (fallback)
        if (!teamsSheetMatch.Variant) {
          const upper = translatedName.toUpperCase();
          if (upper.includes('VR')) variant = 'valor';
          else if (upper.includes('BLACK') || upper.includes('BL') || upper.includes('-BLACK')) variant = 'black';
          else variant = 'volt';
          notes.push(`  Variant inferred from name: ${variant}`);
        }
        notes.push(`  Parsed from translated name "${translatedName}": ${gender}, ${level}`);
        parsed.notes.forEach(n => notes.push(`  ${n}`));
      }
      
      // Parse birth year from original name
      const birthYear = parseBirthYear(originalName);
      if (birthYear.birthYearStart) {
        birthYearStart = birthYear.birthYearStart;
        birthYearEnd = birthYear.birthYearEnd || birthYearStart;
        notes.push(`  Birth year from original name: ${birthYearStart}${birthYearEnd !== birthYearStart ? `-${birthYearEnd}` : ''}`);
      }
      
      confidence = 'high';
    } else {
      // Fallback: try to parse from slug/display name
      notes.push('⚠️  No match in Teams sheet, attempting to parse from slug/name');
      
      const slugUpper = team.slug.toUpperCase();
      const nameUpper = team.display_name.toUpperCase();
      
      // Try to extract from slug
      if (slugUpper.match(/^[BG]U\d+/)) {
        const parsed = parseTranslatedName(team.slug);
        if (parsed.gender) gender = parsed.gender;
        if (parsed.level) level = parsed.level;
        // Infer variant from slug
        if (slugUpper.includes('VR')) variant = 'valor';
        else if (slugUpper.includes('BL')) variant = 'black';
        else variant = 'volt';
        notes.push(`  Parsed from slug: ${gender}, ${level}, ${variant}`);
      }
      
      // Try to extract birth year from name
      const birthYear = parseBirthYear(team.display_name) || parseBirthYear(team.slug);
      if (birthYear.birthYearStart) {
        birthYearStart = birthYear.birthYearStart;
        birthYearEnd = birthYear.birthYearEnd || birthYearStart;
        notes.push(`  Birth year parsed: ${birthYearStart}`);
      } else {
        notes.push('  ⚠️  Could not determine birth year - needs manual review');
      }
      
      confidence = teamsSheetMatch ? 'high' : (birthYear.birthYearStart ? 'medium' : 'low');
    }
    
    // Generate new slug with season year
    const newSlug = generateTeamSlug({
      gender,
      level: normalizeLevel(level),
      variant,
      seasonYear: season2025.name,
    });
    
    // Generate new display name
    const variantSuffix = variant === 'valor' ? ' Valor' : variant === 'black' ? ' Black' : '';
    const newDisplayName = `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix} (${birthYearStart}-${birthYearEnd})`;
    
    const needsManualReview = confidence === 'low' || !birthYearStart;
    
    const mapping: TeamMigrationMapping = {
      oldTeamId: team.id,
      oldSlug: team.slug,
      oldDisplayName: team.display_name,
      oldMetadata: metadata,
      oldSeasonId: team.season_id,
      isNewTeam: false,
      
      teamsSheetMatch: teamsSheetMatch ? {
        originalName: teamsSheetMatch.Teams || teamsSheetMatch['2025_name'] || '',
        translatedName: teamsSheetMatch['2025_name_translated'] || '',
        season: parseInt(String(teamsSheetMatch.Season || '2025'), 10),
      } : null,
      
      newSeasonId: seasonId,
      newGender: gender,
      newLevel: level,
      newVariant: variant,
      newBirthYearStart: birthYearStart,
      newBirthYearEnd: birthYearEnd,
      newSlug,
      newDisplayName,
      
      confidence,
      needsManualReview,
      notes,
    };
    
    mappings.push(mapping);
    
    // Print analysis
    console.log(`Team ID ${team.id}: ${team.slug} → ${newSlug}`);
    console.log(`  Display: "${team.display_name}" → "${newDisplayName}"`);
    console.log(`  Gender: ${gender}, Level: ${level}, Variant: ${variant}, Birth Year: ${birthYearStart}-${birthYearEnd}`);
    console.log(`  Confidence: ${confidence.toUpperCase()}${needsManualReview ? ' ⚠️ NEEDS REVIEW' : ''}`);
    if (teamsSheetMatch) {
      console.log(`  Teams Sheet: "${teamsSheetMatch.Teams || teamsSheetMatch['2025_name']}" → "${translatedName}"`);
    }
    notes.forEach(note => console.log(`  - ${note}`));
    console.log('');
    }
  } else {
    console.log('No existing teams to migrate.\n');
  }
  
  // Second, process teams from Google Sheet that don't exist in DB (create them)
  console.log('📋 Processing teams from Google Sheet...\n');
  const processedSheetTeams = new Set<string>(); // Track which sheet teams we've already processed
  
  for (const row of teamsSheetData) {
    const originalName = row.Teams || row['2025_name'] || '';
    const translatedName = row['2025_name_translated'] || '';
    
    if (!originalName && !translatedName) continue;
    
    // Check if this team already exists (was processed above)
    const key = originalName.trim() || translatedName.trim();
    if (processedSheetTeams.has(key)) continue;
    
    // Check if team already exists in database
    const existingTeam = existingTeamsMap.get(originalName) || 
                         existingTeamsMap.get(translatedName) ||
                         existingTeams.find(t => 
                           t.display_name === originalName || 
                           t.slug === translatedName ||
                           (t.metadata && JSON.parse(t.metadata).translatedName === translatedName)
                         );
    
    if (existingTeam) {
      processedSheetTeams.add(key);
      continue; // Already processed above
    }
    
    // This is a new team from the sheet - create mapping to create it
    processedSheetTeams.add(key);
    
    const notes: string[] = [];
    notes.push(`✓ New team from Teams sheet: "${originalName}"`);
    
    // Parse structured data from translated name
    let gender: 'boys' | 'girls' = 'boys';
    let level: string = 'U13';
    let variant: 'volt' | 'valor' | 'black' = 'volt';
    
    if (translatedName) {
      const parsed = parseTranslatedName(translatedName);
      if (parsed.gender) gender = parsed.gender;
      if (parsed.level) level = parsed.level;
      notes.push(`  Parsed from translated name "${translatedName}": ${gender}, ${level}`);
    }
    
    // Read variant from Variant column
    if (row.Variant) {
      variant = parseVariant(row.Variant);
      notes.push(`  Variant from column: ${variant}`);
    } else if (translatedName) {
      // Fallback: infer from name
      const upper = translatedName.toUpperCase();
      if (upper.includes('VR')) variant = 'valor';
      else if (upper.includes('BLACK') || upper.includes('BL') || upper.includes('-BLACK')) variant = 'black';
      else variant = 'volt';
      notes.push(`  Variant inferred from name: ${variant}`);
    }
    
    // Parse birth year from original name
    const birthYear = parseBirthYear(originalName);
    let birthYearStart: number = 2013;
    let birthYearEnd: number = 2014;
    
    if (birthYear.birthYearStart) {
      birthYearStart = birthYear.birthYearStart;
      birthYearEnd = birthYear.birthYearEnd || birthYearStart;
      notes.push(`  Birth year from original name: ${birthYearStart}${birthYearEnd !== birthYearStart ? `-${birthYearEnd}` : ''}`);
    } else {
      notes.push('  ⚠️  Could not determine birth year - needs manual review');
      // Try to infer from level (rough estimate)
      const levelMatch = level.match(/U(\d+)/);
      if (levelMatch) {
        const age = parseInt(levelMatch[1], 10);
        const currentYear = new Date().getFullYear();
        birthYearStart = currentYear - age;
        birthYearEnd = birthYearStart;
        notes.push(`  Estimated birth year from level: ${birthYearStart}`);
      }
    }
    
    // Generate new slug with season year
    const newSlug = generateTeamSlug({
      gender,
      level: normalizeLevel(level),
      variant,
      seasonYear: season2025.name,
    });
    
    // Generate new display name
    const variantSuffix = variant === 'valor' ? ' Valor' : variant === 'black' ? ' Black' : '';
    const newDisplayName = `${level} ${gender === 'boys' ? 'Boys' : 'Girls'}${variantSuffix} (${birthYearStart}-${birthYearEnd})`;
    
    const confidence = birthYear.birthYearStart ? 'high' : 'medium';
    const needsManualReview = !birthYear.birthYearStart;
    
    const mapping: TeamMigrationMapping = {
      isNewTeam: true,
      teamsSheetRow: row,
      
      teamsSheetMatch: {
        originalName,
        translatedName,
        season: parseInt(String(row.Season || '2025'), 10),
      },
      
      newSeasonId: seasonId,
      newGender: gender,
      newLevel: level,
      newVariant: variant,
      newBirthYearStart: birthYearStart,
      newBirthYearEnd: birthYearEnd,
      newSlug,
      newDisplayName,
      
      confidence,
      needsManualReview,
      notes,
    };
    
    mappings.push(mapping);
    
    // Print analysis
    console.log(`New Team: ${originalName} → ${newSlug}`);
    console.log(`  Display: "${newDisplayName}"`);
    console.log(`  Gender: ${gender}, Level: ${level}, Variant: ${variant}, Birth Year: ${birthYearStart}-${birthYearEnd}`);
    console.log(`  Confidence: ${confidence.toUpperCase()}${needsManualReview ? ' ⚠️ NEEDS REVIEW' : ''}`);
    notes.forEach(note => console.log(`  - ${note}`));
    console.log('');
  }
  
  // Save mapping to file
  const mappingPath = path.join(__dirname, '../../team-migration-map.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2));
  
  const needsReview = mappings.filter(m => m.needsManualReview).length;
  const highConfidence = mappings.filter(m => m.confidence === 'high').length;
  const mediumConfidence = mappings.filter(m => m.confidence === 'medium').length;
  
  console.log(`\n✓ Analysis complete!`);
  console.log(`  Total teams: ${mappings.length}`);
  console.log(`  High confidence: ${highConfidence}`);
  console.log(`  Medium confidence: ${mediumConfidence}`);
  console.log(`  Needs manual review: ${needsReview}`);
  console.log(`\n📄 Mapping saved to: ${mappingPath}`);
  if (needsReview > 0) {
    console.log(`\n⚠️  Please review and edit the mapping file before executing migration!`);
  }
}

/**
 * Step 2: Execute migration using the mapping file
 */
async function executeMigration(): Promise<void> {
  console.log('🚀 Executing team migration...\n');
  
  const mappingPath = path.join(__dirname, '../../team-migration-map.json');
  
  if (!fs.existsSync(mappingPath)) {
    console.error('❌ Migration mapping file not found!');
    console.error(`   Run analysis first: npm run migrate-teams:analyze`);
    process.exit(1);
  }
  
  const mappings: TeamMigrationMapping[] = JSON.parse(
    fs.readFileSync(mappingPath, 'utf-8')
  );
  
  if (mappings.length === 0) {
    console.log('✓ No teams to migrate.');
    return;
  }
  
  // Create backup
  const backupPath = path.join(__dirname, `../../team-migration-backup-${Date.now()}.json`);
  const allTeams = await db.selectFrom('teams').selectAll().execute();
  fs.writeFileSync(backupPath, JSON.stringify(allTeams, null, 2));
  console.log(`📦 Backup created: ${backupPath}\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const mapping of mappings) {
    try {
      // Get season year for slug generation
      const season = await db
        .selectFrom('seasons')
        .select(['name'])
        .where('id', '=', mapping.newSeasonId)
        .executeTakeFirst();
      
      if (!season) {
        throw new Error(`Season ${mapping.newSeasonId} not found`);
      }
      
      // Regenerate slug with season year
      const finalSlug = generateTeamSlug({
        gender: mapping.newGender,
        level: mapping.newLevel,
        variant: mapping.newVariant,
        seasonYear: season.name,
      });
      
      if (mapping.isNewTeam) {
        // Create new team
        const now = new Date().toISOString();
        const result = await db
          .insertInto('teams')
          .values({
            display_name: mapping.newDisplayName,
            slug: finalSlug,
            metadata: mapping.teamsSheetRow ? JSON.stringify({
              originalName: mapping.teamsSheetMatch?.originalName,
              translatedName: mapping.teamsSheetMatch?.translatedName,
            }) : '{}',
            season_id: mapping.newSeasonId,
            gender: mapping.newGender,
            level: mapping.newLevel,
            variant: mapping.newVariant,
            birth_year_start: mapping.newBirthYearStart,
            birth_year_end: mapping.newBirthYearEnd,
            parent_team_id: null,
            is_active: 1,
            created_at: now,
            updated_at: now,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        
        console.log(`✓ Created new team ${result.id}: ${finalSlug} (${mapping.newDisplayName})`);
        successCount++;
      } else if (mapping.oldTeamId) {
        // Update existing team
        await db
          .updateTable('teams')
          .set({
            season_id: mapping.newSeasonId,
            gender: mapping.newGender,
            level: mapping.newLevel,
            variant: mapping.newVariant,
            birth_year_start: mapping.newBirthYearStart,
            birth_year_end: mapping.newBirthYearEnd,
            slug: finalSlug,
            display_name: mapping.newDisplayName,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', mapping.oldTeamId)
          .execute();
        
        console.log(`✓ Migrated team ${mapping.oldTeamId}: ${mapping.oldSlug} → ${finalSlug}`);
        successCount++;
      } else {
        throw new Error('Invalid mapping: neither isNewTeam nor oldTeamId set');
      }
    } catch (error: any) {
      const teamId = mapping.isNewTeam ? 'new' : mapping.oldTeamId;
      console.error(`❌ Failed to ${mapping.isNewTeam ? 'create' : 'migrate'} team ${teamId}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (errorCount > 0) {
    console.log(`\n⚠️  Some teams failed to migrate. Check the errors above.`);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (command === 'analyze' || command === '--analyze' || !command) {
    await analyzeTeams();
  } else if (command === 'execute' || command === '--execute') {
    await executeMigration();
  } else {
    console.error('Usage:');
    console.error('  npm run migrate-teams:analyze  - Analyze teams and create mapping');
    console.error('  npm run migrate-teams:execute  - Execute migration using mapping');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
