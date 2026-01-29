import React, { useMemo, useState, useEffect } from 'react';
import { MatchData } from '../types';
import { Team } from '../types/auth';
import { getAllSeasons } from '../services/seasonService.api';
import { JOGA_COLORS } from '../utils/colors';
import { formatDateWithMonthName } from '../utils/dateFormatting';
// import { getDisplayNameForSlug } from '../utils/teamMapping'; // Reserved for future use

interface DataAtAGlanceViewProps {
  matchData: MatchData[];
  columnKeys: string[];
  teamSlugMap: Map<string, Team>;
}

// Helper function to categorize columns
const categorizeColumns = (columnKeys: string[]): Record<string, string[]> => {
  const categories: Record<string, string[]> = {
    'Game Info': [],
    'Shooting': [],
    'Passing': [],
    'Possession': [],
    'JOGA Metrics': [],
    'Defense': [],
    'Set Pieces': [],
    'Other': []
  };

  // Metadata columns (Game Info)
  const metadataColumns = [
    'Team', 'team', 
    'Opponent', 'opponent', 
    'Date', 'date', 
    'Match', 'match', 
    'Game', 'game', 
    'Competition Type', 'competition type', 'Competition', 'competition',
    'Match Date', 'match date', 'MatchDate', 'matchDate',
    'Season', 'season',
    'Match ID', 'match id', 'MatchId', 'matchId', 
    'Result', 'result', 
    'Venue', 'venue', 
    'Referee', 'referee'
  ];

  columnKeys.forEach(key => {
    // Skip metadata columns (they go to Game Info)
    if (metadataColumns.some(mc => key.toLowerCase() === mc.toLowerCase())) {
      categories['Game Info'].push(key);
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

export const DataAtAGlanceView: React.FC<DataAtAGlanceViewProps> = ({ matchData, columnKeys, teamSlugMap: _teamSlugMap }) => {
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(true);

  // Calculate stats - same logic as in ChatFirstView
  const stats = useMemo(() => {
    const matchCount = matchData.length;
    
    // Extract unique teams
    const teamKey = columnKeys.find(key => 
      key.toLowerCase().includes('team') && !key.toLowerCase().includes('opponent')
    ) || 'Team';
    // Extract team slugs and map to Display Names for display
    const teamSlugs = [...new Set(matchData.map(m => {
      const team = m[teamKey];
      return team && typeof team === 'string' ? team.trim() : null;
    }).filter(Boolean) as string[])];
    const teamCount = teamSlugs.length;
    // For display, use Display Names (but count is based on slugs)
    // Note: teamCount uses slugs directly, Display Names are available via getDisplayNameForSlug if needed
    
    // Extract unique opponents
    const opponentKey = columnKeys.find(key => 
      key.toLowerCase().includes('opponent')
    ) || 'Opponent';
    const opponents = [...new Set(matchData.map(m => m[opponentKey]).filter(Boolean))];
    const opponentCount = opponents.length;
    
    // Extract date range
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date')
    );
    let earliestDate: string | null = null;
    let latestDate: string | null = null;
    if (dateKey && matchData.length > 0) {
      const parseDate = (value: string | number): Date | null => {
        if (value === null || value === undefined || value === '') return null;
        
        // Handle Google Sheets date serial numbers
        if (typeof value === 'number') {
          if (value <= 0 || value > 1000000) return null;
          
          if (value >= 1 && value <= 100000) {
            const MS_PER_DAY = 86400000;
            const EPOCH_OFFSET = new Date(1899, 11, 30).getTime();
            const date = new Date(EPOCH_OFFSET + (value - 1) * MS_PER_DAY);
            
            if (value > 59) {
              date.setTime(date.getTime() - MS_PER_DAY);
            }
            
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              if (year >= 2000 && year <= 2100) {
                return date;
              }
            }
          }
        }
        
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return null;
          
          // Try MM/DD/YYYY format
          const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (mmddyyyy) {
            const month = parseInt(mmddyyyy[1], 10) - 1;
            const day = parseInt(mmddyyyy[2], 10);
            const year = parseInt(mmddyyyy[3], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                const parsedYear = date.getFullYear();
                if (parsedYear >= 2000 && parsedYear <= 2100) {
                  return date;
                }
              }
            }
          }
          
          // Try YYYY-MM-DD format
          const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (yyyymmdd) {
            const year = parseInt(yyyymmdd[1], 10);
            const month = parseInt(yyyymmdd[2], 10) - 1;
            const day = parseInt(yyyymmdd[3], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                if (year >= 2000 && year <= 2100) {
                  return date;
                }
              }
            }
          }
          
          // Try standard Date parsing
          const parsed = new Date(trimmed);
          if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            if (year >= 2000 && year <= 2100) {
              return parsed;
            }
          }
        }
        
        return null;
      };
      
      const dates = matchData
        .map(m => {
          const dateValue = m[dateKey];
          if (!dateValue) return null;
          return parseDate(dateValue);
        })
        .filter((d): d is Date => d !== null && d !== undefined);
      
      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        
        if (earliest.getFullYear() >= 2000 && latest.getFullYear() >= 2000) {
          earliestDate = formatDateWithMonthName(earliest);
          latestDate = formatDateWithMonthName(latest);
        }
      }
    }
    
    return { matchCount, teamCount, opponentCount, earliestDate, latestDate };
  }, [matchData, columnKeys]);

  // Fetch active season
  useEffect(() => {
    const fetchActiveSeason = async () => {
      try {
        setLoadingSeason(true);
        const seasons = await getAllSeasons();
        const active = seasons.find(s => s.isActive);
        setActiveSeason(active?.name || null);
      } catch (error) {
        console.error('Error fetching active season:', error);
        setActiveSeason(null);
      } finally {
        setLoadingSeason(false);
      }
    };
    fetchActiveSeason();
  }, []);

  // Categorize columns for display
  const categorizedColumns = useMemo(() => {
    return categorizeColumns(columnKeys);
  }, [columnKeys]);

  // JOGA colors for card headers (rotating pattern - matches Glossary)
  const cardHeaderColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue];
  
  const getCardHeaderColor = (index: number): string => {
    return cardHeaderColors[index % cardHeaderColors.length];
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Use JOGA colors for category backgrounds
  const getCategoryStyle = (category: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderWidth: '1px',
      borderRadius: '0.5rem',
      padding: '1rem',
    };

    switch (category) {
      case 'Game Info':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.valorBlue, 0.1),
          borderColor: hexToRgba(JOGA_COLORS.valorBlue, 0.3),
          color: JOGA_COLORS.valorBlue,
        };
      case 'Shooting':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.pinkFoam, 0.2),
          borderColor: hexToRgba(JOGA_COLORS.pinkFoam, 0.4),
          color: '#1f2937', // gray-800
        };
      case 'Passing':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.valorBlue, 0.1),
          borderColor: hexToRgba(JOGA_COLORS.valorBlue, 0.3),
          color: JOGA_COLORS.valorBlue,
        };
      case 'Possession':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.voltYellow, 0.2),
          borderColor: hexToRgba(JOGA_COLORS.voltYellow, 0.4),
          color: '#1f2937',
        };
      case 'JOGA Metrics':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.voltYellow, 0.2),
          borderColor: hexToRgba(JOGA_COLORS.voltYellow, 0.4),
          color: '#1f2937',
        };
      case 'Defense':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.pinkFoam, 0.2),
          borderColor: hexToRgba(JOGA_COLORS.pinkFoam, 0.4),
          color: '#1f2937',
        };
      case 'Set Pieces':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(JOGA_COLORS.valorBlue, 0.1),
          borderColor: hexToRgba(JOGA_COLORS.valorBlue, 0.3),
          color: JOGA_COLORS.valorBlue,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f9fafb', // gray-50
          borderColor: '#e5e7eb', // gray-200
          color: '#1f2937', // gray-800
        };
    }
  };

  return (
    <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div 
              className="px-6 py-4 border-b border-gray-200"
              style={{ backgroundColor: getCardHeaderColor(0) }}
            >
              <h2 className={`text-xl font-semibold ${getCardHeaderColor(0) === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white'}`}>
                Data Overview
              </h2>
            </div>
            <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Recorded Matches</div>
                <div className="text-3xl font-bold text-gray-900">{stats.matchCount}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Active Season</div>
                <div className="text-3xl font-bold text-gray-900">
                  {loadingSeason ? '...' : (activeSeason || 'N/A')}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Teams</div>
                <div className="text-3xl font-bold text-gray-900">{stats.teamCount}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 font-medium mb-2">Opponents</div>
                <div className="text-3xl font-bold text-gray-900">{stats.opponentCount}</div>
              </div>
              {stats.earliestDate && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium mb-2">Earliest Game</div>
                  <div className="text-base font-semibold text-gray-900">{stats.earliestDate}</div>
                </div>
              )}
              {stats.latestDate && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium mb-2">Latest Game</div>
                  <div className="text-base font-semibold text-gray-900">{stats.latestDate}</div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Detected Columns Section */}
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div 
              className="px-6 py-4 border-b border-gray-200"
              style={{ backgroundColor: getCardHeaderColor(1) }}
            >
              <div>
                  <h2 className={`text-xl font-semibold ${getCardHeaderColor(1) === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white'}`}>
                    Detected Data Columns
                  </h2>
                  <p className={`text-sm mt-1 ${getCardHeaderColor(1) === JOGA_COLORS.voltYellow ? 'text-gray-700' : 'text-white/90'}`}>
                  {columnKeys.length} column{columnKeys.length !== 1 ? 's' : ''} detected in your data
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(categorizedColumns).map(([category, columns]) => (
                  <div key={category} style={getCategoryStyle(category)}>
                    <h3 className="font-semibold text-sm mb-3 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                      {category}
                      <span className="ml-2 text-xs font-normal opacity-75">
                        ({columns.length} {columns.length === 1 ? 'column' : 'columns'})
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {columns.map((column) => (
                        <span
                          key={column}
                          className="px-3 py-1.5 bg-white rounded-md text-sm font-mono border border-gray-300 shadow-sm"
                          title={column}
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
    </div>
  );
};

