/**
 * Seed Training Focus Tags
 * 
 * Populates the training_focus_tags table with the initial taxonomy.
 * Run this script after migration 10.
 */

import { db } from '../db/database.js';
import { runMigrations } from '../db/migrations.js';

const FOCUS_TAGS = [
  // POSSESSION
  { name: 'possession-general', category: 'possession', display_name: 'Possession', sort_order: 1 },
  { name: 'possession-under-pressure', category: 'possession', display_name: 'Possession Under Pressure', sort_order: 2 },
  { name: 'build-up-play', category: 'possession', display_name: 'Build-Up Play', sort_order: 3 },
  { name: 'playing-out-from-back', category: 'possession', display_name: 'Playing Out From Back', sort_order: 4 },
  { name: 'switching-play', category: 'possession', display_name: 'Switching Play', sort_order: 5 },
  { name: 'pass-strings', category: 'possession', display_name: 'Pass Strings / Combinations', sort_order: 6 },

  // ATTACKING
  { name: 'finishing', category: 'attacking', display_name: 'Finishing / Shooting', sort_order: 1 },
  { name: 'creating-chances', category: 'attacking', display_name: 'Creating Chances', sort_order: 2 },
  { name: 'movement-off-ball', category: 'attacking', display_name: 'Movement Off the Ball', sort_order: 3 },
  { name: 'crossing', category: 'attacking', display_name: 'Crossing', sort_order: 4 },
  { name: 'set-piece-attacking', category: 'attacking', display_name: 'Set Pieces — Attacking', sort_order: 5 },

  // DEFENDING
  { name: 'pressing', category: 'defending', display_name: 'Pressing / High Press', sort_order: 1 },
  { name: 'defensive-shape', category: 'defending', display_name: 'Defensive Shape', sort_order: 2 },
  { name: '1v1-defending', category: 'defending', display_name: '1v1 Defending', sort_order: 3 },
  { name: 'recovery-runs', category: 'defending', display_name: 'Recovery Runs', sort_order: 4 },
  { name: 'set-piece-defending', category: 'defending', display_name: 'Set Pieces — Defending', sort_order: 5 },

  // TRANSITION
  { name: 'counter-attack', category: 'transition', display_name: 'Counter-Attacking', sort_order: 1 },
  { name: 'counter-press', category: 'transition', display_name: 'Counter-Press / Transition Defense', sort_order: 2 },
  { name: 'transition-speed', category: 'transition', display_name: 'Transition Speed', sort_order: 3 },

  // TECHNICAL
  { name: 'first-touch', category: 'technical', display_name: 'First Touch', sort_order: 1 },
  { name: 'passing-accuracy', category: 'technical', display_name: 'Passing Accuracy', sort_order: 2 },
  { name: 'dribbling', category: 'technical', display_name: 'Dribbling / Ball Carrying', sort_order: 3 },
  { name: 'heading', category: 'technical', display_name: 'Heading', sort_order: 4 },

  // FITNESS
  { name: 'endurance', category: 'fitness', display_name: 'Endurance / 2nd Half Fitness', sort_order: 1 },
  { name: 'speed', category: 'fitness', display_name: 'Speed & Agility', sort_order: 2 },
  { name: 'game-fitness', category: 'fitness', display_name: 'Game-Realistic Fitness', sort_order: 3 },
];

async function seedTrainingTags() {
  console.log('🌱 Seeding training focus tags...');

  // Ensure migrations are run first
  await runMigrations();

  let inserted = 0;
  let skipped = 0;

  for (const tag of FOCUS_TAGS) {
    try {
      await db
        .insertInto('training_focus_tags')
        .values({
          name: tag.name,
          category: tag.category,
          display_name: tag.display_name,
          sort_order: tag.sort_order,
          is_active: true,
        })
        .onConflict((oc) => oc
          .column('name')
          .doUpdateSet({
            category: tag.category,
            display_name: tag.display_name,
            sort_order: tag.sort_order,
            is_active: true,
          })
        )
        .execute();
      inserted++;
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('UNIQUE constraint')) {
        skipped++;
      } else {
        console.error(`❌ Error inserting tag ${tag.name}:`, error.message);
        throw error;
      }
    }
  }

  console.log(`✅ Seeded ${inserted} training focus tags (${skipped} already existed)`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTrainingTags()
    .then(() => {
      console.log('✅ Seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedTrainingTags };
