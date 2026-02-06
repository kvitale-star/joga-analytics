import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Match, getMatchById, getMatches, updateMatch, MatchFilters } from '../services/matchService';
import { getAllTeams } from '../services/teamService';
import { getAllSeasons } from '../services/seasonService';
import { Team, Season } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { dateToYYYYMMDD } from '../utils/dateFormatting';
import { PageLayout } from './PageLayout';

export const MatchEditorView: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter state
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Results and selection
  const [searchResults, setSearchResults] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Edit form state
  const [editedTeamId, setEditedTeamId] = useState<string>('');
  const [editedOpponentName, setEditedOpponentName] = useState<string>('');
  const [editedMatchDate, setEditedMatchDate] = useState<string>('');
  const [editedCompetitionType, setEditedCompetitionType] = useState<string>('');
  const [editedResult, setEditedResult] = useState<string>('');
  const [editedIsHome, setEditedIsHome] = useState<string>('');
  const [editedVenue, setEditedVenue] = useState<string>('');
  const [editedReferee, setEditedReferee] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load teams and seasons
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allTeams, allSeasons] = await Promise.all([
          getAllTeams(),
          getAllSeasons(),
        ]);
        setTeams(allTeams);
        setSeasons(allSeasons);
        
        // Set active season as default
        const activeSeason = allSeasons.find(s => s.isActive) || allSeasons[0];
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  // Filter teams by season
  const filteredTeams = useMemo(() => {
    if (!selectedSeasonId) return [];
    return teams.filter(team => team.seasonId === selectedSeasonId);
  }, [teams, selectedSeasonId]);

  // Get unique opponents from search results
  const availableOpponents = useMemo(() => {
    const opponents = new Set<string>();
    searchResults.forEach(match => {
      if (match.opponentName) {
        opponents.add(match.opponentName);
      }
    });
    return Array.from(opponents).sort();
  }, [searchResults]);

  // Auto-filter matches when filters change
  useEffect(() => {
    const filterMatches = async () => {
      // Season is required
      if (!selectedSeasonId) {
        setSearchResults([]);
        setSelectedMatch(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const filters: MatchFilters = {};
        
        if (selectedTeamId) {
          filters.teamId = parseInt(selectedTeamId);
        }
        
        if (opponentName.trim()) {
          filters.opponentName = opponentName.trim();
        }
        
        if (startDate) {
          filters.startDate = startDate;
        }
        
        if (endDate) {
          filters.endDate = endDate;
        } else if (startDate) {
          // If only start date is provided, use it as end date too
          filters.endDate = startDate;
        }
        
        const matches = await getMatches(filters);
        
        // Filter by season (teams must match selected season)
        const seasonFilteredMatches = matches.filter(match => {
          if (!match.teamId) return true; // Include matches without teams
          const matchTeam = teams.find(t => t.id === match.teamId);
          return matchTeam?.seasonId === selectedSeasonId;
        });
        
        setSearchResults(seasonFilteredMatches);
        
        // Reset to page 1 when search results change
        setCurrentPage(1);
        
        // If only one match, auto-select it
        if (seasonFilteredMatches.length === 1) {
          setSelectedMatch(seasonFilteredMatches[0]);
        } else {
          setSelectedMatch(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load matches');
        setSearchResults([]);
        setSelectedMatch(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the filter to avoid too many API calls
    const timeoutId = setTimeout(filterMatches, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedSeasonId, selectedTeamId, opponentName, startDate, endDate, teams]);

  // Calculate pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResults = selectedMatch 
    ? [selectedMatch] // Show only selected match when one is selected
    : searchResults.slice(startIndex, endIndex); // Show paginated results

  // Helper function to parse date string without timezone conversion
  const parseDateString = (dateStr: string): string => {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // If it's a Date object string or ISO string, parse it carefully
    // Extract just the date part (YYYY-MM-DD) from ISO strings
    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    // Fallback: try to parse as Date and use local date methods
    try {
      const date = new Date(dateStr);
      return dateToYYYYMMDD(date);
    } catch {
      return '';
    }
  };

  // Reset form when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      setEditedTeamId(selectedMatch.teamId?.toString() || '');
      setEditedOpponentName(selectedMatch.opponentName || '');
      // Parse date string directly without timezone conversion
      setEditedMatchDate(selectedMatch.matchDate ? parseDateString(selectedMatch.matchDate) : '');
      setEditedCompetitionType(selectedMatch.competitionType || '');
      setEditedResult(selectedMatch.result || '');
      setEditedIsHome(selectedMatch.isHome !== null && selectedMatch.isHome !== undefined ? (selectedMatch.isHome ? 'true' : 'false') : '');
      setEditedVenue(selectedMatch.venue || '');
      setEditedReferee(selectedMatch.referee || '');
      setEditedNotes(selectedMatch.notes || '');
    }
  }, [selectedMatch]);

  const handleSave = async () => {
    if (!selectedMatch) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateMatch(selectedMatch.id, {
        teamId: editedTeamId ? parseInt(editedTeamId) : null,
        opponentName: editedOpponentName.trim(),
        matchDate: editedMatchDate,
        competitionType: editedCompetitionType.trim() || null,
        result: editedResult.trim() || null,
        isHome: editedIsHome === '' ? null : editedIsHome === 'true',
        notes: editedNotes.trim() || null,
        venue: editedVenue.trim() || null,
        referee: editedReferee.trim() || null,
      });
      
      setSuccess('Match updated successfully!');
      
      // Reload the match to get updated data
      const updatedMatch = await getMatchById(selectedMatch.id);
      setSelectedMatch(updatedMatch);
      
      // Update in search results if present
      setSearchResults(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update match');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
  };

  if (!user || user.role !== 'admin') {
    return (
      <PageLayout title="Match Editor" subtitle="Find and edit match information.">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">You must be an admin to access match editing.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Match Editor"
      subtitle="Find and edit match information. Modify any non-computed field in the database."
      maxWidth="7xl"
      contentClassName="-mt-6"
    >
      <>
        {/* Sticky Top Control Bar */}
        <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm -mx-6" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50% - 4rem)', marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="flex flex-wrap items-center gap-3 justify-center">
              {/* Season Selector */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Season *</label>
              <select
                value={selectedSeasonId || ''}
                onChange={(e) => {
                  setSelectedSeasonId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedTeamId(''); // Reset team when season changes
                }}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  selectedSeasonId ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={selectedSeasonId ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
                required
              >
                <option value="">Select season...</option>
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name}{season.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  selectedTeamId ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={selectedTeamId ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
                disabled={!selectedSeasonId}
              >
                <option value="">All Teams</option>
                {filteredTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.displayName || team.slug}
                  </option>
                ))}
              </select>
              </div>

              {/* Opponent Selector */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opponent</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Filter by opponent..."
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  opponentName ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={opponentName ? { borderColor: '#ceff00', width: 'auto', minWidth: '180px' } : { width: 'auto', minWidth: '180px' }}
                list="opponent-suggestions"
              />
              <datalist id="opponent-suggestions">
                {availableOpponents.map(opponent => (
                  <option key={opponent} value={opponent} />
                ))}
              </datalist>
              </div>

              {/* Start Date */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  startDate ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={startDate ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
              />
              </div>

              {/* End Date */}
              <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap text-black ${
                  endDate ? 'border-[#ceff00]' : 'border-gray-300'
                }`}
                style={endDate ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
              />
              </div>
            </div>
          </div>
        </div>

      <div className="space-y-6 mt-6">
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

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading matches...</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Matches Found ({searchResults.length})
              </h3>
              {!selectedMatch && searchResults.length > itemsPerPage && (
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {paginatedResults.map(match => {
                const team = teams.find(t => t.id === match.teamId);
                // Parse date string directly without timezone conversion
                const matchDateStr = match.matchDate ? parseDateString(match.matchDate) : 'N/A';
                const isSelected = selectedMatch?.id === match.id;
                
                return (
                  <div
                    key={match.id}
                    onClick={() => handleSelectMatch(match)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          Match #{match.id}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Team:</span> {team?.displayName || team?.slug || 'No Team'} |{' '}
                          <span className="font-medium">Opponent:</span> {match.opponentName} |{' '}
                          <span className="font-medium">Date:</span> {matchDateStr}
                        </div>
                        {match.competitionType && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Competition:</span> {match.competitionType}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-4 text-sm font-medium text-black">
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {!selectedMatch && searchResults.length > itemsPerPage && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-lg text-sm ${
                          currentPage === pageNum
                            ? 'bg-[#ceff00] border-[#ceff00] text-black font-medium'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && selectedSeasonId && searchResults.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No matches found matching your criteria.</p>
          </div>
        )}

        {/* Edit Form */}
        {selectedMatch && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Edit Match #{selectedMatch.id}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team *
                </label>
                <select
                  value={editedTeamId}
                  onChange={(e) => setEditedTeamId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">No Team</option>
                  {filteredTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.displayName || team.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opponent Name *
                </label>
                <input
                  type="text"
                  value={editedOpponentName}
                  onChange={(e) => setEditedOpponentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Match Date *
                </label>
                <input
                  type="date"
                  value={editedMatchDate}
                  onChange={(e) => setEditedMatchDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competition Type
                </label>
                <input
                  type="text"
                  value={editedCompetitionType}
                  onChange={(e) => setEditedCompetitionType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  placeholder="e.g., League, Cup, Friendly"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Result
                </label>
                <input
                  type="text"
                  value={editedResult}
                  onChange={(e) => setEditedResult(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  placeholder="e.g., 2-1, W, L, D"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home/Away
                </label>
                <select
                  value={editedIsHome}
                  onChange={(e) => setEditedIsHome(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">Not Set</option>
                  <option value="true">Home</option>
                  <option value="false">Away</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <input
                  type="text"
                  value={editedVenue}
                  onChange={(e) => setEditedVenue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  placeholder="Venue name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referee
                </label>
                <input
                  type="text"
                  value={editedReferee}
                  onChange={(e) => setEditedReferee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  placeholder="Referee name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  rows={3}
                  placeholder="Additional notes about the match"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editedOpponentName.trim() || !editedMatchDate}
                className="px-4 py-2 rounded-lg text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isSaving || !editedOpponentName.trim() || !editedMatchDate ? '#999' : JOGA_COLORS.voltYellow,
                  border: `2px solid ${isSaving || !editedOpponentName.trim() || !editedMatchDate ? '#999' : JOGA_COLORS.voltYellow}`,
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
      </>
    </PageLayout>
  );
};
