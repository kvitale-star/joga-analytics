import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MatchData } from '../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { DateFilter } from './DateFilter';
import { JOGA_COLORS } from '../utils/colors';
import { UserMenu } from './UserMenu';
import { Team } from '../types/auth';
import { getTeamsForDropdown } from '../utils/teamMapping';
import { useAuth } from '../contexts/AuthContext';
import { formatDateWithUserPreference } from '../utils/dateFormatting';

interface GameDataViewProps {
  matchData: MatchData[];
  columnKeys: string[];
  getTeamKey: () => string;
  getOpponentKey: () => string;
  getLabelKey: () => string;
  parseDateHelper: (value: string | number | undefined | null) => Date | null;
  teamSlugMap: Map<string, Team>;
  selectedOpponents: string[];
  setSelectedOpponents: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedShootingMetrics: string[];
  setSelectedShootingMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedPassingMetrics: string[];
  setSelectedPassingMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedPossessionMetrics: string[];
  setSelectedPossessionMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedJOGAMetrics: string[];
  setSelectedJOGAMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedDefenseMetrics: string[];
  setSelectedDefenseMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedSetPiecesMetrics: string[];
  setSelectedSetPiecesMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedOtherMetrics: string[];
  setSelectedOtherMetrics: (value: string[] | ((prev: string[]) => string[])) => void;
  selectedDate: string;
  setSelectedDate: (value: string | ((prev: string) => string)) => void;
  selectedTeam: string | null;
  setSelectedTeam: (value: string | null | ((prev: string | null) => string | null)) => void;
}

// Configuration: Metrics that should be hidden by default (marked as "additional")
// Add metric names or patterns here. Patterns use case-insensitive partial matching.
// For example, 'Pass % by Zone' will match any metric containing that text.
const ADDITIONAL_METRICS: string[] = [
  'Pass % by Zone',
  'Opp Pass % by Zone',
  'xG (Total)',
  '3-Pass Strings',
  '4-Pass Strings',
  '5-Pass Strings',
  '6-Pass Strings',
  '7-Pass Strings',
  '8-Pass Strings',
  '9-Pass Strings',
  '10-Pass Strings',
  '11-Pass Strings',
  '12-Pass Strings',
  'Opp 3-Pass Strings',
  'Opp 4-Pass Strings',
  'Opp 5-Pass Strings',
  'Opp 6-Pass Strings',
  'Opp 7-Pass Strings',
  'Opp 8-Pass Strings',
  'Opp 9-Pass Strings',
  'Opp 10-Pass Strings',
  'Opp 11-Pass Strings',
  'Opp 12-Pass Strings',
  'Possess % (Def)',
  'Possess % (Mid)',
  'Possess % (Att)',
  'SPI (w)',
  'Opp SPI (w)',
  'CPI (avg of tagged clips)',
  'Behavioral Avg',
  'Notes',
  'Shot Map',
  'Heatmap (1st Half)',
  'Heatmap (2nd Half)',
];

// Check if a metric should be treated as "additional" (hidden by default)
const isAdditionalMetric = (metricKey: string): boolean => {
  const keyLower = metricKey.toLowerCase();
  
  // Check if it's a half-specific metric (contains "1st", "2nd", "first", or "second")
  // Match various patterns: "(1st)", "(2nd)", "1st Half", "2nd Half", "First Half", "Second Half", etc.
  // But exclude false positives like "21st", "12th", "1st period", "2nd period"
  
  // First check for explicit half indicators with parentheses or "half" keyword
  const hasExplicitHalfIndicator = 
    keyLower.includes('(1st)') || 
    keyLower.includes('(2nd)') ||
    keyLower.includes('(first)') ||
    keyLower.includes('(second)') ||
    keyLower.includes('1st half') || 
    keyLower.includes('2nd half') ||
    keyLower.includes('first half') ||
    keyLower.includes('second half');
  
  if (hasExplicitHalfIndicator) {
    return true;
  }
  
  // Check for standalone "1st" or "2nd" as word boundaries (but exclude false positives)
  // Exclude: "21st", "31st", "1st period", "2nd period", "1st place", etc.
  const has1st = /\b1st\b/.test(keyLower);
  const has2nd = /\b2nd\b/.test(keyLower);
  const hasFirst = /\bfirst\b/.test(keyLower);
  const hasSecond = /\bsecond\b/.test(keyLower);
  
  // Exclude false positives
  const falsePositives = [
    '21st', '31st', '41st', '51st', '61st', '71st', '81st', '91st',
    '1st period', '2nd period', 'first period', 'second period',
    '1st place', '2nd place', 'first place', 'second place',
    'firstname', 'secondly', 'firstly'
  ];
  
  const hasFalsePositive = falsePositives.some(fp => keyLower.includes(fp));
  
  if ((has1st || has2nd || hasFirst || hasSecond) && !hasFalsePositive) {
    return true;
  }
  
  return ADDITIONAL_METRICS.some(pattern => keyLower.includes(pattern.toLowerCase()));
};

// Helper function to get category header color (rotating through JOGA colors starting with yellow)
const getCategoryHeaderColor = (index: number): string => {
  const colors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue, JOGA_COLORS.pinkFoam];
  return colors[index % colors.length];
};

// Determine if a metric is an opponent metric (used for Team/Opponent subsections)
const isOpponentMetric = (metricKey: string): boolean => {
  const lower = metricKey.toLowerCase();
  return lower.includes('opp') ||
         lower.includes('opponent') ||
         lower.includes('(opp)') ||
         lower.includes('(opponent)') ||
         lower.includes(' against') ||
         lower.includes('against');
};

// Helper function to categorize metrics - matches DataAtAGlanceView categorization
const categorizeMetrics = (columnKeys: string[]): Record<string, string[]> => {
  const categories: Record<string, string[]> = {
    'Shooting': [],
    'Passing': [],
    'Possession': [],
    'JOGA Metrics': [],
    'Defense': [],
    'Set Pieces': [],
    'Other': []
  };

  // Metadata columns to skip (including match id, referee, venue)
  const metadataColumns = ['Team', 'team', 'Opponent', 'opponent', 'Date', 'date', 'Match', 'match', 'Game', 'game', 'Competition Type', 'competition type', 'Match ID', 'match id', 'MatchId', 'matchId', 'Match ID', 'match_id', 'Referee', 'referee', 'Venue', 'venue'];

  // Categorize columns based on keyword matching
  columnKeys.forEach(key => {
    // Skip metadata columns
    if (metadataColumns.some(mc => key.toLowerCase() === mc.toLowerCase())) {
      return;
    }

    const keyLower = key.toLowerCase();
    let categorized = false;

    // Shooting category
    const isCornerOrFreeKick = keyLower.includes('corner') || 
                                keyLower.includes('free kick') || 
                                keyLower.includes('freekick');
    
    if (!categorized && !isCornerOrFreeKick && (
      keyLower.includes('attempt') ||
      keyLower.includes('shot') ||
      keyLower.includes('goal') ||
      keyLower.includes('xg') ||
      keyLower.includes('conversion') ||
      keyLower.includes('conv') ||
      keyLower.includes('inside box') ||
      keyLower.includes('outside box') ||
      keyLower === 'tsr' ||
      (keyLower.includes('tsr') && !keyLower.includes('pass'))
    )) {
      categories['Shooting'].push(key);
      categorized = true;
    }

    // Passing category
    if (!categorized && (
      keyLower.includes('pass') ||
      keyLower.includes('string') ||
      keyLower.includes('lpc') ||
      keyLower.includes('ppm') ||
      keyLower.includes('zone')
    )) {
      categories['Passing'].push(key);
      categorized = true;
    }

    // Possession category (exclude "Possessions Won" - those go to Defense)
    if (!categorized && (
      (keyLower.includes('possession') && !keyLower.includes('won')) ||
      (keyLower.includes('poss') && !keyLower.includes('won')) ||
      keyLower === 'poss'
    )) {
      categories['Possession'].push(key);
      categorized = true;
    }

    // JOGA Metrics category
    if (!categorized && (
      keyLower.includes('spi') ||
      keyLower.includes('sustained passing')
    )) {
      categories['JOGA Metrics'].push(key);
      categorized = true;
    }

    // Defense category
    if (!categorized && (
      keyLower.includes('tackle') ||
      keyLower.includes('intercept') ||
      keyLower.includes('clearance') ||
      keyLower.includes('block') ||
      keyLower.includes('defensive') ||
      keyLower.includes('defense') ||
      (keyLower.includes('def') && !keyLower.includes('possession')) ||
      keyLower.includes('possessions won') ||
      keyLower.includes('possession won') ||
      (keyLower.includes('poss') && keyLower.includes('won'))
    )) {
      categories['Defense'].push(key);
      categorized = true;
    }

    // Set Pieces category
    if (!categorized && (
      keyLower.includes('corner') ||
      keyLower.includes('free kick') ||
      keyLower.includes('freekick') ||
      keyLower.includes('penalty')
    )) {
      categories['Set Pieces'].push(key);
      categorized = true;
    }

    // Everything else goes to Other
    if (!categorized) {
      categories['Other'].push(key);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(cat => {
    if (categories[cat].length === 0) {
      delete categories[cat];
    }
  });

  return categories;
};

export const GameDataView: React.FC<GameDataViewProps> = ({
  matchData,
  columnKeys,
  getTeamKey,
  getOpponentKey,
  getLabelKey,
  parseDateHelper,
  teamSlugMap,
  selectedOpponents,
  setSelectedOpponents,
  selectedShootingMetrics,
  setSelectedShootingMetrics,
  selectedPassingMetrics,
  setSelectedPassingMetrics,
  selectedPossessionMetrics,
  setSelectedPossessionMetrics,
  selectedJOGAMetrics,
  setSelectedJOGAMetrics,
  selectedDefenseMetrics,
  setSelectedDefenseMetrics,
  selectedSetPiecesMetrics,
  setSelectedSetPiecesMetrics,
  selectedOtherMetrics,
  setSelectedOtherMetrics,
  selectedDate,
  setSelectedDate,
  selectedTeam,
  setSelectedTeam
}) => {
  const { user } = useAuth();
  const [columnOrder, setColumnOrder] = useState<number[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openConfigCategory, setOpenConfigCategory] = useState<string | null>(null);

  const teamKey = getTeamKey();
  const opponentKey = getOpponentKey();
  const labelKey = getLabelKey();

  // Get date key
  const dateKey = useMemo(() => {
    return columnKeys.find(key => 
      key.toLowerCase().includes('date') && 
      !key.toLowerCase().includes('match id') && 
      !key.toLowerCase().includes('matchid')
    ) || (labelKey.toLowerCase().includes('match id') || labelKey.toLowerCase().includes('matchid') 
      ? columnKeys.find(key => key.toLowerCase().includes('date')) || labelKey 
      : labelKey);
  }, [columnKeys, labelKey]);

  // Calculate available dates based on selected team and opponents
  const availableDates = useMemo(() => {
    if (!dateKey) {
      return [];
    }
    
    // Filter matches by selected team and opponents
    let filteredMatches = matchData;
    
    if (selectedTeam) {
      // selectedTeam is now a slug, match against team column (which should also be slugs)
      filteredMatches = filteredMatches.filter(match => {
        const matchTeamSlug = (match[teamKey] as string)?.trim();
        return matchTeamSlug === selectedTeam;
      });
    }
    
    if (selectedOpponents.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const opponent = match[opponentKey];
        return opponent && selectedOpponents.includes(String(opponent));
      });
    }
    
    // Extract unique dates from filtered matches
    const dateMap = new Map<string, Date>();
    
    filteredMatches.forEach(match => {
      const date = parseDateHelper(match[dateKey]);
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, date);
        }
      }
    });
    
    // Convert to array and sort by date (most recent first)
    const dates = Array.from(dateMap.entries())
      .map(([dateStr, date]) => ({
        value: dateStr,
        label: formatDateWithUserPreference(date, user?.preferences),
        date: date
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return dates.map(({ value, label }) => ({ value, label }));
  }, [matchData, selectedTeam, selectedOpponents, dateKey, teamKey, opponentKey, parseDateHelper]);

  // Extract team slugs from match data and map to Display Names
  const teamSlugs = useMemo(() => {
    const teamSet = new Set<string>();
    matchData.forEach(match => {
      const team = match[teamKey];
      if (team && typeof team === 'string' && team.trim()) {
        teamSet.add(team.trim());
      }
    });
    return Array.from(teamSet);
  }, [matchData, teamKey]);

  // Map slugs to Display Names for dropdown
  const teams = useMemo(() => {
    return getTeamsForDropdown(teamSlugs, teamSlugMap);
  }, [teamSlugs, teamSlugMap]);

  // Get available opponents for selected team (or all opponents if no team selected)
  const availableOpponents = useMemo(() => {
    const opponents = new Set<string>();
    matchData.forEach(match => {
      const team = match[teamKey];
      const opponent = match[opponentKey];
      if (opponent && typeof opponent === 'string') {
        // If team is selected, only show opponents for that team
        // selectedTeam is now a slug
        if (selectedTeam) {
          const matchTeamSlug = (team as string)?.trim();
          if (matchTeamSlug === selectedTeam) {
            opponents.add(opponent);
          }
        } else {
          // If no team selected, show all opponents
          opponents.add(opponent);
        }
      }
    });
    return Array.from(opponents).sort();
  }, [matchData, selectedTeam, teamKey, opponentKey]);

  // Filter data by selected team and opponents
  const filteredData = useMemo(() => {
    let filtered = matchData;
    
    // Filter by team if selected (selectedTeam is now a slug)
    if (selectedTeam) {
      filtered = filtered.filter(match => {
        const matchTeamSlug = (match[teamKey] as string)?.trim();
        return matchTeamSlug === selectedTeam;
      });
    }
    
    // Filter by selected opponents if any are selected
    if (selectedOpponents.length > 0) {
      filtered = filtered.filter(match => {
        const opponent = match[opponentKey];
        return opponent && selectedOpponents.includes(String(opponent));
      });
    }

    // Filter by selected date if specified
    if (dateKey && selectedDate) {
      filtered = filtered.filter(match => {
        const matchDate = parseDateHelper(match[dateKey]);
        if (!matchDate) return false;
        
        const matchDateStr = matchDate.toISOString().split('T')[0];
        return matchDateStr === selectedDate;
      });
    }

    // Sort by date (most recent first)
    if (dateKey) {
      const matchesWithDates = filtered.map(match => ({
      match,
        date: parseDateHelper(match[dateKey] as string | number | undefined | null)
      })).filter((item): item is { match: MatchData; date: Date } => item.date !== null);
    
      matchesWithDates.sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });

      return matchesWithDates.map(item => item.match);
    }

    return filtered;
  }, [matchData, selectedTeam, selectedOpponents, selectedDate, teamKey, opponentKey, dateKey, parseDateHelper]);

  // Set default to last 4 unique opponents when team changes
  useEffect(() => {
    if (selectedTeam && availableOpponents.length > 0 && selectedOpponents.length === 0) {
      // Get all matches for the selected team, sorted by date (most recent first)
      const teamMatches = matchData
        .filter(match => {
          const team = match[teamKey];
          return team === selectedTeam;
        })
        .map(match => ({
          match,
          date: dateKey ? parseDateHelper(match[dateKey] as string | number | undefined | null) : null
        }))
        .filter((item): item is { match: MatchData; date: Date } => item.date !== null)
        .sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime();
        });

      // Extract the 4 most recent unique opponents (by date)
      const last4Opponents: string[] = [];
      const seenOpponents = new Set<string>();
      
      for (const { match } of teamMatches) {
        const opponent = match[opponentKey];
        if (opponent && typeof opponent === 'string' && !seenOpponents.has(opponent)) {
          last4Opponents.push(opponent);
          seenOpponents.add(opponent);
          if (last4Opponents.length >= 4) {
            break;
          }
        }
      }

      if (last4Opponents.length > 0) {
        setSelectedOpponents(last4Opponents);
      }
    }
  }, [selectedTeam, availableOpponents.length, matchData, teamKey, opponentKey, dateKey, parseDateHelper, setSelectedOpponents]);

  // Clear selected date if it's no longer in available dates
  useEffect(() => {
    if (selectedDate && !availableDates.some(d => d.value === selectedDate)) {
      setSelectedDate('');
    }
  }, [selectedDate, availableDates]);

  // Initialize column order when filtered data changes
  useEffect(() => {
    if (filteredData.length > 0) {
      setColumnOrder(Array.from({ length: filteredData.length }, (_, i) => i));
    } else {
      setColumnOrder([]);
    }
  }, [filteredData]);

  // Close popover when clicking outside (but let backdrop handle it for portal-rendered popovers)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is on backdrop (which should have z-[299])
      if (target.classList.contains('fixed') && target.classList.contains('inset-0') && target.classList.contains('bg-black')) {
        // Backdrop will handle closing via its onClick
        return;
      }
      // For non-portal clicks, close if clicking outside
      if (openConfigCategory && !target.closest(`[data-category="${openConfigCategory}"]`) && !target.closest(`[data-popover="${openConfigCategory}"]`)) {
        setOpenConfigCategory(null);
      }
    };

    if (openConfigCategory) {
      // Use capture phase to catch events before they propagate
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('click', handleClickOutside, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [openConfigCategory]);

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setColumnOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Get reordered data based on columnOrder
  const reorderedData = useMemo(() => {
    if (columnOrder.length === 0 || filteredData.length === 0) return filteredData;
    if (columnOrder.length !== filteredData.length) return filteredData;
    return columnOrder.map(index => filteredData[index]).filter(Boolean);
  }, [filteredData, columnOrder]);

  // Categorize metrics
  const categorizedMetricsRaw = useMemo(() => {
    return categorizeMetrics(columnKeys);
  }, [columnKeys]);

  // Sort metrics to group similar ones together (e.g., "Shots For" next to "Shots Against")
  const sortMetrics = (metrics: string[]): string[] => {
    // Extract base metric name and type for sorting
    const getMetricInfo = (metric: string) => {
      const lower = metric.toLowerCase();
      
      // Check for "For" / "Against" pairs
      const hasFor = lower.includes(' for') || lower.endsWith(' for');
      const hasAgainst = lower.includes(' against') || lower.endsWith(' against');
      const hasOpp = lower.startsWith('opp ') || lower.startsWith('opponent ');
      
      // Extract base name (remove "For", "Against", "Opp", etc.)
      const baseName = lower
        .replace(/\s*(for|against)\s*$/i, '')
        .replace(/^\s*(opp|opponent)\s+/i, '')
        .replace(/\s+(for|against)\s+/i, ' ')
        .trim();
      
      // Determine sort key
      // Priority: base name, then type (For < Against < Opp < Other)
      let typeOrder = 3; // Default for other metrics
      if (hasFor && !hasAgainst) typeOrder = 0; // "For" comes first
      else if (hasAgainst) typeOrder = 1; // "Against" comes second
      else if (hasOpp) typeOrder = 2; // "Opp" comes third
      
      return { baseName, typeOrder, original: metric };
    };
    
    // Sort metrics
    return [...metrics].sort((a, b) => {
      const infoA = getMetricInfo(a);
      const infoB = getMetricInfo(b);
      
      // First sort by base name
      const nameCompare = infoA.baseName.localeCompare(infoB.baseName);
      if (nameCompare !== 0) return nameCompare;
      
      // If same base name, sort by type order
      return infoA.typeOrder - infoB.typeOrder;
    });
  };

  // Calculate default selections (all metrics except additional ones)
  const getDefaultMetricsForCategory = useCallback((_category: string, allMetrics: string[]): string[] => {
    return allMetrics.filter(metric => !isAdditionalMetric(metric));
  }, []);

  // Initialize default selections if empty (only once when categorizedMetricsRaw is available)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (Object.keys(categorizedMetricsRaw).length > 0 && !initializedRef.current) {
      if (selectedShootingMetrics.length === 0 && categorizedMetricsRaw['Shooting']) {
        setSelectedShootingMetrics(getDefaultMetricsForCategory('Shooting', categorizedMetricsRaw['Shooting']));
      }
      if (selectedPassingMetrics.length === 0 && categorizedMetricsRaw['Passing']) {
        setSelectedPassingMetrics(getDefaultMetricsForCategory('Passing', categorizedMetricsRaw['Passing']));
      }
      if (selectedPossessionMetrics.length === 0 && categorizedMetricsRaw['Possession']) {
        setSelectedPossessionMetrics(getDefaultMetricsForCategory('Possession', categorizedMetricsRaw['Possession']));
      }
      if (selectedJOGAMetrics.length === 0 && categorizedMetricsRaw['JOGA Metrics']) {
        setSelectedJOGAMetrics(getDefaultMetricsForCategory('JOGA Metrics', categorizedMetricsRaw['JOGA Metrics']));
      }
      if (selectedDefenseMetrics.length === 0 && categorizedMetricsRaw['Defense']) {
        setSelectedDefenseMetrics(getDefaultMetricsForCategory('Defense', categorizedMetricsRaw['Defense'] || []));
      }
      if (selectedSetPiecesMetrics.length === 0 && categorizedMetricsRaw['Set Pieces']) {
        setSelectedSetPiecesMetrics(getDefaultMetricsForCategory('Set Pieces', categorizedMetricsRaw['Set Pieces']));
      }
      if (selectedOtherMetrics.length === 0 && categorizedMetricsRaw['Other']) {
        setSelectedOtherMetrics(getDefaultMetricsForCategory('Other', categorizedMetricsRaw['Other']));
      }
      initializedRef.current = true;
    }
  }, [categorizedMetricsRaw, selectedShootingMetrics.length, selectedPassingMetrics.length, selectedPossessionMetrics.length, selectedJOGAMetrics.length, selectedDefenseMetrics.length, selectedSetPiecesMetrics.length, selectedOtherMetrics.length, setSelectedShootingMetrics, setSelectedPassingMetrics, setSelectedPossessionMetrics, setSelectedJOGAMetrics, setSelectedDefenseMetrics, setSelectedSetPiecesMetrics, setSelectedOtherMetrics, getDefaultMetricsForCategory]);

  // State for confirmation popup
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Reset metrics to defaults handler
  const handleResetMetrics = useCallback(() => {
    if (categorizedMetricsRaw['Shooting']) {
      setSelectedShootingMetrics(getDefaultMetricsForCategory('Shooting', categorizedMetricsRaw['Shooting']));
    }
    if (categorizedMetricsRaw['Passing']) {
      setSelectedPassingMetrics(getDefaultMetricsForCategory('Passing', categorizedMetricsRaw['Passing']));
    }
    if (categorizedMetricsRaw['Possession']) {
      setSelectedPossessionMetrics(getDefaultMetricsForCategory('Possession', categorizedMetricsRaw['Possession']));
    }
    if (categorizedMetricsRaw['JOGA Metrics']) {
      setSelectedJOGAMetrics(getDefaultMetricsForCategory('JOGA Metrics', categorizedMetricsRaw['JOGA Metrics']));
    }
    if (categorizedMetricsRaw['Defense']) {
      setSelectedDefenseMetrics(getDefaultMetricsForCategory('Defense', categorizedMetricsRaw['Defense'] || []));
    }
    if (categorizedMetricsRaw['Set Pieces']) {
      setSelectedSetPiecesMetrics(getDefaultMetricsForCategory('Set Pieces', categorizedMetricsRaw['Set Pieces']));
    }
    if (categorizedMetricsRaw['Other']) {
      setSelectedOtherMetrics(getDefaultMetricsForCategory('Other', categorizedMetricsRaw['Other']));
    }
    setShowResetConfirm(false);
  }, [categorizedMetricsRaw, getDefaultMetricsForCategory, setSelectedShootingMetrics, setSelectedPassingMetrics, setSelectedPossessionMetrics, setSelectedJOGAMetrics, setSelectedDefenseMetrics, setSelectedSetPiecesMetrics, setSelectedOtherMetrics]);

  // Allow resetting metrics from elsewhere in the app (e.g., User Preferences)
  useEffect(() => {
    const handler = () => {
      handleResetMetrics();
    };

    window.addEventListener('joga:reset-game-data-metrics', handler as EventListener);
    return () => {
      window.removeEventListener('joga:reset-game-data-metrics', handler as EventListener);
    };
  }, [handleResetMetrics]);

  // Filter metrics based on category selections
  const categorizedMetrics = useMemo(() => {
    const result: Record<string, string[]> = {};
    
    // Map category selections
    const categorySelections: Record<string, string[]> = {
      'Shooting': selectedShootingMetrics,
      'Passing': selectedPassingMetrics,
      'Possession': selectedPossessionMetrics,
      'JOGA Metrics': selectedJOGAMetrics,
      'Defense': selectedDefenseMetrics,
      'Other': selectedOtherMetrics,
    };
    
    // Filter each category based on selections
      Object.entries(categorizedMetricsRaw).forEach(([category, metrics]) => {
      const selected = categorySelections[category] || [];
      // If no selections yet, use defaults (all non-additional metrics)
      if (selected.length === 0) {
        result[category] = metrics.filter(metric => !isAdditionalMetric(metric));
      } else {
        result[category] = metrics.filter(metric => selected.includes(metric));
      }
      
      // Sort metrics within each category
      result[category] = sortMetrics(result[category]);
      
      // Remove empty categories
      if (result[category].length === 0) {
        delete result[category];
      }
    });
    
    return result;
  }, [categorizedMetricsRaw, selectedShootingMetrics, selectedPassingMetrics, selectedPossessionMetrics, selectedJOGAMetrics, selectedDefenseMetrics, selectedSetPiecesMetrics, selectedOtherMetrics]);

  // Determine if a metric should be displayed as a percentage
  const isPercentageMetric = (metricKey: string): boolean => {
    // First check if "%" is in the metric name - this takes priority
    if (metricKey.includes('%')) {
      return true;
    }
    
    const keyLower = metricKey.toLowerCase();
    
    // Explicitly exclude count-based metrics
    const excludePatterns = [
      'pass strings', 'pass string', 'string', 'strings',
      'lpc', 'longest pass',
      'ppm', 'passes per minute',
      'passes', 'pass',
      'goals', 'goal',
      'attempts', 'attempt',
      'shots', 'shot',
      'corners', 'corner',
      'free kick', 'freekick',
      'xg', 'xga',
      'match id', 'matchid'
    ];
    
    if (excludePatterns.some(pattern => keyLower.includes(pattern))) {
      return false;
    }
    
    // Include percentage indicators
    const percentagePatterns = [
      'percent', 'percentage',
      'rate', 'conv', 'conversion',
      'share', 'possession', 'poss',
      'spi', 'sustained passing',
      'zone', 'by zone',
      'inside box', 'outside box',
      'accuracy', 'completion'
    ];
    
    return percentagePatterns.some(pattern => keyLower.includes(pattern));
  };

  // Format value for display
  const formatValue = (value: any, metricKey: string): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      const isPercentage = isPercentageMetric(metricKey);
      
      if (isPercentage) {
        // Handle percentage values (could be 0-1 or 0-100)
        if (value >= 0 && value <= 1) {
          return `${(value * 100).toFixed(1)}%`;
        } else if (value > 1 && value <= 100) {
          return `${value.toFixed(1)}%`;
        } else {
          // If it's supposed to be a percentage but outside normal range, show as number
          return value % 1 === 0 ? value.toString() : value.toFixed(1);
        }
      } else {
        // Not a percentage - display as number
        if (value % 1 === 0) {
          return value.toString();
        } else {
          return value.toFixed(1);
        }
      }
    }
    return String(value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-tour="game-data-header">Game Data Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Browse and compare individual game statistics in tabular format</p>
            </div>
            <div className="relative">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Top Control Bar */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            {/* Team Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
              <select
                value={selectedTeam || ''}
                onChange={(e) => {
                  setSelectedTeam(e.target.value || null);
                  setSelectedOpponents([]); // Reset opponents when team changes
                }}
                className="px-3 py-1.5 text-sm border-2 border-[#ceff00] rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap"
                style={{ borderColor: '#ceff00', width: 'auto', minWidth: '140px' }}
              >
                <option value="">Choose a team...</option>
                {teams.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Opponent Selector - Multiselect */}
            <div className="flex-shrink-0 relative z-[200]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opponent</label>
              <MultiSelectDropdown
                options={availableOpponents.map(opp => ({ value: opp, label: opp }))}
                selectedValues={selectedOpponents}
                onSelectionChange={(values) => setSelectedOpponents(values)}
                placeholder="All Opponents"
                className="min-w-[180px]"
              />
            </div>

            {/* Date Filter */}
            <DateFilter
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              availableDates={availableDates}
            />
          </div>
        </div>
      </div>

      {/* Reset Confirmation Popup */}
      {showResetConfirm && document && createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[300]"
            onClick={() => setShowResetConfirm(false)}
          />
          <div 
            className="fixed inset-0 flex items-center justify-center z-[301] pointer-events-none"
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reset Metrics to Defaults?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will reset all metric selections to their default values. Any custom metric selections will be lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors text-white"
                  style={{
                    backgroundColor: JOGA_COLORS.valorBlue,
                    border: `2px solid ${JOGA_COLORS.valorBlue}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#557799'; // Darker valor blue
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetMetrics();
                  }}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors text-white"
                  style={{
                    backgroundColor: JOGA_COLORS.valorBlue,
                    border: `2px solid ${JOGA_COLORS.valorBlue}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#557799'; // Darker valor blue
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Reset Button - Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 text-sm rounded-lg font-medium transition-colors text-white shadow-lg"
          style={{
            backgroundColor: JOGA_COLORS.valorBlue,
            border: `2px solid ${JOGA_COLORS.valorBlue}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#557799'; // Darker valor blue
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
          }}
        >
          Reset
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="w-full max-w-[1600px] mx-auto">
          {!selectedTeam ? (
            <div 
              className="relative w-full rounded-lg"
              style={{
                backgroundImage: 'url(/joga-logo-bw.png)',
                backgroundSize: '60% auto',
                backgroundPosition: 'center top',
                backgroundRepeat: 'no-repeat',
                minWidth: '100%',
                minHeight: 'calc(min(60vw, 960px) + 4rem)',
                paddingTop: '2rem',
                paddingBottom: '2rem',
                opacity: 0.2,
              }}
            >
            </div>
          ) : reorderedData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {selectedTeam}
              </h2>
              <p className="text-gray-600">
                {selectedOpponents.length > 0 
                      ? `No games found for ${selectedTeam} against ${selectedOpponents.join(', ')}.`
                  : `No games found for ${selectedTeam}.`}
              </p>
            </div>
          ) : (
            <>
        {/* Render table for each category */}
        <div className="space-y-6">
          {Object.entries(categorizedMetrics).map(([category, metrics], categoryIndex) => {
            // Get the appropriate state setter and selected values for this category
            const getCategoryState = () => {
              switch (category) {
                case 'Shooting':
                  return { selected: selectedShootingMetrics, setter: setSelectedShootingMetrics, all: categorizedMetricsRaw['Shooting'] || [] };
                case 'Passing':
                  return { selected: selectedPassingMetrics, setter: setSelectedPassingMetrics, all: categorizedMetricsRaw['Passing'] || [] };
                case 'Possession':
                  return { selected: selectedPossessionMetrics, setter: setSelectedPossessionMetrics, all: categorizedMetricsRaw['Possession'] || [] };
                case 'JOGA Metrics':
                  return { selected: selectedJOGAMetrics, setter: setSelectedJOGAMetrics, all: categorizedMetricsRaw['JOGA Metrics'] || [] };
                case 'Defense':
                  return { selected: selectedDefenseMetrics, setter: setSelectedDefenseMetrics, all: categorizedMetricsRaw['Defense'] || [] };
                case 'Set Pieces':
                  return { selected: selectedSetPiecesMetrics, setter: setSelectedSetPiecesMetrics, all: categorizedMetricsRaw['Set Pieces'] || [] };
                case 'Other':
                  return { selected: selectedOtherMetrics, setter: setSelectedOtherMetrics, all: categorizedMetricsRaw['Other'] || [] };
                default:
                  return { selected: [], setter: () => {}, all: [] };
              }
            };
            const categoryState = getCategoryState();
            const isConfigOpen = openConfigCategory === category;
            const categoryColor = getCategoryHeaderColor(categoryIndex);
            const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';

            return (
            <div 
              key={category} 
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col relative z-0 group"
              data-category={category}
            >
              {/* Colored Header */}
              <div 
                className="px-8 py-4 border-b border-gray-200"
                style={{ backgroundColor: categoryColor }}
              >
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-semibold ${textColor}`}>{category}</h2>
                  {/* Config Icon Button - visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenConfigCategory(isConfigOpen ? null : category);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 ${textColor === 'text-gray-900' ? 'text-gray-700 hover:text-gray-900 hover:bg-black hover:bg-opacity-10' : 'text-white hover:text-gray-100 hover:bg-white hover:bg-opacity-20'} rounded-full relative`}
                    title="Configure metrics"
                  >
                  {/* Gear Icon SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  
                  {/* Popover - rendered via portal to prevent click-through issues */}
                  {isConfigOpen && categoryState.all.length > 0 && typeof document !== 'undefined' && createPortal(
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-[299]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                          setOpenConfigCategory(null);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                        }}
                        style={{ 
                          pointerEvents: 'auto',
                          touchAction: 'none'
                        }}
                      />
                      {/* Popover Content */}
                      <div
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[300] p-6 w-[1000px] max-h-[75vh] overflow-y-auto"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          maxWidth: 'calc(100vw - 80px)',
                          pointerEvents: 'auto',
                        }}
                        data-popover={category}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            {category} Metrics
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenConfigCategory(null);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {categoryState.all.map(metric => {
                          const isSelected = categoryState.selected.includes(metric);
                          return (
                            <label
                              key={metric}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    categoryState.setter(prev => [...prev, metric]);
                                  } else {
                                    categoryState.setter(prev => prev.filter(m => m !== metric));
                                  }
                                }}
                                className="h-4 w-4 text-[#6787aa] focus:ring-[#6787aa] border-gray-300 rounded flex-shrink-0"
                              />
                              <span className="text-sm text-gray-700 whitespace-nowrap">{metric}</span>
                            </label>
                          );
                        })}
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </button>
              </div>
              </div>
              
              {/* Table Content */}
              <div className="p-8">
                <div className="overflow-x-auto -mx-8 px-8">
                  <table 
                    className="divide-y divide-gray-200" 
                    style={{ 
                      width: 'auto', 
                      tableLayout: 'auto',
                      minWidth: '900px' // 4 games (4 * 150px) + metric column (300px)
                    }}
                  >
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10" style={{ minWidth: '300px', width: '300px' }}>
                      Metric
                    </th>
                    {reorderedData.map((match, displayIndex) => {
                      const opponent = (match[opponentKey] as string | undefined) || 'Unknown';
                      const team = (match[teamKey] as string | undefined) || 'Unknown';
                      // Use the date key from useMemo
                      const date = dateKey ? parseDateHelper(match[dateKey] as string | number | undefined | null) : null;
                      // Never show match ID - always show date or game number
                      const dateStr = date ? formatDateWithUserPreference(date, user?.preferences) : `Game ${displayIndex + 1}`;
                      return (
                        <th
                          key={`col-${displayIndex}-${opponent}`}
                          draggable
                          onDragStart={() => handleDragStart(displayIndex)}
                          onDragOver={(e) => handleDragOver(e, displayIndex)}
                          onDragEnd={handleDragEnd}
                          className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move hover:bg-gray-100 whitespace-nowrap ${
                            draggedIndex === displayIndex ? 'opacity-50' : ''
                          }`}
                          style={{ width: 'auto', maxWidth: '150px' }}
                          title="Drag to reorder"
                        >
                          <div>{selectedTeam ? opponent : `${team} vs ${opponent}`}</div>
                          <div className="text-gray-400 font-normal">{dateStr}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const teamMetrics = metrics.filter(m => !isOpponentMetric(m));
                    const opponentMetrics = metrics.filter(m => isOpponentMetric(m));

                    const renderMetricRow = (metricKey: string) => (
                      <tr key={metricKey} className="hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10" style={{ minWidth: '300px', width: '300px' }}>
                          {metricKey}
                        </td>
                        {reorderedData.map((match, displayIndex) => (
                          <td
                            key={`${metricKey}-${displayIndex}`}
                            className="px-4 py-1.5 text-sm text-gray-700 whitespace-nowrap"
                            style={{ width: 'auto', maxWidth: '150px' }}
                          >
                            {formatValue(match[metricKey] as string | number | undefined, metricKey)}
                          </td>
                        ))}
                      </tr>
                    );

                    const renderSectionHeaderRow = (label: 'Team' | 'Opponent') => (
                      <tr key={`section-${label}`}>
                        <td
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider sticky left-0 z-10"
                          style={{
                            minWidth: '300px',
                            width: '300px',
                            backgroundColor: '#f9fafb', // gray-50
                            borderTop: '1px solid #e5e7eb', // gray-200
                          }}
                        >
                          {label}
                        </td>
                        {reorderedData.map((_, idx) => (
                          <td
                            key={`section-${label}-${idx}`}
                            className="px-4 py-2"
                            style={{
                              backgroundColor: '#f9fafb',
                              borderTop: '1px solid #e5e7eb',
                            }}
                          />
                        ))}
                      </tr>
                    );

                    return (
                      <>
                        {teamMetrics.length > 0 && renderSectionHeaderRow('Team')}
                        {teamMetrics.map(renderMetricRow)}
                        {opponentMetrics.length > 0 && renderSectionHeaderRow('Opponent')}
                        {opponentMetrics.map(renderMetricRow)}
                      </>
                    );
                  })()}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          );
          })}
        </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
