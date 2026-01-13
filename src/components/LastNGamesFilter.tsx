import React from 'react';

interface LastNGamesFilterProps {
  lastNGames: number | null;
  onLastNGamesChange: (n: number | null) => void;
  totalGames: number;
}

export const LastNGamesFilter: React.FC<LastNGamesFilterProps> = ({
  lastNGames,
  onLastNGamesChange,
  totalGames,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Recent Games
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">Last</span>
        <input
          type="number"
          min="1"
          max={totalGames}
          value={lastNGames || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              onLastNGamesChange(null);
            } else {
              const num = parseInt(value, 10);
              if (!isNaN(num) && num > 0) {
                onLastNGamesChange(Math.min(num, totalGames));
              }
            }
          }}
          placeholder="All"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
        <span className="text-sm text-gray-600 whitespace-nowrap">games</span>
        {lastNGames && (
          <button
            onClick={() => onLastNGamesChange(null)}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 underline"
            title="Clear filter"
          >
            Clear
          </button>
        )}
      </div>
      {lastNGames && (
        <p className="text-xs text-gray-500 mt-1">
          Showing {lastNGames} of {totalGames} total games
        </p>
      )}
    </div>
  );
};

