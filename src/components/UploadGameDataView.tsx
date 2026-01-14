import React, { useState, useMemo } from 'react';
import { MatchData, SheetConfig } from '../types';
import { appendRowToSheet } from '../services/sheetsService';
import { JOGA_COLORS } from '../utils/colors';
import { UserMenu } from './UserMenu';

interface UploadGameDataViewProps {
  columnKeys: string[];
  matchData: MatchData[];
  sheetConfig: SheetConfig;
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

export const UploadGameDataView: React.FC<UploadGameDataViewProps> = ({ columnKeys, matchData, sheetConfig }) => {
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get available teams from existing data
  const availableTeams = useMemo(() => {
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
    return Array.from(teams).sort();
  }, [matchData, columnKeys]);

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Game Data</h1>
              <p className="text-sm text-gray-600 mt-1">Enter data for a single game</p>
            </div>
            <div className="relative">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
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
            {Object.entries(formFields).map(([category, fields]) => (
              <div key={category} className="mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {category}
                  </h2>
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
                                <option key={team} value={team}>{team}</option>
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
            ))}

            {/* Form Actions */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{
                  backgroundColor: isSubmitting ? '#9ca3af' : JOGA_COLORS.valorBlue,
                  border: `2px solid ${JOGA_COLORS.valorBlue}`,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#557799'; // Darker valor blue
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
                  }
                }}
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
        </div>
      </div>
    </div>
  );
};

