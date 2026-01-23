/**
 * Fix Volt team slugs in 2025 season to include "VT" suffix
 * 
 * This script updates all Volt teams in the 2025 season that don't have "VT" in their slug.
 * Example: BU12-2025 → BU12VT-2025
 */

import { db } from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixVoltSlugs2025(): Promise<void> {
  console.log('🔧 Fixing Volt team slugs in 2025 season...\n');

  // Get 2025 season
  const season2025 = await db
    .selectFrom('seasons')
    .selectAll()
    .where('name', '=', '2025')
    .executeTakeFirst();

  if (!season2025) {
    console.error('❌ Season 2025 not found');
    process.exit(1);
  }

  console.log(`Found season 2025 (ID: ${season2025.id})\n`);

  // Get all Volt teams in 2025 that don't have "VT" in their slug
  const voltTeams = await db
    .selectFrom('teams')
    .selectAll()
    .where('season_id', '=', season2025.id)
    .where('variant', '=', 'volt')
    .where('slug', 'not like', '%VT%')
    .execute();

  if (voltTeams.length === 0) {
    console.log('✓ No Volt teams found that need updating.');
    return;
  }

  console.log(`Found ${voltTeams.length} Volt team(s) that need slug updates:\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const team of voltTeams) {
    try {
      // Generate new slug with VT suffix
      // Current slug format: BU12-2025
      // New slug format: BU12VT-2025
      const newSlug = team.slug.replace(/-2025$/, 'VT-2025');

      // Check if new slug already exists
      const existing = await db
        .selectFrom('teams')
        .select(['id'])
        .where('slug', '=', newSlug)
        .executeTakeFirst();

      if (existing) {
        console.error(`⚠️  Team ${team.id} (${team.slug}): New slug ${newSlug} already exists, skipping`);
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

      console.log(`✓ Updated team ${team.id}: ${team.slug} → ${newSlug}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to update team ${team.id} (${team.slug}): ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Update complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (errorCount > 0) {
    console.log(`\n⚠️  Some teams failed to update. Check the errors above.`);
  }
}

fixVoltSlugs2025()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
