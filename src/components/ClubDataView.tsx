import React, { useState } from 'react';
import { MatchData } from '../types';
import { ChartType, CHART_GROUPS, CHART_LABELS } from '../utils/chartGroups';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { FadeTransition } from './FadeTransition';
import { UserMenu } from './UserMenu';
import { ShotsChart } from './ShotsChart';
import { GoalsChart } from './GoalsChart';
import { PossessionChart } from './PossessionChart';
import { XGChart } from './xGChart';
import { TSRChart } from './TSRChart';
import { SPIChart } from './SPIChart';
import { ConversionRateChart } from './ConversionRateChart';
import { AttemptsChart } from './AttemptsChart';
import { PositionalAttemptsChart } from './PositionalAttemptsChart';
import { MiscStatsChart } from './MiscStatsChart';
import { PassesChart } from './PassesChart';
import { AvgPassLengthChart } from './AvgPassLengthChart';
import { PassStrLengthChart } from './PassStrLengthChart';
import { PassByZoneChart } from './PassByZoneChart';
import { PPMChart } from './PPMChart';
import { PassShareChart } from './PassShareChart';
import { AutoChart } from './AutoChart';
import { getChartConfig } from '../utils/chartUtils';
import { TeamComparisonRadialChart } from './TeamComparisonRadialChart';

interface ClubDataViewProps {
  matchData: MatchData[];
  columnKeys: string[];
  clubDataByTeam: MatchData[];
  availableClubTeams: string[];
  selectedClubTeams: string[];
  setSelectedClubTeams: (value: string[] | ((prev: string[]) => string[])) => void;
  lastNGames: number | null;
  setLastNGames: (value: number | null | ((prev: number | null) => number | null)) => void;
  selectedChartGroup: string | null;
  setSelectedChartGroup: (value: string | null | ((prev: string | null) => string | null)) => void;
  selectedCharts: ChartType[];
  setSelectedCharts: (value: ChartType[] | ((prev: ChartType[]) => ChartType[])) => void;
  additionalOptions: string[];
  setAdditionalOptions: (value: string[] | ((prev: string[]) => string[])) => void;
  availableCharts: ChartType[];
  autoChartColumns: string[];
  columnPairs: Map<string, string | null>;
  // Helper functions
  getTeamKey: () => string;
  getShotsForKey: () => string;
  getShotsAgainstKey: () => string;
  getGoalsForKey: () => string;
  getGoalsAgainstKey: () => string;
  getPossessionKey: () => string;
  getOppPossessionKey: () => string;
  getPassShareKey: () => string;
  getxGKey: () => string;
  getxGAKey: () => string;
  getTSRKey: () => string;
  getOppTSRKey: () => string;
  getSPIKey: () => string;
  getSPIWKey: () => string;
  getOppSPIKey: () => string;
  getOppSPIWKey: () => string;
  getConversionRateKey: () => string;
  getOppConversionRateKey: () => string;
  getAttemptsKey: () => string;
  getOppAttemptsKey: () => string;
  getInsideBoxAttemptsPctKey: () => string;
  getOutsideBoxAttemptsPctKey: () => string;
  getOppInsideBoxAttemptsPctKey: () => string;
  getOppOutsideBoxAttemptsPctKey: () => string;
  getCornersForKey: () => string;
  getCornersAgainstKey: () => string;
  getFreeKickForKey: () => string;
  getFreeKickAgainstKey: () => string;
  getPassesForKey: () => string;
  getOppPassesKey: () => string;
  getAvgPassLengthKey: () => string;
  getOppAvgPassLengthKey: () => string;
  getTeamPassStrings35Key: () => string;
  getTeamPassStrings6PlusKey: () => string;
  getLPCAvgKey: () => string;
  getPassByZoneKeys: () => string[];
  getOppPassByZoneKeys: () => string[];
  getPPMKey: () => string;
  getOppPPMKey: () => string;
  getOppPassShareKey: () => string;
}

export const ClubDataView: React.FC<ClubDataViewProps> = ({
  matchData,
  columnKeys,
  clubDataByTeam,
  availableClubTeams,
  selectedClubTeams,
  setSelectedClubTeams,
  lastNGames,
  setLastNGames,
  selectedChartGroup,
  setSelectedChartGroup,
  selectedCharts,
  setSelectedCharts,
  additionalOptions,
  setAdditionalOptions,
  availableCharts,
  autoChartColumns,
  columnPairs,
  getTeamKey,
  getShotsForKey,
  getShotsAgainstKey,
  getGoalsForKey,
  getGoalsAgainstKey,
  getPossessionKey,
  getOppPossessionKey,
  getPassShareKey,
  getxGKey,
  getxGAKey,
  getTSRKey,
  getOppTSRKey,
  getSPIKey,
  getSPIWKey,
  getOppSPIKey,
  getOppSPIWKey,
  getConversionRateKey,
  getOppConversionRateKey,
  getAttemptsKey,
  getOppAttemptsKey,
  getInsideBoxAttemptsPctKey,
  getOutsideBoxAttemptsPctKey,
  getOppInsideBoxAttemptsPctKey,
  getOppOutsideBoxAttemptsPctKey,
  getCornersForKey,
  getCornersAgainstKey,
  getFreeKickForKey,
  getFreeKickAgainstKey,
  getPassesForKey,
  getOppPassesKey,
  getAvgPassLengthKey,
  getOppAvgPassLengthKey,
  getTeamPassStrings35Key,
  getTeamPassStrings6PlusKey,
  getLPCAvgKey,
  getPassByZoneKeys,
  getOppPassByZoneKeys,
  getPPMKey,
  getOppPPMKey,
  getOppPassShareKey,
}) => {
  const teamKeyForCharts = getTeamKey();
  const showLabels = additionalOptions.includes('showChartLabels');
  const globalIncludeOpponents = additionalOptions.includes('includeOpponents');
  
  // Chart expansion state - synced with chart configs (loaded from saved preferences)
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  
  // Load initial expansion states from saved configs
  React.useEffect(() => {
    const loadExpansionStates = async () => {
      // Note: We need user from AuthContext, but ClubDataView doesn't have direct access
      // The charts will load their own configs via useChartConfig hook
      // We'll sync via callbacks
    };
    
    loadExpansionStates();
  }, []);
  
  const handleChartExpansionChange = (chartType: string) => (isExpanded: boolean) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartType]: isExpanded,
    }));
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Club Data Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Team performance metrics across all JOGA teams</p>
            </div>
            <div className="relative">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Top Control Bar */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            {/* Team Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
              <MultiSelectDropdown
                options={availableClubTeams.map(team => ({
                  value: team,
                  label: team
                }))}
                selectedValues={selectedClubTeams}
                onSelectionChange={setSelectedClubTeams}
                placeholder="Select teams..."
                className="min-w-[180px]"
                isTeamDropdown={true}
              />
            </div>

            {/* Chart Group Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Chart Group</label>
              <select
                value={selectedChartGroup || ''}
                onChange={(e) => {
                  const groupId = e.target.value || null;
                  setSelectedChartGroup(groupId);
                  if (groupId) {
                    const group = CHART_GROUPS.find(g => g.id === groupId);
                    if (group) {
                      // Filter to only include charts that are available
                      const chartsToSelect = group.charts.filter(chart => availableCharts.includes(chart));
                      if (chartsToSelect.length > 0) {
                        setSelectedCharts(chartsToSelect);
                      } else {
                        setSelectedCharts([]);
                      }
                    }
                  } else {
                    setSelectedCharts([]);
                  }
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] min-w-[160px]"
              >
                <option value="">Select Group...</option>
                {[...CHART_GROUPS].sort((a, b) => {
                  // "All Charts" always at top
                  if (a.id === 'all') return -1;
                  if (b.id === 'all') return 1;
                  // Rest alphabetically
                  return a.name.localeCompare(b.name);
                }).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Charts</label>
              <MultiSelectDropdown
                options={availableCharts.map(chart => ({
                  value: chart,
                  label: CHART_LABELS[chart]
                }))}
                selectedValues={selectedCharts}
                onSelectionChange={(values) => {
                  setSelectedCharts(values as ChartType[]);
                  setSelectedChartGroup(null);
                }}
                placeholder="Select charts..."
                className="min-w-[180px]"
              />
            </div>

            {/* Options */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Options</label>
              <MultiSelectDropdown
                options={[
                  { value: 'boys', label: 'Boys Teams' },
                  { value: 'girls', label: 'Girls Teams' },
                  { value: 'blackTeams', label: 'Black Teams' },
                  { value: 'showChartLabels', label: 'Show Chart Labels' },
                  { value: 'includeOpponents', label: 'Include Opponents' }
                ]}
                selectedValues={additionalOptions}
                onSelectionChange={setAdditionalOptions}
                placeholder="Select options..."
                className="min-w-[180px]"
              />
            </div>

            {/* Last N Games Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Last N Games</label>
              <input
                type="number"
                min="1"
                max={matchData.length}
                value={lastNGames || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setLastNGames(null);
                  } else {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num > 0) {
                      setLastNGames(Math.min(num, matchData.length));
                    }
                  }
                }}
                placeholder="All"
                className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-[1600px] mx-auto w-full">
          {!clubDataByTeam || clubDataByTeam.length === 0 ? (
            (() => {
              // Show radial chart when no teams selected OR when all teams are selected (default state)
              const noTeamsSelected = selectedClubTeams.length === 0;
              const allTeamsSelected = selectedClubTeams.length > 0 && 
                                       availableClubTeams.length > 0 &&
                                       selectedClubTeams.length === availableClubTeams.length &&
                                       selectedClubTeams.every(team => availableClubTeams.includes(team));
              const shouldShowRadial = noTeamsSelected || allTeamsSelected;
              
              return shouldShowRadial ? (
                availableClubTeams && availableClubTeams.length >= 2 ? (
                  <div className="max-w-4xl mx-auto">
                    <TeamComparisonRadialChart
                      data={matchData || []}
                      teamKey={teamKeyForCharts}
                      availableTeams={availableClubTeams || []}
                      getTSRKey={getTSRKey}
                      getPossessionKey={getPossessionKey}
                      getSPIKey={getSPIKey}
                      getPassesKey={getPassesForKey}
                      getLPCAvgKey={getLPCAvgKey}
                      getConversionRateKey={getConversionRateKey}
                      columnKeys={columnKeys || []}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600 text-lg">
                      {availableClubTeams && availableClubTeams.length === 1 
                        ? 'At least 2 teams are required to display the team comparison chart.'
                        : 'No teams available. Please ensure your data contains team information.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 text-lg">
                    No team data available. Try adjusting filters.
                  </p>
                </div>
              );
            })()
          ) : (
            <>
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Shots Chart */}
              {selectedCharts.includes('shots') && columnKeys.includes(getShotsForKey()) && columnKeys.includes(getShotsAgainstKey()) && (
                <div className={expandedCharts['shots'] ? 'lg:col-span-2' : ''}>
                  <ShotsChart
                    data={clubDataByTeam}
                    shotsForKey={getShotsForKey()}
                    shotsAgainstKey={getShotsAgainstKey()}
                    opponentKey={teamKeyForCharts}
                    showLabels={showLabels}
                    attemptsForKey={columnKeys.includes(getAttemptsKey()) ? getAttemptsKey() : undefined}
                    attemptsAgainstKey={columnKeys.includes(getOppAttemptsKey()) ? getOppAttemptsKey() : undefined}
                    goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                    goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('shots')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* Goals Chart */}
              {selectedCharts.includes('goals') && columnKeys.includes(getGoalsForKey()) && columnKeys.includes(getGoalsAgainstKey()) && (
                <div className={expandedCharts['goals'] ? 'lg:col-span-2' : ''}>
                  <GoalsChart
                    data={clubDataByTeam}
                    goalsForKey={getGoalsForKey()}
                    goalsAgainstKey={getGoalsAgainstKey()}
                    opponentKey={teamKeyForCharts}
                    showLabels={showLabels}
                    xGKey={columnKeys.includes(getxGKey()) ? getxGKey() : undefined}
                    xGAKey={columnKeys.includes(getxGAKey()) ? getxGAKey() : undefined}
                    shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                    shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('goals')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* Possession Chart */}
              {selectedCharts.includes('possession') && columnKeys.includes(getPossessionKey()) && (
                <div className={expandedCharts['possession'] ? 'lg:col-span-2' : ''}>
                  <PossessionChart
                    data={clubDataByTeam}
                    possessionKey={getPossessionKey()}
                    passShareKey={getPassShareKey()}
                    opponentKey={teamKeyForCharts}
                    oppPossessionKey={columnKeys.includes(getOppPossessionKey()) ? getOppPossessionKey() : undefined}
                    oppPassShareKey={columnKeys.includes(getOppPassShareKey()) ? getOppPassShareKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('possession')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* xG Chart */}
              {selectedCharts.includes('xg') && columnKeys.includes(getxGKey()) && columnKeys.includes(getxGAKey()) && (
                <div className={expandedCharts['xg'] ? 'lg:col-span-2' : ''}>
                  <XGChart
                    data={clubDataByTeam}
                    xGKey={getxGKey()}
                    xGAKey={getxGAKey()}
                    opponentKey={teamKeyForCharts}
                    showLabels={showLabels}
                    goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                    goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                    shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                    shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('xg')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* TSR Chart */}
              {selectedCharts.includes('tsr') && (columnKeys.includes(getTSRKey()) || columnKeys.includes(getOppTSRKey())) && (
                <div className={expandedCharts['tsr'] ? 'lg:col-span-2' : ''}>
                  <TSRChart
                    data={clubDataByTeam}
                    tsrKey={columnKeys.includes(getTSRKey()) ? getTSRKey() : undefined}
                    oppTSRKey={columnKeys.includes(getOppTSRKey()) ? getOppTSRKey() : undefined}
                    opponentKey={teamKeyForCharts}
                    showLabels={showLabels}
                    shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                    shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('tsr')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* SPI Chart */}
              <FadeTransition
                show={selectedCharts.includes('spi') && (columnKeys.includes(getSPIKey()) || 
                  columnKeys.includes(getSPIWKey()) || 
                  columnKeys.includes(getOppSPIKey()) || 
                  columnKeys.includes(getOppSPIWKey()))}
                className="mb-6"
              >
                <SPIChart
                  data={clubDataByTeam}
                  spiKey={getSPIKey()}
                  spiWKey={getSPIWKey()}
                  oppSpiKey={getOppSPIKey()}
                  oppSpiWKey={getOppSPIWKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Conversion Rate Chart */}
              {selectedCharts.includes('conversionRate') && (columnKeys.includes(getConversionRateKey()) || columnKeys.includes(getOppConversionRateKey())) && (
                <div className={expandedCharts['conversionRate'] ? 'lg:col-span-2' : ''}>
                  <ConversionRateChart
                    data={clubDataByTeam}
                    conversionRateKey={getConversionRateKey()}
                    oppConversionRateKey={getOppConversionRateKey()}
                    opponentKey={teamKeyForCharts}
                    showLabels={showLabels}
                    shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                    shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                    goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                    goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                    onExpansionChange={handleChartExpansionChange('conversionRate')}
                    globalIncludeOpponents={globalIncludeOpponents}
                  />
                </div>
              )}

              {/* Attempts Chart */}
              <FadeTransition
                show={selectedCharts.includes('attempts') && columnKeys.includes(getAttemptsKey()) && columnKeys.includes(getOppAttemptsKey())}
                className="mb-6"
              >
                <AttemptsChart
                  data={clubDataByTeam}
                  attemptsKey={getAttemptsKey()}
                  oppAttemptsKey={getOppAttemptsKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Positional Attempts Chart */}
              <FadeTransition
                show={selectedCharts.includes('positionalAttempts') && 
                  (columnKeys.includes(getInsideBoxAttemptsPctKey()) || columnKeys.includes(getOutsideBoxAttemptsPctKey())) &&
                  (columnKeys.includes(getOppInsideBoxAttemptsPctKey()) || columnKeys.includes(getOppOutsideBoxAttemptsPctKey()))}
                className="mb-6"
              >
                <PositionalAttemptsChart
                  data={clubDataByTeam}
                  insideBoxAttemptsPctKey={getInsideBoxAttemptsPctKey()}
                  outsideBoxAttemptsPctKey={getOutsideBoxAttemptsPctKey()}
                  oppInsideBoxAttemptsPctKey={getOppInsideBoxAttemptsPctKey()}
                  oppOutsideBoxAttemptsPctKey={getOppOutsideBoxAttemptsPctKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Misc Stats Chart */}
              <FadeTransition
                show={selectedCharts.includes('miscStats') && 
                  (columnKeys.includes(getCornersForKey()) || columnKeys.includes(getCornersAgainstKey())) &&
                  (columnKeys.includes(getFreeKickForKey()) || columnKeys.includes(getFreeKickAgainstKey()))}
                className="mb-6"
              >
                <MiscStatsChart
                  data={clubDataByTeam}
                  cornersForKey={getCornersForKey()}
                  cornersAgainstKey={getCornersAgainstKey()}
                  freeKickForKey={getFreeKickForKey()}
                  freeKickAgainstKey={getFreeKickAgainstKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Passes Chart */}
              <FadeTransition
                show={selectedCharts.includes('passes') && columnKeys.includes(getPassesForKey()) && columnKeys.includes(getOppPassesKey())}
                className="mb-6"
              >
                <PassesChart
                  data={clubDataByTeam}
                  passesForKey={getPassesForKey()}
                  oppPassesKey={getOppPassesKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Avg Pass Length Chart */}
              <FadeTransition
                show={selectedCharts.includes('avgPassLength') && columnKeys.includes(getAvgPassLengthKey()) && columnKeys.includes(getOppAvgPassLengthKey())}
                className="mb-6"
              >
                <AvgPassLengthChart
                  data={clubDataByTeam}
                  avgPassLengthKey={getAvgPassLengthKey()}
                  oppAvgPassLengthKey={getOppAvgPassLengthKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Pass String Length Chart */}
              <FadeTransition
                show={selectedCharts.includes('passStrLength') && 
                  columnKeys.includes(getTeamPassStrings35Key()) && 
                  columnKeys.includes(getTeamPassStrings6PlusKey()) && 
                  columnKeys.includes(getLPCAvgKey())}
                className="mb-6"
              >
                <PassStrLengthChart
                  data={clubDataByTeam}
                  passStrings35Key={getTeamPassStrings35Key()}
                  passStrings6PlusKey={getTeamPassStrings6PlusKey()}
                  lpcKey={getLPCAvgKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Passing SPI Chart */}
              <FadeTransition
                show={selectedCharts.includes('passingSPI') && (columnKeys.includes(getSPIKey()) || 
                  columnKeys.includes(getSPIWKey()) || 
                  columnKeys.includes(getOppSPIKey()) || 
                  columnKeys.includes(getOppSPIWKey()))}
                className="mb-6"
              >
                <SPIChart
                  data={clubDataByTeam}
                  spiKey={getSPIKey()}
                  spiWKey={getSPIWKey()}
                  oppSpiKey={getOppSPIKey()}
                  oppSpiWKey={getOppSPIWKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Pass By Zone Chart */}
              <FadeTransition
                show={selectedCharts.includes('passByZone') && getPassByZoneKeys().length > 0 && getOppPassByZoneKeys().length > 0}
                className="mb-6"
              >
                <PassByZoneChart
                  data={clubDataByTeam}
                  passByZoneKeys={getPassByZoneKeys()}
                  oppPassByZoneKeys={getOppPassByZoneKeys()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* PPM Chart */}
              <FadeTransition
                show={selectedCharts.includes('ppm') && columnKeys.includes(getPPMKey()) && columnKeys.includes(getOppPPMKey())}
                className="mb-6"
              >
                <PPMChart
                  data={clubDataByTeam}
                  ppmKey={getPPMKey()}
                  oppPPMKey={getOppPPMKey()}
                  opponentKey={teamKeyForCharts}
                  showLabels={showLabels}
                />
              </FadeTransition>

              {/* Pass Share Chart */}
              {selectedCharts.includes('passShare') && (columnKeys.includes(getPassShareKey()) || columnKeys.includes(getOppPassShareKey())) && (
                <div className={expandedCharts['passShare'] ? 'lg:col-span-2' : ''}>
                  <PassShareChart
                    data={clubDataByTeam}
                    passShareKey={getPassShareKey()}
                    oppPassShareKey={getOppPassShareKey()}
                    opponentKey={teamKeyForCharts}
                  />
                </div>
              )}
              </div>

              {/* Auto-Generated Charts */}
              {/* Defense Section */}
              {selectedChartGroup === 'defense' && selectedCharts.includes('auto') && autoChartColumns.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Defense</h2>
                </>
              )}

              {selectedCharts.includes('auto') && autoChartColumns.length > 0 && (() => {
                const processedPairs = new Set<string>();
                // Filter to defense-related columns when Defense group is selected
                const columnsToShow = selectedChartGroup === 'defense' 
                  ? autoChartColumns.filter(col => {
                      const colLower = col.toLowerCase();
                      return colLower.includes('tackle') ||
                             colLower.includes('intercept') ||
                             colLower.includes('clearance') ||
                             colLower.includes('block') ||
                             colLower.includes('defensive') ||
                             colLower.includes('defense') ||
                             colLower.includes('possessions won') ||
                             colLower.includes('possession won') ||
                             (colLower.includes('poss') && colLower.includes('won'));
                    })
                  : autoChartColumns;
                
                if (columnsToShow.length === 0) return null;
                
                return (
                  <>
                    <h2 className={`text-2xl font-bold text-gray-900 mb-6 ${selectedChartGroup === 'defense' ? 'mt-0' : 'mt-8'}`}>
                      {selectedChartGroup === 'defense' ? 'Defensive Statistics' : 'Additional Statistics'}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {columnsToShow.map((columnKey) => {
                        if (processedPairs.has(columnKey)) {
                          return null;
                        }
                        
                        const pairColumn = columnPairs.get(columnKey);
                        const config = getChartConfig(columnKey, !!pairColumn);
                        if (pairColumn && config.type !== 'combo') {
                          config.type = 'combo';
                        }
                        
                        if (pairColumn) {
                          processedPairs.add(columnKey);
                          processedPairs.add(pairColumn);
                        }
                        
                        return (
                          <AutoChart
                            key={columnKey}
                            data={clubDataByTeam}
                            columnKey={columnKey}
                            opponentKey={teamKeyForCharts}
                            config={config}
                            pairColumnKey={pairColumn || undefined}
                            showLabels={showLabels}
                          />
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </main>
    </>
  );
};

