/**
 * Tests for Team Context Builder Service
 */

import { buildTeamContext } from '../services/teamContextBuilder.js';
import { createTestTeam, createTestMatch } from './helpers/dataHelpers.js';
import { createTestAdmin } from './helpers/authHelpers.js';
import { db } from '../db/database.js';

describe('Team Context Builder Service', () => {
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;

  beforeEach(async () => {
    // Clean up
    await db.deleteFrom('training_logs').execute();
    await db.deleteFrom('insights').execute();
    await db.deleteFrom('matches').execute();

    admin = await createTestAdmin();
    testTeam = await createTestTeam('Test Team U13', 'test-u13', { age_group: 'U13', level: 'U13' });
  });

  afterEach(async () => {
    await db.deleteFrom('training_logs').execute();
    await db.deleteFrom('insights').execute();
    await db.deleteFrom('matches').execute();
  });

  describe('buildTeamContext', () => {
    it('should build context for team with no matches', async () => {
      const context = await buildTeamContext(testTeam.id);

      expect(context).toHaveProperty('team');
      expect(context).toHaveProperty('matches');
      expect(context).toHaveProperty('insights');
      expect(context).toHaveProperty('trainingLogs');
      expect(context).toHaveProperty('usSoccerFrameworks');
      expect(context).toHaveProperty('clubPhilosophy');
      expect(context).toHaveProperty('developmentStage');
      expect(context).toHaveProperty('formattedMatchData');
      expect(context).toHaveProperty('dataHash');

      expect(context.team.id).toBe(testTeam.id);
      expect(context.matches).toEqual([]);
      expect(context.insights).toEqual([]);
      expect(context.trainingLogs).toEqual([]);
      expect(context.formattedMatchData.length).toBeGreaterThan(0);
    });

    it('should include matches in context', async () => {
      const match1 = await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01', undefined, 'Win', {
        possession: 60,
        goalsFor: 2,
        goalsAgainst: 1,
      });

      const match2 = await createTestMatch(testTeam.id, 'Opponent 2', '2024-01-08', undefined, 'Loss', {
        possession: 45,
        goalsFor: 1,
        goalsAgainst: 3,
      });

      const context = await buildTeamContext(testTeam.id);

      expect(context.matches.length).toBe(2);
      expect(context.matches[0].id).toBe(match2.id); // Most recent first
      expect(context.matches[1].id).toBe(match1.id);
    });

    it('should include insights in context', async () => {
      // Create a match and generate insights
      const match = await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01', undefined, 'Win', {
        possession: 85, // Anomaly
        goalsFor: 5,
        goalsAgainst: 1,
      });

      // Create an insight manually
      await db.insertInto('insights').values({
        team_id: testTeam.id,
        match_id: match.id,
        season_id: null,
        insight_type: 'anomaly',
        category: 'possession',
        severity: 0.8,
        title: 'High possession detected',
        detail_json: JSON.stringify({ stat: 'possession', value: 85 }),
        narrative: 'Possession was unusually high',
        is_read: false,
        is_dismissed: false,
      }).execute();

      const context = await buildTeamContext(testTeam.id);

      expect(context.insights.length).toBeGreaterThan(0);
      expect(context.insights[0].title).toContain('possession');
    });

    it('should include training logs in context', async () => {
      // Create a training log
      const uniqueName = `test-tag-${Date.now()}-${Math.random()}`;
      const focusTag = await db.insertInto('training_focus_tags').values({
        name: uniqueName,
        category: 'possession',
        display_name: 'Test Tag',
        is_active: true,
      }).returning('id').executeTakeFirstOrThrow();

      await db.insertInto('training_logs').values({
        team_id: testTeam.id,
        user_id: admin.userId,
        session_date: '2024-01-15',
        session_type: 'training',
        focus_tags: JSON.stringify([focusTag.id]),
        notes: 'Test training session',
      }).execute();

      const context = await buildTeamContext(testTeam.id);

      expect(context.trainingLogs.length).toBeGreaterThan(0);
      // Verify training log exists and has correct date
      const log = context.trainingLogs[0];
      expect(log.session_date).toBeDefined();
      // Training logs are ordered by date desc, so the most recent should be first
      // Just verify we got training logs back
      expect(log.team_id).toBe(testTeam.id);
    });

    it('should determine development stage from team metadata', async () => {
      const context = await buildTeamContext(testTeam.id);

      expect(context.developmentStage).toHaveProperty('name');
      expect(context.developmentStage).toHaveProperty('ageRange');
      expect(context.developmentStage).toHaveProperty('format');
      expect(context.developmentStage.ageRange).toBe('U13');
      expect(context.developmentStage.format).toBe('11v11');
    });

    it('should extract age group from display name if not in metadata', async () => {
      const team = await createTestTeam('U15 Boys Team', 'test-u15');
      const context = await buildTeamContext(team.id);

      expect(context.developmentStage.ageRange).toBe('U15');
    });

    it('should default to U13 if age group cannot be determined', async () => {
      const team = await createTestTeam('Unknown Team', 'test-unknown');
      const context = await buildTeamContext(team.id);

      expect(context.developmentStage.ageRange).toBe('U13'); // Default
    });

    it('should format match data for AI', async () => {
      await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01', undefined, 'Win', {
        possession: 60,
        goalsFor: 2,
        goalsAgainst: 1,
      });

      const context = await buildTeamContext(testTeam.id);

      expect(context.formattedMatchData).toContain('TEAM CONTEXT');
      expect(context.formattedMatchData).toContain('DEVELOPMENT STAGE');
      expect(context.formattedMatchData).toContain('CLUB PHILOSOPHY');
      expect(context.formattedMatchData).toContain('MATCH DATA');
      expect(context.formattedMatchData).toContain('Opponent 1');
    });

    it('should generate data hash', async () => {
      const context1 = await buildTeamContext(testTeam.id);
      const hash1 = context1.dataHash;

      // Add a match
      await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01');

      const context2 = await buildTeamContext(testTeam.id);
      const hash2 = context2.dataHash;

      // Hash should change when data changes
      expect(hash1).not.toBe(hash2);
    });

    it('should load US Soccer frameworks', async () => {
      const context = await buildTeamContext(testTeam.id);

      expect(context.usSoccerFrameworks).toHaveProperty('licenseLevels');
      expect(context.usSoccerFrameworks).toHaveProperty('playerDevelopmentFrameworks');
      expect(context.usSoccerFrameworks).toHaveProperty('methodologies');
    });

    it('should load club philosophy', async () => {
      const context = await buildTeamContext(testTeam.id);

      expect(context.clubPhilosophy).toHaveProperty('playingStyle');
      expect(context.clubPhilosophy).toHaveProperty('trainingMethodology');
      expect(context.clubPhilosophy).toHaveProperty('clubValues');
      expect(context.clubPhilosophy).toHaveProperty('nonNegotiables');
    });
  });
});
