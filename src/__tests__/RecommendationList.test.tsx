/**
 * Phase 4 - RecommendationList Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RecommendationList } from '../components/RecommendationList';
import * as recommendationService from '../services/recommendationService';
import type { Recommendation } from '../services/recommendationService';

const mockRecommendations: Recommendation[] = [
  {
    id: 1,
    team_id: 10,
    insight_id: null,
    recommendation_type: 'tactical',
    category: 'possession',
    priority: 'high',
    title: 'Improve Possession',
    description: 'Work on possession drills.',
    action_items: JSON.stringify(['Drill 1']),
    training_plan_json: null,
    framework_alignment: null,
    club_philosophy_alignment: null,
    is_applied: false,
    applied_at: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    team_id: 10,
    insight_id: null,
    recommendation_type: 'training',
    category: 'shooting',
    priority: 'medium',
    title: 'Finishing Practice',
    description: 'Focus on finishing.',
    action_items: JSON.stringify(['Drill 2']),
    training_plan_json: null,
    framework_alignment: null,
    club_philosophy_alignment: null,
    is_applied: true,
    applied_at: '2024-01-16T10:00:00Z',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
];

describe('RecommendationList', () => {
  beforeEach(() => {
    vi.spyOn(recommendationService, 'getRecommendationsForTeam').mockResolvedValue(mockRecommendations);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state initially', async () => {
    vi.mocked(recommendationService.getRecommendationsForTeam).mockImplementation(
      () => new Promise(() => {}) // Never resolves - keeps loading state
    );

    await act(async () => {
      render(<RecommendationList teamId={10} />);
    });

    expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
  });

  it('should render recommendations when loaded', async () => {
    render(<RecommendationList teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Improve Possession')).toBeInTheDocument();
    });

    expect(screen.getByText('Finishing Practice')).toBeInTheDocument();
    expect(screen.getByText('Work on possession drills.')).toBeInTheDocument();
  });

  it('should show empty state when no recommendations', async () => {
    vi.mocked(recommendationService.getRecommendationsForTeam).mockResolvedValue([]);

    render(<RecommendationList teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('No recommendations available for this team.')).toBeInTheDocument();
    });
  });

  it('should show error state when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(recommendationService.getRecommendationsForTeam).mockRejectedValue(new Error('Network error'));

    render(<RecommendationList teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should show filter controls', async () => {
    render(<RecommendationList teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Improve Possession')).toBeInTheDocument();
    });

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
  });

  it('should display results count', async () => {
    render(<RecommendationList teamId={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 2 recommendations/)).toBeInTheDocument();
    });
  });

  it('should call getRecommendationsForTeam with teamId', async () => {
    render(<RecommendationList teamId={42} />);

    await waitFor(() => {
      expect(recommendationService.getRecommendationsForTeam).toHaveBeenCalledWith(42);
    });
  });
});
