/**
 * Migrate all team slugs to new format with dash after level
 * 
 * Old format: BU12VT-2026, BU12VR-2026, BU12BL-2026
 * New format: BU12-VT-2026, BU12-VR-2026, BU12-BL-2026
 * 
 * Also handles teams without variant suffix (legacy): BU12-2026 → BU12-VT-2026
 */

import { db } from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateSlugs(): Promise<void> {
  console.log('🔄 Migrating team slugs to new format (with dash after level)...\n');

  // Get all teams
  const teams = await db
    .selectFrom('teams')
    .selectAll()
    .execute();

  if (teams.length === 0) {
    console.log('✓ No teams found.');
    return;
  }

  console.log(`Found ${teams.length} team(s) to process\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const team of teams) {
    try {
      const currentSlug = team.slug;
      
      // Check if already in new format
      if (currentSlug.includes('-VT-') || currentSlug.includes('-VR-') || currentSlug.includes('-BL-')) {
        skippedCount++;
        continue;
      }

      // Parse current slug to extract components
      // Patterns:
      // - BU12VT-2026 → BU12-VT-2026
      // - BU12VR-2026 → BU12-VR-2026
      // - BU12BL-2026 → BU12-BL-2026
      // - BU12-2026 → BU12-VT-2026 (legacy, assume Volt)
      
      let newSlug: string;
      
      // Check for variant suffixes
      if (currentSlug.includes('VT-') && !currentSlug.includes('-VT-')) {
        // BU12VT-2026 → BU12-VT-2026
        newSlug = currentSlug.replace(/([A-Z]U\d+)(VT)(-\d{4})/, '$1-$2$3');
      } else if (currentSlug.includes('VR-') && !currentSlug.includes('-VR-')) {
        // BU12VR-2026 → BU12-VR-2026
        newSlug = currentSlug.replace(/([A-Z]U\d+)(VR)(-\d{4})/, '$1-$2$3');
      } else if (currentSlug.includes('BL-') && !currentSlug.includes('-BL-')) {
        // BU12BL-2026 → BU12-BL-2026
        newSlug = currentSlug.replace(/([A-Z]U\d+)(BL)(-\d{4})/, '$1-$2$3');
      } else if (currentSlug.match(/^[BG]U\d+-\d{4}$/)) {
        // Legacy format: BU12-2026 → BU12-VT-2026 (assume Volt)
        // Use variant from database if available, otherwise default to Volt
        const variant = team.variant || 'volt';
        const variantSuffix = variant === 'volt' ? '-VT' : variant === 'valor' ? '-VR' : '-BL';
        newSlug = currentSlug.replace(/^([BG]U\d+)(-\d{4})$/, `$1${variantSuffix}$2`);
      } else {
        // Unknown format, skip
        console.log(`⚠️  Skipping team ${team.id} (${currentSlug}): Unknown format`);
        skippedCount++;
        continue;
      }

      // Check if new slug already exists
      const existing = await db
        .selectFrom('teams')
        .select(['id'])
        .where('slug', '=', newSlug)
        .where('id', '!=', team.id)
        .executeTakeFirst();

      if (existing) {
        console.error(`⚠️  Team ${team.id} (${currentSlug}): New slug ${newSlug} already exists, skipping`);
        errorCount++;
        continue;
      }

      // Update the slug
      await db
        .updateTable('teams')
        .set({
          slug: newSlug,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', team.id)
        .execute();

      console.log(`✓ Updated team ${team.id}: ${currentSlug} → ${newSlug}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to update team ${team.id} (${team.slug}): ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped (already in new format): ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (errorCount > 0) {
    console.log(`\n⚠️  Some teams failed to update. Check the errors above.`);
  }
}

migrateSlugs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
