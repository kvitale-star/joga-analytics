import React from 'react';
import { PreviewMatchStatsResponse } from '../services/matchService';
import { Team } from '../types/auth';
import { normalizeFieldName } from '../utils/fieldDeduplication';
import { JOGA_COLORS } from '../utils/colors';
import { formatDateStringLocale } from '../utils/dateFormatting';

interface MatchConfirmationModalProps {
  isOpen: boolean;
  previewData: PreviewMatchStatsResponse | null;
  teamSlugMap: Map<string, Team>;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isUpdating?: boolean;
}

export const MatchConfirmationModal: React.FC<MatchConfirmationModalProps> = ({
  isOpen,
  previewData,
  teamSlugMap,
  onConfirm,
  onCancel,
  isSubmitting = false,
  isUpdating = false,
}) => {
  if (!isOpen || !previewData) return null;

  const { gameInfo, rawStats } = previewData;

  // Get team name
  const teamName = gameInfo.teamId
    ? Array.from(teamSlugMap.values()).find(t => t.id === gameInfo.teamId)?.displayName || 
      Array.from(teamSlugMap.values()).find(t => t.id === gameInfo.teamId)?.slug || 
      'Unknown Team'
    : 'No Team Selected';

  // Group raw stats by category
  const gameInfoFields: Record<string, any> = {};
  const basicStats1st: Record<string, any> = {};
  const basicStats2nd: Record<string, any> = {};
  const passStrings: Record<string, any> = {};
  const shots: Record<string, any> = {};
  const other: Record<string, any> = {};

  const categorizeField = (fieldName: string): string => {
    const lower = fieldName.toLowerCase();
    
    if (lower.includes('team') || lower.includes('opponent') || lower.includes('date') || 
        lower.includes('competition') || lower.includes('result') || 
        lower.includes('home/away') || lower.includes('home away') ||
        lower.includes('venue') || lower.includes('referee') || lower.includes('notes')) {
      return 'gameInfo';
    }
    
    if (lower.includes('1st half') || lower.includes('1st') || lower.includes('first')) {
      if (lower.includes('pass string')) return 'passStrings';
      if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
          lower.includes('opp conv rate') || lower.includes('xg') ||
          lower.includes('% attempts')) return 'shots';
      return 'basicStats1st';
    }
    
    if (lower.includes('2nd half') || lower.includes('2nd') || lower.includes('second')) {
      if (lower.includes('pass string')) return 'passStrings';
      if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
          lower.includes('opp conv rate') || lower.includes('xg') ||
          lower.includes('% attempts')) return 'shots';
      return 'basicStats2nd';
    }
    
    if (lower.includes('pass string')) return 'passStrings';
    if (lower.includes('inside box conv rate') || lower.includes('outside box conv rate') || 
        lower.includes('opp conv rate') || lower.includes('xg') ||
        lower.includes('% attempts')) return 'shots';
    
    return 'other';
  };

  Object.entries(rawStats).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    
    const category = categorizeField(key);
    switch (category) {
      case 'gameInfo':
        gameInfoFields[key] = value;
        break;
      case 'basicStats1st':
        basicStats1st[key] = value;
        break;
      case 'basicStats2nd':
        basicStats2nd[key] = value;
        break;
      case 'passStrings':
        passStrings[key] = value;
        break;
      case 'shots':
        shots[key] = value;
        break;
      default:
        other[key] = value;
    }
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };

  const renderSection = (title: string, data: Record<string, any>) => {
    if (Object.keys(data).length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
              // Format field name nicely using normalizeFieldName
              const formattedKey = normalizeFieldName(key);
              return (
                <div key={key} className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">{formattedKey}</div>
                  <div className="text-base font-semibold text-gray-900">{formatValue(value)}</div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isUpdating ? 'Update Match Data' : 'Confirm Match Data'}
          </h2>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>
        
        <div className="px-6 py-4">
          {isUpdating && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Warning:</strong> This will update an existing match. 
                Fields with values of 0 will keep their existing values (0s act as placeholders).
              </p>
            </div>
          )}
          {/* Game Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
              Game Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-sm font-medium text-gray-600">Team</div>
                <div className="text-base font-semibold text-gray-900">{teamName}</div>
              </div>
              {gameInfo.opponentName && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">Opponent</div>
                  <div className="text-base font-semibold text-gray-900">{gameInfo.opponentName}</div>
                </div>
              )}
              {gameInfo.matchDate && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">Match Date</div>
                  <div className="text-base font-semibold text-gray-900">
                    {formatDateStringLocale(gameInfo.matchDate)}
                  </div>
                </div>
              )}
              {gameInfo.competitionType && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">Competition Type</div>
                  <div className="text-base font-semibold text-gray-900">{gameInfo.competitionType}</div>
                </div>
              )}
              {rawStats['Competition'] && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">Competition</div>
                  <div className="text-base font-semibold text-gray-900">{rawStats['Competition']}</div>
                </div>
              )}
              {gameInfo.result && (
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium text-gray-600">Result</div>
                  <div className="text-base font-semibold text-gray-900">{gameInfo.result}</div>
                </div>
              )}
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-sm font-medium text-gray-600">Home/Away</div>
                <div className="text-base font-semibold text-gray-900">
                  {gameInfo.isHome === true ? 'Home' : gameInfo.isHome === false ? 'Away' : 'Tournament'}
                </div>
              </div>
            </div>
          </div>

          {/* Entered Data */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Entered Data</h2>
            {renderSection('Basic Stats (1st Half)', basicStats1st)}
            {renderSection('Basic Stats (2nd Half)', basicStats2nd)}
            {renderSection('Pass Strings', passStrings)}
            {renderSection('Shots', shots)}
            {renderSection('Other', other)}
          </div>

        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          >
            {isSubmitting ? 'Saving...' : isUpdating ? 'Update Match' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
