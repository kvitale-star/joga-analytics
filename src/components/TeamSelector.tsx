import React from 'react';

interface TeamSelectorProps {
  teams: string[];
  selectedTeam: string | null;
  onSelectTeam: (team: string | null) => void;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeam,
  onSelectTeam,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Team
      </label>
      <select
        value={selectedTeam || ''}
        onChange={(e) => {
          const value = e.target.value;
          onSelectTeam(value === '' ? null : value);
        }}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Select a team...</option>
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
  );
};


