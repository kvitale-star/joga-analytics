import React from 'react';
import { MatchData } from '../types';

interface MatchSelectorProps {
  matches: MatchData[];
  selectedMatch: MatchData | null;
  onSelectMatch: (match: MatchData) => void;
  labelKey: string;
}

export const MatchSelector: React.FC<MatchSelectorProps> = ({
  matches,
  selectedMatch,
  onSelectMatch,
  labelKey,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Match
      </label>
      <select
        value={selectedMatch ? matches.indexOf(selectedMatch) : ''}
        onChange={(e) => {
          const index = parseInt(e.target.value);
          if (index >= 0 && index < matches.length) {
            onSelectMatch(matches[index]);
          }
        }}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">All Matches</option>
        {matches.map((match, index) => (
          <option key={index} value={index}>
            {match[labelKey] || `Match ${index + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
};








