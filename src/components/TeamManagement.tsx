import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../services/userService';
import {
  assignTeamToUser,
  createTeam,
  deactivateTeam,
  getAllTeams,
  getUserTeams,
  removeTeamFromUser,
  updateTeam,
} from '../services/teamService';
import { activateSeason, createSeason, getAllSeasons } from '../services/seasonService';
import type { Season, Team, User } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { generateTeamSlug, normalizeLevel } from '../utils/teamSlug';
import { getAgeGroupOptions } from '../config/levelToAgeGroup';
// import { calculateAgeGroupFromLevel } from '../config/levelToAgeGroup'; // Reserved for Phase 2

type Gender = 'boys' | 'girls';
type Variant = 'volt' | 'valor' | 'black';

export const TeamManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGender, setSelectedGender] = useState<'boys' | 'girls' | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>('slug');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Assignments UI
  const [selectedTeamForAssignments, setSelectedTeamForAssignments] = useState<Team | null>(null);
  const [assignedCoaches, setAssignedCoaches] = useState<User[]>([]);

  const coaches = useMemo(() => users.filter(u => u.role === 'coach' && u.isActive), [users]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (selectedTeamForAssignments) {
      void loadTeamAssignments(selectedTeamForAssignments);
    }
  }, [selectedTeamForAssignments]);

  const loadData = async (preserveSeasonSelection = false) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    // Save current season selection if we need to preserve it
    const currentSeasonId = selectedSeasonId;
    
    try {
      setIsLoading(true);
      setError('');
      const [allTeams, allUsers, allSeasons] = await Promise.all([
        getAllTeams(),
        getAllUsers(),
        getAllSeasons(),
      ]);
      setTeams(allTeams);
      setUsers(allUsers);
      setSeasons(allSeasons);

      if (preserveSeasonSelection && currentSeasonId !== null) {
        // Verify the season still exists, otherwise fall back to active season
        const seasonStillExists = allSeasons.some(s => s.id === currentSeasonId);
        if (seasonStillExists) {
          setSelectedSeasonId(currentSeasonId);
        } else {
          const activeSeason = allSeasons.find(s => s.isActive) || allSeasons[0];
          setSelectedSeasonId(activeSeason ? activeSeason.id : null);
        }
      } else {
        const activeSeason = allSeasons.find(s => s.isActive) || allSeasons[0];
        setSelectedSeasonId(activeSeason ? activeSeason.id : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamAssignments = async (team: Team) => {
    try {
      // Determine which coaches have this team assigned by scanning all coaches
      const assignments = await Promise.all(
        coaches.map(async coach => {
          const coachTeams = await getUserTeams(coach.id);
          return coachTeams.some(t => t.id === team.id) ? coach : null;
        })
      );
      setAssignedCoaches(assignments.filter(Boolean) as User[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team assignments');
    }
  };

  // Get unique levels from teams for dropdown
  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    teams.forEach(team => {
      if (team.level) {
        levels.add(team.level);
      }
    });
    return Array.from(levels).sort((a, b) => {
      // Sort U-levels numerically (U12, U13, U14, etc.)
      const aNum = parseInt(a.replace(/^U/i, ''), 10);
      const bNum = parseInt(b.replace(/^U/i, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }, [teams]);

  const filteredTeams = useMemo(() => {
    let filtered = teams;
    
    // Filter by season
    if (selectedSeasonId) {
      filtered = filtered.filter(t => t.seasonId === selectedSeasonId);
    }
    
    // Filter by gender
    if (selectedGender !== 'all') {
      filtered = filtered.filter(t => t.gender === selectedGender);
    }
    
    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(t => t.level === selectedLevel);
    }
    
    // Sort teams
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | null | undefined;
        let bValue: string | number | null | undefined;
        
        switch (sortColumn) {
          case 'slug':
            aValue = a.slug;
            bValue = b.slug;
            break;
          case 'displayName':
            aValue = a.displayName || '';
            bValue = b.displayName || '';
            break;
          case 'level':
            aValue = a.level || '';
            bValue = b.level || '';
            break;
          case 'ageGroup':
            aValue = a.ageGroup || '';
            bValue = b.ageGroup || '';
            break;
          case 'status':
            aValue = a.isActive ? 'active' : 'inactive';
            bValue = b.isActive ? 'active' : 'inactive';
            break;
          default:
            return 0;
        }
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [teams, selectedSeasonId, selectedGender, selectedLevel, sortColumn, sortDirection]);
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-gray-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-gray-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Reserved for future use if needed
  // const getParentTeam = (team: Team): Team | undefined => {
  //   if (!team.parentTeamId) return undefined;
  //   return teams.find(t => t.id === team.parentTeamId);
  // };

  const getChildTeams = (team: Team): Team[] => {
    return teams.filter(t => t.parentTeamId === team.id);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">You must be an admin to manage teams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create, edit, deactivate teams, and assign coaches.</p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="font-medium py-2 px-4 rounded-lg text-black transition-colors"
          style={{ backgroundColor: JOGA_COLORS.voltYellow, border: `2px solid ${JOGA_COLORS.voltYellow}` }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b8e600';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
          }}
        >
          + Create Team
        </button>
      </div>

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

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Season {filteredTeams.length > 0 && (
                  <span className="text-gray-500 font-normal">({filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''})</span>
                )}
              </label>
              <select
                value={selectedSeasonId ?? ''}
                onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All seasons</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as 'boys' | 'girls' | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All</option>
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All</option>
                {availableLevels.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const yearStr = prompt('Create season year (e.g., 2026):');
                if (!yearStr) return;
                const year = Number(yearStr);
                try {
                  const created = await createSeason(year);
                  setSuccess(`Season ${created.name} created`);
                  setTimeout(() => setSuccess(''), 3000);
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to create season');
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              + Season
            </button>
            <button
              onClick={async () => {
                if (!selectedSeasonId) return;
                try {
                  await activateSeason(selectedSeasonId);
                  setSuccess('Active season updated');
                  setTimeout(() => setSuccess(''), 3000);
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to set active season');
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={!selectedSeasonId}
            >
              Set Active
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading teams...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No teams found</p>
            <p className="text-gray-400 text-sm">
              {selectedSeasonId 
                ? `No teams found for the selected season. Try selecting "All seasons" or create a new team.`
                : 'Create your first team to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('slug')}
                  >
                    <div className="flex items-center">
                      Slug
                      <SortIcon column="slug" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('displayName')}
                  >
                    <div className="flex items-center">
                      Display Name
                      <SortIcon column="displayName" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center">
                      Level
                      <SortIcon column="level" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('ageGroup')}
                  >
                    <div className="flex items-center">
                      Age Group
                      <SortIcon column="ageGroup" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {team.slug}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>{team.displayName}</div>
                      {getChildTeams(team).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {getChildTeams(team).length} child team(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {team.level || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {team.ageGroup || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          team.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setSelectedTeamForAssignments(team)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Assign Coaches
                        </button>
                        {team.isActive && (
                          <button
                            onClick={async () => {
                              if (!confirm('Deactivate this team? It will remain in history but cannot be assigned.')) return;
                              try {
                                await deactivateTeam(team.id);
                                setSuccess('Team deactivated');
                                setTimeout(() => setSuccess(''), 3000);
                                await loadData();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to deactivate team');
                              }
                            }}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateTeam && (
        <TeamModal
          title="Create Team"
          seasons={seasons}
          teams={teams}
          onClose={() => setShowCreateTeam(false)}
          onSave={async (payload) => {
            const created = await createTeam(payload);
            setSuccess(`Team created: ${created.slug}`);
            setTimeout(() => setSuccess(''), 3000);
            await loadData(true); // Preserve season selection
            setShowCreateTeam(false);
          }}
        />
      )}

      {editingTeam && (
        <TeamModal
          title="Edit Team"
          seasons={seasons}
          teams={teams}
          initialTeam={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={async (payload) => {
            const updated = await updateTeam(editingTeam.id, payload);
            setSuccess(`Team updated: ${updated.slug}`);
            setTimeout(() => setSuccess(''), 3000);
            await loadData(true); // Preserve season selection
            setEditingTeam(null);
          }}
        />
      )}

      {selectedTeamForAssignments && (
        <AssignmentsModal
          team={selectedTeamForAssignments}
          coaches={coaches}
          assignedCoaches={assignedCoaches}
          onClose={() => setSelectedTeamForAssignments(null)}
          onAssign={async (coachId) => {
            await assignTeamToUser(coachId, selectedTeamForAssignments.id, currentUser.id);
            setSuccess('Coach assigned');
            setTimeout(() => setSuccess(''), 2000);
            await loadTeamAssignments(selectedTeamForAssignments);
          }}
          onRemove={async (coachId) => {
            await removeTeamFromUser(coachId, selectedTeamForAssignments.id);
            setSuccess('Coach removed');
            setTimeout(() => setSuccess(''), 2000);
            await loadTeamAssignments(selectedTeamForAssignments);
          }}
        />
      )}
    </div>
  );
};

const TeamModal: React.FC<{
  title: string;
  seasons: Season[];
  teams: Team[];
  initialTeam?: Team;
  onClose: () => void;
  onSave: (payload: {
    seasonId: number;
    gender: Gender;
    level: string;
    variant?: Variant;
    ageGroup?: string | null;
    displayName?: string;
    metadata?: any;
    parentTeamId?: number | null;
  }) => Promise<void>;
}> = ({ title, seasons, teams = [], initialTeam, onClose, onSave }) => {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [seasonId, setSeasonId] = useState<number>(initialTeam?.seasonId ?? (seasons.find(s => s.isActive)?.id ?? seasons[0]?.id ?? 0));
  const [gender, setGender] = useState<Gender>((initialTeam?.gender as Gender) ?? 'boys');
  const [level, setLevel] = useState<string>(initialTeam?.level ?? 'U13');
  const [variant, setVariant] = useState<Variant>((initialTeam?.variant as Variant) ?? 'volt');
  const [displayName, setDisplayName] = useState<string>(initialTeam?.displayName ?? '');
  const [parentTeamId, setParentTeamId] = useState<number | null>(initialTeam?.parentTeamId ?? null);
  const [ageGroup, setAgeGroup] = useState<string>(initialTeam?.ageGroup ?? '');
  
  const ageGroupOptions = useMemo(() => getAgeGroupOptions(), []);

  const slugPreview = useMemo(() => {
    const selectedSeason = seasons.find(s => s.id === seasonId);
    const seasonYear = selectedSeason?.name;
    return generateTeamSlug({ gender, level: normalizeLevel(level), variant, seasonYear });
  }, [gender, level, variant, seasonId, seasons]);

  const availableParentTeams = useMemo(() => {
    // Safety check: teams might not be loaded yet
    if (!teams || !Array.isArray(teams)) return [];
    
    // Get current season year for comparison
    const currentSeason = seasons.find(s => s.id === seasonId);
    if (!currentSeason) return [];
    const currentSeasonYear = parseInt(currentSeason.name, 10);
    if (isNaN(currentSeasonYear)) return [];
    
    // Filter out:
    // 1. The current team being edited (if editing)
    // 2. Teams from the same season or later seasons (parent must be from EARLIER season)
    // 3. Inactive teams
    return teams.filter(team => {
      if (initialTeam && team.id === initialTeam.id) return false; // Can't be own parent
      if (!team.isActive) return false; // Exclude inactive teams
      
      // Parent must be from an earlier season
      const teamSeason = seasons.find(s => s.id === team.seasonId);
      if (!teamSeason) return false;
      const teamSeasonYear = parseInt(teamSeason.name, 10);
      if (isNaN(teamSeasonYear)) return false;
      
      // Only allow teams from earlier seasons
      return teamSeasonYear < currentSeasonYear;
    });
  }, [teams, seasonId, initialTeam, seasons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await onSave({
        seasonId,
        gender,
        level: normalizeLevel(level),
        variant,
        ageGroup: ageGroup.trim() || null,
        displayName: displayName.trim() ? displayName.trim() : undefined,
        parentTeamId: parentTeamId ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full mx-4">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">Slug preview: <span className="font-mono">{slugPreview}</span></p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                <select
                  value={seasonId}
                  onChange={(e) => setSeasonId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.isActive ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <input
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="U13"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value as Variant)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="volt">Volt</option>
                  <option value="valor">Valor</option>
                  <option value="black">Black</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select age group...</option>
                  {ageGroupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name (optional)</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h4>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Team (optional)
                </label>
                <select
                  value={parentTeamId ?? ''}
                  onChange={(e) => setParentTeamId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
              <option value="">None (no parent)</option>
              {availableParentTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.slug}
                </option>
              ))}
                </select>
                {availableParentTeams.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No eligible parent teams found. Parent teams must be from a different season.
                  </p>
                )}
                {availableParentTeams.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Link this team to a team from a previous season for continuity
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg text-black font-medium"
              style={{ backgroundColor: isSaving ? '#9ca3af' : JOGA_COLORS.voltYellow }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssignmentsModal: React.FC<{
  team: Team;
  coaches: User[];
  assignedCoaches: User[];
  onClose: () => void;
  onAssign: (coachId: number) => Promise<void>;
  onRemove: (coachId: number) => Promise<void>;
}> = ({ team, coaches, assignedCoaches, onClose, onAssign, onRemove }) => {
  const assignedIds = useMemo(() => new Set(assignedCoaches.map(c => c.id)), [assignedCoaches]);
  const available = useMemo(() => coaches.filter(c => !assignedIds.has(c.id)), [coaches, assignedIds]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">Coach Assignments</h3>
            <p className="text-sm text-gray-600 mt-1">
              {team.slug}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Assigned coaches</h4>
            {assignedCoaches.length === 0 ? (
              <p className="text-sm text-gray-500">No coaches assigned.</p>
            ) : (
              <div className="space-y-2">
                {assignedCoaches.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-gray-500">{c.email}</div>
                    </div>
                    <button
                      onClick={() => onRemove(c.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Available coaches</h4>
            {available.length === 0 ? (
              <p className="text-sm text-gray-500">No available coaches.</p>
            ) : (
              <div className="space-y-2">
                {available.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-gray-500">{c.email}</div>
                    </div>
                    <button
                      onClick={() => onAssign(c.id)}
                      className="text-sm font-medium px-3 py-1 rounded text-black"
                      style={{ backgroundColor: JOGA_COLORS.voltYellow }}
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

