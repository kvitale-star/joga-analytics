import React from 'react';
import { Match } from '../services/matchService';
import { Team } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { formatDate } from '../utils/dateFormatting';

interface ExistingMatchModalProps {
  isOpen: boolean;
  match: Match | null;
  teamSlugMap: Map<string, Team>;
  onPreFill: () => void;
  onCancel: () => void;
}

export const ExistingMatchModal: React.FC<ExistingMatchModalProps> = ({
  isOpen,
  match,
  teamSlugMap,
  onPreFill,
  onCancel,
}) => {
  if (!isOpen || !match) return null;

  // Get team name
  const teamName = match.teamId
    ? Array.from(teamSlugMap.values()).find(t => t.id === match.teamId)?.displayName || 
      Array.from(teamSlugMap.values()).find(t => t.id === match.teamId)?.slug || 
      'Unknown Team'
    : 'No Team Selected';

  // Format match date to avoid timezone issues
  // match.matchDate is typically YYYY-MM-DD string, parse it manually
  const formatMatchDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    
    // If it's already in YYYY-MM-DD format, parse it manually to avoid timezone conversion
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parts) {
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // JavaScript months are 0-indexed
        const day = parseInt(parts[3], 10);
        const date = new Date(year, month, day);
        return formatDate(date, 'MM/DD/YYYY');
      }
    }
    
    // Fallback: try to parse as Date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return formatDate(date, 'MM/DD/YYYY');
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return dateStr;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Existing Match Found
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            We found an existing match for this team, opponent, and date:
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Team</div>
                <div className="text-base font-semibold text-gray-900">{teamName}</div>
              </div>
              {match.opponentName && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Opponent</div>
                  <div className="text-base font-semibold text-gray-900">{match.opponentName}</div>
                </div>
              )}
              {match.matchDate && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Match Date</div>
                  <div className="text-base font-semibold text-gray-900">
                    {formatMatchDate(match.matchDate)}
                  </div>
                </div>
              )}
              {match.competitionType && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Competition Type</div>
                  <div className="text-base font-semibold text-gray-900">{match.competitionType}</div>
                </div>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Would you like to pre-fill the form with the existing match data? 
            You can edit any fields before submitting. Submitting will <strong>update</strong> this match.
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Continue Without Pre-fill
          </button>
          <button
            onClick={onPreFill}
            className="px-4 py-2 rounded-md text-black font-medium transition-colors"
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
            Pre-fill Form
          </button>
        </div>
      </div>
    </div>
  );
};
