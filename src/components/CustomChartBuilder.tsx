import React, { useState } from 'react';
import { createCustomChart, updateCustomChart } from '../services/customChartsService';
import type { CustomChart, CustomChartConfig, ChartType, ChartRenderData } from '../types/customCharts';
import { DynamicChartRenderer } from './DynamicChartRenderer';
import { JOGA_COLORS } from '../utils/colors';

interface CustomChartBuilderProps {
  chart: CustomChart | null; // null = create new, otherwise edit existing
  sheetConfig: { range: string }; // Kept for future use (render endpoint) - currently unused
  columnKeys: string[];
  matchData: Array<Record<string, any>>;
  onClose: () => void;
}

export const CustomChartBuilder: React.FC<CustomChartBuilderProps> = ({
  chart,
  sheetConfig: _sheetConfig, // Prefixed with _ to indicate intentionally unused
  columnKeys,
  matchData,
  onClose,
}) => {
  const [name, setName] = useState(chart?.name || '');
  const [description, setDescription] = useState(chart?.description || '');
  const [chartType, setChartType] = useState<ChartType>(chart?.chartType || 'line');
  const [xAxisKey, setXAxisKey] = useState(chart?.config.xAxis.key || 'Date');
  const [xAxisLabel, setXAxisLabel] = useState(chart?.config.xAxis.label || '');
  const [series, setSeries] = useState<Array<{ key: string; label: string; aggregation?: 'none' | 'avg' | 'sum' }>>(
    chart?.config.series || []
  );
  const [filters] = useState<CustomChartConfig['filters']>(chart?.config.filters || {});
  const [groupBy, setGroupBy] = useState<CustomChartConfig['groupBy']>(chart?.config.groupBy);
  const [previewData, setPreviewData] = useState<ChartRenderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Get unique values for filters (kept for future filter UI expansion)
  // const availableTeams = React.useMemo(() => {
  //   const teams = new Set<string>();
  //   matchData.forEach((row) => {
  //     const teamKey = columnKeys.find((k) => k.toLowerCase().includes('team'));
  //     if (teamKey && row[teamKey]) {
  //       teams.add(String(row[teamKey]));
  //     }
  //   });
  //   return Array.from(teams).sort();
  // }, [matchData, columnKeys]);

  // const availableOpponents = React.useMemo(() => {
  //   const opponents = new Set<string>();
  //   matchData.forEach((row) => {
  //     const oppKey = columnKeys.find((k) => k.toLowerCase().includes('opponent'));
  //     if (oppKey && row[oppKey]) {
  //       opponents.add(String(row[oppKey]));
  //     }
  //   });
  //   return Array.from(opponents).sort();
  // }, [matchData, columnKeys]);

  // const availableSeasons = React.useMemo(() => {
  //   const seasons = new Set<number>();
  //   matchData.forEach((row) => {
  //     const seasonKey = columnKeys.find((k) => k.toLowerCase() === 'season');
  //     if (seasonKey && row[seasonKey]) {
  //       const season = typeof row[seasonKey] === 'number' ? row[seasonKey] : parseInt(String(row[seasonKey]), 10);
  //       if (!isNaN(season)) {
  //         seasons.add(season);
  //       }
  //     }
  //   });
  //   return Array.from(seasons).sort((a, b) => b - a);
  // }, [matchData, columnKeys]);

  const numericColumns = React.useMemo(() => {
    return columnKeys.filter((key) => {
      // Check if column has numeric values
      return matchData.some((row) => {
        const value = row[key];
        return typeof value === 'number' && !isNaN(value);
      });
    });
  }, [columnKeys, matchData]);

  const handleAddSeries = () => {
    if (numericColumns.length === 0) return;
    const firstNumeric = numericColumns[0];
    setSeries([...series, { key: firstNumeric, label: firstNumeric }]);
  };

  const handleRemoveSeries = (index: number) => {
    setSeries(series.filter((_, i) => i !== index));
  };

  const handleSeriesChange = (index: number, field: 'key' | 'label' | 'aggregation', value: any) => {
    const newSeries = [...series];
    newSeries[index] = { ...newSeries[index], [field]: value };
    setSeries(newSeries);
  };

  const handlePreview = async () => {
    if (!xAxisKey || series.length === 0) {
      setError('Please select an x-axis and at least one series');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For preview, use local matchData processing (simplified version of backend logic)
      let filtered = [...matchData];

      // Apply filters
      if (filters) {
        if (filters.teams && filters.teams.length > 0) {
          filtered = filtered.filter((row) => {
            const teamValue = row.team || row.Team || row.teamName || '';
            return filters.teams!.some((filterTeam) =>
              teamValue.toString().toLowerCase().includes(filterTeam.toLowerCase())
            );
          });
        }

        if (filters.opponents && filters.opponents.length > 0) {
          filtered = filtered.filter((row) => {
            const oppValue = row.opponent || row.Opponent || row.opponentName || '';
            return filters.opponents!.some((filterOpp) =>
              oppValue.toString().toLowerCase().includes(filterOpp.toLowerCase())
            );
          });
        }

        if (filters.seasons && filters.seasons.length > 0) {
          const seasonKey = columnKeys.find((k) => k.toLowerCase() === 'season');
          if (seasonKey) {
            filtered = filtered.filter((row) => {
              const season = typeof row[seasonKey] === 'number'
                ? row[seasonKey]
                : parseInt(String(row[seasonKey] || '0'), 10);
              return filters.seasons!.includes(season);
            });
          }
        }
      }

      // Group data
      let grouped: Map<string, Array<Record<string, any>>>;
      if (groupBy === 'date') {
        grouped = new Map();
        filtered.forEach((row) => {
          const date = row[xAxisKey];
          const key = date ? new Date(date).toISOString().split('T')[0] : 'unknown';
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(row);
        });
      } else {
        grouped = new Map();
        filtered.forEach((row, index) => {
          grouped.set(`point_${index}`, [row]);
        });
      }

      // Build series data
      const chartSeries = series.map((seriesConfig) => {
        const data: Array<{ x: any; y: number | null }> = [];

        grouped.forEach((rows, groupKey) => {
          let xValue: any;
          if (groupBy === 'date') {
            xValue = groupKey;
          } else {
            xValue = rows[0]?.[xAxisKey] || groupKey;
          }

          let yValue: number | null = null;

          if (rows.length === 1) {
            const rawValue = rows[0]?.[seriesConfig.key];
            yValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || null;
          } else {
            const values = rows
              .map((row) => {
                const raw = row[seriesConfig.key];
                return typeof raw === 'number' ? raw : parseFloat(String(raw)) || null;
              })
              .filter((v): v is number => v !== null);

            if (values.length > 0) {
              const agg = seriesConfig.aggregation || 'avg';
              if (agg === 'avg') {
                yValue = values.reduce((a, b) => a + b, 0) / values.length;
              } else if (agg === 'sum') {
                yValue = values.reduce((a, b) => a + b, 0);
              } else {
                yValue = values[0];
              }
            }
          }

          data.push({ x: xValue, y: yValue });
        });

        return {
          key: seriesConfig.key,
          label: seriesConfig.label,
          data: data.sort((a, b) => {
            if (typeof a.x === 'string' && typeof b.x === 'string') {
              return a.x.localeCompare(b.x);
            }
            if (typeof a.x === 'number' && typeof b.x === 'number') {
              return a.x - b.x;
            }
            return 0;
          }),
        };
      });

      setPreviewData({
        xKey: xAxisKey,
        xLabel: xAxisLabel || xAxisKey,
        series: chartSeries,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to preview chart');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Chart name is required');
      return;
    }
    if (!xAxisKey || series.length === 0) {
      setError('Please select an x-axis and at least one series');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const config: CustomChartConfig = {
        xAxis: { key: xAxisKey, label: xAxisLabel || xAxisKey },
        series,
        filters,
        groupBy,
      };

      if (chart) {
        await updateCustomChart(chart.id, {
          name,
          description: description || undefined,
          chartType,
          config,
        });
      } else {
        await createCustomChart({
          name,
          description: description || undefined,
          chartType,
          config,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save chart');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    // Always show confirmation dialog (like walkthrough does)
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowCancelConfirm(false);
  };

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 relative">
      {/* Header with joga yellow background - matching tutorial style, edge-to-edge */}
      <header 
        className="border-b border-gray-200 px-6 py-4 flex-shrink-0 rounded-t-lg"
        style={{ backgroundColor: JOGA_COLORS.voltYellow }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {chart ? 'Edit Chart' : 'Create Custom Chart'}
            </h1>
            {chart ? (
              <p className="text-sm text-gray-700 mt-1">Update your custom chart configuration</p>
            ) : (
              <p className="text-sm text-gray-700 mt-1">Build a custom visualization from your match data</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancelClick}
            className="p-2 rounded-lg transition-colors text-gray-900 hover:bg-white/90"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Confirmation Dialog - matching walkthrough pattern */}
      {showCancelConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Changes?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel? Any unsaved changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-lg font-medium text-black transition-colors"
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
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Chart Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Custom Chart"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type *
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="line">Line</option>
                  <option value="bar">Bar</option>
                  <option value="area">Area</option>
                  <option value="scatter">Scatter</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">X-Axis</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column *
                </label>
                <select
                  value={xAxisKey}
                  onChange={(e) => setXAxisKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {columnKeys.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={xAxisLabel}
                  onChange={(e) => setXAxisLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={xAxisKey}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Series (Y-Axis)</h2>
              <button
                onClick={handleAddSeries}
                className="px-3 py-1 text-sm font-medium rounded transition-colors text-black"
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
                + Add Series
              </button>
            </div>
            {series.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">Add at least one series to display data</p>
            )}
            <div className="space-y-3">
              {series.map((s, index) => (
                <div key={index} className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">Series {index + 1}</span>
                    <button
                      onClick={() => handleRemoveSeries(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Column *</label>
                      <select
                        value={s.key}
                        onChange={(e) => handleSeriesChange(index, 'key', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        {numericColumns.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Label *</label>
                      <input
                        type="text"
                        value={s.label}
                        onChange={(e) => handleSeriesChange(index, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder={s.key}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Aggregation</label>
                      <select
                        value={s.aggregation || 'none'}
                        onChange={(e) => handleSeriesChange(index, 'aggregation', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">None</option>
                        <option value="avg">Average</option>
                        <option value="sum">Sum</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Filters (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy || 'match'}
                  onChange={(e) => setGroupBy(e.target.value as CustomChartConfig['groupBy'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="match">Match</option>
                  <option value="date">Date</option>
                  <option value="team">Team</option>
                </select>
              </div>
              {/* Add more filter UI here if needed */}
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          {previewData ? (
            <DynamicChartRenderer chartType={chartType} data={previewData} height={500} />
          ) : (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Click "Preview" to see your chart</p>
            </div>
          )}
          
          {/* Preview and Create Chart buttons under preview */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handlePreview}
              disabled={loading || !xAxisKey || series.length === 0}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !xAxisKey || series.length === 0}
              className="flex-1 px-4 py-2 font-medium rounded-lg transition-colors text-black disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: saving || !name.trim() || !xAxisKey || series.length === 0 
                  ? '#d1d5db' 
                  : JOGA_COLORS.voltYellow,
                border: `2px solid ${saving || !name.trim() || !xAxisKey || series.length === 0 
                  ? '#d1d5db' 
                  : JOGA_COLORS.voltYellow}`,
              }}
              onMouseEnter={(e) => {
                if (!saving && name.trim() && xAxisKey && series.length > 0) {
                  e.currentTarget.style.backgroundColor = '#b8e600';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving && name.trim() && xAxisKey && series.length > 0) {
                  e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                }
              }}
            >
              {saving ? 'Saving...' : chart ? 'Update Chart' : 'Create Chart'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
