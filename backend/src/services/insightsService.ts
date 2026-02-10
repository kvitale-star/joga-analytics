/**
 * Insights Service
 * 
 * Automatically detects statistically noteworthy findings from match data.
 * Runs deterministic statistical checks - no AI needed for detection, only for narration.
 */

import { db } from '../db/database.js';
import type { InsightRow, NewInsight } from '../db/schema.js';
import { getMatches } from './matchService.js';

interface AnomalyFinding {
  stat_name: string;
  value: number;
  season_avg: number;
  season_stddev: number;
  z_score: number;
}

interface TrendFinding {
  stat_name: string;
  rolling_avg_3: number;
  rolling_avg_5: number;
  season_avg: number;
  direction: 'improving' | 'declining';
  games_in_trend: number;
}

interface HalfSplitFinding {
  stat_name: string;
  avg_1st_half: number;
  avg_2nd_half: number;
  delta: number;
  delta_trend_direction: 'improving' | 'declining' | 'stable';
  consecutive_games_with_drop: number;
}

interface CorrelationFinding {
  stat_a: string;
  stat_b: string;
  pearson_r: number;
  p_value_approx: number;
  sample_size: number;
}

interface BenchmarkFinding {
  team_id: number;
  stat_name: string;
  team_avg: number;
  club_avg: number;
  percentile_rank: number;
}

/**
 * Get numeric stat value from match stats_json
 */
function getStatValue(statsJson: any, statName: string): number | null {
  if (!statsJson || typeof statsJson !== 'object') return null;
  const value = statsJson[statName];
  if (typeof value === 'number' && !isNaN(value)) return value;
  return null;
}

/**
 * Calculate mean and standard deviation
 */
function calculateMeanStdDev(values: number[]): { mean: number; stddev: number } {
  if (values.length === 0) return { mean: 0, stddev: 0 };
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);
  
  return { mean, stddev };
}

/**
 * Map z-score to severity (0-1)
 */
function zScoreToSeverity(zScore: number): number {
  const absZ = Math.abs(zScore);
  if (absZ >= 3.0) return 1.0;
  if (absZ >= 2.5) return 0.7;
  if (absZ >= 2.0) return 0.5;
  if (absZ >= 1.5) return 0.3;
  return 0.1;
}

/**
 * A. Anomaly Detection (single-game outliers)
 * For each numeric stat, compute season mean and stddev, flag z-score > 1.5
 */
async function detectAnomalies(
  teamId: number,
  seasonId: number | null,
  latestMatchId: number,
  latestMatchStats: any
): Promise<AnomalyFinding[]> {
  // Get all matches for this team/season
  const matches = await getMatches({ teamId });
  
  // Filter by season if provided
  let seasonMatches = matches;
  if (seasonId) {
    // TODO: Filter by season when season_id is added to matches table
    // For now, use all matches
    seasonMatches = matches;
  }
  
  // Need at least 3 matches for meaningful statistics
  if (seasonMatches.length < 3) {
    console.log(`⚠️  Anomaly detection: Only ${seasonMatches.length} matches, need at least 3`);
    return [];
  }
  
  // Key stats to check for anomalies
  const keyStats = [
    'possession',
    'pass share',
    'ppm',
    'spi',
    'conversion rate',
    'attemptsFor',
    'attemptsAgainst',
    'goalsFor',
    'goalsAgainst',
    'passesFor',
    'passesAgainst',
  ];
  
  const findings: AnomalyFinding[] = [];
  
  for (const statName of keyStats) {
    // Collect all values for this stat across season (excluding latest match for baseline)
    const values: number[] = [];
    for (const match of seasonMatches) {
      // Exclude the latest match from baseline calculation
      if (match.id === latestMatchId) continue;
      
      if (match.statsJson) {
        const value = getStatValue(match.statsJson, statName);
        if (value !== null) {
          values.push(value);
        }
      }
    }
    
    if (values.length < 2) continue; // Need at least 2 data points for baseline (plus latest = 3 total)
    
    // Calculate mean and stddev from baseline (excluding latest match)
    const { mean, stddev } = calculateMeanStdDev(values);
    
    if (stddev === 0) continue; // No variation, skip
    
    // Get latest match value
    const latestValue = getStatValue(latestMatchStats, statName);
    if (latestValue === null) continue;
    
    // Calculate z-score
    const zScore = (latestValue - mean) / stddev;
    
    // Flag if |z-score| > 1.5
    if (Math.abs(zScore) > 1.5) {
      findings.push({
        stat_name: statName,
        value: latestValue,
        season_avg: mean,
        season_stddev: stddev,
        z_score: zScore,
      });
    }
  }
  
  return findings;
}

/**
 * B. Trend Detection (multi-game directional changes)
 * Compute 3-game and 5-game rolling averages, compare to season average
 */
async function detectTrends(
  teamId: number,
  seasonId: number | null
): Promise<TrendFinding[]> {
  const matches = await getMatches({ teamId });
  
  // Filter by season if provided
  let seasonMatches = matches;
  if (seasonId) {
    // TODO: Filter by season
    seasonMatches = matches;
  }
  
  // Sort by date (oldest first)
  seasonMatches.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  
  // Need at least 5 matches for trend detection
  if (seasonMatches.length < 5) return [];
  
  const keyStats = [
    'possession',
    'pass share',
    'ppm',
    'spi',
    'conversion rate',
    'attemptsFor',
    'attemptsAgainst',
  ];
  
  const findings: TrendFinding[] = [];
  
  for (const statName of keyStats) {
    // Collect all values
    const values: Array<{ matchId: number; value: number; date: string }> = [];
    for (const match of seasonMatches) {
      if (match.statsJson) {
        const value = getStatValue(match.statsJson, statName);
        if (value !== null) {
          values.push({
            matchId: match.id,
            value,
            date: match.matchDate,
          });
        }
      }
    }
    
    if (values.length < 5) continue;
    
    // Calculate season average
    const seasonAvg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    
    // Calculate rolling averages for last 3 and 5 games
    const last3 = values.slice(-3);
    const last5 = values.slice(-5);
    
    const rollingAvg3 = last3.reduce((sum, v) => sum + v.value, 0) / last3.length;
    const rollingAvg5 = last5.reduce((sum, v) => sum + v.value, 0) / last5.length;
    
    // Check if rolling average diverges from season average by more than 1 stddev
    const stddev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v.value - seasonAvg, 2), 0) / values.length
    );
    
    if (stddev === 0) continue;
    
    const divergence3 = Math.abs(rollingAvg3 - seasonAvg) / stddev;
    const divergence5 = Math.abs(rollingAvg5 - seasonAvg) / stddev;
    
    // Flag if divergence > 1.0 stddev
    if (divergence3 > 1.0 || divergence5 > 1.0) {
      // Determine direction
      const direction = rollingAvg3 > seasonAvg ? 'improving' : 'declining';
      
      // Count consecutive games in trend direction
      let gamesInTrend = 0;
      for (let i = values.length - 1; i >= 1; i--) {
        const current = values[i].value;
        const previous = values[i - 1].value;
        if (direction === 'improving' && current > previous) {
          gamesInTrend++;
        } else if (direction === 'declining' && current < previous) {
          gamesInTrend++;
        } else {
          break;
        }
      }
      
      findings.push({
        stat_name: statName,
        rolling_avg_3: rollingAvg3,
        rolling_avg_5: rollingAvg5,
        season_avg: seasonAvg,
        direction,
        games_in_trend: gamesInTrend,
      });
    }
  }
  
  return findings;
}

/**
 * C. Half-Split Analysis (1st vs 2nd half patterns)
 * Compute delta between 1st and 2nd half, track rolling average
 */
async function detectHalfSplitPatterns(
  teamId: number,
  seasonId: number | null
): Promise<HalfSplitFinding[]> {
  const matches = await getMatches({ teamId });
  
  // Filter by season if provided
  let seasonMatches = matches;
  if (seasonId) {
    // TODO: Filter by season
    seasonMatches = matches;
  }
  
  // Sort by date
  seasonMatches.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  
  // Need at least 3 matches with half-split data
  if (seasonMatches.length < 3) return [];
  
  const findings: HalfSplitFinding[] = [];
  
  // Stats to analyze for half-split
  const halfSplitStats = [
    { name: 'goals', firstHalf: 'goalsFor1stHalf', secondHalf: 'goalsFor2ndHalf' },
    { name: 'attempts', firstHalf: 'attemptsFor1stHalf', secondHalf: 'attemptsFor2ndHalf' },
    { name: 'passes', firstHalf: 'passesFor1stHalf', secondHalf: 'passesFor2ndHalf' },
    { name: 'possession', firstHalf: 'possession1stHalf', secondHalf: 'possession2ndHalf' },
  ];
  
  for (const stat of halfSplitStats) {
    // Collect half-split data
    const halfData: Array<{ firstHalf: number; secondHalf: number; delta: number }> = [];
    
    for (const match of seasonMatches) {
      if (match.statsJson) {
        const firstHalf = getStatValue(match.statsJson, stat.firstHalf);
        const secondHalf = getStatValue(match.statsJson, stat.secondHalf);
        
        if (firstHalf !== null && secondHalf !== null) {
          const delta = secondHalf - firstHalf;
          halfData.push({ firstHalf, secondHalf, delta });
        }
      }
    }
    
    if (halfData.length < 3) continue;
    
    // Calculate averages
    const avg1st = halfData.reduce((sum, d) => sum + d.firstHalf, 0) / halfData.length;
    const avg2nd = halfData.reduce((sum, d) => sum + d.secondHalf, 0) / halfData.length;
    const avgDelta = avg2nd - avg1st;
    
    // Determine trend direction
    let deltaTrendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (avgDelta > 0.1 * avg1st) {
      deltaTrendDirection = 'improving';
    } else if (avgDelta < -0.1 * avg1st) {
      deltaTrendDirection = 'declining';
    }
    
    // Count consecutive games with drop (if declining)
    let consecutiveGamesWithDrop = 0;
    if (deltaTrendDirection === 'declining') {
      for (let i = halfData.length - 1; i >= 1; i--) {
        if (halfData[i]!.delta < 0 && halfData[i - 1]!.delta < 0) {
          consecutiveGamesWithDrop++;
        } else {
          break;
        }
      }
    }
    
    // Flag if delta is significant (more than 10% of 1st half average)
    if (Math.abs(avgDelta) > 0.1 * avg1st) {
      findings.push({
        stat_name: stat.name,
        avg_1st_half: avg1st,
        avg_2nd_half: avg2nd,
        delta: avgDelta,
        delta_trend_direction: deltaTrendDirection,
        consecutive_games_with_drop: consecutiveGamesWithDrop,
      });
    }
  }
  
  return findings;
}

/**
 * D. Correlation Analysis (stat relationships)
 * Compute Pearson correlations between key stat pairs and outcomes
 */
async function detectCorrelations(
  teamId: number,
  seasonId: number | null
): Promise<CorrelationFinding[]> {
  const matches = await getMatches({ teamId });
  
  // Filter by season if provided
  let seasonMatches = matches;
  if (seasonId) {
    // TODO: Filter by season
    seasonMatches = matches;
  }
  
  // Need at least 8 games for correlation analysis
  if (seasonMatches.length < 8) return [];
  
  // Sort by date
  seasonMatches.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  
  // Convert result to numeric (win=3, draw=1, loss=0)
  const getResultValue = (result: string | null): number => {
    if (!result) return 1; // Default to draw
    const lower = result.toLowerCase();
    if (lower.includes('win') || lower.includes('w')) return 3;
    if (lower.includes('loss') || lower.includes('l')) return 0;
    return 1; // Draw
  };
  
  const findings: CorrelationFinding[] = [];
  
  // Key correlations to check
  const correlationsToCheck = [
    { stat_a: 'pass share', stat_b: 'result' },
    { stat_a: 'spi', stat_b: 'result' },
    { stat_a: 'possession', stat_b: 'result' },
    { stat_a: 'conversion rate', stat_b: 'result' },
    { stat_a: 'ppm', stat_b: 'possession' },
  ];
  
  for (const { stat_a, stat_b } of correlationsToCheck) {
    // Collect paired values
    const pairs: Array<{ a: number; b: number }> = [];
    
    for (const match of seasonMatches) {
      if (match.statsJson) {
        let valueA: number | null = null;
        let valueB: number | null = null;
        
        if (stat_b === 'result') {
          valueB = getResultValue(match.result);
        } else {
          valueB = getStatValue(match.statsJson, stat_b);
        }
        
        valueA = getStatValue(match.statsJson, stat_a);
        
        if (valueA !== null && valueB !== null) {
          pairs.push({ a: valueA, b: valueB });
        }
      }
    }
    
    if (pairs.length < 8) continue;
    
    // Calculate Pearson correlation
    const meanA = pairs.reduce((sum, p) => sum + p.a, 0) / pairs.length;
    const meanB = pairs.reduce((sum, p) => sum + p.b, 0) / pairs.length;
    
    let numerator = 0;
    let sumSqA = 0;
    let sumSqB = 0;
    
    for (const pair of pairs) {
      const diffA = pair.a - meanA;
      const diffB = pair.b - meanB;
      numerator += diffA * diffB;
      sumSqA += diffA * diffA;
      sumSqB += diffB * diffB;
    }
    
    const denominator = Math.sqrt(sumSqA * sumSqB);
    if (denominator === 0) continue;
    
    const pearsonR = numerator / denominator;
    
    // Approximate p-value (simplified - for exact p-value would need t-distribution)
    // Using rough approximation: |r| > 0.4 is significant for n >= 8
    const pValueApprox = Math.abs(pearsonR) > 0.4 ? 0.05 : 0.5;
    
    // Only include if |r| > 0.4
    if (Math.abs(pearsonR) > 0.4) {
      findings.push({
        stat_a,
        stat_b,
        pearson_r: pearsonR,
        p_value_approx: pValueApprox,
        sample_size: pairs.length,
      });
    }
  }
  
  return findings;
}

/**
 * Save insight to database
 */
async function saveInsight(insight: Omit<NewInsight, 'id' | 'created_at' | 'updated_at'>): Promise<InsightRow> {
  const result = await db
    .insertInto('insights')
    .values({
      ...insight,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return result;
}

/**
 * Generate insights for a specific match
 * Called after match creation/update
 */
export async function generateInsightsForMatch(
  teamId: number,
  matchId: number,
  seasonId: number | null
): Promise<void> {
  console.log(`📊 Generating insights for team ${teamId}, match ${matchId}`);
  
  // Get the latest match
  const matches = await getMatches({ teamId });
  const latestMatch = matches.find(m => m.id === matchId);
  
  if (!latestMatch || !latestMatch.statsJson) {
    console.log('⚠️  No match or stats found, skipping insights');
    return;
  }
  
  const insights: Array<Omit<NewInsight, 'id' | 'created_at' | 'updated_at'>> = [];
  
  // A. Anomaly Detection
  const anomalies = await detectAnomalies(teamId, seasonId, matchId, latestMatch.statsJson);
  for (const anomaly of anomalies) {
    const category = mapStatToCategory(anomaly.stat_name);
    const title = `${anomaly.stat_name} was ${anomaly.z_score > 0 ? 'unusually high' : 'unusually low'} (${anomaly.z_score.toFixed(1)}σ from season average)`;
    
    insights.push({
      team_id: teamId,
      match_id: matchId,
      season_id: seasonId,
      insight_type: 'anomaly',
      category,
      severity: zScoreToSeverity(anomaly.z_score),
      title,
      detail_json: JSON.stringify(anomaly),
      narrative: null,
      is_read: false,
      is_dismissed: false,
      expires_at: null,
    });
  }
  
  // B. Trend Detection (runs on all matches, not just latest)
  const trends = await detectTrends(teamId, seasonId);
  for (const trend of trends) {
    // Only create insight if this is a new trend (check if similar insight already exists)
    const category = mapStatToCategory(trend.stat_name);
    const title = `${trend.stat_name} is ${trend.direction} (${trend.games_in_trend} games)`;
    
    insights.push({
      team_id: teamId,
      match_id: null, // Trend insights are not tied to a specific match
      season_id: seasonId,
      insight_type: 'trend',
      category,
      severity: Math.min(0.3 + (trend.games_in_trend * 0.1), 1.0),
      title,
      detail_json: JSON.stringify(trend),
      narrative: null,
      is_read: false,
      is_dismissed: false,
      expires_at: null,
    });
  }
  
  // C. Half-Split Analysis
  const halfSplits = await detectHalfSplitPatterns(teamId, seasonId);
  for (const halfSplit of halfSplits) {
    const category = mapStatToCategory(halfSplit.stat_name);
    const title = `${halfSplit.stat_name} ${halfSplit.delta_trend_direction === 'declining' ? 'drops' : 'improves'} in 2nd half (avg ${halfSplit.delta > 0 ? '+' : ''}${halfSplit.delta.toFixed(1)})`;
    
    insights.push({
      team_id: teamId,
      match_id: null,
      season_id: seasonId,
      insight_type: 'half_split',
      category,
      severity: Math.min(0.4 + (halfSplit.consecutive_games_with_drop * 0.1), 1.0),
      title,
      detail_json: JSON.stringify(halfSplit),
      narrative: null,
      is_read: false,
      is_dismissed: false,
      expires_at: null,
    });
  }
  
  // Save all insights
  let savedCount = 0;
  for (const insight of insights) {
    try {
      await saveInsight(insight);
      savedCount++;
    } catch (error) {
      console.error(`❌ Error saving insight:`, error);
    }
  }
  
  console.log(`✅ Generated ${insights.length} insights, saved ${savedCount}`);
}

/**
 * Map stat name to category
 */
function mapStatToCategory(statName: string): 'shooting' | 'possession' | 'passing' | 'defending' | 'general' {
  const lower = statName.toLowerCase();
  if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt') || lower.includes('conversion')) {
    return 'shooting';
  }
  if (lower.includes('possession') || lower.includes('possess')) {
    return 'possession';
  }
  if (lower.includes('pass') || lower.includes('spi') || lower.includes('ppm')) {
    return 'passing';
  }
  if (lower.includes('against') || lower.includes('defend')) {
    return 'defending';
  }
  return 'general';
}

/**
 * Get active insights for a team
 */
export async function getActiveInsights(teamId: number): Promise<InsightRow[]> {
  return await db
    .selectFrom('insights')
    .selectAll()
    .where('team_id', '=', teamId)
    .where('is_dismissed', '=', false)
    .where((eb) =>
      eb.or([
        eb('expires_at', 'is', null),
        eb('expires_at', '>', new Date().toISOString()),
      ])
    )
    .orderBy('severity', 'desc')
    .orderBy('created_at', 'desc')
    .execute();
}
