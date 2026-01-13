import React from 'react';
import { ChartType, CHART_LABELS } from '../utils/chartGroups';

interface ChartSelectorProps {
  availableCharts: ChartType[];
  selectedCharts: ChartType[];
  onSelectionChange: (charts: ChartType[]) => void;
}

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  availableCharts,
  selectedCharts,
  onSelectionChange,
}) => {
  const handleToggle = (chart: ChartType) => {
    if (selectedCharts.includes(chart)) {
      onSelectionChange(selectedCharts.filter((c) => c !== chart));
    } else {
      onSelectionChange([...selectedCharts, chart]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Charts
      </label>
      <div className="flex flex-wrap gap-2">
        {availableCharts.map((chart) => {
          const isSelected = selectedCharts.includes(chart);
          return (
            <button
              key={chart}
              onClick={() => handleToggle(chart)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CHART_LABELS[chart]}
            </button>
          );
        })}
      </div>
      {selectedCharts.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">No charts selected</p>
      )}
    </div>
  );
};

