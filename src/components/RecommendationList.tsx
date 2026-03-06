import React, { useState, useMemo } from 'react';
import { Recommendation, getRecommendationsForTeam } from '../services/recommendationService';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationListProps {
  teamId: number;
  refreshTrigger?: number; // Increment to force refetch (e.g. after generating new recommendations)
  onAccept?: (recommendationId: number) => void;
  onSkip?: (recommendationId: number) => void;
  onViewDetail?: (recommendationId: number) => void;
  showLinkedInsights?: boolean;
  className?: string;
}

type FilterStatus = 'all' | 'active' | 'applied';
type FilterCategory = 'all' | 'shooting' | 'possession' | 'passing' | 'defending' | 'general';
type FilterType = 'all' | 'tactical' | 'training' | 'general';
type SortOption = 'priority' | 'date-newest' | 'date-oldest';

export const RecommendationList: React.FC<RecommendationListProps> = ({
  teamId,
  refreshTrigger = 0,
  onAccept,
  onSkip,
  onViewDetail,
  showLinkedInsights = false,
  className = '',
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('priority');

  // Load recommendations
  React.useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecommendationsForTeam(teamId);
        setRecommendations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recommendations');
        console.error('Error loading recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      loadRecommendations();
    }
  }, [teamId, refreshTrigger]);

  // Filter and sort recommendations
  const filteredAndSorted = useMemo(() => {
    let filtered = [...recommendations];

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(r => !r.is_applied);
    } else if (statusFilter === 'applied') {
      filtered = filtered.filter(r => r.is_applied);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.recommendation_type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          // If same priority, sort by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        case 'date-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [recommendations, statusFilter, categoryFilter, typeFilter, sortOption]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-600 mb-2">No recommendations available for this team.</p>
        <p className="text-sm text-gray-500">Generate recommendations from insights or team analysis.</p>
      </div>
    );
  }

  if (filteredAndSorted.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-600 mb-2">No recommendations match the current filters.</p>
        <button
          onClick={() => {
            setStatusFilter('all');
            setCategoryFilter('all');
            setTypeFilter('all');
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters and Sort */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="applied">Applied</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FilterCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="shooting">Shooting</option>
              <option value="possession">Possession</option>
              <option value="passing">Passing</option>
              <option value="defending">Defending</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="tactical">Tactical</option>
              <option value="training">Training</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Priority</option>
              <option value="date-newest">Newest First</option>
              <option value="date-oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSorted.length} of {recommendations.length} recommendations
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredAndSorted.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onAccept={onAccept}
            onSkip={onSkip}
            onViewDetail={onViewDetail}
            showLinkedInsight={showLinkedInsights}
          />
        ))}
      </div>
    </div>
  );
};
