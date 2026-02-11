/**
 * Team Context Builder Service
 * Builds comprehensive team context for AI including match data, frameworks, insights, training logs
 */

import { db } from '../db/database.js';
import { TeamRow, InsightRow, TrainingLogRow } from '../db/schema.js';
import { getMatches } from './matchService.js';
import { getActiveInsights } from './insightsService.js';
import { getTrainingLogsForTeam } from './trainingLogService.js';
import { loadUSSFrameworks, loadClubPhilosophy, getFrameworkForAgeGroup, type USSFrameworkContext, type ClubPhilosophy } from './frameworkLoader.js';
import { hashMatchData } from './aiCacheManager.js';

export interface TeamContextData {
  team: TeamRow;
  seasonId: number | null;
  matches: any[]; // Matches from getMatches (processed format, not raw MatchRow)
  insights: InsightRow[];
  trainingLogs: TrainingLogRow[];
  usSoccerFrameworks: USSFrameworkContext;
  clubPhilosophy: ClubPhilosophy;
  developmentStage: {
    name: string;
    ageRange: string;
    format: string;
    framework: string | null;
    recommendedLicenseLevel: string | null;
  };
  formattedMatchData: string;
  dataHash: string;
}

/**
 * Build comprehensive team context for AI
 */
export async function buildTeamContext(teamId: number, seasonId?: number | null): Promise<TeamContextData> {
  // Fetch team
  const team = await db
    .selectFrom('teams')
    .selectAll()
    .where('id', '=', teamId)
    .executeTakeFirst();

  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  // Use team's season_id if not provided
  const effectiveSeasonId = seasonId ?? team.season_id;

  // Parallel fetch all data sources
  const [matches, insights, trainingLogs, usSoccerFrameworks, clubPhilosophy] = await Promise.all([
    getMatches({ teamId }),
    getActiveInsights(teamId),
    getTrainingLogsForTeam(teamId, { limit: 20 }), // Last 20 training sessions
    loadUSSFrameworks(),
    loadClubPhilosophy(),
  ]);

  // Determine development stage from team metadata
  const ageGroup = extractAgeGroupFromTeam(team);
  const frameworkInfo = getFrameworkForAgeGroup(usSoccerFrameworks, ageGroup);

  const developmentStage = {
    name: `U${ageGroup.replace(/^U/i, '')} Development Stage`,
    ageRange: ageGroup,
    format: frameworkInfo.developmentFramework ? Object.keys(usSoccerFrameworks.playerDevelopmentFrameworks).find(
      k => usSoccerFrameworks.playerDevelopmentFrameworks[k] === frameworkInfo.developmentFramework
    ) || '11v11' : '11v11',
    framework: frameworkInfo.developmentFramework,
    recommendedLicenseLevel: frameworkInfo.recommendedLicenseLevel,
  };

  // Format match data for AI
  const formattedMatchData = formatTeamContextForAI(
    team,
    matches,
    insights,
    trainingLogs,
    developmentStage,
    clubPhilosophy
  );

  // Generate data hash for cache invalidation (use same function as cache manager)
  const dataHash = hashMatchData(matches);

  return {
    team,
    seasonId: effectiveSeasonId,
    matches,
    insights,
    trainingLogs,
    usSoccerFrameworks,
    clubPhilosophy,
    developmentStage,
    formattedMatchData,
    dataHash,
  };
}

/**
 * Extract age group from team metadata
 */
function extractAgeGroupFromTeam(team: TeamRow): string {
  // Try to extract from metadata JSON
  try {
    const metadata = typeof team.metadata === 'string' ? JSON.parse(team.metadata) : team.metadata;
    if (metadata?.age_group) {
      return metadata.age_group;
    }
    if (metadata?.level) {
      return metadata.level;
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Try to extract from display_name (e.g., "U13 Boys")
  const match = team.display_name.match(/U(\d+)/i);
  if (match) {
    return `U${match[1]}`;
  }

  // Default to U13 if can't determine
  return 'U13';
}

/**
 * Format team context for AI consumption
 */
function formatTeamContextForAI(
  team: TeamRow,
  matches: any[],
  insights: InsightRow[],
  trainingLogs: TrainingLogRow[],
  developmentStage: TeamContextData['developmentStage'],
  clubPhilosophy: ClubPhilosophy
): string {
  let context = `# TEAM CONTEXT: ${team.display_name}\n\n`;

  // Development Stage
  context += `## DEVELOPMENT STAGE\n`;
  context += `Age Group: ${developmentStage.ageRange}\n`;
  context += `Format: ${developmentStage.format}\n`;
  if (developmentStage.framework) {
    context += `\nUS Soccer Player Development Framework:\n${developmentStage.framework.substring(0, 500)}...\n\n`;
  }

  // Club Philosophy
  context += `## CLUB PHILOSOPHY\n`;
  context += `Playing Style: ${clubPhilosophy.playingStyle}\n\n`;
  context += `Training Methodology: ${clubPhilosophy.trainingMethodology}\n\n`;
  context += `Club Values: ${clubPhilosophy.clubValues}\n\n`;
  context += `Non-Negotiables:\n`;
  clubPhilosophy.nonNegotiables.forEach(item => {
    context += `- ${item}\n`;
  });
  context += `\n`;

  // Match Data
  context += `## MATCH DATA (${matches.length} matches)\n\n`;
  if (matches.length === 0) {
    context += `No match data available.\n\n`;
  } else {
    matches.slice(0, 20).forEach((match, idx) => {
      context += `### Match ${idx + 1}: vs ${match.opponentName || match.opponent_name || 'Unknown'} on ${match.matchDate || match.match_date}\n`;
      context += `Result: ${match.result || 'N/A'}\n`;
      
      if (match.statsJson || match.stats_json) {
        try {
          const statsJson = match.statsJson || match.stats_json;
          const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson;
          const keyStats = ['possession', 'goalsFor', 'goalsAgainst', 'attemptsFor', 'attemptsAgainst', 'pass share', 'ppm', 'spi'];
          keyStats.forEach(stat => {
            if (stats[stat] !== undefined && stats[stat] !== null) {
              context += `${stat}: ${stats[stat]}\n`;
            }
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
      context += `\n`;
    });
  }

  // Active Insights
  context += `## ACTIVE INSIGHTS (${insights.length} insights)\n\n`;
  if (insights.length === 0) {
    context += `No active insights.\n\n`;
  } else {
    insights.slice(0, 10).forEach(insight => {
      context += `### ${insight.title} (${insight.insight_type}, severity: ${insight.severity.toFixed(2)})\n`;
      if (insight.narrative) {
        context += `${insight.narrative}\n`;
      }
      context += `\n`;
    });
  }

  // Recent Training Logs
  context += `## RECENT TRAINING LOGS (${trainingLogs.length} sessions)\n\n`;
  if (trainingLogs.length === 0) {
    context += `No training logs available.\n\n`;
  } else {
    trainingLogs.slice(0, 10).forEach(log => {
      context += `### ${log.session_date} - ${log.session_type}\n`;
      try {
        const focusTags = typeof log.focus_tags === 'string' ? JSON.parse(log.focus_tags) : log.focus_tags;
        if (Array.isArray(focusTags) && focusTags.length > 0) {
          context += `Focus: ${focusTags.join(', ')}\n`;
        }
      } catch (e) {
        // Ignore parse errors
      }
      if (log.notes) {
        context += `Notes: ${log.notes}\n`;
      }
      context += `\n`;
    });
  }

  return context;
}

