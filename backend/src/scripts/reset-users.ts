/**
 * Reset Users Script
 * 
 * Deletes all users and sessions from the database
 * Use this to start fresh with user setup
 * 
 * Run with: npm run reset-users
 * Or: tsx src/scripts/reset-users.ts
 */

import { db, sqliteDb } from '../db/database.js';

async function resetUsers() {
  try {
    console.log('🔄 Resetting users and sessions...');
    
    // Delete all sessions first (foreign key constraint)
    const sessionsDeleted = await db
      .deleteFrom('sessions')
      .execute();
    console.log(`✓ Deleted all sessions`);
    
    // Delete all user-team assignments
    const assignmentsDeleted = await db
      .deleteFrom('user_teams')
      .execute();
    console.log(`✓ Deleted all user-team assignments`);
    
    // Delete all users
    const usersDeleted = await db
      .deleteFrom('users')
      .execute();
    console.log(`✓ Deleted all users`);
    
    console.log('\n✅ Users and sessions reset complete!');
    console.log('You can now create a new admin account through the setup wizard.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error resetting users:', error);
    process.exit(1);
  }
}

resetUsers();
