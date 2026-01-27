import React, { useState, useEffect } from 'react';
import { getAllCustomCharts } from '../services/customChartsService';
import type { CustomChart } from '../types/customCharts';

interface AllCustomChartsManagementProps {
  onEditChart: (chart: CustomChart) => void;
}

export const AllCustomChartsManagement: React.FC<AllCustomChartsManagementProps> = ({
  onEditChart,
}) => {
  const [charts, setCharts] = useState<CustomChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedCharts = await getAllCustomCharts();
      setCharts(loadedCharts);
    } catch (err: any) {
      setError(err.message || 'Failed to load all custom charts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Custom Charts</h2>
        <p className="text-gray-600">Loading charts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Custom Charts</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  // Group charts by user
  const chartsByUser = charts.reduce((acc, chart) => {
    if (!acc[chart.userId]) {
      acc[chart.userId] = [];
    }
    acc[chart.userId].push(chart);
    return acc;
  }, {} as Record<number, CustomChart[]>);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">All Custom Charts</h2>
      <p className="text-sm text-gray-600 mb-4">
        View all custom charts created by all users in the system.
      </p>

      {charts.length === 0 ? (
        <p className="text-gray-600">No custom charts found in the system.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(chartsByUser).map(([userId, userCharts]) => (
            <div key={userId} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                User ID: {userId} ({userCharts.length} chart{userCharts.length !== 1 ? 's' : ''})
              </h3>
              <div className="space-y-3">
                {userCharts.map((chart) => (
                  <div
                    key={chart.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          {chart.name}
                        </h4>
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
                      <button
                        onClick={() => onEditChart(chart)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors ml-4"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
