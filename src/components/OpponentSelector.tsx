import React from 'react';

interface OpponentSelectorProps {
  opponents: string[];
  selectedOpponent: string | null;
  onSelectOpponent: (opponent: string | null) => void;
}

export const OpponentSelector: React.FC<OpponentSelectorProps> = ({
  opponents,
  selectedOpponent,
  onSelectOpponent,
}) => {
  if (opponents.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Opponent (Optional)
      </label>
      <select
        value={selectedOpponent || ''}
        onChange={(e) => {
          onSelectOpponent(e.target.value || null);
        }}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">All Opponents</option>
        {opponents.map((opponent) => (
          <option key={opponent} value={opponent}>
            {opponent}
          </option>
        ))}
      </select>
    </div>
  );
};








