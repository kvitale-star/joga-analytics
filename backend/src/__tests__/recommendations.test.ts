/**
 * Tests for Recommendations Service and Routes
 * Mocks AI service to avoid actual Gemini API calls
 */

import request from 'supertest';
import { cleanupTestData, getTestClient } from './helpers/testHelpers.js';
import { createTestAdmin, createTestCoach, getAuthHeaders } from './helpers/authHelpers.js';
import { createTestTeam, createTestMatch, assignTeamToUser } from './helpers/dataHelpers.js';
import {
  getRecommendationsForTeam,
  markRecommendationAsApplied,
  getRecommendationById,
} from '../services/recommendationService.js';
import { db } from '../db/database.js';

let client: any;
function makeRequest() {
  return client;
}

describe('Recommendations Service', () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let coach: Awaited<ReturnType<typeof createTestCoach>>;
  let coachWithTeam: Awaited<ReturnType<typeof createTestCoach>>;
  let testTeam: Awaited<ReturnType<typeof createTestTeam>>;

  beforeAll(async () => {
    await cleanupTestData();
    client = await getTestClient();
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(async () => {
    admin = await createTestAdmin();
    coach = await createTestCoach();
    coachWithTeam = await createTestCoach(undefined, 'TestPassword123!', 'Coach With Team');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    testTeam = await createTestTeam();
    await assignTeamToUser(coachWithTeam.userId, testTeam.id, admin.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('getRecommendationsForTeam', () => {
    beforeEach(async () => {
      // Create test recommendations
      await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'high',
        title: 'High Priority Recommendation',
        description: 'Description',
        action_items: JSON.stringify(['Action 1']),
        is_applied: false,
      }).execute();

      await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'training',
        category: 'defending',
        priority: 'medium',
        title: 'Medium Priority Recommendation',
        description: 'Description',
        action_items: JSON.stringify(['Action 2']),
        is_applied: true,
      }).execute();
    });

    it('should get all recommendations for a team', async () => {
      const recommendations = await getRecommendationsForTeam(testTeam.id);

      expect(recommendations.length).toBe(2);
    });

    it('should filter by isApplied', async () => {
      const active = await getRecommendationsForTeam(testTeam.id, { isApplied: false });
      const applied = await getRecommendationsForTeam(testTeam.id, { isApplied: true });

      expect(active.length).toBe(1);
      expect(active[0].is_applied).toBe(false);
      expect(applied.length).toBe(1);
      expect(applied[0].is_applied).toBe(true);
    });

    it('should filter by category', async () => {
      const recommendations = await getRecommendationsForTeam(testTeam.id, {
        category: 'possession',
      });

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].category).toBe('possession');
    });

    it('should filter by recommendation type', async () => {
      const recommendations = await getRecommendationsForTeam(testTeam.id, {
        recommendationType: 'training',
      });

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendation_type).toBe('training');
    });

    it('should limit results', async () => {
      const recommendations = await getRecommendationsForTeam(testTeam.id, { limit: 1 });

      expect(recommendations.length).toBe(1);
    });

    it('should order by priority and date', async () => {
      const recommendations = await getRecommendationsForTeam(testTeam.id);

      // Should have both priorities
      const priorities = recommendations.map(r => r.priority);
      expect(priorities).toContain('high');
      expect(priorities).toContain('medium');
      
      // High priority should come before medium (if both exist)
      const highIndex = priorities.indexOf('high');
      const mediumIndex = priorities.indexOf('medium');
      if (highIndex !== -1 && mediumIndex !== -1) {
        expect(highIndex).toBeLessThan(mediumIndex);
      }
    });
  });

  describe('markRecommendationAsApplied', () => {
    it('should mark recommendation as applied', async () => {
      const rec = await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'medium',
        title: 'Test Recommendation',
        description: 'Description',
        action_items: JSON.stringify([]),
        is_applied: false,
      }).returningAll().executeTakeFirstOrThrow();

      const updated = await markRecommendationAsApplied(rec.id);

      expect(updated.is_applied).toBe(true);
      expect(updated.applied_at).not.toBeNull();
    });
  });

  describe('GET /api/recommendations/team/:teamId', () => {
    beforeEach(async () => {
      await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'high',
        title: 'Test Recommendation',
        description: 'Description',
        action_items: JSON.stringify([]),
        is_applied: false,
      }).execute();
    });

    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .get(`/api/recommendations/team/${testTeam.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return recommendations for team', async () => {
      const response = await makeRequest()
        .get(`/api/recommendations/team/${testTeam.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 403 for unauthorized team access', async () => {
      const otherTeam = await createTestTeam();

      const response = await makeRequest()
        .get(`/api/recommendations/team/${otherTeam.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/recommendations/generate', () => {
    beforeEach(async () => {
      await createTestMatch(testTeam.id, 'Opponent 1', '2024-01-01');
    });

    it('should return 401 without authentication', async () => {
      const response = await makeRequest()
        .post('/api/recommendations/generate')
        .send({ teamId: testTeam.id })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if teamId is missing', async () => {
      const response = await makeRequest()
        .post('/api/recommendations/generate')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for unauthorized team access', async () => {
      const otherTeam = await createTestTeam();

      const response = await makeRequest()
        .post('/api/recommendations/generate')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .send({ teamId: otherTeam.id })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    // Note: Actual AI-based recommendation generation is tested manually
    // or via E2E when API key is available. Mocking requires complex setup.
  });

  describe('GET /api/recommendations/:id', () => {
    it('should return 401 without authentication', async () => {
      const rec = await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'high',
        title: 'Test Recommendation',
        description: 'Description',
        action_items: JSON.stringify([]),
        is_applied: false,
      }).returning('id').executeTakeFirstOrThrow();

      const response = await makeRequest()
        .get(`/api/recommendations/${rec.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return recommendation by id', async () => {
      const rec = await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'high',
        title: 'Single Rec Test',
        description: 'Test description',
        action_items: JSON.stringify(['Action 1']),
        is_applied: false,
      }).returningAll().executeTakeFirstOrThrow();

      const response = await makeRequest()
        .get(`/api/recommendations/${rec.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(200);

      expect(response.body.id).toBe(rec.id);
      expect(response.body.title).toBe('Single Rec Test');
      expect(response.body.team_id).toBe(testTeam.id);
    });

    it('should return 404 for non-existent recommendation', async () => {
      const response = await makeRequest()
        .get('/api/recommendations/99999')
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for unauthorized team access', async () => {
      const otherTeam = await createTestTeam();
      const rec = await db.insertInto('recommendations').values({
        team_id: otherTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'high',
        title: 'Other Team Rec',
        description: 'Description',
        action_items: JSON.stringify([]),
        is_applied: false,
      }).returning('id').executeTakeFirstOrThrow();

      const response = await makeRequest()
        .get(`/api/recommendations/${rec.id}`)
        .set(getAuthHeaders(coachWithTeam.cookies))
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/recommendations/:id/apply', () => {
    let recommendationId: number;

    beforeEach(async () => {
      const rec = await db.insertInto('recommendations').values({
        team_id: testTeam.id,
        insight_id: null,
        recommendation_type: 'tactical',
        category: 'possession',
        priority: 'medium',
        title: 'Test Recommendation',
        description: 'Description',
        action_items: JSON.stringify([]),
        is_applied: false,
      }).returning('id').executeTakeFirstOrThrow();

      recommendationId = rec.id;
    });

    it('should mark recommendation as applied', async () => {
      const response = await makeRequest()
        .patch(`/api/recommendations/${recommendationId}/apply`)
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .expect(200);

      expect(response.body.is_applied).toBe(true);
      expect(response.body.applied_at).not.toBeNull();
    });

    it('should return 404 for non-existent recommendation', async () => {
      const response = await makeRequest()
        .patch('/api/recommendations/99999/apply')
        .set(getAuthHeaders(coachWithTeam.cookies, coachWithTeam.csrfToken))
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
