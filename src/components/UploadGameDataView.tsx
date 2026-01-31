import React, { useState, useMemo, useEffect } from 'react';
import { MatchData, SheetConfig } from '../types';
import { createMatch } from '../services/matchService';
import { JOGA_COLORS } from '../utils/colors';
import { Team } from '../types/auth';
import { PageLayout } from './PageLayout';
import { getAllSeasons } from '../services/seasonService.api';

interface UploadGameDataViewProps {
  columnKeys: string[];
  matchData: MatchData[];
  sheetConfig: SheetConfig;
  teamSlugMap: Map<string, Team>;
}

// Fields that are computed/calculated - should not be in the form
const COMPUTED_FIELDS = [
  'tsr',
  'opp tsr',
  'total shots ratio',
  'opp total shots ratio',
  'conversion rate',
  'opp conversion rate',
  'spi',
  'spi (w)',
  'opp spi',
  'opp spi (w)',
  'pass share',
  'opp pass share',
  'ppm',
  'opp ppm',
  'passes per minute',
  'opp passes per minute',
  'lpc',
  'lpc avg',
  'longest pass chain',
  'possess % (def)',
  'possess % (mid)',
  'possess % (att)',
  'inside box attempts %',
  'outside box attempts %',
  'opp inside box attempts %',
  'opp outside box attempts %',
  'total attempts (1st half)',
  'total attempts (2nd half)',
  'total attempts 1st half',
  'total attempts 2nd half',
  'total attempts (1st)',
  'total attempts (2nd)',
  'total attempts 1st',
  'total attempts 2nd',
  'pass strings (3–5)',
  'pass strings (6+)',
  'pass strings (3-5)',
  'pass strings (6+)',
];

// Fields to exclude (shot maps, heat maps, etc.)
const EXCLUDED_FIELDS = [
  'shot map',
  'heatmap',
  'heat map',
  'match id',
  'matchid',
  'notes',
  'behavioral avg',
  'cpi',
];

// Full game stats that should be excluded (they are computed from 1st/2nd half)
const FULL_GAME_STATS_TO_EXCLUDE = [
  'goals for',
  'goals against',
  'shots for',
  'shots against',
  'total attempts',
  'opp total attempts',
  'attempts for',
  'attempts against',
  'passes completed',
  'passes for',
  'passes against',
  'opp pass completed',
  'possession',
  'opp possession',
  'possessions won',
  'opp possessions won',
  'corners against',
  'corners for',
  'free kicks against',
  'free kicks for',
  'penalty against',
  'penalty for',
  'xg (total)',
  'xg total',
];

// Check if a field should be excluded
const shouldExcludeField = (fieldName: string): boolean => {
  const lower = fieldName.toLowerCase();
  
  // Exclude computed fields
  if (COMPUTED_FIELDS.some(computed => lower.includes(computed))) {
    return true;
  }
  
  // Exclude specific fields
  if (EXCLUDED_FIELDS.some(excluded => lower.includes(excluded))) {
    return true;
  }
  
  // Exclude full game stats (they are computed from 1st/2nd half)
  // But only if they don't have "1st half" or "2nd half" in the name
  const hasHalfIndicator = lower.includes('1st half') || lower.includes('2nd half') || 
                          lower.includes('first half') || lower.includes('second half') ||
                          lower.includes('(1st') || lower.includes('(2nd') ||
                          lower.includes('(first') || lower.includes('(second');
  
  if (!hasHalfIndicator && FULL_GAME_STATS_TO_EXCLUDE.some(fullGame => lower.includes(fullGame))) {
    return true;
  }
  
  // Exclude fields that are clearly calculated (contain %, ratio, etc. in certain contexts)
  // But allow percentage fields that are manually entered like possession
  if (lower.includes('pass % by zone') || lower.includes('opp pass % by zone')) {
    return true;
  }
  
  return false;
};

// Categorize fields for better form organization
const categorizeField = (fieldName: string): string => {
  const lower = fieldName.toLowerCase();
  
  // Specific field mappings first
  if (lower === 'result' || lower.includes('result')) {
    return 'Game Info';
  }
  if (lower === 'season' || lower.includes('season')) {
    return 'Game Info';
  }
  // Check for 1st half or 2nd half indicators
  const isFirstHalf = lower.includes('1st half') || lower.includes('first half') || lower.includes('(1st') || lower.includes('(first');
  const isSecondHalf = lower.includes('2nd half') || lower.includes('second half') || lower.includes('(2nd') || lower.includes('(second');
  
  // General pattern matching
  if (lower.includes('team') || lower.includes('opponent') || lower.includes('date') || lower.includes('competition')) {
    return 'Game Info';
  }
  
  // Basic stats (goals, shots, attempts, passes completed) - MUST have half indicator
  // Full game stats without half indicators are excluded by shouldExcludeField
  // Passes completed by half should be in Basic Stats sections
  // Check for passes completed/comp with half indicators first
  if (lower.includes('pass') && (lower.includes('completed') || lower.includes('comp'))) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
    // If passes completed without half indicator, it should be excluded (full game stat)
    // But categorize as Shots as fallback
    return 'Shots';
  }
  
  // Possession minutes by half should be in Basic Stats sections
  if (lower.includes('possession mins') || lower.includes('poss mins') || 
      (lower.includes('possession') && lower.includes('mins'))) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
  }
  
  // Possessions won by half should be in Basic Stats sections
  if (lower.includes('possessions won') || lower.includes('poss won')) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
  }
  
  // Possession by half (percentage) should be in Basic Stats sections
  if ((lower.includes('possession') || lower.includes('poss')) && 
      !lower.includes('mins') && !lower.includes('won') && 
      (isFirstHalf || isSecondHalf)) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
  }
  
  // Other basic stats (goals, shots, attempts) - MUST have half indicator
  if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt')) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
    // If no half indicator, this should have been excluded, but categorize as Shots as fallback
    return 'Shots';
  }
  
  // Inside/Outside box conversion rates should go to Shots category (not Basic Stats)
  if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate')) {
    return 'Shots';
  }
  
  // Opponent conversion rate should go to Shots category
  if (lower.includes('opp conv rate') || lower.includes('opp conversion rate')) {
    return 'Shots';
  }
  
  // Other conversion rates - can be full game or by half
  if (lower.includes('conv rate') || lower.includes('conversion rate')) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
    // Conversion rates can be full game, so allow them in 1st half section
    return 'Basic Stats (1st Half)';
  }
  
  // xG should not be in Basic Stats - categorize as Shots
  if (lower.includes('xg')) {
    return 'Shots';
  }
  // Other passing fields (pass strings, zones, etc.) - not passes completed
  // Passes completed by half are handled above in Basic Stats
  if (lower.includes('string') || lower.includes('zone') || 
      (lower.includes('pass') && !lower.includes('completed') && !lower.includes('for') && !lower.includes('against'))) {
    return 'Pass Strings';
  }
  // Possession fields (excluding possession by half which are in Basic Stats)
  // Only full game possession percentages by zone go to Possession category
  // Full game possession and possessions won are excluded (computed from halves)
  if ((lower.includes('possession') || lower.includes('poss')) && 
      !lower.includes('mins') && !lower.includes('won') && 
      !isFirstHalf && !isSecondHalf &&
      (lower.includes('def') || lower.includes('mid') || lower.includes('att') || lower.includes('zone'))) {
    return 'Possession';
  }
  
  // Set pieces with half indicators should go to Basic Stats
  if ((lower.includes('corner') || lower.includes('free kick') || lower.includes('freekick') || lower.includes('penalty')) &&
      (isFirstHalf || isSecondHalf)) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
  }
  
  // Other fields with half indicators should go to Basic Stats
  if (isFirstHalf || isSecondHalf) {
    if (isFirstHalf) {
      return 'Basic Stats (1st Half)';
    } else if (isSecondHalf) {
      return 'Basic Stats (2nd Half)';
    }
  }
  
  return 'Shots';
};

// Determine if a field is Team or Opponent metric
const isOpponentField = (fieldName: string): boolean => {
  const lower = fieldName.toLowerCase();
  return lower.includes('opp') || 
         lower.includes('opponent') || 
         lower.includes('against') ||
         (lower.includes('pass') && lower.includes('against'));
};

export const UploadGameDataView: React.FC<UploadGameDataViewProps> = ({ columnKeys, matchData, teamSlugMap }) => {
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  // JOGA colors for category headers (rotating pattern - matches Glossary)
  const categoryHeaderColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.pinkFoam, JOGA_COLORS.valorBlue];
  
  const getCategoryHeaderColor = (index: number): string => {
    return categoryHeaderColors[index % categoryHeaderColors.length];
  };

  // Load active season on mount
  useEffect(() => {
    const loadActiveSeason = async () => {
      try {
        const seasons = await getAllSeasons();
        const active = seasons.find(s => s.isActive);
        if (active) {
          setActiveSeasonId(active.id);
        }
      } catch (error) {
        console.error('Error loading active season:', error);
      }
    };
    void loadActiveSeason();
  }, []);

  // Get available teams from database (filtered by active season)
  // Also get teams from match data as fallback
  const availableTeams = useMemo(() => {
    // Get all active database teams for the active season
    const dbTeams = Array.from(teamSlugMap.values())
      .filter(team => {
        // Must be active
        if (!team.isActive) return false;
        // Must be in active season (if season is set)
        if (activeSeasonId !== null && team.seasonId !== activeSeasonId) return false;
        return true;
      })
      .map(team => ({
        id: team.id,
        slug: team.slug,
        displayName: team.displayName || team.slug,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // If we have database teams, use them
    if (dbTeams.length > 0) {
      return dbTeams;
    }
    
    // Fallback: extract from match data
    const teamKey = columnKeys.find(key => 
      key.toLowerCase().includes('team') && !key.toLowerCase().includes('opponent')
    ) || 'Team';
    const teams = new Set<string>();
    matchData.forEach(match => {
      const team = match[teamKey];
      if (team && typeof team === 'string') {
        teams.add(team);
      }
    });
    return Array.from(teams).map(slug => ({ id: undefined, slug, displayName: slug })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [matchData, columnKeys, teamSlugMap, activeSeasonId]);

  // Filter and categorize fields for the form
  const formFields = useMemo(() => {
    const fields = columnKeys
      .filter(key => !shouldExcludeField(key))
      .map(key => ({
        name: key,
        category: categorizeField(key),
      }))
      .sort((a, b) => {
        // Sort by category first, then by name
        if (a.category !== b.category) {
          const categoryOrder = ['Game Info', 'Basic Stats (1st Half)', 'Basic Stats (2nd Half)', 'Shots', 'Pass Strings', 'Possession'];
          return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
        }
        return a.name.localeCompare(b.name);
      });
    
    // Group by category
    const grouped: Record<string, typeof fields> = {};
    fields.forEach(field => {
      if (!grouped[field.category]) {
        grouped[field.category] = [];
      }
      grouped[field.category].push(field);
    });
    
    // Sort fields within each category for better flow
    Object.keys(grouped).forEach(category => {
      const categoryFields = grouped[category];
      
      if (category === 'Game Info') {
        // Game Info: Team, Opponent, Date, Competition, Result
        const priorityOrder = ['team', 'opponent', 'date', 'competition', 'result'];
        categoryFields.sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          const aIndex = priorityOrder.findIndex(p => aLower.includes(p));
          const bIndex = priorityOrder.findIndex(p => bLower.includes(p));
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      } else if (category === 'Basic Stats (1st Half)' || category === 'Basic Stats (2nd Half)') {
        // Basic Stats: Goals first, then Shots, then Attempts
        const priorityOrder = ['goals', 'shots', 'attempts'];
        categoryFields.sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          const aIndex = priorityOrder.findIndex(p => aLower.includes(p));
          const bIndex = priorityOrder.findIndex(p => bLower.includes(p));
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // Sort "For" before "Against"
          const aFor = aLower.includes('for') && !aLower.includes('against');
          const bFor = bLower.includes('for') && !bLower.includes('against');
          if (aFor && !bFor) return -1;
          if (!aFor && bFor) return 1;
          return a.name.localeCompare(b.name);
        });
      } else if (category === 'Pass Strings') {
        // Pass Strings: Sort by pass string length (3-9 first, then 10 last)
        categoryFields.sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          
          // Extract pass string numbers (e.g., "3-pass string" -> 3, "10-pass string" -> 10)
          const getPassStringNumber = (name: string): number => {
            const match = name.match(/(\d+)[-\s]pass/);
            return match ? parseInt(match[1], 10) : 999; // 999 for non-pass-string fields
          };
          
          const aNum = getPassStringNumber(aLower);
          const bNum = getPassStringNumber(bLower);
          
          // If both are pass strings, sort by number (10 comes last)
          if (aNum !== 999 && bNum !== 999) {
            // Put 10 at the end, others in ascending order
            if (aNum === 10 && bNum !== 10) return 1;
            if (bNum === 10 && aNum !== 10) return -1;
            return aNum - bNum;
          }
          
          // If only one is a pass string, prioritize it
          if (aNum !== 999) return -1;
          if (bNum !== 999) return 1;
          
          // Otherwise, alphabetical
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
    
    // Check if it's likely a number field
    if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt') || 
        lower.includes('pass') || lower.includes('corner') || lower.includes('free kick') ||
        lower.includes('possession') || lower.includes('poss') || lower.includes('xg') ||
        lower.includes('string') || lower.includes('lpc') || lower.includes('ppm')) {
      return 'number';
    }
    
    return 'text';
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

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields (Game Info)
    if (!formData.team) {
      newErrors.team = 'Team is required';
    }
    
    if (!formData.opponent) {
      newErrors.opponent = 'Opponent is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    try {
      // Get team ID from team slug
      let teamId: number | undefined;
      if (formData.team) {
        const teamSlug = String(formData.team).trim();
        const team = Array.from(teamSlugMap.values()).find(
          t => t.slug.toLowerCase() === teamSlug.toLowerCase() || 
               t.displayName?.toLowerCase() === teamSlug.toLowerCase()
        );
        if (team) {
          teamId = team.id;
        }
      }
      
      // Prepare raw stats (exclude game info fields that go to top level)
      // Competition is a free-form field that goes in rawStats
      const gameInfoFields = ['team', 'opponent', 'date', 'competitionType', 'result', 'isHome'];
      const rawStats: Record<string, any> = {};
      Object.keys(formData).forEach(key => {
        // Skip game info fields that are handled separately
        if (gameInfoFields.includes(key)) {
          return;
        }
        // Include all other fields as raw stats (including competition)
        const value = formData[key];
        if (value !== '' && value !== null && value !== undefined) {
          rawStats[key] = value;
        }
      });
      
      // Add competition to rawStats if provided
      if (formData.competition) {
        rawStats.competition = formData.competition;
      }
      
      // Format date (ensure it's in YYYY-MM-DD format)
      let matchDate = '';
      if (formData.date) {
        const dateValue = formData.date;
        if (typeof dateValue === 'string') {
          // If already in YYYY-MM-DD format, use as-is
          if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
            matchDate = dateValue.split('T')[0]; // Remove time if present
          } else {
            // Try to parse other date formats
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
              matchDate = parsed.toISOString().split('T')[0];
            } else {
              matchDate = dateValue;
            }
          }
        }
      }
      
      // Get isHome value (from form data or default to null)
      const isHomeValue = formData.isHome !== undefined && formData.isHome !== '' 
        ? (formData.isHome === 'Home' || String(formData.isHome) === 'true')
        : null;
      
      // Create match via backend API (will compute stats automatically)
      await createMatch({
        teamId: teamId || null,
        opponentName: formData.opponent ? String(formData.opponent) : '',
        matchDate,
        competitionType: formData.competitionType ? String(formData.competitionType) : null,
        result: formData.result ? String(formData.result) : null,
        isHome: isHomeValue !== null ? Boolean(isHomeValue) : null,
        rawStats, // Backend will compute derived metrics (includes competition field)
      });
      
      setSubmitSuccess(true);
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

  // Reset form
  const handleReset = () => {
    setFormData({});
    setErrors({});
    setSubmitSuccess(false);
  };

  return (
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
            {/* Game Info Section - Always First */}
            <div className="mb-6">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div 
                    className="px-6 py-4 border-b border-gray-200"
                  style={{ backgroundColor: getCategoryHeaderColor(0) }}
                  >
                  <h2 className={`text-lg font-semibold ${getCategoryHeaderColor(0) === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white'}`}>
                    Game Info
                  </h2>
                  </div>
                  <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Team Dropdown - 2 columns */}
                    <div className="flex flex-col md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={formData.team || ''}
                        onChange={(e) => handleChange('team', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.team ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="">Select a team...</option>
                        {availableTeams.map(team => (
                          <option key={team.slug} value={team.slug}>{team.displayName}</option>
                        ))}
                      </select>
                      {errors.team && (
                        <span className="text-red-500 text-xs mt-1">{errors.team}</span>
                      )}
                    </div>

                    {/* Opponent - 2 columns */}
                    <div className="flex flex-col md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opponent <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.opponent || ''}
                        onChange={(e) => handleChange('opponent', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.opponent ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {errors.opponent && (
                        <span className="text-red-500 text-xs mt-1">{errors.opponent}</span>
                      )}
                    </div>

                    {/* Date - 2 columns */}
                    <div className="flex flex-col md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date || ''}
                        onChange={(e) => handleChange('date', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.date ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {errors.date && (
                        <span className="text-red-500 text-xs mt-1">{errors.date}</span>
                      )}
                    </div>

                    {/* Competition Type - 2 columns (wider) */}
                    <div className="flex flex-col md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competition Type
                      </label>
                      <select
                        value={formData.competitionType || ''}
                        onChange={(e) => handleChange('competitionType', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.competitionType ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="League">League</option>
                        <option value="Tournament">Tournament</option>
                        <option value="Scrimmage">Scrimmage</option>
                      </select>
                      {errors.competitionType && (
                        <span className="text-red-500 text-xs mt-1">{errors.competitionType}</span>
                      )}
                    </div>

                    {/* Competition - 2 columns (wider) */}
                    <div className="flex flex-col md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competition
                      </label>
                      <input
                        type="text"
                        value={formData.competition || ''}
                        onChange={(e) => handleChange('competition', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.competition ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Spring League, State Cup"
                      />
                      {errors.competition && (
                        <span className="text-red-500 text-xs mt-1">{errors.competition}</span>
                      )}
                    </div>

                    {/* Home/Away - 1 column (narrower) */}
                    <div className="flex flex-col md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Home/Away
                      </label>
                      <select
                        value={formData.isHome !== undefined ? (String(formData.isHome) === 'true' || formData.isHome === 'Home' ? 'Home' : 'Away') : ''}
                        onChange={(e) => handleChange('isHome', e.target.value === 'Home' ? 'Home' : 'Away')}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.isHome ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="Home">Home</option>
                        <option value="Away">Away</option>
                      </select>
                      {errors.isHome && (
                        <span className="text-red-500 text-xs mt-1">{errors.isHome}</span>
                      )}
                    </div>

                    {/* Result - 1 column (narrower) */}
                    <div className="flex flex-col md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Result
                      </label>
                      <select
                        value={formData.result || ''}
                        onChange={(e) => handleChange('result', e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                          errors.result ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="Win">Win</option>
                        <option value="Loss">Loss</option>
                        <option value="Draw">Draw</option>
                      </select>
                      {errors.result && (
                        <span className="text-red-500 text-xs mt-1">{errors.result}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Categories */}
            {Object.entries(formFields).filter(([category]) => category !== 'Game Info').map(([category, fields], categoryIndex) => {
              const categoryColor = getCategoryHeaderColor(categoryIndex + 1);
              const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';
              
              // For Basic Stats, Pass Strings, and Shots sections, separate Team and Opponent fields
              const isBasicStats = category === 'Basic Stats (1st Half)' || category === 'Basic Stats (2nd Half)';
              const isPassStrings = category === 'Pass Strings';
              const isShots = category === 'Shots';
              const teamFields = (isBasicStats || isPassStrings || isShots) ? fields.filter(f => !isOpponentField(f.name)) : [];
              const opponentFields = (isBasicStats || isPassStrings || isShots) ? fields.filter(f => isOpponentField(f.name)) : [];
              const otherFields = (isBasicStats || isPassStrings || isShots) ? [] : fields;
              
              // Helper function to render a field
              const renderField = (field: { name: string }) => {
                      const fieldName = field.name;
                      const inputType = getInputType(fieldName);
                      const value = formData[fieldName] ?? '';
                      const error = errors[fieldName];
                const isRequired = false;
                      // Penalty fields and conversion rate fields should be single width
                      const lowerFieldName = fieldName.toLowerCase();
                      const isPenaltyField = lowerFieldName.includes('penalty');
                      const isConvRateField = lowerFieldName.includes('inside box conv rate') || 
                                            lowerFieldName.includes('outside box conv rate') ||
                                            lowerFieldName.includes('conv rate');
                      const colSpan = (inputType === 'number' || isPenaltyField || isConvRateField) ? 'md:col-span-1' : 'md:col-span-2';
                      // All non-Game Info fields should have placeholder="0"
                      const shouldShowPlaceholder = category !== 'Game Info';

                      return (
                  <div key={fieldName} className={`flex flex-col ${colSpan}`}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {fieldName}
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
                                const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                handleChange(fieldName, val);
                              }}
                              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                error ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder={shouldShowPlaceholder ? "0" : undefined}
                            />
                          ) : (
                            <input
                              type="text"
                              value={value as string}
                              onChange={(e) => handleChange(fieldName, e.target.value)}
                              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] ${
                                error ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder={shouldShowPlaceholder ? "0" : undefined}
                              required={isRequired}
                            />
                          )}
                          {error && (
                            <span className="text-red-500 text-xs mt-1">{error}</span>
                          )}
                        </div>
                      );
              };
              
              return (
              <div key={category} className="mb-6">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div 
                    className="px-6 py-4 border-b border-gray-200"
                    style={{ backgroundColor: categoryColor }}
                  >
                    <h2 className={`text-lg font-semibold ${textColor}`}>
                    {category}
                  </h2>
                  </div>
                  <div className="p-6">
                    {(isBasicStats || isPassStrings || isShots) ? (
                      <div className="space-y-6">
                        {/* Team Subsection */}
                        {teamFields.length > 0 && (
                          <div>
                            <h3 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300">
                              Team
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                              {teamFields.map(renderField)}
                            </div>
                          </div>
                        )}

                        {/* Opponent Subsection */}
                        {opponentFields.length > 0 && (
                          <div>
                            <h3 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300">
                              Opponent
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                              {opponentFields.map(renderField)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {otherFields.map(renderField)}
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
                    e.currentTarget.style.backgroundColor = '#b8e600'; // Darker volt yellow
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
  );
};

