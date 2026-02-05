import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserPreferences, getUserById } from '../services/authService';
import { getAllSeasons } from '../services/seasonService';
import { resetAllChartConfigs } from '../services/chartPreferencesService';
import { JOGA_COLORS } from '../utils/colors';
import type { Season } from '../types/auth';

export const UserPreferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isResettingCharts, setIsResettingCharts] = useState(false);
  const [chartResetSuccess, setChartResetSuccess] = useState(false);
  const [gameDataResetSuccess, setGameDataResetSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setPreferences(user.preferences || {});
    }
  }, [user]);

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const all = await getAllSeasons();
        setSeasons(all);
      } catch {
        // Preferences UI should still function without seasons
        setSeasons([]);
      }
    };
    void loadSeasons();
  }, []);

  const handleChange = (key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!user) {
      setError('You must be logged in to update preferences');
      return;
    }

    setIsLoading(true);

    try {
      await updateUserPreferences(user.id, preferences);
      
      // Refresh user data
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        // Update auth context - we'll need to add a method for this
        // For now, just show success
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">User Preferences</h2>
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Preferences updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preferred Seasons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Seasons (multi-select)
          </label>
          {seasons.length === 0 ? (
            <p className="text-sm text-gray-500">No seasons available.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {seasons
                .slice()
                .sort((a, b) => Number(b.name) - Number(a.name))
                .map((season) => {
                  const year = Number(season.name);
                  const preferred: number[] = Array.isArray(preferences.preferredSeasons)
                    ? preferences.preferredSeasons
                    : [];
                  const checked = preferred.includes(year);
                  return (
                    <label key={season.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...preferred, year]))
                            : preferred.filter((y) => y !== year);
                          handleChange('preferredSeasons', next);
                        }}
                        className="rounded border-gray-300 text-[#6787aa] focus:ring-[#6787aa]"
                        disabled={isLoading}
                      />
                      <span className="text-sm text-gray-700">
                        {season.name}{season.isActive ? ' (Active)' : ''}
                      </span>
                    </label>
                  );
                })}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            If selected, reporting views will prefer showing data from these season year(s).
          </p>
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select
            value={preferences.dateFormat || 'MM/DD/YYYY'}
            onChange={(e) => handleChange('dateFormat', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-black"
          style={{
            backgroundColor: isLoading ? '#9ca3af' : JOGA_COLORS.voltYellow,
            border: `2px solid ${JOGA_COLORS.voltYellow}`,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#b8e600';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
            }
          }}
        >
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      {/* Chart Preferences Reset Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Preferences</h3>
        <p className="text-sm text-gray-600 mb-4">
          Reset all chart configurations to their default settings. This will restore all charts to their original state.
        </p>
        
        {chartResetSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            All chart configurations have been reset to defaults!
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            if (!user) {
              setError('You must be logged in to reset chart preferences');
              return;
            }

            if (!window.confirm('Are you sure you want to reset all chart configurations to their default settings? This action cannot be undone.')) {
              return;
            }

            setIsResettingCharts(true);
            setChartResetSuccess(false);
            setError('');

            try {
              await resetAllChartConfigs(user.id);
              
              // Refresh user data
              const updatedUser = await getUserById(user.id);
              if (updatedUser) {
                setChartResetSuccess(true);
                setTimeout(() => {
                  setChartResetSuccess(false);
                }, 5000);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to reset chart preferences');
            } finally {
              setIsResettingCharts(false);
            }
          }}
          disabled={isResettingCharts || isLoading}
          className="font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-white"
          style={{
            backgroundColor: (isResettingCharts || isLoading) ? '#9ca3af' : '#dc2626',
            border: `2px solid ${(isResettingCharts || isLoading) ? '#9ca3af' : '#dc2626'}`,
          }}
          onMouseEnter={(e) => {
            if (!isResettingCharts && !isLoading) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResettingCharts && !isLoading) {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }
          }}
        >
          {isResettingCharts ? 'Resetting...' : 'Reset All Charts'}
        </button>
      </div>

      {/* Game Data Metrics Reset Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Game Data View</h3>
        <p className="text-sm text-gray-600 mb-4">
          Reset the Game Data dashboard metric selections back to the default set (full-game metrics only; half metrics hidden by default).
        </p>

        {gameDataResetSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Game Data metric selections have been reset to defaults!
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Reset Game Data metric selections to defaults? This will overwrite any custom metric selections you made in the Game Data view.')) {
              return;
            }

            setGameDataResetSuccess(false);
            window.dispatchEvent(new CustomEvent('joga:reset-game-data-metrics'));
            setGameDataResetSuccess(true);
            setTimeout(() => setGameDataResetSuccess(false), 5000);
          }}
          disabled={isLoading}
          className="font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-white"
          style={{
            backgroundColor: isLoading ? '#9ca3af' : JOGA_COLORS.valorBlue,
            border: `2px solid ${isLoading ? '#9ca3af' : JOGA_COLORS.valorBlue}`,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#557799';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
            }
          }}
        >
          Reset Game Data Metrics
        </button>
      </div>
    </div>
  );
};
