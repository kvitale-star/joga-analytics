import { db } from '../dist/db/database.js';

async function checkMatches() {
  try {
    const matches = await db.selectFrom('matches').selectAll().execute();
    console.log(`Found ${matches.length} match(es) in database.`);
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  - ID: ${m.id}, Opponent: ${m.opponent_name || 'N/A'}, Date: ${m.match_date || 'N/A'}`);
      });
    } else {
      console.log('✅ Database is clean - no matches found.');
    }
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

checkMatches();
