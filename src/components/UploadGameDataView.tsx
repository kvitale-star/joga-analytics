import React, { useState, useMemo } from 'react';
import { MatchData, SheetConfig } from '../types';
import { appendRowToSheet } from '../services/sheetsService';
import { JOGA_COLORS } from '../utils/colors';
import { Team } from '../types/auth';
import { PageLayout } from './PageLayout';

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
  'lpc avg',
  'possess % (def)',
  'possess % (mid)',
  'possess % (att)',
  'inside box attempts %',
  'outside box attempts %',
  'opp inside box attempts %',
  'opp outside box attempts %',
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
  if (lower.includes('inside box conv rate') || lower.includes('inside box conversion rate')) {
    return 'Shooting';
  }
  if (lower.includes('outside box conv rate') || lower.includes('outside box conversion rate')) {
    return 'Shooting';
  }
  
  // General pattern matching
  if (lower.includes('team') || lower.includes('opponent') || lower.includes('date') || lower.includes('competition')) {
    return 'Game Info';
  }
  if (lower.includes('goal') || lower.includes('shot') || lower.includes('attempt') || lower.includes('xg') || lower.includes('conv rate') || lower.includes('conversion rate')) {
    return 'Shooting';
  }
  if (lower.includes('pass') || lower.includes('string') || lower.includes('lpc') || lower.includes('zone')) {
    return 'Passing';
  }
  if (lower.includes('possession') || lower.includes('poss')) {
    return 'Possession';
  }
  if (lower.includes('corner') || lower.includes('free kick') || lower.includes('freekick')) {
    return 'Set Pieces';
  }
  
  return 'Other';
};

export const UploadGameDataView: React.FC<UploadGameDataViewProps> = ({ columnKeys, matchData, sheetConfig, teamSlugMap }) => {
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // JOGA colors for category headers (rotating pattern - matches Glossary)
  const categoryHeaderColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.pinkFoam, JOGA_COLORS.valorBlue];
  
  const getCategoryHeaderColor = (index: number): string => {
    return categoryHeaderColors[index % categoryHeaderColors.length];
  };

  // Get available teams from database (for dropdown)
  // Also get teams from match data as fallback
  const availableTeams = useMemo(() => {
    // Get all active database teams
    const dbTeams = Array.from(teamSlugMap.values())
      .filter(team => team.isActive)
      .map(team => ({
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
    return Array.from(teams).map(slug => ({ slug, displayName: slug })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [matchData, columnKeys, teamSlugMap]);

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
          const categoryOrder = ['Game Info', 'Shooting', 'Passing', 'Possession', 'Set Pieces', 'Other'];
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    try {
      // Append the row to Google Sheets
      await appendRowToSheet(sheetConfig, columnKeys, formData);
      
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
      maxWidth="6xl"
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
            {Object.entries(formFields).map(([category, fields], categoryIndex) => {
              const categoryColor = getCategoryHeaderColor(categoryIndex);
              const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';
              
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map(field => {
                      const fieldName = field.name;
                      const inputType = getInputType(fieldName);
                      const value = formData[fieldName] ?? '';
                      const error = errors[fieldName];
                      const isRequired = fieldName.toLowerCase().includes('team') || 
                                        fieldName.toLowerCase().includes('opponent') || 
                                        fieldName.toLowerCase().includes('date');

                      return (
                        <div key={fieldName} className="flex flex-col">
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
                              required={isRequired}
                            />
                          )}
                          {error && (
                            <span className="text-red-500 text-xs mt-1">{error}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
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

