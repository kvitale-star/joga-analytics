import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Match, getMatchById, getMatches, updateMatch, MatchFilters } from '../services/matchService';
import { getAllTeams } from '../services/teamService';
import { getAllSeasons } from '../services/seasonService';
import { Team, Season } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { dateToYYYYMMDD } from '../utils/dateFormatting';
import { normalizeFieldName } from '../utils/fieldDeduplication';
import { extractStatsFromImage } from '../services/ocrService';
import { UserMenu } from './UserMenu';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { Modal } from './Modal';

interface MatchEditorViewProps {
  columnKeys: string[];
}

export const MatchEditorView: React.FC<MatchEditorViewProps> = ({ columnKeys }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter state
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  
  // Results and selection
  const [searchResults, setSearchResults] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Edit form state
  const [editedTeamId, setEditedTeamId] = useState<string>('');
  const [editedOpponentName, setEditedOpponentName] = useState<string>('');
  const [editedMatchDate, setEditedMatchDate] = useState<string>('');
  const [editedCompetitionType, setEditedCompetitionType] = useState<string>('');
  const [editedResult, setEditedResult] = useState<string>('');
  const [editedIsHome, setEditedIsHome] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Stats form state - organized by category
  const [editedStats, setEditedStats] = useState<Record<string, string | number>>({});
  
  // Section upload state
  const [sectionUploadState, setSectionUploadState] = useState<Record<string, {
    processing: boolean;
    message: { type: 'success' | 'error'; text: string } | null;
  }>>({});

  // Load teams and seasons
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allTeams, allSeasons] = await Promise.all([
          getAllTeams(),
          getAllSeasons(),
        ]);
        setTeams(allTeams);
        setSeasons(allSeasons);
        
        // Set active season as default
        const activeSeason = allSeasons.find(s => s.isActive) || allSeasons[0];
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  // Filter teams by season
  const filteredTeams = useMemo(() => {
    if (!selectedSeasonId) return [];
    return teams.filter(team => team.seasonId === selectedSeasonId);
  }, [teams, selectedSeasonId]);

  // Get unique opponents from search results
  const availableOpponents = useMemo(() => {
    const opponents = new Set<string>();
    searchResults.forEach(match => {
      if (match.opponentName) {
        opponents.add(match.opponentName);
      }
    });
    return Array.from(opponents).sort();
  }, [searchResults]);

  // Auto-filter matches when filters change
  useEffect(() => {
    const filterMatches = async () => {
      // Season is required
      if (!selectedSeasonId) {
        setSearchResults([]);
        setSelectedMatch(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const filters: MatchFilters = {};
        
        if (selectedTeamId) {
          filters.teamId = parseInt(selectedTeamId);
        }
        
        if (opponentName.trim()) {
          filters.opponentName = opponentName.trim();
        }
        
        if (startDate) {
          filters.startDate = startDate;
        }
        
        if (endDate) {
          filters.endDate = endDate;
        } else if (startDate) {
          // If only start date is provided, use it as end date too
          filters.endDate = startDate;
        }
        
        if (options.includes('missingHalfStats')) {
          filters.missingHalfTimeStats = true;
        }
        
        const matches = await getMatches(filters);
        
        // Filter by season (teams must match selected season)
        const seasonFilteredMatches = matches.filter(match => {
          if (!match.teamId) return true; // Include matches without teams
          const matchTeam = teams.find(t => t.id === match.teamId);
          return matchTeam?.seasonId === selectedSeasonId;
        });
        
        setSearchResults(seasonFilteredMatches);
        
        // Reset to page 1 when search results change
        setCurrentPage(1);
        
        // If only one match, auto-select it
        if (seasonFilteredMatches.length === 1) {
          setSelectedMatch(seasonFilteredMatches[0]);
        } else {
          setSelectedMatch(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load matches');
        setSearchResults([]);
        setSelectedMatch(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the filter to avoid too many API calls
    const timeoutId = setTimeout(filterMatches, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedSeasonId, selectedTeamId, opponentName, startDate, endDate, options, teams]);

  // Helper function to check if match has half-time stats
  // Returns false if ALL Basic Stats (1st Half) and Basic Stats (2nd Half) fields are missing or 0
  const hasHalfTimeStats = (match: Match): boolean => {
    if (!match.statsJson || typeof match.statsJson !== 'object') {
      return false;
    }
    const stats = match.statsJson;
    
    // List of Basic Stats fields to check (both raw field names and normalized field names)
    // These are the specific fields shown in Basic Stats (1st Half) and Basic Stats (2nd Half) sections
    const basicStatsFields = [
      // 1st Half - Team
      'goalsFor1stHalf', 'Goals For (1st)',
      'shotsFor1stHalf', 'Shots For (1st)',
      'cornersFor1stHalf', 'Corners For (1st)',
      'freeKicksFor1stHalf', 'Free Kicks For (1st)',
      'penaltyFor1stHalf', 'Penalty For (1st)',
      'passesFor1stHalf', 'Passes Comp (1st)', 'Passes Completed (1st)',
      'possessionMins1stHalf', 'Possession Mins (1st)', 'Possession Minutes (1st)',
      'possession1stHalf', 'Possession (1st)',
      'possessionsWon1stHalf', 'Possessions Won (1st)',
      // 1st Half - Opponent
      'goalsAgainst1stHalf', 'Goals Against (1st)',
      'shotsAgainst1stHalf', 'Shots Against (1st)',
      'cornersAgainst1stHalf', 'Corners Against (1st)',
      'freeKicksAgainst1stHalf', 'Free Kicks Against (1st)',
      'penaltyAgainst1stHalf', 'Penalty Against (1st)',
      'passesAgainst1stHalf', 'Opp Passes Comp (1st)', 'Opp Passes Completed (1st)',
      'oppPossessionMins1stHalf', 'Opp Possession Mins (1st)', 'Opp Possession Minutes (1st)',
      'oppPossession1stHalf', 'Opp Possession (1st)',
      'oppPossessionsWon1stHalf', 'Opp Possessions Won (1st)',
      // 2nd Half - Team
      'goalsFor2ndHalf', 'Goals For (2nd)',
      'shotsFor2ndHalf', 'Shots For (2nd)',
      'cornersFor2ndHalf', 'Corners For (2nd)',
      'freeKicksFor2ndHalf', 'Free Kicks For (2nd)',
      'penaltyFor2ndHalf', 'Penalty For (2nd)',
      'passesFor2ndHalf', 'Passes Comp (2nd)', 'Passes Completed (2nd)',
      'possessionMins2ndHalf', 'Possession Mins (2nd)', 'Possession Minutes (2nd)',
      'possession2ndHalf', 'Possession (2nd)',
      'possessionsWon2ndHalf', 'Possessions Won (2nd)',
      // 2nd Half - Opponent
      'goalsAgainst2ndHalf', 'Goals Against (2nd)',
      'shotsAgainst2ndHalf', 'Shots Against (2nd)',
      'cornersAgainst2ndHalf', 'Corners Against (2nd)',
      'freeKicksAgainst2ndHalf', 'Free Kicks Against (2nd)',
      'penaltyAgainst2ndHalf', 'Penalty Against (2nd)',
      'passesAgainst2ndHalf', 'Opp Passes Comp (2nd)', 'Opp Passes Completed (2nd)',
      'oppPossessionMins2ndHalf', 'Opp Possession Mins (2nd)', 'Opp Possession Minutes (2nd)',
      'oppPossession2ndHalf', 'Opp Possession (2nd)',
      'oppPossessionsWon2ndHalf', 'Opp Possessions Won (2nd)',
    ];
    
    // Check if at least one field exists and has a non-zero value
    const hasNonZeroValue = basicStatsFields.some(fieldName => {
      const value = stats[fieldName];
      // Field has a value if it's not undefined, not null, not empty string, and not 0
      return value !== undefined && value !== null && value !== '' && value !== 0;
    });
    
    return hasNonZeroValue;
  };

  // Sort results - if "Missing Half Stats" option is selected, prioritize matches missing half-time stats
  const sortedResults = useMemo(() => {
    const results = [...searchResults];
    if (options.includes('missingHalfStats')) {
      return results.sort((a, b) => {
        const aHasHalfTime = hasHalfTimeStats(a);
        const bHasHalfTime = hasHalfTimeStats(b);
        // Missing half-time stats come first
        if (!aHasHalfTime && bHasHalfTime) return -1;
        if (aHasHalfTime && !bHasHalfTime) return 1;
        // Then sort by date (newest first) - compare YYYY-MM-DD strings directly to avoid timezone issues
        return (b.matchDate || '').localeCompare(a.matchDate || '');
      });
    }
    // Default: sort by date (newest first) - compare YYYY-MM-DD strings directly to avoid timezone issues
    return results.sort((a, b) => 
      (b.matchDate || '').localeCompare(a.matchDate || '')
    );
  }, [searchResults, options]);

  // Calculate pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResults = selectedMatch 
    ? [selectedMatch] // Show only selected match when one is selected
    : sortedResults.slice(startIndex, endIndex); // Show paginated results

  // Helper function to format match result with score
  // Converts "W", "L", "D" or score like "3-2" to "W (3-2)", "L (1-3)", "T (1-1)" format
  const formatMatchResult = (result: string | null | undefined, statsJson: any): string => {
    if (!result) return '';
    
    // Check if result is already in format "W", "L", "D"
    const upperResult = result.toUpperCase().trim();
    if (upperResult === 'W' || upperResult === 'L' || upperResult === 'D' || upperResult === 'T') {
      // Try to find score in statsJson
      const goalsFor = statsJson?.goalsFor || statsJson?.['Goals For'];
      const goalsAgainst = statsJson?.goalsAgainst || statsJson?.['Goals Against'];
      
      // If we have both goals, format as "W (3-2)" or "L (1-3)" or "T (1-1)"
      if (goalsFor !== undefined && goalsAgainst !== undefined && 
          goalsFor !== null && goalsAgainst !== null) {
        const resultLetter = upperResult === 'T' ? 'T' : upperResult;
        return `${resultLetter} (${goalsFor}-${goalsAgainst})`;
      }
      // Otherwise just return the result letter
      return upperResult;
    }
    
    // If result is already a score like "3-2", try to determine W/L/T
    const scoreMatch = result.match(/^(\d+)-(\d+)$/);
    if (scoreMatch) {
      const goalsFor = parseInt(scoreMatch[1]);
      const goalsAgainst = parseInt(scoreMatch[2]);
      if (goalsFor > goalsAgainst) {
        return `W (${goalsFor}-${goalsAgainst})`;
      } else if (goalsFor < goalsAgainst) {
        return `L (${goalsFor}-${goalsAgainst})`;
      } else {
        return `T (${goalsFor}-${goalsAgainst})`;
      }
    }
    
    // If result contains both letter and score like "W 3-2", format it
    const combinedMatch = result.match(/^([WLD])\s*(\d+)-(\d+)$/i);
    if (combinedMatch) {
      const letter = combinedMatch[1].toUpperCase();
      const goalsFor = combinedMatch[2];
      const goalsAgainst = combinedMatch[3];
      return `${letter === 'D' ? 'T' : letter} (${goalsFor}-${goalsAgainst})`;
    }
    
    // Fallback: return as-is
    return result;
  };

  // Helper function to parse date string without timezone conversion
  const parseDateString = (dateStr: string): string => {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // If it's a Date object string or ISO string, parse it carefully
    // Extract just the date part (YYYY-MM-DD) from ISO strings
    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    // Fallback: try to parse as Date and use local date methods
    try {
      const date = new Date(dateStr);
      return dateToYYYYMMDD(date);
    } catch {
      return '';
    }
  };

  // Computed fields that should not be editable (matching UploadGameDataView)
  const COMPUTED_FIELDS = [
    'tsr', 'total shots ratio', 'opp tsr', 'opp total shots ratio',
    'conversion rate', 'opp conversion rate',
    'spi', 'spi (w)', 'opp spi', 'opp spi (w)',
    'pass share', 'opp pass share',
    'ppm', 'passes per minute', 'opp ppm', 'opp passes per minute',
    'lpc', 'longest pass chain', 'opp lpc', 'opp longest pass chain',
    'passes completed', 'opp passes completed', 'opp pass completed',
    'total attempts', 'opp total attempts',
    'possession', 'possessions won', 'opp possession', 'opp possessions won',
    'pass strings (3-5)', 'pass strings (3–5)', 'pass strings (6+)', 'pass strings <4', 'pass strings 4+',
    'inside box attempts %', 'outside box attempts %',
    'opp inside box attempts %', 'opp outside box attempts %',
    'corners against', 'corners for',
    'free kicks against', 'free kicks for',
    'penalty for', 'penalty against',
    'penalty', 'penalties',
    'result',
  ];

  // Check if a field should be excluded (computed fields)
  const shouldExcludeField = (fieldName: string): boolean => {
    const normalizedFieldName = fieldName.replace(/\s+/g, ' ').trim();
    const lower = normalizedFieldName.toLowerCase();
    
    // Check against computed fields list
    if (COMPUTED_FIELDS.some(computed => {
      // For "possession" and "possessions won", use exact word match to avoid excluding "possession mins"
      if (computed === 'possession' || computed === 'possessions won' || 
          computed === 'opp possession' || computed === 'opp possessions won') {
        return (lower === computed || lower === `opp ${computed}`) && 
               !lower.includes('mins') && !lower.includes('minutes');
      }
      // For "penalty for" and "penalty against", only exclude if there's no half indicator
      if (computed === 'penalty for' || computed === 'penalty against' || 
          computed === 'penalty' || computed === 'penalties') {
        const hasHalfIndicator = lower.includes('1st') || lower.includes('2nd') || 
                                lower.includes('first') || lower.includes('second');
        if (hasHalfIndicator) {
          return false; // Don't exclude half-specific penalty fields
        }
        const isPenaltyFor = lower.includes('penalty for') || lower.includes('penalties for');
        const isPenaltyAgainst = lower.includes('penalty against') || lower.includes('penalties against');
        const isJustPenalty = (lower === 'penalty' || lower === 'penalties') && !hasHalfIndicator;
        return isPenaltyFor || isPenaltyAgainst || isJustPenalty;
      }
      // For "corners for", "corners against", "free kicks for", "free kicks against", only exclude if there's no half indicator
      if (computed === 'corners for' || computed === 'corners against' || 
          computed === 'free kicks for' || computed === 'free kicks against') {
        const hasHalfIndicator = lower.includes('1st') || lower.includes('2nd') || 
                                lower.includes('first') || lower.includes('second');
        if (hasHalfIndicator) {
          return false; // Don't exclude half-specific corners/free kicks fields
        }
        const isCornersFor = lower.includes('corners for') || lower.includes('corner for');
        const isCornersAgainst = lower.includes('corners against') || lower.includes('corner against');
        const isFreeKicksFor = lower.includes('free kicks for') || lower.includes('freekick for');
        const isFreeKicksAgainst = lower.includes('free kicks against') || lower.includes('freekick against');
        return isCornersFor || isCornersAgainst || isFreeKicksFor || isFreeKicksAgainst;
      }
      // For other computed fields, check if field name includes the computed field name
      return lower.includes(computed);
    })) {
      return true;
    }
    
    return false;
  };

  // Check if field is opponent field (matching UploadGameDataView)
  const isOpponentField = (fieldName: string): boolean => {
    const lower = fieldName.toLowerCase();
    return lower.includes('opp') || lower.includes('opponent') || 
           lower.includes('(opp)') || lower.includes('(opponent)') ||
           lower.includes(' against') || lower.includes('against');
  };

  // Categorize field helper (matching UploadGameDataView exactly)
  const categorizeField = (fieldName: string): string => {
    const lower = fieldName.toLowerCase();
    
    // Game Info fields
    if (lower.includes('team') || lower.includes('opponent') || lower.includes('date') || 
        lower.includes('competition type') || lower.includes('competition') || 
        lower.includes('season') || lower.includes('home/away') || lower.includes('home away') ||
        lower.includes('result') || lower.includes('venue') || lower.includes('referee') || lower.includes('notes')) {
      return 'Game Info';
    }
    
    // Basic Stats (1st Half)
    if (lower.includes('1st half') || lower.includes('1st') || lower.includes('first half') || lower.includes('first')) {
      if (lower.includes('pass string') || lower.includes('passstring')) {
        return 'Pass Strings';
      }
      if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
          lower.includes('opp conv rate') || lower.includes('xg') ||
          lower.includes('% attempts inside box') || lower.includes('% attempts outside box') ||
          lower.includes('attempts inside box %') || lower.includes('attempts outside box %') ||
          lower.includes('opp % attempts inside box') || lower.includes('opp % attempts outside box') ||
          lower.includes('opp attempts inside box %') || lower.includes('opp attempts outside box %')) {
        return 'Shots Map';
      }
      // Corners and free kicks with 1st half indicator go to Basic Stats (1st Half)
      if (lower.includes('corner') || lower.includes('free kick') || lower.includes('freekick')) {
        return 'Basic Stats (1st Half)';
      }
      // All other 1st half fields go to Basic Stats (1st Half)
      return 'Basic Stats (1st Half)';
    }
    
    // Basic Stats (2nd Half)
    if (lower.includes('2nd half') || lower.includes('2nd') || lower.includes('second half') || lower.includes('second')) {
      if (lower.includes('pass string') || lower.includes('passstring')) {
        return 'Pass Strings';
      }
      if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
          lower.includes('opp conv rate') || lower.includes('xg') ||
          lower.includes('% attempts inside box') || lower.includes('% attempts outside box') ||
          lower.includes('attempts inside box %') || lower.includes('attempts outside box %') ||
          lower.includes('opp % attempts inside box') || lower.includes('opp % attempts outside box') ||
          lower.includes('opp attempts inside box %') || lower.includes('opp attempts outside box %')) {
        return 'Shots Map';
      }
      // Corners and free kicks with 2nd half indicator go to Basic Stats (2nd Half)
      if (lower.includes('corner') || lower.includes('free kick') || lower.includes('freekick')) {
        return 'Basic Stats (2nd Half)';
      }
      // All other 2nd half fields go to Basic Stats (2nd Half)
      return 'Basic Stats (2nd Half)';
    }
    
    // Pass Strings (no half indicator means it's a pass string field)
    // Exclude computed pass string aggregations (they're in COMPUTED_FIELDS)
    if (lower.includes('pass strings (3-5)') || lower.includes('pass strings (3–5)') || 
        lower.includes('pass strings (6+)') || lower.includes('pass strings <4') || 
        lower.includes('pass strings 4+')) {
      return 'Other'; // Will be excluded by COMPUTED_FIELDS check
    }
    if (lower.includes('pass string') || lower.includes('passstring') || 
        (lower.includes('pass') && (lower.includes('3') || lower.includes('4') || lower.includes('5') || 
         lower.includes('6') || lower.includes('7') || lower.includes('8') || 
         lower.includes('9') || lower.includes('10')))) {
      return 'Pass Strings';
    }
    
    // Shots Map category
    if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
        lower.includes('opp conv rate') || lower.includes('conversion rate') || lower.includes('xg') ||
        lower.includes('% attempts inside box') || lower.includes('% attempts outside box') ||
        lower.includes('attempts inside box %') || lower.includes('attempts outside box %') ||
        lower.includes('opp % attempts inside box') || lower.includes('opp % attempts outside box') ||
        lower.includes('opp attempts inside box %') || lower.includes('opp attempts outside box %')) {
      return 'Shots Map';
    }
    
    // Possession Location category - Possess % (Def), (Mid), (Att)
    if (lower.includes('possess % (def)') || lower.includes('possess % (mid)') || lower.includes('possess % (att)')) {
      return 'Possession Location';
    }
    
    // Pass Location category - only Pass % By Zone stats (not possess %)
    if (lower.includes('pass % by zone') || lower.includes('pass % zone')) {
      return 'Pass Location';
    }
    
    return 'Other';
  };

  // Required fields that should always be shown (matching Upload Game Data)
  const requiredFields = [
    'Possession Mins (1st)',
    'Possession Mins (2nd)',
    'Opp Possession Mins (1st)',
    'Opp Possession Mins (2nd)',
    'Throw-in (1st)',
    'Throw-in (2nd)',
    'Opp Throw-in (1st)',
    'Opp Throw-in (2nd)',
  ];

  // Extract and organize stats from match - show ALL fields from columnKeys + requiredFields (like Upload Game Data)
  const organizedStats = useMemo(() => {
    const stats: Record<string, Record<string, any>> = {};
    const statsJson = selectedMatch?.statsJson || {};
    
    // Build set of all fields that should be shown (from columnKeys + requiredFields)
    const seenNormalized = new Set<string>();
    
    // Add fields from columnKeys
    (columnKeys || []).forEach(key => {
      const normalizedKey = normalizeFieldName(key);
      if (shouldExcludeField(normalizedKey)) return;
      
      const fieldKey = normalizedKey.toLowerCase().trim();
      if (seenNormalized.has(fieldKey)) return;
      seenNormalized.add(fieldKey);
      
      const category = categorizeField(normalizedKey);
      if (!stats[category]) stats[category] = {};
      // Use value from statsJson if available, otherwise use 0 for number fields or empty string
      // Try multiple key variations to find the value
      const value = statsJson[key] ?? statsJson[normalizedKey] ?? 
                    Object.entries(statsJson).find(([k]) => 
                      normalizeFieldName(k).toLowerCase() === fieldKey
                    )?.[1];
      stats[category][normalizedKey] = value !== undefined && value !== null ? value : '';
    });
    
    // Add required fields that don't already exist
    requiredFields.forEach(reqField => {
      const normalizedReq = normalizeFieldName(reqField);
      const reqKey = normalizedReq.toLowerCase().trim();
      if (seenNormalized.has(reqKey)) return;
      seenNormalized.add(reqKey);
      
      const category = categorizeField(normalizedReq);
      if (!stats[category]) stats[category] = {};
      // Use value from statsJson if available, otherwise use 0 for number fields or empty string
      const value = statsJson[reqField] ?? statsJson[normalizedReq] ??
                    Object.entries(statsJson).find(([k]) => 
                      normalizeFieldName(k).toLowerCase() === reqKey
                    )?.[1];
      stats[category][normalizedReq] = value !== undefined && value !== null ? value : '';
    });
    
    return stats;
  }, [selectedMatch, columnKeys]);

  // Scroll to top when success message appears
  useEffect(() => {
    if (success) {
      // Scroll to top after React has rendered
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [success]);

  // Reset form when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      setEditedTeamId(selectedMatch.teamId?.toString() || '');
      setEditedOpponentName(selectedMatch.opponentName || '');
      // Parse date string directly without timezone conversion
      setEditedMatchDate(selectedMatch.matchDate ? parseDateString(selectedMatch.matchDate) : '');
      setEditedCompetitionType(selectedMatch.competitionType || '');
      setEditedResult(selectedMatch.result || '');
      setEditedIsHome(selectedMatch.isHome !== null && selectedMatch.isHome !== undefined ? (selectedMatch.isHome ? 'true' : 'false') : '');
      setEditedNotes(selectedMatch.notes || '');
      
      // Load stats
      if (selectedMatch.statsJson) {
        const stats: Record<string, string | number> = {};
        Object.entries(selectedMatch.statsJson).forEach(([key, value]) => {
          const normalizedKey = normalizeFieldName(key);
          // Convert value to string or number
          if (typeof value === 'number' || typeof value === 'string') {
            stats[normalizedKey] = value;
          } else if (value !== null && value !== undefined) {
            stats[normalizedKey] = String(value);
          }
        });
        setEditedStats(stats);
      } else {
        setEditedStats({});
      }
    }
  }, [selectedMatch]);

  // Category header colors (matching UploadGameDataView - rotate through JOGA colors)
  const categoryHeaderColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue, JOGA_COLORS.pinkFoam];
  
  const getCategoryHeaderColor = (index: number): string => {
    return categoryHeaderColors[index % categoryHeaderColors.length];
  };

  // Category order (matching UploadGameDataView)
  // Category order (matching UploadGameDataView - no 'Other' category)
  const categoryOrder = [
    'Game Info',
    'Basic Stats (1st Half)',
    'Basic Stats (2nd Half)',
    'Shots Map',
    'Possession Location',
    'Pass Location',
    'Pass Strings'
  ];

  // Handle section image upload
  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSectionUploadState(prev => ({
      ...prev,
      [category]: { processing: true, message: null }
    }));

    try {
      // Determine period based on category
      const period = category.includes('1st') || category.includes('First') ? '1st' : '2nd';
      
      // Extract stats from image - returns { teamStats, opponentStats }
      const { teamStats, opponentStats } = await extractStatsFromImage(file, period);
      
      // Merge team and opponent stats into a single object
      const allStats = { ...teamStats, ...opponentStats };
      
      // Update editedStats with extracted stats
      setEditedStats(prev => {
        const updated = { ...prev };
        Object.entries(allStats).forEach(([key, value]) => {
          const normalizedKey = normalizeFieldName(key);
          // Convert value to string or number
          if (typeof value === 'number' || typeof value === 'string') {
            updated[normalizedKey] = value;
          } else if (value !== null && value !== undefined) {
            updated[normalizedKey] = String(value);
          }
        });
        return updated;
      });

      setSectionUploadState(prev => ({
        ...prev,
        [category]: { 
          processing: false, 
          message: { type: 'success', text: 'Stats extracted successfully!' } 
        }
      }));

      // Clear message after 3 seconds
      setTimeout(() => {
        setSectionUploadState(prev => ({
          ...prev,
          [category]: { processing: false, message: null }
        }));
      }, 3000);
    } catch (error) {
      setSectionUploadState(prev => ({
        ...prev,
        [category]: { 
          processing: false, 
          message: { type: 'error', text: error instanceof Error ? error.message : 'Failed to extract stats' } 
        }
      }));
    }
  };

  // Get input type for a field
  const getInputType = (fieldName: string): 'text' | 'number' | 'date' => {
    const lower = fieldName.toLowerCase();
    if (lower.includes('date')) return 'date';
    if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt') || 
        lower.includes('pass') || lower.includes('corner') || lower.includes('free kick') ||
        lower.includes('possession') || lower.includes('poss') || lower.includes('xg') ||
        lower.includes('string') || lower.includes('penalty') || lower.includes('throw')) {
      return 'number';
    }
    return 'text';
  };

  const handleSave = async () => {
    if (!selectedMatch) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateMatch(selectedMatch.id, {
        teamId: editedTeamId ? parseInt(editedTeamId) : null,
        opponentName: editedOpponentName.trim(),
        matchDate: editedMatchDate,
        competitionType: editedCompetitionType.trim() || null,
        result: editedResult.trim() || null,
        isHome: editedIsHome === '' ? null : editedIsHome === 'true',
        notes: editedNotes.trim() || null,
        rawStats: editedStats, // Include stats in update
      });
      
      // Reload the match to get updated data
      const updatedMatch = await getMatchById(selectedMatch.id);
      setSelectedMatch(updatedMatch);
      
      // Update in search results if present
      setSearchResults(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      
      // Show success modal
      setSuccess('Match updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update match');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMatch = (match: Match) => {
    // If clicking on an already-selected match, deselect it
    if (selectedMatch?.id === match.id) {
      setSelectedMatch(null);
    } else {
      setSelectedMatch(match);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <>
        <header className="bg-white shadow-sm border-b border-gray-200 relative">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Match Editor</h1>
                <p className="text-sm text-gray-600 mt-1">Find and edit match information.</p>
              </div>
              <div className="relative">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        <div className="bg-white rounded-lg shadow p-6 m-6">
          <p className="text-gray-600">You must be an admin to access match editing.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Match Editor</h1>
              <p className="text-sm text-gray-600 mt-1">Find and edit match information. Modify any non-computed field in the database.</p>
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
              {/* Season Selector */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Season *</label>
              <select
                value={selectedSeasonId || ''}
                onChange={(e) => {
                  setSelectedSeasonId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedTeamId(''); // Reset team when season changes
                }}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  selectedSeasonId ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={selectedSeasonId ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
                required
              >
                <option value="">Select season...</option>
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name}{season.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  selectedTeamId ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={selectedTeamId ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
                disabled={!selectedSeasonId}
              >
                <option value="">All Teams</option>
                {filteredTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.displayName || team.slug}
                  </option>
                ))}
              </select>
              </div>

              {/* Opponent Selector */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opponent</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Filter by opponent..."
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  opponentName ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={opponentName ? { borderColor: '#ceff00', width: 'auto', minWidth: '180px' } : { width: 'auto', minWidth: '180px' }}
                list="opponent-suggestions"
              />
              <datalist id="opponent-suggestions">
                {availableOpponents.map(opponent => (
                  <option key={opponent} value={opponent} />
                ))}
              </datalist>
              </div>

              {/* Start Date */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  startDate ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={startDate ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
              />
              </div>

              {/* End Date */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  endDate ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={endDate ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
              />
              </div>

              {/* Options */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">Options</label>
                <MultiSelectDropdown
                  options={[
                    { value: 'missingHalfStats', label: 'Missing Half Stats' }
                  ]}
                  selectedValues={options}
                  onSelectionChange={setOptions}
                  placeholder="Select options..."
                  className="min-w-[180px]"
                />
              </div>
            </div>
          </div>
        </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="w-full max-w-7xl mx-auto">
          <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading matches...</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && sortedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Matches Found ({sortedResults.length})
              </h3>
              {!selectedMatch && sortedResults.length > itemsPerPage && (
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {paginatedResults.map(match => {
                const team = teams.find(t => t.id === match.teamId);
                // Parse date string directly without timezone conversion
                const matchDateStr = match.matchDate ? parseDateString(match.matchDate) : 'N/A';
                const isSelected = selectedMatch?.id === match.id;
                
                return (
                  <div
                    key={match.id}
                    onClick={() => handleSelectMatch(match)}
                    className={`p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">#{match.id}</span>
                          {!hasHalfTimeStats(match) && (
                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded whitespace-nowrap">
                              Missing Half Stats
                            </span>
                          )}
                          <span className="text-sm text-gray-700">
                            {team?.displayName || team?.slug || 'No Team'}
                          </span>
                          <span className="text-gray-400">vs</span>
                          <span className="text-sm text-gray-700">{match.opponentName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">{matchDateStr}</span>
                          {match.result && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatMatchResult(match.result, match.statsJson)}
                              </span>
                            </>
                          )}
                          {match.competitionType && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">{match.competitionType}</span>
                            </>
                          )}
                          {match.isHome !== null && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">{match.isHome ? 'Home' : 'Away'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 text-xs font-medium text-black bg-[#ceff00] px-2 py-1 rounded">
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {!selectedMatch && sortedResults.length > itemsPerPage && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-lg text-sm ${
                          currentPage === pageNum
                            ? 'bg-[#ceff00] border-[#ceff00] text-black font-medium'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && selectedSeasonId && sortedResults.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No matches found matching your criteria.</p>
          </div>
        )}

        {/* Edit Form */}
        {selectedMatch && (
          <div className="space-y-6">
            {/* Render sections by category */}
            {categoryOrder.map((category, categoryIndex) => {
                const categoryColor = getCategoryHeaderColor(categoryIndex);
                const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';
                
                // Get fields for this category
                let fields: Array<{ name: string; value: any }> = [];
                
                if (category === 'Game Info') {
                  // Game Info fields are in separate state
                  fields = [
                    { name: 'Team', value: editedTeamId },
                    { name: 'Opponent Name', value: editedOpponentName },
                    { name: 'Match Date', value: editedMatchDate },
                    { name: 'Competition Type', value: editedCompetitionType },
                    { name: 'Result', value: editedResult },
                    { name: 'Home/Away', value: editedIsHome },
                    { name: 'Notes', value: editedNotes },
                  ];
                } else {
                  // Stats fields from organizedStats
                  const categoryStats = organizedStats[category] || {};
                  fields = Object.entries(categoryStats).map(([key, value]) => ({
                    name: key,
                    value: editedStats[key] ?? (value as string | number),
                  }));
                }
                
                if (fields.length === 0 && category !== 'Game Info') return null;
                
                return (
                  <div key={category} className="mb-6">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                      <div 
                        className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
                        style={{ backgroundColor: categoryColor }}
                      >
                        <h2 className={`text-lg font-semibold ${textColor}`}>
                          {category}
                        </h2>
                        {(category === 'Basic Stats (1st Half)' || category === 'Basic Stats (2nd Half)') && (
                          <div className="flex items-center gap-2">
                            {sectionUploadState[category]?.message && (
                              <span className={`text-xs ${
                                sectionUploadState[category].message!.type === 'success' 
                                  ? 'text-green-100' 
                                  : 'text-red-100'
                              }`}>
                                {sectionUploadState[category].message!.text}
                              </span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSectionImageUpload(e, category)}
                              disabled={sectionUploadState[category]?.processing || false}
                              className="hidden"
                              id={`section-upload-${category}`}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`section-upload-${category}`)?.click()}
                              disabled={sectionUploadState[category]?.processing || false}
                              className={`flex items-center gap-1 px-2 py-1 bg-white text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors ${
                                sectionUploadState[category]?.processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="Upload screenshot for this section"
                            >
                              {sectionUploadState[category]?.processing ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span>Upload</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-6">
                        {/* Game Info - 3 column layout */}
                        {category === 'Game Info' ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {fields.map(field => {
                              const fieldName = field.name;
                              const value = field.value ?? '';
                              
                              // Special handling for Game Info fields
                              if (fieldName === 'Team') {
                                return (
                                  <div key={fieldName}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Team *
                                    </label>
                                    <select
                                      value={editedTeamId}
                                      onChange={(e) => setEditedTeamId(e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                                    >
                                      <option value="">No Team</option>
                                      {filteredTeams.map(team => (
                                        <option key={team.id} value={team.id}>
                                          {team.displayName || team.slug}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              }
                              if (fieldName === 'Home/Away') {
                                return (
                                  <div key={fieldName}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Home/Away
                                    </label>
                                    <select
                                      value={editedIsHome}
                                      onChange={(e) => setEditedIsHome(e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                                    >
                                      <option value="">Not Set</option>
                                      <option value="true">Home</option>
                                      <option value="false">Away</option>
                                    </select>
                                  </div>
                                );
                              }
                              if (fieldName === 'Notes') {
                                return (
                                  <div key={fieldName} className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Notes
                                    </label>
                                    <textarea
                                      value={editedNotes}
                                      onChange={(e) => setEditedNotes(e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                                      rows={3}
                                      placeholder="Additional notes about the match"
                                    />
                                  </div>
                                );
                              }
                              // Other Game Info fields as text inputs
                              const setterMap: Record<string, (val: string) => void> = {
                                'Opponent Name': setEditedOpponentName,
                                'Match Date': setEditedMatchDate,
                                'Competition Type': setEditedCompetitionType,
                                'Result': setEditedResult,
                              };
                              const setter = setterMap[fieldName];
                              if (!setter) return null;
                              
                              return (
                                <div key={fieldName}>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {fieldName} {fieldName === 'Opponent Name' || fieldName === 'Match Date' ? '*' : ''}
                                  </label>
                                  <input
                                    type={fieldName === 'Match Date' ? 'date' : 'text'}
                                    value={String(value)}
                                    onChange={(e) => setter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                                    required={fieldName === 'Opponent Name' || fieldName === 'Match Date'}
                                    placeholder={fieldName === 'Competition Type' ? 'e.g., League, Cup, Friendly' : fieldName === 'Result' ? 'e.g., 2-1, W, L, D' : ''}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Stats sections - separate Team and Opponent
                          <>
                            {/* Team Fields */}
                            {fields.filter(f => !isOpponentField(f.name)).length > 0 && (
                              <>
                                <div className="mt-4 mb-2">
                                  <h3 className="text-md font-semibold text-gray-800">Team</h3>
                                  <div className="border-t border-gray-300 mt-1"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                  {fields.filter(f => !isOpponentField(f.name)).map(field => {
                                    const fieldName = field.name;
                                    const inputType = getInputType(fieldName);
                                    const value = field.value ?? '';
                                    
                                    return (
                                      <div key={fieldName} className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {fieldName}
                                        </label>
                                        {inputType === 'number' ? (
                                          <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={value}
                                            onChange={(e) => {
                                              const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                              setEditedStats(prev => ({ ...prev, [fieldName]: newValue }));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-black"
                                            placeholder="0"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={String(value)}
                                            onChange={(e) => {
                                              setEditedStats(prev => ({ ...prev, [fieldName]: e.target.value }));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-black"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                            
                            {/* Opponent Fields */}
                            {fields.filter(f => isOpponentField(f.name)).length > 0 && (
                              <>
                                <div className="mt-6 mb-2">
                                  <h3 className="text-md font-semibold text-gray-800">Opponent</h3>
                                  <div className="border-t border-gray-300 mt-1"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                  {fields.filter(f => isOpponentField(f.name)).map(field => {
                                    const fieldName = field.name;
                                    const inputType = getInputType(fieldName);
                                    const value = field.value ?? '';
                                    
                                    return (
                                      <div key={fieldName} className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {fieldName}
                                        </label>
                                        {inputType === 'number' ? (
                                          <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={value}
                                            onChange={(e) => {
                                              const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                              setEditedStats(prev => ({ ...prev, [fieldName]: newValue }));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-black"
                                            placeholder="0"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={String(value)}
                                            onChange={(e) => {
                                              setEditedStats(prev => ({ ...prev, [fieldName]: e.target.value }));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-black"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })}
            
            {/* Save/Cancel buttons - matching UploadGameDataView style (no card, on gray background) */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-6 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editedOpponentName.trim() || !editedMatchDate}
                className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black"
                style={{
                  backgroundColor: isSaving || !editedOpponentName.trim() || !editedMatchDate ? '#9ca3af' : JOGA_COLORS.voltYellow,
                  border: `2px solid ${JOGA_COLORS.voltYellow}`,
                }}
                onMouseEnter={(e) => {
                  if (!isSaving && editedOpponentName.trim() && editedMatchDate) {
                    e.currentTarget.style.backgroundColor = '#b8e600';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving && editedOpponentName.trim() && editedMatchDate) {
                    e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                  }
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={!!success}
        onClose={() => setSuccess(null)}
        title="Success"
        maxWidth="sm"
      >
        <div className="text-center py-4">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-lg text-gray-900 mb-6">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="px-6 py-2 rounded-lg font-medium transition-colors text-black"
            style={{
              backgroundColor: JOGA_COLORS.voltYellow,
              border: `2px solid ${JOGA_COLORS.voltYellow}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b8e600';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
            }}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};
