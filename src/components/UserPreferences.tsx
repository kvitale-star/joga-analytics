import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserPreferences, getUserById } from '../services/authService';
import { JOGA_COLORS } from '../utils/colors';

export const UserPreferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPreferences(user.preferences || {});
    }
  }, [user]);

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
        {/* Theme Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <select
            value={preferences.theme || 'light'}
            onChange={(e) => handleChange('theme', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        {/* Chart Defaults */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Chart Type
          </label>
          <select
            value={preferences.defaultChartType || 'bar'}
            onChange={(e) => handleChange('defaultChartType', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="combo">Combo Chart</option>
          </select>
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

        {/* Notifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Notifications
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.emailNotifications !== false}
                onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                className="rounded border-gray-300 text-[#6787aa] focus:ring-[#6787aa]"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">Receive email notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.weeklyReports === true}
                onChange={(e) => handleChange('weeklyReports', e.target.checked)}
                className="rounded border-gray-300 text-[#6787aa] focus:ring-[#6787aa]"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">Weekly summary reports</span>
            </label>
          </div>
        </div>

        {/* Custom JSON Editor for Advanced Users */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Advanced: Custom Preferences (JSON)
          </label>
          <textarea
            value={JSON.stringify(preferences, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setPreferences(parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={8}
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Edit JSON directly for advanced customization
          </p>
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
    </div>
  );
};
