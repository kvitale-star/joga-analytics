import React, { useState, useEffect } from 'react';
import { getCustomCharts, deleteCustomChart } from '../services/customChartsService';
import type { CustomChart } from '../types/customCharts';
import { JOGA_COLORS } from '../utils/colors';

interface CustomChartsManagementProps {
  onEditChart: (chart: CustomChart) => void;
}

export const CustomChartsManagement: React.FC<CustomChartsManagementProps> = ({
  onEditChart,
}) => {
  const [charts, setCharts] = useState<CustomChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedCharts = await getCustomCharts();
      setCharts(loadedCharts);
    } catch (err: any) {
      setError(err.message || 'Failed to load custom charts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chartId: number, chartName: string) => {
    if (!confirm(`Are you sure you want to delete "${chartName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(chartId);
      await deleteCustomChart(chartId);
      setCharts(charts.filter(c => c.id !== chartId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete chart');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Charts</h2>
        <p className="text-gray-600">Loading charts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Charts</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Custom Charts</h2>
        <button
          onClick={() => onEditChart(null as any)}
          className="px-4 py-2 font-medium rounded-lg transition-colors text-black"
          style={{
            backgroundColor: JOGA_COLORS.voltYellow,
            border: `2px solid ${JOGA_COLORS.voltYellow}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b8e600';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
          }}
        >
          Create Custom Chart
        </button>
      </div>

      {charts.length === 0 ? (
        <p className="text-gray-600">You haven't created any custom charts yet.</p>
      ) : (
        <div className="space-y-4">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {chart.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Type: {chart.chartType}</span>
                    <span>
                      Created: {new Date(chart.createdAt).toLocaleDateString()}
                    </span>
                    {chart.updatedAt !== chart.createdAt && (
                      <span>
                        Updated: {new Date(chart.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEditChart(chart)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(chart.id, chart.name)}
                    disabled={deletingId === chart.id}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === chart.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
