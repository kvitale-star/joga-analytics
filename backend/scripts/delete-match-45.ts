import { db } from '../src/db/database.js';

async function deleteMatch45() {
  try {
    // Check if match 45 exists
    const match = await db
      .selectFrom('matches')
      .selectAll()
      .where('id', '=', 45)
      .executeTakeFirst();

    if (!match) {
      console.log('❌ Match ID 45 not found in database.');
      await db.destroy();
      process.exit(0);
    }

    console.log(`Found match ID 45:`);
    console.log(`  - Opponent: ${match.opponent_name || 'N/A'}`);
    console.log(`  - Date: ${match.match_date || 'N/A'}`);
    console.log(`  - Team ID: ${match.team_id || 'N/A'}`);

    // Delete any associated game events first (if they exist)
    const eventsDeleted = await db
      .deleteFrom('game_events')
      .where('match_id', '=', 45)
      .execute();
    console.log(`\nDeleted ${eventsDeleted.length} game event(s) associated with match 45.`);

    // Delete the match
    await db
      .deleteFrom('matches')
      .where('id', '=', 45)
      .execute();

    console.log(`\n✅ Successfully deleted match ID 45 from database.`);
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

deleteMatch45();
