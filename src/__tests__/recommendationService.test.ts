/**
 * Phase 4 - Frontend Recommendation Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseActionItems,
  parseTrainingPlan,
  getPriorityColor,
  getPriorityBadge,
} from '../services/recommendationService';

describe('recommendationService', () => {
  describe('parseActionItems', () => {
    it('should return empty array for null', () => {
      expect(parseActionItems(null)).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseActionItems('not json')).toEqual([]);
    });

    it('should parse valid JSON array', () => {
      expect(parseActionItems('["Action 1", "Action 2"]')).toEqual(['Action 1', 'Action 2']);
    });

    it('should return empty array for empty array string', () => {
      expect(parseActionItems('[]')).toEqual([]);
    });
  });

  describe('parseTrainingPlan', () => {
    it('should return null for null', () => {
      expect(parseTrainingPlan(null)).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      expect(parseTrainingPlan('not json')).toBeNull();
    });

    it('should parse valid training plan', () => {
      const plan = JSON.stringify({
        sessionType: 'training',
        duration: 90,
        focus: 'Possession',
        drills: ['Rondo', 'Positional play'],
      });
      expect(parseTrainingPlan(plan)).toEqual({
        sessionType: 'training',
        duration: 90,
        focus: 'Possession',
        drills: ['Rondo', 'Positional play'],
      });
    });
  });

  describe('getPriorityColor', () => {
    it('should return red for urgent', () => {
      expect(getPriorityColor('urgent')).toBe('red');
    });

    it('should return orange for high', () => {
      expect(getPriorityColor('high')).toBe('orange');
    });

    it('should return blue for medium', () => {
      expect(getPriorityColor('medium')).toBe('blue');
    });

    it('should return gray for low', () => {
      expect(getPriorityColor('low')).toBe('gray');
    });
  });

  describe('getPriorityBadge', () => {
    it('should capitalize priority correctly', () => {
      expect(getPriorityBadge('urgent')).toBe('Urgent');
      expect(getPriorityBadge('high')).toBe('High');
      expect(getPriorityBadge('medium')).toBe('Medium');
      expect(getPriorityBadge('low')).toBe('Low');
    });
  });
});
