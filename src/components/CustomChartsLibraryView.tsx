import React, { useState, useEffect } from 'react';
import { getCustomCharts, deleteCustomChart } from '../services/customChartsService';
import type { CustomChart } from '../types/customCharts';
import { CustomChartBuilder } from './CustomChartBuilder';
import { PageLayout } from './PageLayout';
import { JOGA_COLORS } from '../utils/colors';

interface CustomChartsLibraryViewProps {
  sheetConfig: { range: string };
  columnKeys: string[];
  matchData: Array<Record<string, any>>;
}

export const CustomChartsLibraryView: React.FC<CustomChartsLibraryViewProps> = ({
  sheetConfig,
  columnKeys,
  matchData,
}) => {
  const [charts, setCharts] = useState<CustomChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChart, setEditingChart] = useState<CustomChart | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomCharts();
      setCharts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load charts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chartId: number) => {
    if (!confirm('Are you sure you want to delete this chart?')) {
      return;
    }

    try {
      await deleteCustomChart(chartId);
      await loadCharts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete chart');
    }
  };

  const handleEdit = (chart: CustomChart) => {
    setEditingChart(chart);
    setShowBuilder(true);
  };

  const handleCreate = () => {
    setEditingChart(null);
    setShowBuilder(true);
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingChart(null);
    loadCharts();
  };

  if (showBuilder) {
    return (
      <CustomChartBuilder
        chart={editingChart}
        sheetConfig={sheetConfig}
        columnKeys={columnKeys}
        matchData={matchData}
        onClose={handleBuilderClose}
      />
    );
  }

  return (
    <PageLayout
      title="Custom Charts"
      subtitle="Create and manage your custom data visualizations"
    >
      <div className="flex justify-end mb-6">
        <button
          onClick={handleCreate}
          className="font-medium py-2 px-6 rounded-lg transition-colors text-black"
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
          + Create Chart
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading charts...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && charts.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">No custom charts yet</p>
          <button
            onClick={handleCreate}
            className="font-medium py-2 px-6 rounded-lg transition-colors text-black"
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
            Create Your First Chart
          </button>
        </div>
      )}

      {!loading && !error && charts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{chart.name}</h3>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                  {chart.chartType}
                </span>
              </div>
              {chart.description && (
                <p className="text-sm text-gray-600 mb-3">{chart.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(chart)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(chart.id)}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Updated {new Date(chart.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
};
