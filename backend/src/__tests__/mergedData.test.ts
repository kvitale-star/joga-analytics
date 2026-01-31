/**
 * Tests for Merged Data Service
 * 
 * Verifies that Google Sheets and PostgreSQL data are correctly merged,
 * with proper Match ID preservation and deduplication.
 * 
 * Note: These tests focus on the merge logic and Match ID preservation.
 * Full integration tests with mocked Google Sheets would require more complex setup.
 */

import { getMergedMatchData } from '../services/mergedDataService.js';
import { createTestTeam, createTestMatch } from './helpers/dataHelpers.js';
import { cleanupTestData } from './helpers/testHelpers.js';
import { db } from '../db/database.js';

describe('Merged Data Service - Database Integration', () => {
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create a test team
    testTeam = await createTestTeam();
  });

  afterEach(async () => {
    // Clean up test data
    await db.deleteFrom('matches').where('team_id', '=', testTeam.id).execute();
  });

  describe('Database Match ID Handling', () => {
    it('should use database ID for matches that only exist in database', async () => {
      const matchDate = '2025-01-20';
      const opponentName = 'Database Only Opponent';

      // Create a database match
      const dbMatch = await createTestMatch(
        testTeam.id,
        opponentName,
        matchDate,
        'Tournament',
        'Win',
        {
          goalsFor: 2,
          goalsAgainst: 0,
        }
      );

      // Get merged data (will only have DB data since Sheets will fail or return empty)
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Debug: Log what we're looking for and what we got
      console.log('Looking for match with:', { matchDate, opponentName });
      console.log('Total merged matches:', merged.length);
      console.log('Sample matches:', merged.slice(0, 3).map(m => ({
        date: m['Date'] || m['date'],
        dateType: typeof (m['Date'] || m['date']),
        opponent: m['Opponent'] || m['opponent'],
        matchId: m['Match ID'] || m['match id'] || m['MatchId'] || m['matchId']
      })));

      // Find our test match - handle both string and Date object formats
      const testMatch = merged.find(m => {
        const mDate: any = m['Date'] || m['date'] || '';
        let dateStr = '';
        if (mDate instanceof Date) {
          dateStr = mDate.toISOString().split('T')[0];
        } else if (typeof mDate === 'string') {
          dateStr = mDate.split('T')[0]; // Handle ISO strings like "2025-01-20T00:00:00.000Z"
        } else {
          dateStr = String(mDate);
        }
        const mOpponent = String(m['Opponent'] || m['opponent'] || '').trim();
        const matchFound = dateStr === matchDate && mOpponent === opponentName;
        if (matchFound) {
          console.log('Found match!', { dateStr, mOpponent, matchId: m['Match ID'] });
        }
        return matchFound;
      });
      
      // Should find the match
      expect(testMatch).toBeDefined();
      
      // Should use database ID (integer)
      expect(testMatch!['Match ID']).toBe(dbMatch.id);
      expect(typeof testMatch!['Match ID']).toBe('number');
      
      // Should have correct data
      expect(testMatch!['Opponent']).toBe(opponentName);
      // Date might be a Date object, so convert to string for comparison
      const testDate: any = testMatch!['Date'] || testMatch!['date'];
      const testDateStr = testDate instanceof Date 
        ? testDate.toISOString().split('T')[0] 
        : String(testDate).split('T')[0];
      expect(testDateStr).toBe(matchDate);
    });

    it('should use Match ID from stats_json if available in database match', async () => {
      const matchDate = '2025-01-25';
      const opponentName = 'Stats JSON Match ID Opponent';

      // Create a database match with Match ID in stats_json
      const dbMatch = await createTestMatch(
        testTeam.id,
        opponentName,
        matchDate,
        'Scrimmage',
        'Draw',
        {
          'Match ID': 'M10050',
          goalsFor: 1,
          goalsAgainst: 1,
        }
      );

      // Get merged data
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Find our test match
      const testMatch = merged.find(m => 
        String(m['Date'] || m['date'] || '') === matchDate &&
        String(m['Opponent'] || m['opponent'] || '') === opponentName
      );
      
      // Should find the match
      expect(testMatch).toBeDefined();
      
      // Should use Match ID from stats_json
      expect(testMatch!['Match ID']).toBe('M10050');
    });
  });

  describe('Deduplication Logic', () => {
    it('should not deduplicate matches with different dates', async () => {
      const opponentName = 'Same Opponent';

      // Create database matches with different dates
      const dbMatch1 = await createTestMatch(
        testTeam.id,
        opponentName,
        '2025-02-05',
        'League',
        'Win',
        { goalsFor: 1 }
      );

      const dbMatch2 = await createTestMatch(
        testTeam.id,
        opponentName,
        '2025-02-10', // Different date
        'League',
        'Win',
        { goalsFor: 2 }
      );

      // Get merged data
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Should have both matches (different dates)
      const matches = merged.filter(m => 
        String(m['Opponent'] || m['opponent'] || '') === opponentName
      );
      
      expect(matches.length).toBeGreaterThanOrEqual(2);
      
      // Both should be present
      const matchIds = matches.map(m => m['Match ID']);
      expect(matchIds).toContain(dbMatch1.id);
      expect(matchIds).toContain(dbMatch2.id);
    });

    it('should not deduplicate matches with different opponents', async () => {
      const matchDate = '2025-02-15';

      // Create database matches with different opponents
      const dbMatch1 = await createTestMatch(
        testTeam.id,
        'Opponent A',
        matchDate,
        'League',
        'Win',
        { goalsFor: 1 }
      );

      const dbMatch2 = await createTestMatch(
        testTeam.id,
        'Opponent B', // Different opponent
        matchDate,
        'League',
        'Win',
        { goalsFor: 2 }
      );

      // Get merged data
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Should have both matches (different opponents)
      const matches = merged.filter(m => 
        String(m['Date'] || m['date'] || '') === matchDate
      );
      
      expect(matches.length).toBeGreaterThanOrEqual(2);
      
      // Both should be present
      const matchIds = matches.map(m => m['Match ID']);
      expect(matchIds).toContain(dbMatch1.id);
      expect(matchIds).toContain(dbMatch2.id);
    });
  });

  describe('Data Precedence', () => {
    it('should include computed stats from database matches', async () => {
      const matchDate = '2025-02-20';
      const opponentName = 'Precedence Test';

      // Create database match with computed stats
      const dbMatch = await createTestMatch(
        testTeam.id,
        opponentName,
        matchDate,
        'League',
        'Win',
        {
          goalsFor: 3,
          goalsAgainst: 1,
          tsr: 75,
          'conversion rate': 30,
        }
      );

      // Get merged data
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Find our test match (handle both string and Date formats)
      // Database returns dates as strings in YYYY-MM-DD format
      const testMatch = merged.find(m => {
        const mDate: any = m['Date'] || m['date'] || '';
        let dateStr = '';
        if (mDate instanceof Date) {
          dateStr = mDate.toISOString().split('T')[0];
        } else if (typeof mDate === 'string') {
          dateStr = mDate.split('T')[0]; // Handle ISO strings
        } else {
          dateStr = String(mDate);
        }
        const mOpponent = String(m['Opponent'] || m['opponent'] || '');
        return dateStr === matchDate && mOpponent === opponentName;
      });
      
      // Should find the match
      expect(testMatch).toBeDefined();
      
      // Should have database stats (check in stats_json or direct fields)
      // Stats are stored in stats_json, so check there
      const goalsFor = testMatch!['Goals For'] || testMatch!['goalsFor'] || testMatch!['goals_for'];
      const tsr = testMatch!['tsr'] || testMatch!['TSR'] || testMatch!['Total Shots Ratio'];
      const convRate = testMatch!['conversion rate'] || testMatch!['Conversion Rate'];
      
      // At least one of these should match
      expect(goalsFor === 3 || testMatch!['goalsFor'] === 3).toBeTruthy();
      expect(tsr === 75 || testMatch!['tsr'] === 75).toBeTruthy();
      expect(convRate === 30 || testMatch!['conversion rate'] === 30).toBeTruthy();
    });
  });

  describe('Sorting', () => {
    it('should sort merged data by date (most recent first)', async () => {
      // Create database matches with different dates
      const dbMatch1 = await createTestMatch(
        testTeam.id,
        'Opponent C',
        '2025-03-15', // Most recent
        'League',
        'Win',
        {}
      );

      const dbMatch2 = await createTestMatch(
        testTeam.id,
        'Opponent D',
        '2025-03-01', // Oldest
        'League',
        'Win',
        {}
      );

      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Should be sorted by date (most recent first)
      expect(merged.length).toBeGreaterThanOrEqual(2);
      
      // Check that dates are in descending order
      for (let i = 0; i < merged.length - 1; i++) {
        const dateA = String(merged[i]['Date'] || merged[i]['date'] || '');
        const dateB = String(merged[i + 1]['Date'] || merged[i + 1]['date'] || '');
        if (dateA && dateB) {
          expect(dateA.localeCompare(dateB)).toBeGreaterThanOrEqual(0);
        }
      }

      // Most recent should be first (handle Date object or string)
      const firstDate: any = merged[0]['Date'] || merged[0]['date'];
      const firstDateStr = firstDate instanceof Date 
        ? firstDate.toISOString().split('T')[0] 
        : String(firstDate).split('T')[0];
      expect(firstDateStr).toBe('2025-03-15');
    });
  });

  describe('Match ID Format Handling', () => {
    it('should handle Match ID stored in stats_json', async () => {
      const matchDate = '2025-02-25';
      const opponentName = 'Format Test Opponent';

      // Create database match with Match ID in stats_json
      const dbMatch = await createTestMatch(
        testTeam.id,
        opponentName,
        matchDate,
        'League',
        'Win',
        {
          'Match ID': 'M10050', // Stored in stats_json
          goalsFor: 2,
        }
      );

      // Get merged data
      const merged = await getMergedMatchData({ teamId: testTeam.id });

      // Find our test match
      const testMatch = merged.find(m => 
        String(m['Date'] || m['date'] || '') === matchDate &&
        String(m['Opponent'] || m['opponent'] || '') === opponentName
      );
      
      // Should find the match
      expect(testMatch).toBeDefined();
      
      // Should use Match ID from stats_json
      expect(testMatch!['Match ID']).toBe('M10050');
    });
  });
});
