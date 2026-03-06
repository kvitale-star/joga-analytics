import React, { useState, useEffect, useMemo } from 'react';
import { InsightCard } from './InsightCard';
import { JOGA_COLORS } from '../utils/colors';
import { GenerateRecommendationModal } from './GenerateRecommendationModal';
import {
  getInsightsForTeam,
  getInsights,
  dismissInsight,
  generateInsightsForTeam,
  type Insight,
} from '../services/insightsService';
import { getAllTeams } from '../services/teamService';
import { getAllSeasons } from '../services/seasonService';
import { useAuth } from '../contexts/AuthContext';

interface BriefingFeedViewProps {
  onNavigateToTrainingLog?: (teamId: number, preSelectedCategory?: string) => void;
  onNavigateToRecommendations?: (teamId: number) => void;
  className?: string;
}

export const BriefingFeedView: React.FC<BriefingFeedViewProps> = ({
  onNavigateToTrainingLog,
  onNavigateToRecommendations,
  className = '',
}) => {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [allTeams, setAllTeams] = useState<Array<{ id: number; displayName: string; slug: string; seasonId: number | null }>>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedInsightIdForRec, setSelectedInsightIdForRec] = useState<number | null>(null);

  // Load teams and seasons on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, seasonsData] = await Promise.all([
          getAllTeams(),
          getAllSeasons().catch(() => []),
        ]);
        setAllTeams(teamsData);
        const activeSeason = seasonsData.find((s: { isActive: boolean }) => s.isActive) || seasonsData[0];
        setActiveSeasonId(activeSeason?.id ?? null);
        const seasonTeams = activeSeason
          ? teamsData.filter((t: { seasonId: number | null }) => t.seasonId === activeSeason.id)
          : teamsData;
        if (!selectedTeamId && seasonTeams.length > 0) {
          setSelectedTeamId(seasonTeams[0].id);
        }
        // When only one team, ensure it's selected
        if (seasonTeams.length === 1) {
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

  // Filter to active season's teams
  const teams = useMemo(() => {
    if (!activeSeasonId) return allTeams;
    return allTeams.filter((t) => t.seasonId === activeSeasonId);
  }, [allTeams, activeSeasonId]);

  // Reset selection if selected team not in active season
  useEffect(() => {
    if (selectedTeamId && teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Clear generate feedback when switching teams
  useEffect(() => {
    setGenerateError(null);
    setGenerateSuccess(null);
  }, [selectedTeamId]);

  // Load insights when team changes (or all insights if no team filter)
  useEffect(() => {
    const loadInsights = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (selectedTeamId) {
          const data = await getInsightsForTeam(selectedTeamId);
          setInsights(data);
        } else {
          const data = await getInsights();
          setInsights(data);
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [user, selectedTeamId]);

  const handleDismiss = async (insightId: number) => {
    try {
      await dismissInsight(insightId);
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedTeamId) return;
    setGeneratingInsights(true);
    setGenerateError(null);
    setGenerateSuccess(null);
    try {
      await generateInsightsForTeam(selectedTeamId);
      const data = await getInsightsForTeam(selectedTeamId);
      setInsights(data);
      setGenerateSuccess(
        data.length > 0
          ? `Generated ${data.length} insight${data.length === 1 ? '' : 's'}.`
          : 'No new findings for this team. The team may need more match data (at least 3 games for anomalies).'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate insights';
      setGenerateError(message);
      console.error('Failed to generate insights:', error);
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleGetRecommendation = (insightId: number) => {
    setSelectedInsightIdForRec(insightId);
    setIsGenerateModalOpen(true);
  };

  const handleLogTraining = (insightId: number, category: string) => {
    const insight = insights.find((i) => i.id === insightId);
    if (insight && onNavigateToTrainingLog) {
      onNavigateToTrainingLog(insight.team_id, category);
    } else if (onNavigateToTrainingLog && selectedTeamId) {
      onNavigateToTrainingLog(selectedTeamId, category);
    }
  };

  const teamMap = useMemo(() => {
    const m: Record<number, string> = {};
    allTeams.forEach((t) => {
      m[t.id] = t.displayName || t.slug;
    });
    return m;
  }, [allTeams]);

  if (!user) return null;

  return (
    <div className={className}>
      {/* Error/Success feedback */}
      {generateError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {generateError}
        </div>
      )}
      {generateSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {generateSuccess}
        </div>
      )}

      {/* Header with team selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Briefing Feed</h1>
            <p className="text-sm text-gray-600">
              Insights and recommendations for your teams
            </p>
          </div>
          <div className="flex items-center gap-3">
            {teams.length > 1 ? (
              <select
                value={selectedTeamId ?? ''}
                onChange={(e) => setSelectedTeamId(parseInt(e.target.value) || null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa]"
              >
                <option value="">All my teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.displayName || team.slug}
                  </option>
                ))}
              </select>
            ) : teams.length === 1 ? (
              <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md border border-gray-200">
                {teams[0]?.displayName || teams[0]?.slug}
              </span>
            ) : null}
            {selectedTeamId && (
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="px-4 py-2 text-sm font-medium text-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: generatingInsights ? '#9ca3af' : JOGA_COLORS.voltYellow,
                  border: `2px solid ${generatingInsights ? '#9ca3af' : JOGA_COLORS.voltYellow}`,
                }}
                onMouseEnter={(e) => {
                  if (!generatingInsights) e.currentTarget.style.backgroundColor = '#b8e600';
                }}
                onMouseLeave={(e) => {
                  if (!generatingInsights) e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                }}
              >
                {generatingInsights ? 'Generating...' : 'Generate Insights'}
              </button>
            )}
            {onNavigateToRecommendations && selectedTeamId && (
              <button
                onClick={() => onNavigateToRecommendations(selectedTeamId)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Recommendations
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Insights feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
              <p className="text-gray-600">Loading insights...</p>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-2">No insights yet.</p>
            <p className="text-sm text-gray-500 mb-4">
              {selectedTeamId
                ? 'Generate insights to see statistical findings from your match data.'
                : 'Select a team to view insights, or generate insights for a team with match data.'}
            </p>
            {selectedTeamId && (
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="px-4 py-2 text-sm font-medium text-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: generatingInsights ? '#9ca3af' : JOGA_COLORS.voltYellow,
                  border: `2px solid ${generatingInsights ? '#9ca3af' : JOGA_COLORS.voltYellow}`,
                }}
                onMouseEnter={(e) => {
                  if (!generatingInsights) e.currentTarget.style.backgroundColor = '#b8e600';
                }}
                onMouseLeave={(e) => {
                  if (!generatingInsights) e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                }}
              >
                {generatingInsights ? 'Generating...' : 'Generate Insights'}
              </button>
            )}
          </div>
        ) : (
          insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              teamDisplayName={teamMap[insight.team_id]}
              onLogTraining={onNavigateToTrainingLog ? handleLogTraining : undefined}
              onGetRecommendation={handleGetRecommendation}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>

      {/* Generate Recommendation Modal */}
      {selectedTeamId && (
        <GenerateRecommendationModal
          isOpen={isGenerateModalOpen}
          onClose={() => {
            setIsGenerateModalOpen(false);
            setSelectedInsightIdForRec(null);
          }}
          teamId={selectedTeamId}
          insightId={selectedInsightIdForRec}
          onRecommendationsGenerated={() => {
            setIsGenerateModalOpen(false);
            setSelectedInsightIdForRec(null);
            if (onNavigateToRecommendations) {
              onNavigateToRecommendations(selectedTeamId);
            }
          }}
        />
      )}
    </div>
  );
};
