import { useState, useRef, useEffect } from 'react';
import { ChartType, CHART_GROUPS, CHART_LABELS } from '../utils/chartGroups';
import type { CustomChart } from '../types/customCharts';
import { JOGA_COLORS } from '../utils/colors';

interface CombinedChartSelectorProps {
  availableCharts: (ChartType | string)[];
  selectedCharts: (ChartType | string)[];
  onSelectionChange: (values: (ChartType | string)[]) => void;
  selectedChartGroup: string | null;
  onGroupChange: (groupId: string | null) => void;
  customCharts: CustomChart[];
  onCreateCustomChart: () => void;
  className?: string;
}

export const CombinedChartSelector: React.FC<CombinedChartSelectorProps> = ({
  availableCharts,
  selectedCharts,
  onSelectionChange,
  selectedChartGroup,
  onGroupChange,
  customCharts,
  onCreateCustomChart,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleChart = (chartValue: ChartType | string) => {
    if (selectedCharts.includes(chartValue)) {
      onSelectionChange(selectedCharts.filter(v => v !== chartValue));
      onGroupChange(null); // Clear group selection when manually selecting charts
    } else {
      onSelectionChange([...selectedCharts, chartValue]);
      onGroupChange(null);
    }
  };

  const selectGroup = (groupId: string) => {
    const group = CHART_GROUPS.find(g => g.id === groupId);
    if (group) {
      const chartsToSelect = group.charts.filter(chart => 
        availableCharts.includes(chart)
      );
      if (chartsToSelect.length > 0) {
        onSelectionChange(chartsToSelect);
        onGroupChange(groupId);
      }
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
    onGroupChange(null);
  };

  // Get custom charts that are available
  const availableCustomCharts = customCharts.filter(chart => 
    availableCharts.includes(`custom-chart-${chart.id}`)
  );

  // Build display text
  const displayText = selectedCharts.length > 0
    ? `${selectedCharts.length} chart${selectedCharts.length !== 1 ? 's' : ''} selected`
    : 'Select charts...';

  // Get all individual charts (excluding custom charts, auto charts, and removed charts)
  const individualCharts = availableCharts.filter(chart => {
    if (typeof chart === 'string' && chart.startsWith('custom-chart-')) {
      return false;
    }
    if (chart === 'auto') {
      return false;
    }
    // Remove 'goals', 'attempts', 'passShare', and 'passingSPI' charts from individual charts section
    if (chart === 'goals' || chart === 'attempts' || chart === 'passShare' || chart === 'passingSPI') {
      return false;
    }
    return true;
  }) as ChartType[];

  return (
    <div className={`relative z-[200] ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full pl-3 pr-2 py-1.5 text-sm rounded-lg bg-white border-2 focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-left flex items-center justify-between ${
          selectedCharts.length > 0 ? 'border-[#ceff00]' : 'border-gray-300'
        } ${className}`}
        style={selectedCharts.length > 0 ? { borderColor: '#ceff00' } : {}}
      >
        <span className={selectedCharts.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {displayText}
        </span>
        <svg
          className={`w-4 h-4 text-gray-900 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-[200] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
          style={{ 
            width: '400px', // Reduced by 20% from 500px
            maxHeight: '600px', // Taller to show more without scrolling
            overflowY: 'auto'
          }}
        >
          {/* Chart Groups Section */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Chart Groups</h3>
          </div>
          <div className="py-1">
            {(() => {
              // Define the desired order: Dashboard > All Charts > JOGA Metrics > Shooting > Passing & Possession > Defense
              const groupOrder = ['dashboard', 'all', 'performance', 'shooting', 'passing-possession', 'defense'];
              
              // Sort groups according to the desired order
              const sortedGroups = [...CHART_GROUPS].sort((a, b) => {
                const indexA = groupOrder.indexOf(a.id);
                const indexB = groupOrder.indexOf(b.id);
                // If not found in order, put at end
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
              });

              return sortedGroups.map((group) => {
                const isGroupSelected = selectedChartGroup === group.id;
                const groupChartsAvailable = group.charts.filter(chart => 
                  availableCharts.includes(chart)
                );
                
                if (groupChartsAvailable.length === 0) return null;

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      if (isGroupSelected) {
                        clearSelection();
                      } else {
                        selectGroup(group.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between ${
                      isGroupSelected ? 'bg-blue-50 border-l-4 border-[#6787aa]' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      <div className="text-xs text-gray-500">{group.description}</div>
                    </div>
                    {isGroupSelected && (
                      <svg className="w-4 h-4 text-[#6787aa] ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              });
            })()}
          </div>

          {/* Individual Charts Section */}
          {individualCharts.length > 0 && (
            <>
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 border-t border-gray-200 sticky top-0 z-10">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Individual Charts</h3>
              </div>
              <div className="py-1">
                {individualCharts.map((chart) => {
                  const chartType = chart as ChartType;
                  const isSelected = selectedCharts.includes(chart);
                  const label = CHART_LABELS[chartType];

                  return (
                    <label
                      key={chartType}
                      className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChart(chartType)}
                        className="mr-3 h-4 w-4 text-[#6787aa] focus:ring-[#6787aa] border-gray-300 rounded flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {/* Custom Charts Section */}
          {availableCustomCharts.length > 0 && (
            <>
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 border-t border-gray-200 sticky top-0 z-10">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Custom Charts</h3>
              </div>
              <div className="py-1">
                {availableCustomCharts.map((chart) => {
                  const chartValue = `custom-chart-${chart.id}`;
                  const isSelected = selectedCharts.includes(chartValue);

                  return (
                    <label
                      key={chart.id}
                      className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChart(chartValue)}
                        className="mr-3 h-4 w-4 text-[#6787aa] focus:ring-[#6787aa] border-gray-300 rounded flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700">{chart.name}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {/* Create Custom Chart Action */}
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={() => {
              onCreateCustomChart();
              setIsOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
            style={{
              color: JOGA_COLORS.voltYellow ? '#000' : undefined,
            }}
          >
            <span className="mr-2 font-bold">+</span>
            <span>Create Custom Chart</span>
          </button>
        </div>
      )}
    </div>
  );
};
