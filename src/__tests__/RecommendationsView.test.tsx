/**
 * Phase 4 - RecommendationsView Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecommendationsView } from '../components/RecommendationsView';
import * as teamService from '../services/teamService';
import * as recommendationService from '../services/recommendationService';

// Mock useAuth to avoid AuthProvider/DB complexity
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@test.com', name: 'Test', role: 'coach' as const },
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockTeams = [
  {
    id: 10,
    displayName: 'U13 Boys',
    slug: 'u13-boys',
    metadata: {},
    seasonId: 1,
    parentTeamId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockRecommendations = [
  {
    id: 1,
    team_id: 10,
    insight_id: null,
    recommendation_type: 'tactical',
    category: 'possession',
    priority: 'high',
    title: 'Test Recommendation',
    description: 'Test description',
    action_items: JSON.stringify([]),
    training_plan_json: null,
    framework_alignment: null,
    club_philosophy_alignment: null,
    is_applied: false,
    applied_at: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
];

function renderWithAuth(ui: React.ReactElement) {
  return render(ui);
}

describe('RecommendationsView', () => {
  beforeEach(() => {
    vi.spyOn(teamService, 'getAllTeams').mockResolvedValue(mockTeams);
    vi.spyOn(recommendationService, 'getRecommendationsForTeam').mockResolvedValue(mockRecommendations);
  });

  it('should show Training Recommendations heading', async () => {
    renderWithAuth(<RecommendationsView teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Training Recommendations')).toBeInTheDocument();
    });
  });

  it('should show Generate Recommendations button', async () => {
    renderWithAuth(<RecommendationsView teamId={10} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Recommendations' })).toBeInTheDocument();
    });
  });

  it('should load and display recommendations for team', async () => {
    renderWithAuth(<RecommendationsView teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Test Recommendation')).toBeInTheDocument();
    });
  });

  it('should show team name when single team', async () => {
    renderWithAuth(<RecommendationsView teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('U13 Boys')).toBeInTheDocument();
    });
  });
});
