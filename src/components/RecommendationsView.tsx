import React, { useState, useMemo } from 'react';
import { RecommendationList } from './RecommendationList';
import { GenerateRecommendationModal } from './GenerateRecommendationModal';
import { markRecommendationAsApplied } from '../services/recommendationService';
import { useAuth } from '../contexts/AuthContext';
import { getAllTeams } from '../services/teamService';
import { getAllSeasons } from '../services/seasonService';

interface RecommendationsViewProps {
  teamId?: number;
  className?: string;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  teamId: propTeamId,
  className = '',
}) => {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(propTeamId || null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [listRefreshTrigger, setListRefreshTrigger] = useState(0);

  // Load teams and seasons on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, seasonsData] = await Promise.all([
          getAllTeams(),
          getAllSeasons().catch(() => []),
        ]);
        setAllTeams(teamsData);
        const activeSeason = seasonsData.find((s: { isActive: boolean }) => s.isActive) || seasonsData[0];
        setActiveSeasonId(activeSeason?.id ?? null);
        // If no team selected and we'll have teams after filter, select first
        const seasonTeams = activeSeason
          ? teamsData.filter((t: any) => t.seasonId === activeSeason.id)
          : teamsData;
        if (!selectedTeamId && seasonTeams.length > 0) {
          setSelectedTeamId(seasonTeams[0].id);
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Filter to active season's teams only
  const teams = useMemo(() => {
    if (!activeSeasonId) return allTeams;
    return allTeams.filter((t) => t.seasonId === activeSeasonId);
  }, [allTeams, activeSeasonId]);

  // Reset selection if selected team is not in active season
  React.useEffect(() => {
    if (selectedTeamId && teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleAccept = async (recommendationId: number) => {
    try {
      setLoading(true);
      await markRecommendationAsApplied(recommendationId);
      // Refresh the list by reloading (RecommendationList will handle this via useEffect)
      window.location.reload(); // Simple refresh for now - could be improved with state management
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      alert('Failed to accept recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (recommendationId: number) => {
    try {
      setLoading(true);
      await markRecommendationAsApplied(recommendationId); // For now, skip = mark as applied
      window.location.reload();
    } catch (error) {
      console.error('Error skipping recommendation:', error);
      alert('Failed to skip recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (recommendationId: number) => {
    // TODO: Navigate to detail view or open modal
    console.log('View detail for recommendation:', recommendationId);
  };

  // const handleGenerateFromInsight = (insightId: number) => {
  //   setSelectedInsightId(insightId);
  //   setIsGenerateModalOpen(true);
  // };

  const handleGenerateGeneral = () => {
    setSelectedInsightId(null);
    setIsGenerateModalOpen(true);
  };

  if (!selectedTeamId) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please select a team to view recommendations.</p>
          {teams.length > 0 && (
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.displayName || team.slug}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Training Recommendations</h1>
            <p className="text-gray-600">
              AI-powered recommendations based on match data, insights, and training history
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Team Selector - show dropdown when multiple teams, label when single */}
            {teams.length > 1 ? (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.displayName || team.slug}
                  </option>
                ))}
              </select>
            ) : teams.length === 1 ? (
              <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md border border-gray-200">
                {teams.find((t) => t.id === selectedTeamId)?.displayName || teams[0]?.displayName || teams[0]?.slug}
              </span>
            ) : null}
            <button
              onClick={handleGenerateGeneral}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Recommendations
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {selectedTeamId && (
        <RecommendationList
          teamId={selectedTeamId}
          refreshTrigger={listRefreshTrigger}
          onAccept={handleAccept}
          onSkip={handleSkip}
          onViewDetail={handleViewDetail}
          showLinkedInsights={true}
        />
      )}

      {/* Generate Modal */}
      <GenerateRecommendationModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setSelectedInsightId(null);
        }}
        teamId={selectedTeamId!}
        insightId={selectedInsightId}
        onRecommendationsGenerated={() => {
          setIsGenerateModalOpen(false);
          setSelectedInsightId(null);
          // Trigger list refetch (keeps same team selected)
          setListRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
};
