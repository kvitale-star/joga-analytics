import { db } from '../dist/db/database.js';

async function deleteMatches() {
  try {
    // Get all matches
    const matches = await db.selectFrom('matches').selectAll().execute();
    console.log(`Found ${matches.length} match(es) in database:`);
    matches.forEach(m => {
      console.log(`  - ID: ${m.id}, Opponent: ${m.opponent_name || 'N/A'}, Date: ${m.match_date || 'N/A'}`);
    });

    if (matches.length === 0) {
      console.log('No matches to delete.');
      await db.destroy();
      process.exit(0);
    }

    // Delete all matches
    await db.deleteFrom('matches').execute();
    console.log(`\n✅ Deleted ${matches.length} match(es) from database.`);
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

deleteMatches();
