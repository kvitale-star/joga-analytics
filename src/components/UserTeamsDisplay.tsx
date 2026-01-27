import React, { useState, useEffect } from 'react';
import { getUserTeams } from '../services/teamService';
import type { Team } from '../types/auth';

interface UserTeamsDisplayProps {
  userId: number;
}

export const UserTeamsDisplay: React.FC<UserTeamsDisplayProps> = ({ userId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const userTeams = await getUserTeams(userId);
        setTeams(userTeams);
      } catch (err: any) {
        setError(err.message || 'Failed to load teams');
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Access</h2>
        <p className="text-gray-600">Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Access</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Access</h2>
      {teams.length === 0 ? (
        <p className="text-gray-600">No teams assigned.</p>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p className="font-medium text-gray-900">{team.displayName}</p>
                {team.metadata && (
                  <p className="text-sm text-gray-500 mt-1">
                    {team.metadata.gender && `${team.metadata.gender} • `}
                    {team.metadata.level && `${team.metadata.level} • `}
                    {team.metadata.variant && team.metadata.variant}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  team.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {team.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
