import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MatchData } from '../types';
import { createMatch, updateMatch, previewMatchStats, PreviewMatchStatsResponse, Match } from '../services/matchService';
import { JOGA_COLORS } from '../utils/colors';
import { Team } from '../types/auth';
import { PageLayout } from './PageLayout';
import { getAllSeasons } from '../services/seasonService';
import { normalizeFieldName } from '../utils/fieldDeduplication';
import { MatchConfirmationModal } from './MatchConfirmationModal';
import { ExistingMatchModal } from './ExistingMatchModal';
import { extractStatsFromImage } from '../services/ocrService';
import { apiGet } from '../services/apiClient';

interface UploadGameDataViewProps {
  columnKeys: string[];
  matchData: MatchData[];
  teamSlugMap: Map<string, Team>;
  onDataSubmitted?: () => void;
}

// Fields that are computed/calculated - should not be in the form
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
  // Set pieces - these are computed from 1st/2nd half versions
  'corners against', 'corners for',
  'free kicks against', 'free kicks for',
  'penalty for', 'penalty against',
  // Penalty fields are computed from 1st/2nd half versions
  'penalty', 'penalties',
  // Result is computed/derived from goals
  'result',
];

// Fields to exclude
const EXCLUDED_FIELDS = [
  'shot map', 'heatmap', 'heat map', 'match id', 'matchid', 'notes',
  'behavioral avg', 'cpi',
  // Exclude duplicate Game Info fields
  'team id', 'teamid', // Use "Team" instead
  'opponent name', 'opponentname', // Use "Opponent" instead
  'match date', // Use "Date" instead (keep "Date" as primary)
  // Unused fields
  'referee', 'venue',
];

// Check if a field should be excluded
const shouldExcludeField = (fieldName: string): boolean => {
  // Normalize whitespace first to handle double spaces and variations
  const normalizedFieldName = fieldName.replace(/\s+/g, ' ').trim();
  const lower = normalizedFieldName.toLowerCase();
  
  // Exclude computed fields
  // But be careful: "possession" shouldn't exclude "possession mins" or "possession minutes"
  // And "penalty for"/"penalty against" shouldn't exclude "Penalty For (1st)" etc.
  if (COMPUTED_FIELDS.some(computed => {
    // For "possession" and "possessions won", use exact word match to avoid excluding "possession mins"
    if (computed === 'possession' || computed === 'possessions won' || 
        computed === 'opp possession' || computed === 'opp possessions won') {
      // Only exclude if it's exactly "possession" or "possessions won" (not "possession mins")
      return (lower === computed || lower === `opp ${computed}`) && 
             !lower.includes('mins') && !lower.includes('minutes');
    }
    // For "penalty for" and "penalty against", only exclude if there's no half indicator
    if (computed === 'penalty for' || computed === 'penalty against' || 
        computed === 'penalty' || computed === 'penalties') {
      const hasHalfIndicator = lower.includes('1st') || lower.includes('2nd') || 
                              lower.includes('first') || lower.includes('second');
      // Only exclude full-game penalty fields, not half-specific ones
      if (hasHalfIndicator) {
        return false; // Don't exclude half-specific penalty fields
      }
      // Check if it matches penalty field patterns (full game version)
      // Handle variations: "penalty for", "penalties for", "penalty against", "penalties against", etc.
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
      // Only exclude full-game corners/free kicks fields, not half-specific ones
      if (hasHalfIndicator) {
        return false; // Don't exclude half-specific corners/free kicks fields
      }
      // Check if it matches corners/free kicks field patterns (full game version)
      const isCornersFor = lower.includes('corners for') || lower.includes('corner for');
      const isCornersAgainst = lower.includes('corners against') || lower.includes('corner against');
      const isFreeKicksFor = lower.includes('free kicks for') || lower.includes('free kick for') || 
                            lower.includes('freekicks for') || lower.includes('freekick for');
      const isFreeKicksAgainst = lower.includes('free kicks against') || lower.includes('free kick against') || 
                                lower.includes('freekicks against') || lower.includes('freekick against');
      return isCornersFor || isCornersAgainst || isFreeKicksFor || isFreeKicksAgainst;
    }
    // For "conversion rate" - both Team and Opp versions should appear in the form (they're NOT computed)
    // So we don't exclude either of them
    if (computed === 'conversion rate' || computed === 'opp conversion rate') {
      return false; // Don't exclude conversion rate fields - they should appear in Shots section
    }
    return lower.includes(computed);
  })) {
    return true;
  }
  
  // Exclude specific fields
  if (EXCLUDED_FIELDS.some(excluded => lower === excluded || lower.includes(excluded))) {
    return true;
  }
  
  // Exclude duplicate Game Info fields (exact matches)
  if (lower === 'team id' || lower === 'teamid') {
    return true; // Use "Team" instead
  }
  if (lower === 'opponent name' || lower === 'opponentname') {
    return true; // Use "Opponent" instead
  }
  if (lower === 'match date' || lower === 'matchdate') {
    return true; // Use "Date" instead
  }
  
  // Exclude full game stats that should be split into halves
  // But keep opponent "against" fields that are already opponent metrics (they're not duplicates)
  if (lower.includes('goals for') && !lower.includes('1st') && !lower.includes('2nd') && !lower.includes('first') && !lower.includes('second') && !lower.includes('against')) {
    return true;
  }
  // Check if field has a half indicator
  const hasHalfIndicator = lower.includes('1st') || lower.includes('2nd') || 
                           lower.includes('first') || lower.includes('second');
  
  if (lower.includes('goals against') && !hasHalfIndicator) {
    // Exclude full game "goals against" (it's computed from halves)
    return true;
  }
  if (lower.includes('shots for') && !hasHalfIndicator && !lower.includes('against')) {
    return true;
  }
  if (lower.includes('shots against') && !hasHalfIndicator) {
    // Exclude full game "shots against" (it's computed from halves)
    return true;
  }
  if (lower.includes('total attempts') && !hasHalfIndicator) {
    // Exclude full game "total attempts" (it's computed from halves)
    // But keep "opp total attempts" with half indicators - they're already opponent metrics
    if (!lower.includes('opp') && !lower.includes('opponent')) {
      return true;
    }
  }
  
  // Exclude full game possession minutes (without half indicator)
  // But keep possession minutes with half indicators (1st/2nd) - these should be on the form
  if ((lower.includes('possession mins') || lower.includes('possession minutes')) && !hasHalfIndicator) {
    return true;
  }
  
  // Exclude full game penalty fields (without half indicator)
  // But keep penalty fields with half indicators (1st/2nd) - these should be on the form
  // Handle various forms: "penalty for", "penalties for", "penalty against", "penalties against", etc.
  // Normalize whitespace first to handle double spaces
  const normalizedLower = lower.replace(/\s+/g, ' ').trim();
  if ((normalizedLower.includes('penalty for') || normalizedLower.includes('penalties for') ||
       normalizedLower.includes('penalty against') || normalizedLower.includes('penalties against') ||
       (normalizedLower === 'penalty' && !hasHalfIndicator) || 
       (normalizedLower === 'penalties' && !hasHalfIndicator)) && !hasHalfIndicator) {
    // Exclude full-game penalty fields, but keep half-specific ones
    return true;
  }
  
  // Exclude full game corners and free kicks (without half indicator)
  // But keep corners and free kicks with half indicators (1st/2nd) - these should be on the form
  // Handle various forms: "corners for", "corner for", "corners against", "corner against", etc.
  if ((normalizedLower.includes('corners for') || normalizedLower.includes('corner for') ||
       normalizedLower.includes('corners against') || normalizedLower.includes('corner against') ||
       normalizedLower.includes('free kicks for') || normalizedLower.includes('free kick for') ||
       normalizedLower.includes('free kicks against') || normalizedLower.includes('free kick against') ||
       normalizedLower.includes('freekicks for') || normalizedLower.includes('freekick for') ||
       normalizedLower.includes('freekicks against') || normalizedLower.includes('freekick against')) && !hasHalfIndicator) {
    // Exclude full-game corners and free kicks, but keep half-specific ones
    return true;
  }
  
  return false;
};

// Categorize fields for better form organization
const categorizeField = (fieldName: string): string => {
  const lower = fieldName.toLowerCase();
  
  // Game Info fields
  if (lower.includes('team') || lower.includes('opponent') || lower.includes('date') || 
      lower.includes('competition type') || lower.includes('competition') || 
      lower.includes('season') || lower.includes('home/away') || lower.includes('home away')) {
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

// Check if field is opponent field
const isOpponentField = (fieldName: string): boolean => {
  const lower = fieldName.toLowerCase();
  // Check for "opp" anywhere in the field name (not just "opp " with space)
  // Also check for "opponent", "against", and variations
  return lower.includes('opp') || lower.includes('opponent') || 
         lower.includes('(opp)') || lower.includes('(opponent)') ||
         lower.includes(' against') || lower.includes('against');
};

// Format field label for display - normalize field names to fix typos and ensure consistency
const formatFieldLabel = (fieldName: string): string => {
  return normalizeFieldName(fieldName);
};

// Field ordering for Basic Stats sections
// Order: Goals > Possession > Shots > Corners > Free Kicks > Passes Comp > Penalty > Possession Mins > Possession Won > Throw-in
// Note: More specific matches (e.g., "possession mins") must come after general ones (e.g., "possession") in this case
const BASIC_STATS_ORDER = [
  'goals',
  'possession', // General possession (must come before specific ones)
  'shot', 'shots',
  'corners', 'corner',
  'free kick', 'free kicks',
  'passes completed', 'passes comp', 'passes',
  'penalty', 'penalties',
  'possession minutes', 'possession mins', // Specific: possession minutes
  'possession won', // Specific: possession won
  'throw-in', 'throw in'
];

// Sort fields within Basic Stats category
// Sort Pass Strings: 3-9 first, then 10 last (within Team and Opponent groups)
const sortPassStringsFields = (fields: Array<{ name: string; category: string }>): Array<{ name: string; category: string }> => {
  return fields.sort((a, b) => {
    // Extract number from pass string field
    const getPassStringNum = (name: string): number => {
      const match = name.match(/(\d+)[\s-]?pass/i);
      return match ? parseInt(match[1]) : 0;
    };
    
    const aNum = getPassStringNum(a.name);
    const bNum = getPassStringNum(b.name);
    
    // If both are 10, maintain order
    if (aNum === 10 && bNum === 10) return a.name.localeCompare(b.name);
    // If one is 10, it comes last
    if (aNum === 10 && bNum !== 10) return 1;
    if (bNum === 10 && aNum !== 10) return -1;
    // Otherwise sort by number
    if (aNum !== 0 && bNum !== 0) return aNum - bNum;
    
    return a.name.localeCompare(b.name);
  });
};

// Sort fields within Shots Map category
// Team fields order: Conversion Rate > Inside Box Conv Rate > Outside Box Conv Rate > % Attempts Inside Box > % Attempts Outside Box
const sortShotsMapFields = (teamFields: Array<{ name: string; category: string }>, opponentFields: Array<{ name: string; category: string }>): {
  teamFields: Array<{ name: string; category: string }>;
  opponentFields: Array<{ name: string; category: string }>;
} => {
  // Define order for team fields
  const teamOrder = [
    'conversion rate',
    'inside box conv rate',
    'outside box conv rate',
    '% attempts inside box',
    'attempts inside box %',
    '% attempts outside box',
    'attempts outside box %'
  ];
  
  // Sort team fields
  const sortedTeamFields = [...teamFields].sort((a, b) => {
    const aLower = a.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const bLower = b.name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    let aIndex = -1;
    let bIndex = -1;
    
    for (let i = 0; i < teamOrder.length; i++) {
      if (aLower.includes(teamOrder[i])) {
        aIndex = i;
        break;
      }
    }
    
    for (let i = 0; i < teamOrder.length; i++) {
      if (bLower.includes(teamOrder[i])) {
        bIndex = i;
        break;
      }
    }
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For fields not in order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
  
  // Sort opponent fields - Opp Conv Rate first, then alphabetically
  const opponentOrder = [
    'opp conv rate'
  ];
  
  const sortedOpponentFields = [...opponentFields].sort((a, b) => {
    const aLower = a.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const bLower = b.name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    let aIndex = -1;
    let bIndex = -1;
    
    for (let i = 0; i < opponentOrder.length; i++) {
      if (aLower.includes(opponentOrder[i])) {
        aIndex = i;
        break;
      }
    }
    
    for (let i = 0; i < opponentOrder.length; i++) {
      if (bLower.includes(opponentOrder[i])) {
        bIndex = i;
        break;
      }
    }
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For fields not in order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
  
  return {
    teamFields: sortedTeamFields,
    opponentFields: sortedOpponentFields
  };
};

const sortBasicStatsFields = (fields: Array<{ name: string; category: string }>): Array<{ name: string; category: string }> => {
  return fields.sort((a, b) => {
    // Normalize whitespace (handle double spaces, etc.)
    const aLower = a.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const bLower = b.name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Find index in priority order - check for more specific matches first
    // For possession-related fields, check specific ones before general "possession"
    let aIndex = -1;
    let bIndex = -1;
    
    // Check for specific possession fields FIRST (must check before general "possession")
    // Handle both singular and plural forms
    // Order matters: check most specific first, then general
    if (aLower.includes('possession mins') || aLower.includes('possession minutes')) {
      aIndex = BASIC_STATS_ORDER.findIndex(order => order === 'possession minutes' || order === 'possession mins');
    } else if (aLower.includes('possession won') || aLower.includes('possessions won')) {
      aIndex = BASIC_STATS_ORDER.findIndex(order => order === 'possession won');
    } else {
      // For general matching, iterate through order array and find first match
      // This ensures we match the most specific term first
      for (let i = 0; i < BASIC_STATS_ORDER.length; i++) {
        const order = BASIC_STATS_ORDER[i];
        // Skip possession-specific terms (already handled above)
        if (order === 'possession minutes' || order === 'possession mins' || order === 'possession won') {
          continue;
        }
        // Check if field name contains this order term
        if (aLower.includes(order)) {
          aIndex = i;
          break;
        }
      }
    }
    
    if (bLower.includes('possession mins') || bLower.includes('possession minutes')) {
      bIndex = BASIC_STATS_ORDER.findIndex(order => order === 'possession minutes' || order === 'possession mins');
    } else if (bLower.includes('possession won') || bLower.includes('possessions won')) {
      bIndex = BASIC_STATS_ORDER.findIndex(order => order === 'possession won');
    } else {
      // For general matching, iterate through order array and find first match
      // This ensures we match the most specific term first
      for (let i = 0; i < BASIC_STATS_ORDER.length; i++) {
        const order = BASIC_STATS_ORDER[i];
        // Skip possession-specific terms (already handled above)
        if (order === 'possession minutes' || order === 'possession mins' || order === 'possession won') {
          continue;
        }
        // Check if field name contains this order term
        if (bLower.includes(order)) {
          bIndex = i;
          break;
        }
      }
    }
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If both fields are not in the order list, sort alphabetically
    // (Note: opponent/team separation is handled in renderFieldsWithSubsections)
    return a.name.localeCompare(b.name);
  });
};

export const UploadGameDataView: React.FC<UploadGameDataViewProps> = ({ 
  columnKeys, 
  teamSlugMap,
  onDataSubmitted 
}) => {
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<Array<{ id: number; name: string; isActive: boolean }>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewMatchStatsResponse | null>(null);
  
  // Section-specific upload state - track state per section
  const [sectionUploadState, setSectionUploadState] = useState<Record<string, {
    processing: boolean;
    message: { type: 'success' | 'error'; text: string } | null;
  }>>({});
  const [pendingSubmission, setPendingSubmission] = useState<{
    teamId: number | null;
    opponentName: string;
    matchDate: string;
    competitionType: string | null;
    result: string | null;
    isHome: boolean | null;
    rawStats: Record<string, any>;
  } | null>(null);
  const [existingMatch, setExistingMatch] = useState<Match | null>(null);
  const [isLoadingExistingMatch, setIsLoadingExistingMatch] = useState(false);
  const [showExistingMatchModal, setShowExistingMatchModal] = useState(false);
  const matchSearchParamsRef = useRef<{ teamId: number; opponentName: string; matchDate: string } | null>(null);
  const [opponentSuggestions, setOpponentSuggestions] = useState<string[]>([]);
  const [showOpponentSuggestions, setShowOpponentSuggestions] = useState(false);
  const opponentInputRef = useRef<HTMLInputElement | null>(null);
  const opponentSuggestionsRef = useRef<HTMLDivElement | null>(null);

  // Load seasons
  React.useEffect(() => {
    const loadSeasons = async () => {
      try {
        const allSeasons = await getAllSeasons();
        setSeasons(allSeasons.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })));
        const active = allSeasons.find(s => s.isActive);
        if (active) {
          setActiveSeasonId(active.id);
        }
      } catch (error) {
        console.error('Error loading seasons:', error);
      }
    };
    loadSeasons();
  }, []);

  // Function to load existing match data into form
  const loadExistingMatchData = useCallback((match: Match) => {
    if (!match.statsJson) return;
    
    // Convert match data to form format
    const existingData: Record<string, any> = {};
    
    // Load stats from statsJson
    Object.entries(match.statsJson).forEach(([key, value]) => {
      const normalizedKey = normalizeFieldName(key);
      existingData[normalizedKey] = value;
    });
    
    // Merge with current form data (form data takes precedence for fields user has entered)
    setFormData(prev => {
      const merged = { ...prev };
      
      // Only override with existing data if form field is empty/0/undefined
      Object.entries(existingData).forEach(([key, value]) => {
        const currentValue = prev[key];
        if (currentValue === undefined || currentValue === '' || currentValue === 0 || currentValue === null) {
          merged[key] = value;
        }
        // Otherwise keep user's input (don't overwrite)
      });
      
      return merged;
    });
  }, []);

  // Function to find existing match (actual API call)
  const performMatchSearch = useCallback(async (teamId: number, opponentName: string, matchDate: string) => {
    setIsLoadingExistingMatch(true);
    try {
      // Send date as-is (MM/DD/YYYY format) - backend will handle conversion
      const response = await apiGet<{ match: Match; found: boolean }>(
        `/matches/find-existing?teamId=${teamId}&opponentName=${encodeURIComponent(opponentName)}&matchDate=${encodeURIComponent(matchDate)}`
      );
      
      if (response.found && response.match) {
        setExistingMatch(response.match);
        // Don't auto-pre-fill - user will choose via button/modal
      } else {
        setExistingMatch(null);
      }
    } catch (error) {
      console.error('Error finding existing match:', error);
      setExistingMatch(null);
    } finally {
      setIsLoadingExistingMatch(false);
    }
  }, []);

  // Check for existing match when Team/Opponent/Date changes (with debounce)
  useEffect(() => {
    // Find Team field (not Team ID - the form uses Team dropdown with slug)
    const teamKey = columnKeys.find(key => 
      normalizeFieldName(key).toLowerCase().includes('team') && 
      !normalizeFieldName(key).toLowerCase().includes('team id')
    );
    const opponentKey = columnKeys.find(key => 
      normalizeFieldName(key).toLowerCase().includes('opponent')
    );
    const dateKey = columnKeys.find(key => 
      normalizeFieldName(key).toLowerCase().includes('date')
    );
    
    // Get team slug from form data
    const teamSlug = teamKey && formData[teamKey] ? String(formData[teamKey]).trim() : '';
    const opponentName = opponentKey && formData[opponentKey] ? String(formData[opponentKey]).trim() : '';
    const matchDate = dateKey && formData[dateKey] ? String(formData[dateKey]) : '';
    
    // Need all three to search
    if (!teamSlug || !opponentName || !matchDate) {
      setExistingMatch(null);
      matchSearchParamsRef.current = null;
      return;
    }
    
    // Look up team ID from slug
    const team = Array.from(teamSlugMap.values()).find(t => t.slug === teamSlug);
    const teamId = team?.id;
    
    if (!teamId) {
      setExistingMatch(null);
      matchSearchParamsRef.current = null;
      return;
    }

    // Create search params object
    const newSearchParams = { teamId, opponentName, matchDate };
    
    // Check if search params actually changed (avoid unnecessary API calls)
    const currentParams = matchSearchParamsRef.current;
    const paramsChanged = !currentParams || 
      currentParams.teamId !== newSearchParams.teamId ||
      currentParams.opponentName !== newSearchParams.opponentName ||
      currentParams.matchDate !== newSearchParams.matchDate;
    
    if (!paramsChanged) {
      // Same search params, no need to check again
      return;
    }

    // Update search params ref
    matchSearchParamsRef.current = newSearchParams;
    
    // Debounce: wait 300ms before checking (prevents flashing on rapid changes)
    // Only show loading state when we actually start the API call
    const timeoutId = setTimeout(() => {
      // Double-check params haven't changed during the delay
      if (matchSearchParamsRef.current?.teamId === newSearchParams.teamId &&
          matchSearchParamsRef.current?.opponentName === newSearchParams.opponentName &&
          matchSearchParamsRef.current?.matchDate === newSearchParams.matchDate) {
        performMatchSearch(newSearchParams.teamId, newSearchParams.opponentName, newSearchParams.matchDate);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [formData, columnKeys, teamSlugMap, performMatchSearch]);

  // Handle pre-fill from modal
  const handlePreFillMatch = useCallback(() => {
    if (existingMatch) {
      loadExistingMatchData(existingMatch);
    }
    setShowExistingMatchModal(false);
  }, [existingMatch, loadExistingMatchData]);

  // Handle cancel from modal
  const handleCancelPreFill = useCallback(() => {
    setShowExistingMatchModal(false);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        opponentInputRef.current &&
        opponentSuggestionsRef.current &&
        !opponentInputRef.current.contains(event.target as Node) &&
        !opponentSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowOpponentSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // JOGA colors for category headers - rotate through Volt Yellow, Valor Blue, and Pink Foam
  const categoryHeaderColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.valorBlue, JOGA_COLORS.pinkFoam];
  
  const getCategoryHeaderColor = (index: number): string => {
    return categoryHeaderColors[index % categoryHeaderColors.length];
  };

  // Get available teams from database (active season only)
  const availableTeams = useMemo(() => {
    const dbTeams = Array.from(teamSlugMap.values())
      .filter(team => team.isActive && (!activeSeasonId || team.seasonId === activeSeasonId))
      .map(team => ({
        slug: team.slug,
        displayName: team.displayName || team.slug,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    return dbTeams;
  }, [teamSlugMap, activeSeasonId]);

  // Required fields that should always appear on the form, even if they don't exist in the data
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

  // Filter and categorize fields for the form
  const formFields = useMemo(() => {
    // Start with fields from columnKeys
    // Normalize field names to fix typos (e.g., "Passed Comp" -> "Passes Comp")
    // Deduplicate at source: use a Set to track normalized names
    const seenNormalized = new Set<string>();
    const existingFields = columnKeys
      .filter(key => {
        // Normalize field name first, then check exclusion
        // This ensures we catch typos and variations
        const normalizedKey = normalizeFieldName(key);
        const excluded = shouldExcludeField(normalizedKey);
        return !excluded;
      })
      .map(key => {
        // Normalize field name to fix typos and ensure consistency
        const normalizedName = normalizeFieldName(key);
        return {
          originalKey: key,
          name: normalizedName,
          category: categorizeField(normalizedName),
        };
      })
      .filter(field => {
        // Deduplicate: if we've already seen this normalized name, skip it
        const fieldKey = field.name.toLowerCase().trim();
        if (seenNormalized.has(fieldKey)) {
          return false;
        }
        seenNormalized.add(fieldKey);
        return true;
      })
      .map(({ originalKey, ...rest }) => rest); // Remove originalKey from final result
    
    // Add required fields that don't already exist
    // Normalize required field names as well and check against seenNormalized
    const requiredFieldsToAdd = requiredFields
      .filter(reqField => {
        const normalizedReq = normalizeFieldName(reqField);
        const reqKey = normalizedReq.toLowerCase().trim();
        return !seenNormalized.has(reqKey);
      })
      .map(name => {
        const normalizedName = normalizeFieldName(name);
        const fieldKey = normalizedName.toLowerCase().trim();
        seenNormalized.add(fieldKey); // Track it so it's not added again
        return {
          name: normalizedName,
          category: categorizeField(normalizedName),
        };
      });
    
    const allFields = [...existingFields, ...requiredFieldsToAdd];
    
    // Group by category and deduplicate fields with the same normalized name
    // Use case-insensitive comparison to catch variations
    const grouped: Record<string, Array<{ name: string; category: string }>> = {};
    const seenFields = new Set<string>();
    allFields.forEach(field => {
      // Deduplicate: check case-insensitively to catch variations
      const fieldKey = field.name.toLowerCase().trim();
      
      // Special handling for conversion rate fields - normalize variations
      let normalizedKey = fieldKey;
      if (normalizedKey.includes('conv') && normalizedKey.includes('rate')) {
        // Normalize all conversion rate variations to "opp conv rate"
        normalizedKey = normalizedKey.replace(/\bopp\s+conversion\s+rate\b/g, 'opp conv rate');
        normalizedKey = normalizedKey.replace(/\bopponent\s+conversion\s+rate\b/g, 'opp conv rate');
        normalizedKey = normalizedKey.replace(/\bopponent\s+conv\s+rate\b/g, 'opp conv rate');
        normalizedKey = normalizedKey.replace(/\bopp\s+conv\.?\s+rate\b/g, 'opp conv rate');
      }
      
      if (seenFields.has(normalizedKey)) {
        return;
      }
      seenFields.add(normalizedKey);
      
      // If we normalized the key, update the field name to the canonical form
      if (normalizedKey !== fieldKey && normalizedKey === 'opp conv rate') {
        field.name = 'Opp Conv Rate';
      }
      
      if (!grouped[field.category]) {
        grouped[field.category] = [];
      }
      grouped[field.category].push(field);
    });
    
    // Debug: Log any categories with potential duplicates
    // Fields are already deduplicated above
    
    // Debug: Log possession mins fields in Basic Stats categories
    
    // Sort fields within each category
    // NOTE: For Basic Stats and Pass Strings, we DON'T sort here because we need to split into Team/Opponent first
    // The sorting will happen in renderFieldsWithSubsections after splitting
    Object.keys(grouped).forEach(category => {
      if (category === 'Game Info') {
        // Game Info: Team, Opponent, Date, Competition Type, Competition, Home/Away, Result
        const priorityOrder = ['team', 'opponent', 'date', 'competition type', 'competition', 'home/away', 'home away', 'result'];
        grouped[category].sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          const aIndex = priorityOrder.findIndex(p => aLower.includes(p));
          const bIndex = priorityOrder.findIndex(p => bLower.includes(p));
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      } else if (category === 'Possession Location') {
        // Possession Location: Only Possess % (Def), (Mid), (Att) in that order
        // Filter to only include the three specific stats
        grouped[category] = grouped[category].filter(field => {
          const lower = field.name.toLowerCase();
          return lower.includes('possess % (def)') || lower.includes('possess % (mid)') || lower.includes('possess % (att)');
        });
        
        // Sort in order: Def, Mid, Att
        grouped[category].sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          
          const getZoneOrder = (name: string): number => {
            if (name.includes('(def)') || name.includes(' def')) return 1;
            if (name.includes('(mid)') || name.includes(' mid')) return 2;
            if (name.includes('(att)') || name.includes(' att')) return 3;
            return 0;
          };
          
          const aZone = getZoneOrder(aLower);
          const bZone = getZoneOrder(bLower);
          
          if (aZone !== 0 && bZone !== 0) return aZone - bZone;
          if (aZone !== 0) return -1;
          if (bZone !== 0) return 1;
          
          return a.name.localeCompare(b.name);
        });
      } else if (category === 'Pass Location') {
        // Pass Location: Only Pass % By Zone (Def), (Mid), (Att) in that order
        // Filter to only include Pass % By Zone stats (not possess %)
        grouped[category] = grouped[category].filter(field => {
          const lower = field.name.toLowerCase();
          return (lower.includes('pass %') && (lower.includes('zone') || lower.includes('by zone'))) &&
                 !lower.includes('possess %');
        });
        
        // Sort in order: Def, Mid, Att
        grouped[category].sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          
          const getZoneOrder = (name: string): number => {
            if (name.includes('(def)') || name.includes(' def')) return 1;
            if (name.includes('(mid)') || name.includes(' mid')) return 2;
            if (name.includes('(att)') || name.includes(' att')) return 3;
            return 0;
          };
          
          const aZone = getZoneOrder(aLower);
          const bZone = getZoneOrder(bLower);
          
          if (aZone !== 0 && bZone !== 0) return aZone - bZone;
          if (aZone !== 0) return -1;
          if (bZone !== 0) return 1;
          
          return a.name.localeCompare(b.name);
        });
      }
    });
    
    return grouped;
  }, [columnKeys]);

  // Determine input type for a field
  const getInputType = (fieldName: string): 'text' | 'number' | 'date' | 'select' => {
    const lower = fieldName.toLowerCase();
    
    if (lower.includes('date')) {
      return 'date';
    }
    
    if (lower.includes('team') && availableTeams.length > 0) {
      return 'select';
    }
    
    if (lower.includes('competition type')) {
      return 'select';
    }
    
    if (lower.includes('season')) {
      return 'select';
    }
    
    if (lower.includes('home/away') || lower.includes('home away')) {
      return 'select';
    }
    
    // Check if it's likely a number field
    if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt') || 
        lower.includes('pass') || lower.includes('corner') || lower.includes('free kick') ||
        lower.includes('possession') || lower.includes('poss') || lower.includes('xg') ||
        lower.includes('string') || lower.includes('penalty') || lower.includes('throw')) {
      return 'number';
    }
    
    return 'text';
  };

  // Get field width (for layout efficiency)
  // All fields are single width in 5-column layout
  const getFieldWidth = (_fieldName: string): string => {
    return '';
  };

  // Handle input change
  const handleChange = (fieldName: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Fetch opponent suggestions
  const fetchOpponentSuggestions = useCallback(async (query: string, teamId?: number) => {
    if (!query || query.trim().length < 2) {
      setOpponentSuggestions([]);
      setShowOpponentSuggestions(false);
      return;
    }

    try {
      const teamIdParam = teamId ? `&teamId=${teamId}` : '';
      const response = await apiGet<{ suggestions: string[] }>(
        `/matches/opponents/suggestions?query=${encodeURIComponent(query)}${teamIdParam}&limit=10`
      );
      setOpponentSuggestions(response.suggestions || []);
      setShowOpponentSuggestions(response.suggestions && response.suggestions.length > 0);
    } catch (error) {
      console.error('Error fetching opponent suggestions:', error);
      setOpponentSuggestions([]);
      setShowOpponentSuggestions(false);
    }
  }, []);

  // Debounced opponent suggestion fetch
  const opponentSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle opponent input change with autocomplete
  const handleOpponentChange = useCallback((fieldName: string, value: string) => {
    handleChange(fieldName, value);
    
    // Clear previous timeout
    if (opponentSuggestionTimeoutRef.current) {
      clearTimeout(opponentSuggestionTimeoutRef.current);
    }
    
    // Find team ID if available
    const teamKey = columnKeys.find(key => 
      normalizeFieldName(key).toLowerCase().includes('team') && 
      !normalizeFieldName(key).toLowerCase().includes('team id')
    );
    const teamSlug = teamKey && formData[teamKey] ? String(formData[teamKey]).trim() : '';
    const team = teamSlug ? Array.from(teamSlugMap.values()).find(t => t.slug === teamSlug) : null;
    const teamId = team?.id;
    
    // Debounce suggestion fetch
    opponentSuggestionTimeoutRef.current = setTimeout(() => {
      fetchOpponentSuggestions(value, teamId);
    }, 300);
  }, [formData, columnKeys, teamSlugMap, fetchOpponentSuggestions]);

  // Handle opponent suggestion selection
  const handleOpponentSuggestionSelect = useCallback((fieldName: string, suggestion: string) => {
    handleChange(fieldName, suggestion);
    setShowOpponentSuggestions(false);
    setOpponentSuggestions([]);
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    const teamKey = columnKeys.find(key => 
      key.toLowerCase().includes('team') && !key.toLowerCase().includes('opponent')
    );
    const opponentKey = columnKeys.find(key => 
      key.toLowerCase().includes('opponent')
    );
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date') && !key.toLowerCase().includes('match id')
    );
    
    if (teamKey && !formData[teamKey]) {
      newErrors[teamKey] = 'Team is required';
    }
    
    if (opponentKey && !formData[opponentKey]) {
      newErrors[opponentKey] = 'Opponent is required';
    }
    
    if (dateKey && !formData[dateKey]) {
      newErrors[dateKey] = 'Date is required';
    }
    
    // Validate number fields
    Object.keys(formData).forEach(key => {
      const inputType = getInputType(key);
      if (inputType === 'number' && formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
        const numValue = typeof formData[key] === 'string' ? parseFloat(formData[key]) : formData[key];
        if (isNaN(numValue as number) || (numValue as number) < 0) {
          newErrors[key] = 'Must be a valid positive number';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Prepare submission data (extracted for reuse)
  const prepareSubmissionData = () => {
    // Find field keys
    const teamKey = columnKeys.find(key => 
      key.toLowerCase().includes('team') && !key.toLowerCase().includes('opponent')
    );
    const opponentKey = columnKeys.find(key => 
      key.toLowerCase().includes('opponent')
    );
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date') && !key.toLowerCase().includes('match id')
    );
    const competitionTypeKey = columnKeys.find(key => 
      key.toLowerCase().includes('competition type')
    );
    const competitionKey = columnKeys.find(key => 
      key.toLowerCase().includes('competition') && !key.toLowerCase().includes('type')
    );
    const resultKey = columnKeys.find(key => 
      key.toLowerCase().includes('result')
    );
    const homeAwayKey = columnKeys.find(key => 
      key.toLowerCase().includes('home/away') || key.toLowerCase().includes('home away')
    );
    
    // Get team ID from team slug
    let teamId: number | undefined;
    if (teamKey && formData[teamKey]) {
      const teamSlug = String(formData[teamKey]).trim();
      const team = Array.from(teamSlugMap.values()).find(
        t => t.slug.toLowerCase() === teamSlug.toLowerCase() || 
             t.displayName?.toLowerCase() === teamSlug.toLowerCase()
      );
      if (team) {
        teamId = team.id;
      }
    }
    
    // Prepare raw stats (exclude game info fields that go to top level)
    const rawStats: Record<string, any> = {};
    Object.keys(formData).forEach(key => {
      // Skip game info fields that are handled separately
      if (key === teamKey || key === opponentKey || key === dateKey || 
          key === competitionTypeKey || key === competitionKey || 
          key === resultKey || key === homeAwayKey) {
        return;
      }
      // Include all other fields as raw stats
      // For number fields, default to 0 if empty/invalid
      const value = formData[key];
      const inputType = getInputType(key);
      
      if (inputType === 'number') {
        // For number fields, always include a value (default to 0 if empty/invalid)
        if (value === '' || value === null || value === undefined || isNaN(Number(value))) {
          rawStats[key] = 0;
        } else {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          rawStats[key] = isNaN(numValue) ? 0 : numValue;
        }
      } else {
        // For non-number fields, only include if not empty
        if (value !== '' && value !== null && value !== undefined) {
          rawStats[key] = value;
        }
      }
    });
    
    // Format date - convert MM/DD/YYYY to YYYY-MM-DD
    // IMPORTANT: Use local date methods to avoid timezone shifts (don't use toISOString)
    let matchDate = '';
    if (dateKey && formData[dateKey]) {
      const dateValue = formData[dateKey];
      if (typeof dateValue === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          // Already in YYYY-MM-DD format
          matchDate = dateValue.split('T')[0];
        } else {
          // Try to parse MM/DD/YYYY format
          const mmddyyyy = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (mmddyyyy) {
            // Direct conversion without timezone conversion
            const month = mmddyyyy[1].padStart(2, '0');
            const day = mmddyyyy[2].padStart(2, '0');
            const year = mmddyyyy[3];
            matchDate = `${year}-${month}-${day}`;
          } else {
            // Fallback: try parsing as Date but use local methods
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
              // Use local date methods to avoid timezone conversion
              const year = parsed.getFullYear();
              const month = String(parsed.getMonth() + 1).padStart(2, '0');
              const day = String(parsed.getDate()).padStart(2, '0');
              matchDate = `${year}-${month}-${day}`;
            } else {
              matchDate = dateValue;
            }
          }
        }
      }
    }
    
    // Convert Home/Away/Tournament to boolean
    // Home = true, Away = false, Tournament = null
    let isHome: boolean | null = null;
    if (homeAwayKey && formData[homeAwayKey]) {
      const homeAwayValue = String(formData[homeAwayKey]).toLowerCase();
      if (homeAwayValue === 'home') {
        isHome = true;
      } else if (homeAwayValue === 'away') {
        isHome = false;
      } else {
        // Tournament or other values = null
        isHome = null;
      }
    }

    return {
      teamId: teamId || null,
      opponentName: opponentKey && formData[opponentKey] ? String(formData[opponentKey]) : '',
      matchDate,
      competitionType: competitionTypeKey && formData[competitionTypeKey] ? String(formData[competitionTypeKey]) : null,
      result: resultKey && formData[resultKey] ? String(formData[resultKey]) : null,
      isHome,
      rawStats,
    };
  };

  // Handle form submission - show preview first
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    try {
      const submissionData = prepareSubmissionData();
      
      // Validate required fields
      if (!submissionData.opponentName || !submissionData.matchDate) {
        setErrors({ _general: 'Opponent name and match date are required' });
        setIsSubmitting(false);
        return;
      }
      
      // Get preview of computed stats
      const preview = await previewMatchStats({
        teamId: submissionData.teamId,
        opponentName: submissionData.opponentName,
        matchDate: submissionData.matchDate,
        competitionType: submissionData.competitionType,
        result: submissionData.result,
        isHome: submissionData.isHome,
        rawStats: submissionData.rawStats,
      });
      
      // Store preview data and pending submission
      setPreviewData(preview);
      setPendingSubmission(submissionData);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error previewing match stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to preview match data. Please try again.';
      setErrors({ _general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle confirmation - actually submit the data
  const handleConfirm = async () => {
    if (!pendingSubmission) return;
    
    setIsSubmitting(true);
    
    try {
      // If existing match found, update it; otherwise create new
      if (existingMatch) {
        // For updates, filter out 0s from rawStats (0s act as placeholders - don't update)
        const rawStatsToUpdate: Record<string, any> = {};
        Object.entries(pendingSubmission.rawStats).forEach(([key, value]) => {
          // Only include non-zero values (0s mean "don't update this field")
          if (value !== 0 && value !== '' && value !== null && value !== undefined) {
            rawStatsToUpdate[key] = value;
          }
        });
        
        await updateMatch(existingMatch.id, {
          teamId: pendingSubmission.teamId,
          opponentName: pendingSubmission.opponentName,
          matchDate: pendingSubmission.matchDate,
          competitionType: pendingSubmission.competitionType,
          result: pendingSubmission.result,
          rawStats: rawStatsToUpdate,
        });
      } else {
        await createMatch({
          teamId: pendingSubmission.teamId,
          opponentName: pendingSubmission.opponentName,
          matchDate: pendingSubmission.matchDate,
          competitionType: pendingSubmission.competitionType,
          result: pendingSubmission.result,
          isHome: pendingSubmission.isHome,
          rawStats: pendingSubmission.rawStats,
        });
      }
      
      setSubmitSuccess(true);
      
      // Close modal
      setShowConfirmation(false);
      setPreviewData(null);
      setPendingSubmission(null);
      setExistingMatch(null);
      
      // Callback to reload data
      if (onDataSubmitted) {
        onDataSubmitted();
      }
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({});
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit data. Please try again.';
      setErrors({ _general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel - close modal
  const handleCancel = () => {
    setShowConfirmation(false);
    setPreviewData(null);
    setPendingSubmission(null);
  };

  // Reset form
  const handleReset = () => {
    setFormData({});
    setErrors({});
    setSubmitSuccess(false);
  };

  // Section-specific upload handler for Basic Stats (1st Half) and Basic Stats (2nd Half)
  const handleSectionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, section: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSectionUploadState(prev => ({
        ...prev,
        [section]: { processing: false, message: { type: 'error', text: 'Please upload an image file' } }
      }));
      return;
    }

    // Set processing state for this specific section
    setSectionUploadState(prev => ({
      ...prev,
      [section]: { processing: true, message: null }
    }));

    try {
      // Extract stats from image using Gemini vision
      // Determine period based on section: '1st' for Basic Stats (1st Half), '2nd' for Basic Stats (2nd Half)
      const period = section === 'Basic Stats (1st Half)' ? '1st' : '2nd';
      const { teamStats, opponentStats } = await extractStatsFromImage(file, period);
      
      // Merge team and opponent stats
      const allStats = { ...teamStats, ...opponentStats };
      
      // Filter out computed fields
      const filteredStats: Record<string, number> = {};
      const excludedStats: string[] = [];
      
      Object.keys(allStats).forEach(key => {
        const lowerKey = key.toLowerCase();
        const isAttemptsField = (lowerKey.includes('attempt') || lowerKey.includes('attempts')) && 
                                !lowerKey.includes('penalty') && 
                                !lowerKey.includes('penalties');
        
        if (shouldExcludeField(key) || isAttemptsField) {
          excludedStats.push(key);
        } else {
          filteredStats[key] = allStats[key];
        }
      });

      // Only match stats that belong to this section
      const sectionFields = formFields[section] || [];
      const allFormFields = sectionFields;
      
      let matchedCount = 0;
      let unmatchedStats: string[] = [];
      const matchedFields: string[] = [];
      
      // Process matches first to get accurate counts
      Object.keys(filteredStats).forEach(extractedKey => {
        // Try to find matching field in this section
        const exactMatch = allFormFields.find(f => f.name === extractedKey);
        
        if (exactMatch) {
          matchedCount++;
          matchedFields.push(exactMatch.name);
        } else {
          // Try case-insensitive match
          const caseInsensitiveMatch = allFormFields.find(
            f => f.name.toLowerCase() === extractedKey.toLowerCase()
          );
          
          if (caseInsensitiveMatch) {
            matchedCount++;
            matchedFields.push(caseInsensitiveMatch.name);
          } else {
            // Try normalized match
            const normalizedExtracted = normalizeFieldName(extractedKey);
            const normalizedMatch = allFormFields.find(
              f => normalizeFieldName(f.name).toLowerCase() === normalizedExtracted.toLowerCase()
            );
            
            if (normalizedMatch) {
              matchedCount++;
              matchedFields.push(normalizedMatch.name);
            } else {
              unmatchedStats.push(extractedKey);
            }
          }
        }
      });
      
      // Now update form data with matched stats
      setFormData(prev => {
        const updated = { ...prev };
        
        Object.keys(filteredStats).forEach(extractedKey => {
          // Try to find matching field in this section
          const exactMatch = allFormFields.find(f => f.name === extractedKey);
          
          if (exactMatch) {
            updated[exactMatch.name] = filteredStats[extractedKey];
          } else {
            // Try case-insensitive match
            const caseInsensitiveMatch = allFormFields.find(
              f => f.name.toLowerCase() === extractedKey.toLowerCase()
            );
            
            if (caseInsensitiveMatch) {
              updated[caseInsensitiveMatch.name] = filteredStats[extractedKey];
            } else {
              // Try normalized match
              const normalizedExtracted = normalizeFieldName(extractedKey);
              const normalizedMatch = allFormFields.find(
                f => normalizeFieldName(f.name).toLowerCase() === normalizedExtracted.toLowerCase()
              );
              
              if (normalizedMatch) {
                updated[normalizedMatch.name] = filteredStats[extractedKey];
              }
            }
          }
        });

        return updated;
      });

      // Show success/error message
      const totalStats = Object.keys(filteredStats).length;
      
      // Check if we actually matched any stats
      if (matchedCount > 0) {
        const message = unmatchedStats.length > 0
          ? `Matched ${matchedCount} of ${totalStats} stats. ${unmatchedStats.length} unmatched.`
          : `Successfully matched all ${matchedCount} statistics!`;
        setSectionUploadState(prev => ({
          ...prev,
          [section]: { processing: false, message: { type: 'success', text: message } }
        }));
        setTimeout(() => {
          setSectionUploadState(prev => ({
            ...prev,
            [section]: { processing: false, message: null }
          }));
        }, 5000);
      } else if (totalStats > 0 && unmatchedStats.length > 0) {
        // Stats were extracted but none matched
        setSectionUploadState(prev => ({
          ...prev,
          [section]: { processing: false, message: { type: 'error', text: `Couldn't match ${totalStats} statistics to this section.` } }
        }));
      } else if (totalStats === 0 && excludedStats.length > 0) {
        // Only computed fields were extracted (correctly excluded)
        setSectionUploadState(prev => ({
          ...prev,
          [section]: { processing: false, message: { type: 'success', text: `Image processed. ${excludedStats.length} computed field${excludedStats.length > 1 ? 's' : ''} excluded.` } }
        }));
        setTimeout(() => {
          setSectionUploadState(prev => ({
            ...prev,
            [section]: { processing: false, message: null }
          }));
        }, 3000);
      } else if (totalStats > 0) {
        // Stats were extracted but for some reason matchedCount is 0 (shouldn't happen, but show info)
        setSectionUploadState(prev => ({
          ...prev,
          [section]: { processing: false, message: { type: 'success', text: `Image processed. ${totalStats} stat${totalStats > 1 ? 's' : ''} found and processed.` } }
        }));
        setTimeout(() => {
          setSectionUploadState(prev => ({
            ...prev,
            [section]: { processing: false, message: null }
          }));
        }, 5000);
      } else {
        // No stats extracted at all
        setSectionUploadState(prev => ({
          ...prev,
          [section]: { processing: false, message: { type: 'success', text: 'Image processed. No stats found in image.' } }
        }));
        setTimeout(() => {
          setSectionUploadState(prev => ({
            ...prev,
            [section]: { processing: false, message: null }
          }));
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing section image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract statistics';
      setSectionUploadState(prev => ({
        ...prev,
        [section]: { processing: false, message: { type: 'error', text: errorMessage } }
      }));
    } finally {
      setSectionUploadState(prev => ({
        ...prev,
        [section]: { processing: false, message: prev[section]?.message || null }
      }));
      event.target.value = '';
    }
  };


  // Render fields grouped by Team/Opponent for Basic Stats and other sections
  const renderFieldsWithSubsections = (
    fields: Array<{ name: string; category: string }>,
    category?: string
  ) => {
    // Split into team and opponent fields FIRST, then sort each group
    // This ensures proper ordering within each section
    let teamFields = fields.filter(f => !isOpponentField(f.name));
    let opponentFields = fields.filter(f => isOpponentField(f.name));
    
    // Sort each group separately - use appropriate sort function based on category
    if (category === 'Pass Strings') {
      teamFields = sortPassStringsFields([...teamFields]); // Create new array to ensure sort works
      opponentFields = sortPassStringsFields([...opponentFields]); // Create new array to ensure sort works
    } else if (category === 'Shots Map') {
      // Use custom sort for Shots Map
      const sorted = sortShotsMapFields([...teamFields], [...opponentFields]);
      teamFields = sorted.teamFields;
      opponentFields = sorted.opponentFields;
    } else {
      teamFields = sortBasicStatsFields([...teamFields]); // Create new array to ensure sort works
      opponentFields = sortBasicStatsFields([...opponentFields]); // Create new array to ensure sort works
    }
    
    
    return (
      <>
        {teamFields.length > 0 && (
          <>
            <div className="mt-4 mb-2">
              <h3 className="text-md font-semibold text-gray-800">Team</h3>
              <div className="border-t border-gray-300 mt-1"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {teamFields.map(field => {
                const fieldName = field.name;
                const inputType = getInputType(fieldName);
                const value = formData[fieldName] ?? (inputType === 'number' ? 0 : '');
                const error = errors[fieldName];
                const width = getFieldWidth(fieldName);

                return (
                  <div key={fieldName} className={`flex flex-col ${width}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formatFieldLabel(fieldName)}
                    </label>
                    {inputType === 'number' ? (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={value}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleChange(fieldName, val);
                        }}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          error ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handleChange(fieldName, e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          error ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    )}
                    {error && (
                      <span className="text-red-500 text-xs mt-1">{error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {opponentFields.length > 0 && (
          <>
            <div className="mt-6 mb-2">
              <h3 className="text-md font-semibold text-gray-800">Opponent</h3>
              <div className="border-t border-gray-300 mt-1"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {opponentFields.map(field => {
                const fieldName = field.name;
                const inputType = getInputType(fieldName);
                const value = formData[fieldName] ?? (inputType === 'number' ? 0 : '');
                const error = errors[fieldName];
                const width = getFieldWidth(fieldName);

                return (
                  <div key={fieldName} className={`flex flex-col ${width}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formatFieldLabel(fieldName)}
                    </label>
                    {inputType === 'number' ? (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={value}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleChange(fieldName, val);
                        }}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          error ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handleChange(fieldName, e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          error ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    )}
                    {error && (
                      <span className="text-red-500 text-xs mt-1">{error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  };

  // Category order
  const categoryOrder = [
    'Game Info',
    'Basic Stats (1st Half)',
    'Basic Stats (2nd Half)',
    'Shots Map',
    'Possession Location',
    'Pass Location',
    'Pass Strings'
  ];

  return (
    <>
      <MatchConfirmationModal
        isOpen={showConfirmation}
        previewData={previewData}
        teamSlugMap={teamSlugMap}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        isUpdating={!!existingMatch}
      />
      <ExistingMatchModal
        isOpen={showExistingMatchModal}
        match={existingMatch}
        teamSlugMap={teamSlugMap}
        onPreFill={handlePreFillMatch}
        onCancel={handleCancelPreFill}
      />
      <PageLayout
        title="Upload Game Data"
      subtitle="Enter data for a single game"
      maxWidth="7xl"
    >
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Game data submitted successfully!
        </div>
      )}

      {errors._general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {errors._general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {categoryOrder.map((category, categoryIndex) => {
          const fields = formFields[category];
          if (!fields || fields.length === 0) return null;
          
          const categoryColor = getCategoryHeaderColor(categoryIndex);
          const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';
          
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
                  {category === 'Game Info' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowExistingMatchModal(true)}
                        disabled={!existingMatch || isLoadingExistingMatch}
                        className={`flex items-center gap-1 px-2 py-1 bg-white text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors ${
                          existingMatch && !isLoadingExistingMatch
                            ? 'cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        title={existingMatch ? 'Load existing match data' : isLoadingExistingMatch ? 'Checking for existing match...' : 'No match found'}
                      >
                        {isLoadingExistingMatch ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                            <span>Checking...</span>
                          </>
                        ) : existingMatch ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Load Match</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>No Match</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                  {category === 'Game Info' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {fields.map(field => {
                        const fieldName = field.name;
                        const inputType = getInputType(fieldName);
                        const value = formData[fieldName] ?? '';
                        const error = errors[fieldName];
                        const isRequired = fieldName.toLowerCase().includes('team') || 
                                          fieldName.toLowerCase().includes('opponent') || 
                                          fieldName.toLowerCase().includes('date');
                        const width = getFieldWidth(fieldName);

                        return (
                          <div key={fieldName} className={`flex flex-col ${width}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {formatFieldLabel(fieldName)}
                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {inputType === 'select' && fieldName.toLowerCase().includes('team') ? (
                              <select
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required={isRequired}
                              >
                                <option value="">Select a team...</option>
                                {availableTeams.map(team => (
                                  <option key={team.slug} value={team.slug}>{team.displayName}</option>
                                ))}
                              </select>
                            ) : inputType === 'select' && fieldName.toLowerCase().includes('competition type') ? (
                              <select
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select...</option>
                                <option value="League">League</option>
                                <option value="Tournament">Tournament</option>
                                <option value="Scrimmage">Scrimmage</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : inputType === 'select' && fieldName.toLowerCase().includes('season') ? (
                              <select
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select a season...</option>
                                {seasons.map(season => (
                                  <option key={season.id} value={season.name}>
                                    {season.name} {season.isActive ? '(Active)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : inputType === 'select' && (fieldName.toLowerCase().includes('home/away') || fieldName.toLowerCase().includes('home away')) ? (
                              <select
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select...</option>
                                <option value="Home">Home</option>
                                <option value="Away">Away</option>
                                <option value="Tournament">Tournament</option>
                              </select>
                            ) : inputType === 'date' ? (
                              <input
                                type="date"
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required={isRequired}
                              />
                            ) : inputType === 'number' ? (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={value}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleChange(fieldName, val);
                                }}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="0"
                              />
                            ) : (
                              <div className="relative">
                                <input
                                  ref={fieldName.toLowerCase().includes('opponent') ? opponentInputRef : null}
                                  type="text"
                                  value={value as string}
                                  onChange={(e) => {
                                    if (fieldName.toLowerCase().includes('opponent')) {
                                      handleOpponentChange(fieldName, e.target.value);
                                    } else {
                                      handleChange(fieldName, e.target.value);
                                    }
                                  }}
                                  onFocus={() => {
                                    if (fieldName.toLowerCase().includes('opponent') && value && String(value).trim().length >= 2) {
                                      const teamKey = columnKeys.find(key => 
                                        normalizeFieldName(key).toLowerCase().includes('team') && 
                                        !normalizeFieldName(key).toLowerCase().includes('team id')
                                      );
                                      const teamSlug = teamKey && formData[teamKey] ? String(formData[teamKey]).trim() : '';
                                      const team = teamSlug ? Array.from(teamSlugMap.values()).find(t => t.slug === teamSlug) : null;
                                      fetchOpponentSuggestions(String(value), team?.id);
                                    }
                                  }}
                                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                    error ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  required={isRequired}
                                />
                                {fieldName.toLowerCase().includes('opponent') && showOpponentSuggestions && opponentSuggestions.length > 0 && (
                                  <div
                                    ref={opponentSuggestionsRef}
                                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                  >
                                    {opponentSuggestions.map((suggestion, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleOpponentSuggestionSelect(fieldName, suggestion)}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {error && (
                              <span className="text-red-500 text-xs mt-1">{error}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : category === 'Basic Stats (1st Half)' || category === 'Basic Stats (2nd Half)' || 
                      category === 'Pass Strings' || category === 'Shots Map' ? (
                    renderFieldsWithSubsections(fields, category)
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {fields.map(field => {
                        const fieldName = field.name;
                        const inputType = getInputType(fieldName);
                        const value = formData[fieldName] ?? (inputType === 'number' ? 0 : '');
                        const error = errors[fieldName];
                        const width = getFieldWidth(fieldName);

                        return (
                          <div key={fieldName} className={`flex flex-col ${width}`}>
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
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleChange(fieldName, val);
                                }}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="0"
                              />
                            ) : (
                              <input
                                type="text"
                                value={value as string}
                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                  error ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                            )}
                            {error && (
                              <span className="text-red-500 text-xs mt-1">{error}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black"
            style={{
              backgroundColor: isSubmitting ? '#9ca3af' : JOGA_COLORS.voltYellow,
              border: `2px solid ${JOGA_COLORS.voltYellow}`,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#b8e600';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Game Data'}
          </button>
        </div>
      </form>
    </PageLayout>
    </>
  );
};
