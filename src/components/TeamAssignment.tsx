import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../services/userService';
import { getAllTeams, getUserTeams, assignTeamToUser, removeTeamFromUser } from '../services/teamService';
import { User } from '../types/auth';
import { Team } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';

export const TeamAssignment: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserTeams();
    }
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allUsers, allTeams] = await Promise.all([
        getAllUsers(),
        getAllTeams(),
      ]);
      setUsers(allUsers);
      setTeams(allTeams);
      if (allUsers.length > 0 && !selectedUser) {
        setSelectedUser(allUsers[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTeams = async () => {
    if (!selectedUser) return;

    try {
      const assignedTeams = await getUserTeams(selectedUser.id);
      setUserTeams(assignedTeams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user teams');
    }
  };

  const handleAssignTeam = async (teamId: number) => {
    if (!selectedUser || !currentUser) return;

    try {
      await assignTeamToUser(selectedUser.id, teamId, currentUser.id);
      setSuccess(`Team assigned to ${selectedUser.name}`);
      await loadUserTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign team');
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!selectedUser) return;

    if (!confirm('Are you sure you want to remove this team assignment?')) {
      return;
    }

    try {
      await removeTeamFromUser(selectedUser.id, teamId);
      setSuccess(`Team removed from ${selectedUser.name}`);
      await loadUserTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team');
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">You must be an admin to access team assignments.</p>
      </div>
    );
  }

  const assignedTeamIds = new Set(userTeams.map(t => t.id));
  const availableTeams = teams.filter(t => !assignedTeamIds.has(t.id) && t.isActive);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Team Assignments</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Select User</h3>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === parseInt(e.target.value));
                setSelectedUser(user || null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Teams */}
          {selectedUser && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Teams Assigned to {selectedUser.name}
              </h3>
              {userTeams.length === 0 ? (
                <p className="text-gray-500 text-sm">No teams assigned</p>
              ) : (
                <div className="space-y-2">
                  {userTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{team.displayName}</p>
                        {team.metadata.age_group && (
                          <p className="text-sm text-gray-500">
                            {team.metadata.age_group}
                            {team.metadata.gender && ` • ${team.metadata.gender}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTeam(team.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Teams */}
          {selectedUser && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Available Teams</h3>
              {availableTeams.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {userTeams.length > 0
                    ? 'All active teams are already assigned to this user'
                    : 'No active teams available'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{team.displayName}</p>
                        {team.metadata.age_group && (
                          <p className="text-sm text-gray-500">
                            {team.metadata.age_group}
                            {team.metadata.gender && ` • ${team.metadata.gender}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssignTeam(team.id)}
                        className="text-sm font-medium px-3 py-1 rounded text-black"
                        style={{
                          backgroundColor: JOGA_COLORS.voltYellow,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#b8e600';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
