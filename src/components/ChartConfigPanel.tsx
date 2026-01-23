import React, { useState, useEffect } from 'react';
import { ChartConfig } from '../types/chartConfig';
import { JOGA_COLORS } from '../utils/colors';

interface ChartConfigPanelProps {
  chartType: 'shots' | 'possession' | 'goals' | 'xg' | 'conversionRate' | 'tsr' | 'passes' | 'passShare' | 'avgPassLength' | 'ppm' | 'passStrLength' | 'spi' | 'attempts' | 'miscStats' | 'positionalAttempts' | 'passByZone' | 'auto';
  config: ChartConfig;
  availableMetrics: {
    id: string;
    label: string;
    required?: boolean;
  }[];
  onConfigChange: (config: ChartConfig) => void;
  onSave: () => void;
  onReset: () => void;
  hideOpponentToggle?: boolean; // Optional prop to hide opponent toggle for charts that don't support it
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  config,
  availableMetrics,
  onConfigChange,
  onSave,
  onReset,
  hideOpponentToggle = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<ChartConfig>(config);

  // Sync localConfig when config prop changes (e.g., after reset)
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleMetricToggle = (metricId: string) => {
    const isRequired = availableMetrics.find(m => m.id === metricId)?.required;
    if (isRequired) return; // Can't toggle required metrics

    const newVisibleMetrics = localConfig.visibleMetrics.includes(metricId)
      ? localConfig.visibleMetrics.filter(id => id !== metricId)
      : [...localConfig.visibleMetrics, metricId];

    const newConfig = {
      ...localConfig,
      visibleMetrics: newVisibleMetrics,
    };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleOpponentToggle = () => {
    const newConfig = {
      ...localConfig,
      includeOpponent: !localConfig.includeOpponent,
    };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSave = () => {
    onSave();
    setIsOpen(false);
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Gear Icon Button - shown on parent hover */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        title="Configure chart"
        aria-label="Configure chart"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Configuration Panel */}
      {isOpen && (
        <div className="absolute top-10 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Chart Configuration</h4>

          {/* Metrics Section */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Visible Metrics
            </label>
            <div className="space-y-2">
              {availableMetrics.map((metric) => {
                const isChecked = localConfig.visibleMetrics.includes(metric.id);
                const isRequired = metric.required;

                return (
                  <label
                    key={metric.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleMetricToggle(metric.id)}
                      disabled={isRequired}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className={`text-sm ${isRequired ? 'text-gray-500' : 'text-gray-700'}`}>
                      {metric.label}
                      {isRequired && <span className="text-xs text-gray-400 ml-1">(required)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Opponent Data Toggle */}
          {!hideOpponentToggle && (
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.includeOpponent}
                  onChange={handleOpponentToggle}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include Opponents</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{
                backgroundColor: JOGA_COLORS.valorBlue,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5a7a9a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
              }}
            >
              Save
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close panel when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
