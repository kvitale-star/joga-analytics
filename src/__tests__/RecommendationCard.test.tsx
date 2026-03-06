/**
 * Phase 4 - RecommendationCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationCard } from '../components/RecommendationCard';
import type { Recommendation } from '../services/recommendationService';

const mockRecommendation: Recommendation = {
  id: 1,
  team_id: 10,
  insight_id: null,
  recommendation_type: 'tactical',
  category: 'possession',
  priority: 'high',
  title: 'Improve Possession Under Pressure',
  description: 'Focus on maintaining possession when pressed by opponents.',
  action_items: JSON.stringify(['Drill 1: Rondo', 'Drill 2: Positional play']),
  training_plan_json: JSON.stringify({
    sessionType: 'training',
    duration: 90,
    focus: 'Possession',
    drills: ['Rondo', 'Positional play'],
  }),
  framework_alignment: 'US Soccer D License',
  club_philosophy_alignment: 'Possession-based play',
  is_applied: false,
  applied_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('RecommendationCard', () => {
  it('should render recommendation title and description', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('Improve Possession Under Pressure')).toBeInTheDocument();
    expect(screen.getByText(/Focus on maintaining possession when pressed/)).toBeInTheDocument();
  });

  it('should render priority badge', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should render category and type', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('possession')).toBeInTheDocument();
    expect(screen.getByText('tactical')).toBeInTheDocument();
  });

  it('should render action items', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('Drill 1: Rondo')).toBeInTheDocument();
    expect(screen.getByText('Drill 2: Positional play')).toBeInTheDocument();
  });

  it('should show Applied badge when is_applied is true', () => {
    const appliedRec = { ...mockRecommendation, is_applied: true };
    render(<RecommendationCard recommendation={appliedRec} />);

    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('should not show Accept and Skip buttons when is_applied', () => {
    const appliedRec = { ...mockRecommendation, is_applied: true };
    render(<RecommendationCard recommendation={appliedRec} onAccept={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.queryByText('Accept & Log Training')).not.toBeInTheDocument();
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  });

  it('should show Accept and Skip buttons when not applied and callbacks provided', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onSkip = vi.fn();
    render(<RecommendationCard recommendation={mockRecommendation} onAccept={onAccept} onSkip={onSkip} />);

    expect(screen.getByText('Accept & Log Training')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();

    await user.click(screen.getByText('Accept & Log Training'));
    expect(onAccept).toHaveBeenCalledWith(1);

    await user.click(screen.getByText('Skip'));
    expect(onSkip).toHaveBeenCalledWith(1);
  });

  it('should expand to show training plan when expand button clicked', async () => {
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={mockRecommendation} />);

    // Training plan is in expanded section
    expect(screen.queryByText('Training Plan:')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByText('Training Plan:')).toBeInTheDocument();
    expect(screen.getByText(/Session Type:/)).toBeInTheDocument();
    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
    expect(screen.getByText('Rondo')).toBeInTheDocument();
  });

  it('should show linked insight when provided', async () => {
    const user = userEvent.setup();
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        showLinkedInsight={true}
        linkedInsightTitle="Low Possession vs Press"
        linkedInsightNarrative="Team struggled to retain possession under pressure."
      />
    );

    expect(screen.getByText(/Linked Insight: Low Possession vs Press/)).toBeInTheDocument();

    await user.click(screen.getByText(/Linked Insight: Low Possession vs Press/));
    expect(screen.getByText('Team struggled to retain possession under pressure.')).toBeInTheDocument();
  });
});
