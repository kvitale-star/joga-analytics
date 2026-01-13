import React, { useState } from 'react';
import { TeamSelector } from './TeamSelector';
import { OpponentSelector } from './OpponentSelector';
import { LastNGamesFilter } from './LastNGamesFilter';
import { ChartGroupSelector } from './ChartGroupSelector';
import { ChartSelector } from './ChartSelector';
import { ChartType } from '../utils/chartGroups';

interface ControlsPanelProps {
  teams: string[];
  selectedTeam: string | null;
  onSelectTeam: (team: string | null) => void;
  availableOpponents: string[];
  selectedOpponent: string | null;
  onSelectOpponent: (opponent: string | null) => void;
  lastNGames: number | null;
  onLastNGamesChange: (n: number | null) => void;
  totalGames: number;
  selectedChartGroup: string | null;
  onChartGroupChange: (groupId: string | null) => void;
  availableCharts: ChartType[];
  selectedCharts: ChartType[];
  onChartsChange: (charts: ChartType[]) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  teams,
  selectedTeam,
  onSelectTeam,
  availableOpponents,
  selectedOpponent,
  onSelectOpponent,
  lastNGames,
  onLastNGamesChange,
  totalGames,
  selectedChartGroup,
  onChartGroupChange,
  availableCharts,
  selectedCharts,
  onChartsChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-6 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label={isOpen ? 'Close controls' : 'Open controls'}
        style={{
          width: '56px',
          height: '56px',
        }}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        )}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="fixed top-20 right-6 z-50 w-80 max-h-[calc(100vh-120px)] bg-white rounded-lg shadow-2xl border-2 border-blue-600 overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filters & Charts</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Panel Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <TeamSelector
                teams={teams}
                selectedTeam={selectedTeam}
                onSelectTeam={onSelectTeam}
              />
              
              <OpponentSelector
                opponents={availableOpponents}
                selectedOpponent={selectedOpponent}
                onSelectOpponent={onSelectOpponent}
              />
              
              <LastNGamesFilter
                lastNGames={lastNGames}
                onLastNGamesChange={onLastNGamesChange}
                totalGames={totalGames}
              />
              
              <ChartGroupSelector
                selectedGroup={selectedChartGroup}
                onGroupChange={onChartGroupChange}
              />
              
              <ChartSelector
                availableCharts={availableCharts}
                selectedCharts={selectedCharts}
                onSelectionChange={onChartsChange}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

