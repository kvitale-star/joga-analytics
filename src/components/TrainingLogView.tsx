import React, { useState, useEffect, useMemo } from 'react';
import { JOGA_COLORS } from '../utils/colors';
import {
  getTrainingLogsForTeam,
  getFocusTags,
  createTrainingLog,
  type TrainingLog,
  type TrainingFocusTag,
} from '../services/trainingLogService';
import { getAllTeams } from '../services/teamService';
import { getAllSeasons } from '../services/seasonService';
import { useAuth } from '../contexts/AuthContext';
import { formatDateWithUserPreference } from '../utils/dateFormatting';

interface TrainingLogViewProps {
  teamId?: number;
  preSelectedCategory?: string;
  className?: string;
}

export const TrainingLogView: React.FC<TrainingLogViewProps> = ({
  teamId: propTeamId,
  preSelectedCategory,
  className = '',
}) => {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(propTeamId || null);
  const [allTeams, setAllTeams] = useState<Array<{ id: number; displayName: string; slug: string; seasonId: number | null }>>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [focusTags, setFocusTags] = useState<TrainingFocusTag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, seasonsData] = await Promise.all([
          getAllTeams(),
          getAllSeasons().catch(() => []),
        ]);
        setAllTeams(teamsData);
        const activeSeason = seasonsData.find((s: { isActive: boolean }) => s.isActive) || seasonsData[0];
        setActiveSeasonId(activeSeason?.id ?? null);
        const seasonTeams = activeSeason
          ? teamsData.filter((t: { seasonId: number | null }) => t.seasonId === activeSeason.id)
          : teamsData;
        if (!selectedTeamId && (propTeamId || seasonTeams.length > 0)) {
          setSelectedTeamId(propTeamId || seasonTeams[0].id);
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, propTeamId]);

  const teams = useMemo(() => {
    if (!activeSeasonId) return allTeams;
    return allTeams.filter((t) => t.seasonId === activeSeasonId);
  }, [allTeams, activeSeasonId]);

  useEffect(() => {
    if (selectedTeamId && teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (propTeamId) {
      setSelectedTeamId(propTeamId);
    }
  }, [propTeamId]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getFocusTags(preSelectedCategory);
        setFocusTags(tags);
      } catch {
        setFocusTags([]);
      }
    };
    loadTags();
  }, [preSelectedCategory]);

  useEffect(() => {
    const loadLogs = async () => {
      if (!selectedTeamId) {
        setLogs([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getTrainingLogsForTeam(selectedTeamId, { limit: 50 });
        setLogs(data);
      } catch (error) {
        console.error('Failed to load training logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [selectedTeamId]);

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    const form = e.target as HTMLFormElement;
    const sessionDate = (form.elements.namedItem('sessionDate') as HTMLInputElement).value;
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
    const tagCheckboxes = form.querySelectorAll('input[name="focusTag"]:checked');
    const tagIds = Array.from(tagCheckboxes).map((cb) => parseInt((cb as HTMLInputElement).value));

    if (tagIds.length === 0) {
      alert('Please select at least one focus area.');
      return;
    }

    setSaving(true);
    try {
      await createTrainingLog({
        teamId: selectedTeamId,
        sessionDate,
        sessionType: 'training',
        focusTags: tagIds,
        notes: notes || null,
      });
      const data = await getTrainingLogsForTeam(selectedTeamId, { limit: 50 });
      setLogs(data);
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create training log:', error);
      alert('Failed to add entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tagsByCategory = useMemo(() => {
    const byCat: Record<string, TrainingFocusTag[]> = {};
    focusTags.forEach((t) => {
      if (!byCat[t.category]) byCat[t.category] = [];
      byCat[t.category].push(t);
    });
    return byCat;
  }, [focusTags]);

  if (!user) return null;

  if (!selectedTeamId) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please select a team to view training logs.</p>
          {teams.length > 0 && (
            <select
              value={selectedTeamId ?? ''}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa]"
            >
              <option value="">Select a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.displayName || team.slug}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Training Log</h1>
            <p className="text-sm text-gray-600">Track what your team works on in training</p>
          </div>
          <div className="flex items-center gap-3">
            {teams.length > 1 ? (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.displayName || team.slug}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className={
                showAddForm
                  ? 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors'
                  : 'px-4 py-2 text-sm font-medium text-black rounded transition-colors'
              }
              style={!showAddForm ? {
                backgroundColor: JOGA_COLORS.voltYellow,
                border: `2px solid ${JOGA_COLORS.voltYellow}`,
              } : undefined}
              onMouseEnter={(e) => {
                if (!showAddForm) e.currentTarget.style.backgroundColor = '#b8e600';
              }}
              onMouseLeave={(e) => {
                if (!showAddForm) e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }}
            >
              {showAddForm ? 'Cancel' : 'Add Entry'}
            </button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddEntry}
          className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Log Training Session</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="sessionDate"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Focus Areas</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tagsByCategory).map(([cat, tags]) => (
                  <div key={cat} className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <label key={tag.id} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="focusTag"
                          value={tag.id}
                          defaultChecked={preSelectedCategory === tag.category}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-1 text-sm">{tag.display_name}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Session notes..."
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: saving ? '#9ca3af' : JOGA_COLORS.voltYellow,
                border: `2px solid ${saving ? '#9ca3af' : JOGA_COLORS.voltYellow}`,
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.backgroundColor = '#b8e600';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">No training log entries yet.</p>
          <p className="text-sm text-gray-500">Click &quot;Add Entry&quot; to log a training session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            let tags: string[] = [];
            try {
              const parsed = JSON.parse(log.focus_tags);
              tags = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch {
              tags = [];
            }
            const tagNames = tags
              .map((id) => focusTags.find((t) => t.id === parseInt(id))?.display_name || id)
              .filter(Boolean);

            return (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {formatDateWithUserPreference(new Date(log.session_date))}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">{log.session_type}</span>
                  {tagNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tagNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
