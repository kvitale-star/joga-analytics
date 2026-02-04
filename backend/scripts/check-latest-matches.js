import { db } from '../dist/db/database.js';

async function checkLatestMatches() {
  try {
    const matches = await db
      .selectFrom('matches')
      .selectAll()
      .orderBy('id', 'desc')
      .limit(5)
      .execute();

    console.log(`Found ${matches.length} most recent matches:\n`);
    
    matches.forEach(m => {
      console.log(`Match ID: ${m.id}`);
      console.log(`  Date: ${m.match_date}`);
      console.log(`  Opponent: ${m.opponent_name}`);
      console.log(`  Team ID: ${m.team_id || 'null'}`);
      console.log(`  Match ID External: ${m.match_id_external || 'null'}`);
      console.log(`  Stats JSON keys: ${m.stats_json ? Object.keys(JSON.parse(m.stats_json)).length : 0} fields`);
      console.log(`  Created At: ${m.created_at}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkLatestMatches();
