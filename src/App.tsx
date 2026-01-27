import { useState, useEffect, useMemo, useRef } from 'react';
import { MatchData } from './types';
import { fetchSheetData } from './services/sheetsService';
import { invalidateAIContextCache } from './services/aiService';
import { sheetConfig } from './config';
import { useURLState } from './hooks/useURLState';
import { useViewScopedState } from './hooks/useViewScopedState';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { StatsCard } from './components/StatsCard';
import { getMissingDataInfo } from './utils/missingDataUtils';
import { ShotsChart } from './components/ShotsChart';
import { PossessionChart } from './components/PossessionChart';
import { XGChart } from './components/xGChart';
import { ConversionRateChart } from './components/ConversionRateChart';
import { GoalsChart } from './components/GoalsChart';
import { SPIChart } from './components/SPIChart';
import { AttemptsChart } from './components/AttemptsChart';
import { PositionalAttemptsChart } from './components/PositionalAttemptsChart';
import { MiscStatsChart } from './components/MiscStatsChart';
import { PassesChart } from './components/PassesChart';
import { AvgPassLengthChart } from './components/AvgPassLengthChart';
import { PassStrLengthChart } from './components/PassStrLengthChart';
import { PassByZoneChart } from './components/PassByZoneChart';
import { PPMChart } from './components/PPMChart';
import { PassShareChart } from './components/PassShareChart';
import { TSRChart } from './components/TSRChart';
import { AutoChart } from './components/AutoChart';
import { ChatFirstView } from './components/ChatFirstView';
import { getChartConfig, findColumnPairs, shouldExcludeColumn } from './utils/chartUtils';
import { ChartType, CHART_GROUPS, CHART_LABELS } from './utils/chartGroups';
import { MultiSelectDropdown } from './components/MultiSelectDropdown';
import { Sidebar } from './components/Sidebar';
import { EmptyChart } from './components/EmptyChart';
import { GameDataView } from './components/GameDataView';
import { DateFilter } from './components/DateFilter';
import { ClubDataView } from './components/ClubDataView';
import { UploadGameDataView } from './components/UploadGameDataView';
import { DataAtAGlanceView } from './components/DataAtAGlanceView';
import { Modal } from './components/Modal';
import { CustomChartBuilder } from './components/CustomChartBuilder';
import { getCustomCharts } from './services/customChartsService';
import { prepareChartData } from './utils/customChartDataProcessor';
import { DynamicChartRenderer } from './components/DynamicChartRenderer';
import { ChartExpandButton } from './components/ChartExpandButton';
import type { CustomChart } from './types/customCharts';
import { useAuth } from './contexts/AuthContext';
import { SetupWizard } from './components/SetupWizard';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { PasswordResetForm } from './components/PasswordResetForm';
import { EmailVerification } from './components/EmailVerification';
import { SettingsView } from './components/SettingsView';
import { Glossary } from './components/Glossary';
import { WalkthroughOverlay } from './components/WalkthroughOverlay';
import { getAllTeams } from './services/teamService';
import { Team } from './types/auth';
import { createTeamSlugMap, getTeamsForDropdown, getDisplayNameForSlug } from './utils/teamMapping';
import { formatDateWithUserPreference } from './utils/dateFormatting';

type ViewMode = 'chat' | 'dashboard' | 'game-data' | 'club-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings' | 'glossary';

function App() {
  const { user, isLoading, isSetupRequired } = useAuth();
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);
  const [databaseTeams, setDatabaseTeams] = useState<Team[]>([]);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [customCharts, setCustomCharts] = useState<CustomChart[]>([]);
  const [customChartData, setCustomChartData] = useState<Record<number, any>>({});
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<CustomChart | null>(null);
  
  const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';
  
  // Create team slug map for quick lookups
  const teamSlugMap = useMemo(() => createTeamSlugMap(databaseTeams), [databaseTeams]);
  
  // Load database teams
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teams = await getAllTeams();
        setDatabaseTeams(teams);
      } catch (error) {
        console.error('Failed to load teams:', error);
        // Continue without database teams - will fallback to showing slugs
      }
    };
    
    if (user && !isLoading) {
      loadTeams();
    }
  }, [user, isLoading]);

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.preferences?.onboardingCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Expose function to start walkthrough from Settings
  useEffect(() => {
    const startWalkthrough = () => {
      setShowWalkthrough(true);
    };
    
    (window as any).startWalkthrough = startWalkthrough;
    
    // Also listen for custom event as fallback
    const handleStartWalkthrough = () => {
      setShowWalkthrough(true);
    };
    window.addEventListener('startWalkthrough', handleStartWalkthrough);
    
    return () => {
      delete (window as any).startWalkthrough;
      window.removeEventListener('startWalkthrough', handleStartWalkthrough);
    };
  }, []);

  // URL-persisted state - view mode is global (not scoped)
  const [viewMode, setViewMode] = useURLState<ViewMode>('view', 'dashboard');

  // Load custom charts when on dashboard view
  useEffect(() => {
    const loadCustomCharts = async () => {
      if (viewMode === 'dashboard' && user && matchData.length > 0) {
        try {
          const charts = await getCustomCharts();
          setCustomCharts(charts);
        } catch (err) {
          console.error('Failed to load custom charts:', err);
        }
      }
    };
    
    loadCustomCharts();
  }, [viewMode, user, matchData.length]);
 
  // Dashboard view-scoped state
  const [selectedTeam, setSelectedTeam] = useViewScopedState<string | null>(viewMode, 'team', null, {
    serialize: (v) => v || '',
    deserialize: (v) => v || null,
  });
  const [selectedOpponent, setSelectedOpponent] = useViewScopedState<string | null>(viewMode, 'opponent', null, {
    serialize: (v) => v || '',
    deserialize: (v) => v || null,
  });
  const [selectedDate, setSelectedDate] = useViewScopedState<string>(viewMode, 'date', '');
  const [selectedChartGroup, setSelectedChartGroup] = useViewScopedState<string | null>(viewMode, 'chartGroup', null, {
    serialize: (v) => v || '',
    deserialize: (v) => v || null,
  });
  // Chart selections - stored in localStorage (not URL) to keep URLs short
  // Chart preferences (which metrics are visible, etc.) are stored in database
  // Can contain both ChartType values and custom chart IDs (format: 'custom-chart-{id}')
  const [selectedCharts, setSelectedCharts] = useLocalStorageState<(ChartType | string)[]>(
    viewMode === 'dashboard' ? 'joga.dashboard.charts' : 'joga.clubData.charts',
    [],
    {
      serialize: (v) => JSON.stringify(v),
      deserialize: (v) => {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
    }
  );
  
  // Dashboard options for Team Data: 'showChartLabels', 'includeOpponents'
  const [dashboardOptions, setDashboardOptions] = useViewScopedState<string[]>(viewMode, 'dashboardOptions', ['showChartLabels'], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : ['showChartLabels'];
      } catch {
        return ['showChartLabels'];
      }
    },
  });
  
  // Club Data view-scoped state
  const [additionalOptions, setAdditionalOptions] = useViewScopedState<string[]>('club-data', 'additionalOptions', ['boys', 'girls', 'showChartLabels'], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : ['boys', 'girls', 'showChartLabels'];
      } catch {
        return ['boys', 'girls', 'showChartLabels'];
      }
    },
  });
  const [lastNGames, setLastNGames] = useViewScopedState<number | null>('club-data', 'lastNGames', 10, {
    serialize: (v) => v?.toString() || '',
    deserialize: (v) => {
      if (!v) return null;
      const num = parseInt(v, 10);
      return isNaN(num) ? null : num;
    },
  });
  
  // Chart expansion state - synced with chart configs (loaded from saved preferences)
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  
  // Load initial expansion states from saved configs
  useEffect(() => {
    const loadExpansionStates = async () => {
      if (!user) return;
      
      try {
        const { getChartPreferences } = await import('./services/chartPreferencesService');
        const preferences = await getChartPreferences(user.id);
        const expansionStates: Record<string, boolean> = {};
        
        Object.keys(preferences).forEach(chartType => {
          const config = preferences[chartType];
          if (config?.isExpanded !== undefined) {
            expansionStates[chartType] = config.isExpanded;
          }
        });
        
        setExpandedCharts(expansionStates);
      } catch (error) {
        console.error('Error loading chart expansion states:', error);
      }
    };
    
    loadExpansionStates();
  }, [user]);
  
  const handleChartExpansionChange = (chartType: string) => (isExpanded: boolean) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartType]: isExpanded,
    }));
  };
  
  // Selected teams for Club Data (multiselect)
  const [selectedClubTeams, setSelectedClubTeams] = useViewScopedState<string[]>('club-data', 'teams', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  
  // Helper to check if boys teams are included
  const includeBoysTeams = additionalOptions.includes('boys');
  // Helper to check if girls teams are included
  const includeGirlsTeams = additionalOptions.includes('girls');
  // Helper to check if black teams are included
  const includeBlackTeams = additionalOptions.includes('blackTeams');
  
  // Game Data View specific URL state (view-scoped)
  const [selectedOpponents, setSelectedOpponents] = useViewScopedState<string[]>('game-data', 'opponents', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  // Metric selections for Game Data view
  // Store in localStorage (not URL) to keep URLs short - these are UI preferences, not bookmarkable filters
  // Only critical filters (team, opponent, date) are in URL for bookmarking
  const [selectedShootingMetrics, setSelectedShootingMetrics] = useLocalStorageState<string[]>('joga.gameData.shootingMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedPassingMetrics, setSelectedPassingMetrics] = useLocalStorageState<string[]>('joga.gameData.passingMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedPossessionMetrics, setSelectedPossessionMetrics] = useLocalStorageState<string[]>('joga.gameData.possessionMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedJOGAMetrics, setSelectedJOGAMetrics] = useLocalStorageState<string[]>('joga.gameData.jogaMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useLocalStorageState<string[]>('joga.gameData.defenseMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedSetPiecesMetrics, setSelectedSetPiecesMetrics] = useLocalStorageState<string[]>('joga.gameData.setPiecesMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });
  const [selectedOtherMetrics, setSelectedOtherMetrics] = useLocalStorageState<string[]>('joga.gameData.otherMetrics', [], {
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });

  // Clean up old non-scoped URL parameters and metric selections (now in localStorage) when switching views
  // This provides backward compatibility and cleans up legacy URLs
  useEffect(() => {
    // Don't clean up URL params if we're on password reset or email verification pages
    // These pages need to preserve the token parameter
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/reset-password') || path.includes('/verify-email')) {
      return; // Don't modify URL on these pages
    }
    
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    // Define old non-scoped param names that should be removed
    // These are legacy params from before view-scoping
    const legacyParams = [
      'team', 'opponent', 'date', 'chartGroup', 'charts', 'lastNGames',
      'gameOpponents', 'selectedClubTeams', 'additionalOptions', 'dashboardOptions',
      'shootingMetrics', 'passingMetrics', 'possessionMetrics', 'jogaMetrics',
      'defenseMetrics', 'setPiecesMetrics', 'otherMetrics'
    ];
    
    // Also remove view-scoped parameters that are now stored in localStorage
    const localStorageParams = [
      // Metric selections (Game Data view)
      'gameData.shootingMetrics', 'gameData.passingMetrics', 'gameData.possessionMetrics',
      'gameData.jogaMetrics', 'gameData.defenseMetrics', 'gameData.setPiecesMetrics', 'gameData.otherMetrics',
      // Chart selections (Dashboard and Club Data views)
      'dashboard.charts', 'clubData.charts'
    ];

    // Remove legacy params (view-scoped params are handled automatically by useViewScopedState)
    // Always preserve 'view' and 'token' parameters
    for (const key of [...legacyParams, ...localStorageParams]) {
      if (params.has(key) && key !== 'view' && key !== 'token') {
        params.delete(key);
        changed = true;
      }
    }

    // Update URL if we removed any legacy params
    if (changed) {
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewMode]);

  useEffect(() => {
    // Don't try to load data while auth is still checking
    if (isLoading) {
      return;
    }

    // Only load data if user is authenticated (in API mode)
    // In browser mode, data can be loaded without auth
    if (!USE_BACKEND_API) {
      // Browser mode - load data without auth
      loadData();
    } else if (user) {
      // API mode - user is authenticated, load data
      loadData();
    } else {
      // API mode - not authenticated, don't try to load (will show login page)
      setError(null); // Clear any previous errors
      setLoading(false);
    }
  }, [user, isLoading, USE_BACKEND_API]);

  const loadData = async () => {
    // Don't load if we're in API mode and not authenticated
    if (USE_BACKEND_API && !user) {
      console.log('Skipping data load - not authenticated in API mode');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Invalidate AI context cache when reloading data
      // This ensures the chatbot rebuilds context with fresh data
      invalidateAIContextCache();
      
      const raw = await fetchSheetData(sheetConfig);
      const data = Array.isArray(raw) ? raw : [];
      if (!Array.isArray(raw)) {
        console.error('❌ fetchSheetData returned non-array; defaulting matchData to []', raw);
      }

      // Extract column keys from first match
      const keys = data.length > 0 ? Object.keys(data[0]) : [];
      if (keys.length > 0) {
        setColumnKeys(keys);
      }

      // Apply preferred season filter (multi-year) when available.
      // We filter here (before setMatchData) to keep derived UI lists consistent.
      const preferredSeasons: number[] = Array.isArray(user?.preferences?.preferredSeasons)
        ? user?.preferences?.preferredSeasons
        : [];

      const seasonKey = keys.find(k => k.toLowerCase() === 'season' || k.toLowerCase().includes('season'));
      const filtered = (preferredSeasons.length > 0 && seasonKey)
        ? data.filter((row) => {
          const raw = row[seasonKey];
          const year =
            typeof raw === 'number' ? raw :
            typeof raw === 'string' ? Number(raw.trim()) :
            NaN;
          return preferredSeasons.includes(year);
        })
        : data;

      setMatchData(Array.isArray(filtered) ? filtered : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find column keys automatically (case-insensitive)
  const findColumnKey = (possibleKeys: string[]): string | null => {
    // First try exact match
    for (const key of possibleKeys) {
      if (columnKeys.includes(key)) return key;
    }
    // Then try case-insensitive match
    for (const key of possibleKeys) {
      const found = columnKeys.find(ck => ck.toLowerCase() === key.toLowerCase());
      if (found) return found;
    }
    return null;
  };

  const getTeamKey = (): string => {
    return findColumnKey(['team', 'Team', 'teamName', 'Team Name', 'team_name']) || 'team';
  };

  const getOpponentKey = (): string => {
    return findColumnKey(['opponent', 'Opponent', 'opponentName', 'Opponent Name', 'opponent_name']) || 'opponent';
  };

  const getLabelKey = (): string => {
    return findColumnKey(['Date', 'date', 'Match', 'match', 'game', 'Game']) || columnKeys[0] || 'Match';
  };

  const getShotsForKey = (): string => {
    return findColumnKey(['shotsFor', 'Shots For', 'shots_for', 'ShotsFor', 'SF']) || 'shotsFor';
  };

  const getShotsAgainstKey = (): string => {
    return findColumnKey(['shotsAgainst', 'Shots Against', 'shots_against', 'ShotsAgainst', 'SA']) || 'shotsAgainst';
  };

  const getTSRKey = (): string => {
    return findColumnKey(['Total Shots Ratio', 'total shots ratio', 'TSR', 'tsr', 'Team TSR', 'team tsr', 'TSR For', 'tsr for']) || 'Total Shots Ratio';
  };

  const getOppTSRKey = (): string => {
    return findColumnKey(['Opp Total Shots Ratio', 'opp total shots ratio', 'Opp TSR', 'opp tsr', 'Opponent TSR', 'opponent tsr', 'OppTSR', 'opp_tsr', 'TSR Against', 'tsr against']) || 'Opp Total Shots Ratio';
  };

  const getGoalsForKey = (): string => {
    return findColumnKey(['goalsFor', 'Goals For', 'goals_for', 'GoalsFor', 'GF', 'goals']) || 'Goals For';
  };

  const getGoalsAgainstKey = (): string => {
    return findColumnKey(['goalsAgainst', 'Goals Against', 'goals_against', 'GoalsAgainst', 'GA']) || 'Goals Against';
  };

  const getPossessionKey = (): string => {
    return findColumnKey(['possession', 'Possession', 'Poss', 'poss']) || 'possession';
  };

  const getOppPossessionKey = (): string => {
    return findColumnKey(['Opp Possession', 'opp possession', 'OppPossession', 'opp_possession', 'Opponent Possession', 'opponent possession']) || 'Opp Possession';
  };

  const getConversionRateKey = (): string => {
    return findColumnKey(['conversionRate', 'Conversion Rate', 'conversion_rate', 'ConversionRate', 'Conv']) || 'conversionRate';
  };

  const getOppConversionRateKey = (): string => {
    return findColumnKey(['Opp Conversion Rate', 'opp conversion rate', 'OppConversionRate', 'opp_conversion_rate', 'Opp Conv Rate', 'opp conv rate']) || 'Opp Conversion Rate';
  };

  const getPassShareKey = (): string => {
    return findColumnKey(['Pass Share', 'pass share', 'PassShare', 'pass_share']) || 'Pass Share';
  };

  const getOppPassShareKey = (): string => {
    return findColumnKey(['Opp Pass Share', 'opp pass share', 'OppPassShare', 'opp_pass_share', 'Opponent Pass Share', 'opponent pass share']) || 'Opp Pass Share';
  };

  const getAttemptsKey = (): string => {
    return findColumnKey(['Attempts', 'attempts', 'Total Attempts', 'total attempts']) || 'Attempts';
  };

  const getOppAttemptsKey = (): string => {
    return findColumnKey(['Opp Total Attempts', 'opp total attempts', 'OppAttempts', 'opp_attempts', 'Opp Attempts', 'opp attempts']) || 'Opp Total Attempts';
  };

  const getInsideBoxConvRateKey = (): string => {
    return findColumnKey(['Inside Box Conv Rate', 'inside box conv rate', 'InsideBoxConvRate', 'inside_box_conv_rate', 'Inside Box Conv', 'IB Conv Rate']) || 'Inside Box Conv Rate';
  };

  const getOutsideBoxConvRateKey = (): string => {
    return findColumnKey(['Outside Box Conv Rate', 'outside box conv rate', 'OutsideBoxConvRate', 'outside_box_conv_rate', 'Outside Box Conv', 'OB Conv Rate']) || 'Outside Box Conv Rate';
  };

  const getInsideBoxAttemptsPctKey = (): string => {
    return findColumnKey(['% Attempts Inside Box', '% attempts inside box', 'Inside Box Attempts %', 'inside box attempts %', 'Team % Attempts Inside Box', 'team % attempts inside box', 'IB Attempts %', 'ib attempts %']) || '% Attempts Inside Box';
  };

  const getOutsideBoxAttemptsPctKey = (): string => {
    return findColumnKey(['% Attempts Outside Box', '% attempts outside box', 'Outside Box Attempts %', 'outside box attempts %', 'Team % Attempts Outside Box', 'team % attempts outside box', 'OB Attempts %', 'ob attempts %']) || '% Attempts Outside Box';
  };

  const getOppInsideBoxAttemptsPctKey = (): string => {
    return findColumnKey(['Opp % Attempts Inside Box', 'opp % attempts inside box', 'Opp Inside Box Attempts %', 'opp inside box attempts %', 'Opponent % Attempts Inside Box', 'opponent % attempts inside box', 'Opp IB Attempts %', 'opp ib attempts %']) || 'Opp % Attempts Inside Box';
  };

  const getOppOutsideBoxAttemptsPctKey = (): string => {
    return findColumnKey(['Opp % Attempts Outside Box', 'opp % attempts outside box', 'Opp Outside Box Attempts %', 'opp outside box attempts %', 'Opponent % Attempts Outside Box', 'opponent % attempts outside box', 'Opp OB Attempts %', 'opp ob attempts %']) || 'Opp % Attempts Outside Box';
  };

  const getCornersForKey = (): string => {
    return findColumnKey(['Corners For', 'corners for', 'CornersFor', 'corners_for', 'Corner For', 'corner for', 'Corners', 'corners']) || 'Corners For';
  };

  const getCornersAgainstKey = (): string => {
    return findColumnKey(['Corners Against', 'corners against', 'CornersAgainst', 'corners_against', 'Corner Against', 'corner against', 'Opp Corners', 'opp corners', 'Opponent Corners', 'opponent corners']) || 'Corners Against';
  };

  const getFreeKickForKey = (): string => {
    return findColumnKey(['Free Kick For', 'free kick for', 'FreeKickFor', 'free_kick_for', 'Free Kicks For', 'free kicks for', 'FK For', 'fk for']) || 'Free Kick For';
  };

  const getFreeKickAgainstKey = (): string => {
    return findColumnKey(['Free Kick Against', 'free kick against', 'FreeKickAgainst', 'free_kick_against', 'Free Kicks Against', 'free kicks against', 'FK Against', 'fk against', 'Opp Free Kick', 'opp free kick', 'Opponent Free Kick', 'opponent free kick']) || 'Free Kick Against';
  };

  const getSPIKey = (): string => {
    return findColumnKey(['SPI', 'spi']) || 'SPI';
  };

  const getSPIWKey = (): string => {
    return findColumnKey(['SPI (w)', 'SPI(w)', 'SPI w', 'spi (w)', 'spi(w)', 'SPI Weighted', 'spi weighted']) || 'SPI (w)';
  };

  const getOppSPIKey = (): string => {
    return findColumnKey(['Opp SPI', 'opp spi', 'OppSPI', 'opp_spi', 'Opponent SPI', 'opponent spi']) || 'Opp SPI';
  };

  const getOppSPIWKey = (): string => {
    return findColumnKey(['Opp SPI (w)', 'Opp SPI(w)', 'opp spi (w)', 'opp spi(w)', 'OppSPI(w)', 'opp_spi(w)', 'Opponent SPI (w)', 'Opponent SPI(w)', 'opponent spi (w)', 'opponent spi(w)', 'Opp SPI w', 'Opp SPI Weighted']) || 'Opp SPI (w)';
  };

  const getTeamPassStrings35Key = (): string => {
    return findColumnKey(['Pass Strings (3–5)', 'Pass Strings (3-5)', 'pass strings (3–5)', 'pass strings (3-5)', 'PassStrings35', 'pass_strings_35', 'Team Pass Strings (3–5)', 'Team Pass Strings (3-5)', 'team pass strings (3–5)', 'team pass strings (3-5)']) || 'Pass Strings (3–5)';
  };

  const getTeamPassStrings6PlusKey = (): string => {
    return findColumnKey(['Pass Strings (6+)', 'Pass Strings 6+', 'pass strings (6+)', 'pass strings 6+', 'PassStrings6Plus', 'pass_strings_6_plus', 'Team Pass Strings (6+)', 'Team Pass Strings 6+', 'team pass strings (6+)', 'team pass strings 6+']) || 'Pass Strings (6+)';
  };

  const getOppPassStrings35Key = (): string => {
    return findColumnKey(['Opp Pass Strings (3–5)', 'Opp Pass Strings (3-5)', 'opp pass strings (3–5)', 'opp pass strings (3-5)', 'OppPassStrings35', 'opp_pass_strings_35', 'Opponent Pass Strings (3–5)', 'Opponent Pass Strings (3-5)', 'opponent pass strings (3–5)', 'opponent pass strings (3-5)']) || 'Opp Pass Strings (3–5)';
  };

  const getOppPassStrings6PlusKey = (): string => {
    return findColumnKey(['Opp Pass Strings (6+)', 'Opp Pass Strings 6+', 'opp pass strings (6+)', 'opp pass strings 6+', 'OppPassStrings6Plus', 'opp_pass_strings_6_plus', 'Opponent Pass Strings (6+)', 'Opponent Pass Strings 6+', 'opponent pass strings (6+)', 'opponent pass strings 6+']) || 'Opp Pass Strings (6+)';
  };

  const getLPCAvgKey = (): string => {
    return findColumnKey(['LPC', 'lpc', 'LPCAvg', 'lpc_avg']) || 'LPC';
  };

  const getPassesForKey = (): string => {
    return findColumnKey(['Passes Completed', 'passes completed', 'Passes', 'passes', 'Total Passes', 'total passes', 'Passes For', 'passes for', 'Num Passes', 'num passes']) || 'Passes Completed';
  };

  const getOppPassesKey = (): string => {
    return findColumnKey(['Opp Pass Completed', 'opp pass completed', 'Opponent Pass Completed', 'opponent pass completed', 'Opp Passes', 'opp passes', 'Opponent Passes', 'opponent passes', 'Opp Total Passes', 'opp total passes']) || 'Opp Pass Completed';
  };

  const getAvgPassLengthKey = (): string => {
    return findColumnKey(['LPC', 'lpc', 'LPCAvg', 'lpc_avg', 'Avg Pass Length', 'avg pass length', 'Average Pass Length', 'average pass length', 'Avg Pass Str Length', 'avg pass str length']) || 'LPC';
  };

  const getOppAvgPassLengthKey = (): string => {
    return findColumnKey(['Opp Avg Pass Length', 'opp avg pass length', 'Opponent Avg Pass Length', 'opponent avg pass length', 'Opp Avg Pass Str Length', 'opp avg pass str length', 'Opp Average Pass String Length']) || 'Opp Avg Pass Length';
  };

  const getPPMKey = (): string => {
    return findColumnKey(['PPM', 'ppm', 'Passes Per Minute', 'passes per minute']) || 'PPM';
  };

  const getOppPPMKey = (): string => {
    return findColumnKey(['Opp PPM', 'opp ppm', 'Opponent PPM', 'opponent ppm', 'Opp Passes Per Minute', 'opp passes per minute']) || 'Opp PPM';
  };

  // Helper to find pass string length columns (1, 2, 3, 4, 5, 6+)
  const getPassStrLengthKeys = (): string[] => {
    const keys: string[] = [];
    // Check for numbered pass strings (3-Pass Strings, 4-Pass Strings, etc.)
    for (let i = 3; i <= 10; i++) {
      const key = findColumnKey([
        `${i}-Pass Strings`,
        `${i} - Pass Strings`,
        `${i} Pass Strings`,
        `Pass Strings ${i}`,
        `pass strings ${i}`,
        `Pass Str ${i}`,
        `pass str ${i}`
      ]);
      if (key) keys.push(key);
    }
    // Also check for 6+ or (6+)
    const key6Plus = findColumnKey([
      'Pass Strings 6+',
      'Pass Strings (6+)',
      'pass strings 6+',
      'pass strings (6+)',
      'Pass Str 6+',
      'Pass Str (6+)'
    ]);
    if (key6Plus && !keys.includes(key6Plus)) keys.push(key6Plus);
    return keys;
  };

  const getOppPassStrLengthKeys = (): string[] => {
    const keys: string[] = [];
    // Check for numbered opponent pass strings (OPP 3-Pass Strings, etc.)
    for (let i = 3; i <= 10; i++) {
      const key = findColumnKey([
        `OPP ${i}-Pass Strings`,
        `Opp ${i}-Pass Strings`,
        `Opponent ${i}-Pass Strings`,
        `OPP ${i} - Pass Strings`,
        `Opp ${i} - Pass Strings`,
        `OPP ${i} Pass Strings`,
        `Opp Pass Strings ${i}`,
        `opp pass strings ${i}`,
        `Opp Pass Str ${i}`,
        `opp pass str ${i}`
      ]);
      if (key) keys.push(key);
    }
    const key6Plus = findColumnKey([
      'Opp Pass Strings 6+',
      'Opp Pass Strings (6+)',
      'opp pass strings 6+',
      'opp pass strings (6+)',
      'OPP Pass Strings 6+',
      'OPP Pass Strings (6+)'
    ]);
    if (key6Plus && !keys.includes(key6Plus)) keys.push(key6Plus);
    return keys;
  };

  // Helper to find pass % by zone columns
  const getPassByZoneKeys = (): string[] => {
    const keys: string[] = [];
    // Check for zone labels: Def, Mid, Att
    const zoneLabels = ['Def', 'Mid', 'Att'];
    for (const zone of zoneLabels) {
      const key = findColumnKey([
        `Pass % by Zone (${zone})`,
        `pass % by zone (${zone})`,
        `Pass % Zone (${zone})`,
        `pass % zone (${zone})`,
        `Zone (${zone}) Pass %`,
        `zone (${zone}) pass %`
      ]);
      if (key) keys.push(key);
    }
    // Also check for numbered zones (1-6) as fallback
    for (let i = 1; i <= 6; i++) {
      const key = findColumnKey([
        `Pass % Zone ${i}`,
        `pass % zone ${i}`,
        `Pass % by Zone ${i}`,
        `pass % by zone ${i}`,
        `Zone ${i} Pass %`,
        `zone ${i} pass %`
      ]);
      if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
  };

  const getOppPassByZoneKeys = (): string[] => {
    const keys: string[] = [];
    // Check for opponent zone labels: Def, Mid, Att
    const zoneLabels = ['Def', 'Mid', 'Att'];
    for (const zone of zoneLabels) {
      const key = findColumnKey([
        `Opp Pass % by Zone (${zone})`,
        `opp pass % by zone (${zone})`,
        `Opponent Pass % by Zone (${zone})`,
        `opponent pass % by zone (${zone})`,
        `Opp Pass % Zone (${zone})`,
        `opp pass % zone (${zone})`,
        `Opp Zone (${zone}) Pass %`,
        `opp zone (${zone}) pass %`
      ]);
      if (key) keys.push(key);
    }
    // Also check for numbered zones (1-6) as fallback
    for (let i = 1; i <= 6; i++) {
      const key = findColumnKey([
        `Opp Pass % Zone ${i}`,
        `opp pass % zone ${i}`,
        `Opponent Pass % Zone ${i}`,
        `opponent pass % zone ${i}`,
        `Opp Zone ${i} Pass %`,
        `opp zone ${i} pass %`
      ]);
      if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
  };


  const getxGKey = (): string => {
    return findColumnKey(['xG', 'xg', 'xG For', 'xGFor', 'Expected Goals', 'Expected Goals For', 'xGFor', 'xG_For', 'xG For', 'ExpectedGoals', 'expected goals']) || 'xG';
  };

  const getxGAKey = (): string => {
    return findColumnKey(['xG (Opp)', 'xG (Opp)', 'xG(Opp)', 'xG_Opp', 'xGA', 'xga', 'xG Against', 'xGAgainst', 'xG_Against', 'xG Against', 'Expected Goals Against', 'ExpectedGoalsAgainst', 'xGA_Against', 'expected goals against']) || 'xG (Opp)';
  };

  // Extract unique team slugs from match data
  const teamSlugs = useMemo(() => {
    const teamKey = getTeamKey();
    const uniqueTeams = new Set<string>();
    matchData.forEach((match) => {
      const team = match[teamKey];
      if (team && typeof team === 'string' && team.trim()) {
        uniqueTeams.add(team.trim());
      }
    });
    return Array.from(uniqueTeams);
  }, [matchData, columnKeys]);

  // Map slugs to Display Names for dropdown
  const teams = useMemo(() => {
    return getTeamsForDropdown(teamSlugs, teamSlugMap);
  }, [teamSlugs, teamSlugMap]);

  // Get available opponents for selected team (or all opponents if "All Teams" is selected)
  const availableOpponents = useMemo(() => {
    const teamKey = getTeamKey();
    const opponentKey = getOpponentKey();
    const opponents = new Set<string>();
    matchData.forEach((match) => {
      const team = match[teamKey];
      const opponent = match[opponentKey];
      // If no team selected (All Teams), show all opponents. Otherwise, filter by team.
      if ((!selectedTeam || team === selectedTeam) && opponent && typeof opponent === 'string' && opponent.trim()) {
        opponents.add(opponent.trim());
      }
    });
    return Array.from(opponents).sort();
  }, [matchData, selectedTeam, columnKeys]);

  // Helper function to parse dates (reusable)
  const parseDateHelper = (value: string | number | undefined | null): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    
    // Handle Google Sheets date serial numbers
    if (typeof value === 'number') {
      if (value <= 0 || value > 1000000) return null;
      
      if (value >= 1 && value <= 100000) {
        const MS_PER_DAY = 86400000;
        const EPOCH_OFFSET = new Date(1899, 11, 30).getTime();
        const date = new Date(EPOCH_OFFSET + (value - 1) * MS_PER_DAY);
        
        if (value > 59) {
          date.setTime(date.getTime() - MS_PER_DAY);
        }
        
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          if (year >= 2000 && year <= 2100) {
            return date;
          }
        }
      }
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      
      // Try MM/DD/YYYY format
      const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyy) {
        const month = parseInt(mmddyyyy[1], 10) - 1;
        const day = parseInt(mmddyyyy[2], 10);
        const year = parseInt(mmddyyyy[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Try YYYY-MM-DD format
      const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (yyyymmdd) {
        const year = parseInt(yyyymmdd[1], 10);
        const month = parseInt(yyyymmdd[2], 10) - 1;
        const day = parseInt(yyyymmdd[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            if (year >= 2000 && year <= 2100) {
              return date;
            }
          }
        }
      }
      
      // Try standard Date parsing
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        if (year >= 2000 && year <= 2100) {
          return parsed;
        }
      }
    }
    
    return null;
  };

  // Filter data by selected team, opponent, and last N games
  const filteredData = useMemo(() => {
    const teamKey = getTeamKey();
    const opponentKey = getOpponentKey();
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date')
    ) || '';
    
    // Start with all matches or filter by team
    let filtered = matchData;
    
    // Filter by team if a specific team is selected (null means "All Teams")
    // selectedTeam is now a slug from the dropdown
    if (selectedTeam) {
      filtered = filtered.filter((match) => {
        const matchTeamSlug = (match[teamKey] as string)?.trim();
        return matchTeamSlug === selectedTeam; // selectedTeam is the slug
      });
    }

    // Filter by opponent if selected (but ignore when All Teams is selected)
    if (selectedOpponent && selectedTeam !== null) {
      filtered = filtered.filter((match) => {
        const opponent = match[opponentKey];
        return opponent === selectedOpponent;
      });
    }

    // Filter by selected date if specified
    if (dateKey && selectedDate) {
      filtered = filtered.filter((match) => {
        const matchDate = parseDateHelper(match[dateKey]);
        if (!matchDate) return false;
        
        const matchDateStr = matchDate.toISOString().split('T')[0];
        return matchDateStr === selectedDate;
      });
    }

    // Filter by last N games if specified (only when specific team is selected)
    if (lastNGames && lastNGames > 0 && dateKey && selectedTeam !== null) {
      // When a specific team is selected, filter globally
      // Sort matches by date (most recent first)
      const matchesWithDates = filtered.map(match => ({
        match,
        date: parseDateHelper(match[dateKey])
      })).filter(item => item.date !== null);
      
      // Sort by date descending (most recent first)
      matchesWithDates.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.getTime() - a.date.getTime();
      });
      
      // Take the last N games
      filtered = matchesWithDates.slice(0, lastNGames).map(item => item.match);
    }

    return filtered;
  }, [matchData, selectedTeam, selectedOpponent, lastNGames, selectedDate, columnKeys, parseDateHelper]);

  // Process custom chart data using filteredData (respects Last N Games and other filters)
  useEffect(() => {
    if (viewMode === 'dashboard' && customCharts.length > 0 && filteredData.length > 0) {
      const chartDataMap: Record<number, any> = {};
      for (const chart of customCharts) {
        try {
          const data = prepareChartData(filteredData, chart.config);
          chartDataMap[chart.id] = data;
        } catch (err) {
          console.error(`Failed to process chart ${chart.id}:`, err);
        }
      }
      setCustomChartData(chartDataMap);
    }
  }, [viewMode, customCharts, filteredData]);

  const teamKey = getTeamKey();
  const opponentKey = getOpponentKey();

  // Calculate available dates based on selected opponent
  const availableDates = useMemo(() => {
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date')
    ) || '';
    
    if (!dateKey) {
      return [];
    }
    
    // Filter matches by selected team and opponent
    let filteredMatches = matchData;
    
    if (selectedTeam) {
      // selectedTeam is now a slug, match against team column (which should also be slugs)
      filteredMatches = filteredMatches.filter(match => {
        const matchTeamSlug = (match[teamKey] as string)?.trim();
        return matchTeamSlug === selectedTeam;
      });
    }
    
    if (selectedOpponent && selectedTeam !== null) {
      filteredMatches = filteredMatches.filter(match => match[opponentKey] === selectedOpponent);
    }
    
    // Extract unique dates from filtered matches
    const dateMap = new Map<string, Date>();
    
    filteredMatches.forEach(match => {
      const date = parseDateHelper(match[dateKey]);
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, date);
        }
      }
    });
    
    // Convert to array and sort by date (most recent first)
    const dates = Array.from(dateMap.entries())
      .map(([dateStr, date]) => ({
        value: dateStr,
        label: formatDateWithUserPreference(date, user?.preferences),
        date: date
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return dates.map(({ value, label }) => ({ value, label }));
  }, [matchData, selectedTeam, selectedOpponent, columnKeys, parseDateHelper, teamKey, opponentKey]);

  // Reset opponent when team changes
  useEffect(() => {
    setSelectedOpponent(null);
    setSelectedDate(''); // Clear date when team changes
  }, [selectedTeam]);

  // Clear selected date if it's no longer in available dates
  useEffect(() => {
    if (selectedDate && !availableDates.some(d => d.value === selectedDate)) {
      setSelectedDate('');
    }
  }, [selectedDate, availableDates]);

  // Calculate averages for filtered matches
  const calculateAverage = (key: string, data: MatchData[]): number => {
    const values = data
      .map((match) => match[key])
      .filter((val) => typeof val === 'number') as number[];
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };


  // Transform data for "All Teams" mode - aggregate by team
  const dataToDisplay = useMemo(() => {
    // If a specific team is selected, use filteredData as-is
    if (selectedTeam !== null) {
      return filteredData;
    }

    // When "All Teams" is selected, aggregate data by team
    const teamKey = getTeamKey();
    const opponentKey = getOpponentKey();
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date')
    ) || '';

    // Group matches by team
    const teamGroups = new Map<string, MatchData[]>();
    
    filteredData.forEach((match) => {
      const team = match[teamKey];
      if (team && typeof team === 'string') {
        const teamName = team.trim();
        if (!teamGroups.has(teamName)) {
          teamGroups.set(teamName, []);
        }
        teamGroups.get(teamName)!.push(match);
      }
    });

    // For each team, apply last N games filter and calculate averages
    const aggregatedData: MatchData[] = [];
    
    teamGroups.forEach((matches, teamName) => {
      let teamMatches = matches;
      
      // Apply last N games filter per team
      if (lastNGames && lastNGames > 0 && dateKey) {
        const matchesWithDates = teamMatches.map(match => ({
          match,
          date: parseDateHelper(match[dateKey])
        })).filter(item => item.date !== null);
        
        matchesWithDates.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime();
        });
        
        teamMatches = matchesWithDates.slice(0, lastNGames).map(item => item.match);
      }

      if (teamMatches.length === 0) return;

      // Calculate averages for all numeric columns
      // teamName is the slug from match data
      const teamSlug = teamName; // teamName from forEach is the slug
      const dbTeam = teamSlugMap.get(teamSlug.toLowerCase().trim());
      const displayName = dbTeam?.displayName || teamSlug;
      
      const aggregatedMatch: MatchData = {
        [teamKey]: teamSlug, // Store slug in match data
        [opponentKey]: displayName, // Use Display Name for x-axis display
      } as MatchData;

      // Get all numeric columns from the first match
      Object.keys(teamMatches[0]).forEach((key) => {
        const values = teamMatches
          .map(m => m[key])
          .filter(val => typeof val === 'number') as number[];
        
        if (values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          // Round to nearest hundredth (2 decimal places)
          aggregatedMatch[key] = Math.round(avg * 100) / 100;
        } else {
          // Preserve non-numeric values from first match
          aggregatedMatch[key] = teamMatches[0][key];
        }
      });

      aggregatedData.push(aggregatedMatch);
    });

    // Sort teams alphabetically
    aggregatedData.sort((a, b) => {
      const aTeam = a[teamKey] as string;
      const bTeam = b[teamKey] as string;
      if (!aTeam || !bTeam) return 0;
      return aTeam.localeCompare(bTeam);
    });

    return aggregatedData;
  }, [filteredData, selectedTeam, lastNGames, columnKeys]);

  // Get available teams for Club Data based on additional options
  const availableClubTeams = useMemo(() => {
    if (viewMode !== 'club-data') return [];
    
    const teamKeyForClub = getTeamKey();
    
    // Extract team slugs from match data
    const allTeamSlugs = new Set<string>();
    matchData.forEach(match => {
      const team = match[teamKeyForClub];
      if (team && typeof team === 'string' && team.trim()) {
        allTeamSlugs.add(team.trim());
      }
    });

    // Filter slugs by database team properties (gender/variant)
    const filteredSlugs = Array.from(allTeamSlugs).filter(slug => {
      const team = teamSlugMap.get(slug.toLowerCase().trim());
      if (!team) {
        // If team not found in database, use fallback logic (check slug prefix)
        const slugUpper = slug.trim().toUpperCase();
        const isBoysTeam = slugUpper.startsWith('B');
        const isGirlsTeam = slugUpper.startsWith('G');
        const isBlackTeam = slugUpper.includes('BLACK') || slugUpper.includes('-BL-');
        
        // Filter by gender
        if (isBoysTeam && !includeBoysTeams) return false;
        if (isGirlsTeam && !includeGirlsTeams) return false;
        if (!isBoysTeam && !isGirlsTeam) return false; // Exclude if can't determine gender
        
        // Filter by variant
        if (isBlackTeam && !includeBlackTeams) return false;
        
        return true;
      }
      
      // Filter by gender using database team property
      if (team.gender === 'boys' && !includeBoysTeams) return false;
      if (team.gender === 'girls' && !includeGirlsTeams) return false;
      if (!team.gender) return false; // Exclude if no gender set
      
      // Filter by variant using database team property
      if (team.variant === 'black' && !includeBlackTeams) return false;
      
      return true;
    });

    // Map slugs to Display Names for dropdown
    return getTeamsForDropdown(filteredSlugs, teamSlugMap);
  }, [viewMode, matchData, includeBoysTeams, includeGirlsTeams, includeBlackTeams, columnKeys, teamSlugMap]);

  // Track previous additional options to detect changes
  const prevAdditionalOptionsRef = useRef<string[]>(additionalOptions);
  const isInitialMountRef = useRef(true);
  const isInitialAutoSelectRef = useRef(false);

  // Sync selected teams when available teams change based on additional options
  useEffect(() => {
    if (viewMode !== 'club-data' || availableClubTeams.length === 0) return;
    
    const prevOptions = prevAdditionalOptionsRef.current;
    const prevIncludeBoys = prevOptions.includes('boys');
    const prevIncludeGirls = prevOptions.includes('girls');
    const prevIncludeBlack = prevOptions.includes('blackTeams');
    
    // Check if selectedClubTeams param exists in URL (view-scoped: clubData.teams)
    const params = new URLSearchParams(window.location.search);
    const hasURLParam = params.has('clubData.teams');
    
    // On initial mount, only auto-select all teams if there's no URL param
    // (meaning user is visiting fresh, not from a URL with explicit selection)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (!hasURLParam && selectedClubTeams.length === 0) {
        // No URL param and no selection = fresh visit, auto-select all
        // Mark this as initial auto-select so we can clean it from URL
        isInitialAutoSelectRef.current = true;
        setSelectedClubTeams(availableClubTeams.map(t => t.slug));
        // Remove from URL immediately since this is the "default" behavior
        setTimeout(() => {
          const newParams = new URLSearchParams(window.location.search);
          if (newParams.has('clubData.teams')) {
            newParams.delete('clubData.teams');
            const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}${window.location.hash}`;
            window.history.replaceState({}, '', newUrl);
          }
          isInitialAutoSelectRef.current = false;
        }, 0);
      }
      prevAdditionalOptionsRef.current = additionalOptions;
      return;
    }
    
    // Get currently selected teams that are still in available teams
    // availableClubTeams is now array of {slug, displayName}, selectedClubTeams contains slugs
    const availableSlugs = new Set(availableClubTeams.map(t => t.slug));
    const validSelectedTeams = selectedClubTeams.filter(slug => availableSlugs.has(slug));
    
    // Find teams that should be auto-selected (newly enabled team types)
    const teamsToAutoSelect: string[] = [];
    const teamsToRemove: string[] = [];
    
    // Check if boys teams were just disabled (unchecked)
    if (!includeBoysTeams && prevIncludeBoys) {
      const boysTeams = selectedClubTeams.filter(slug => {
        const team = teamSlugMap.get(slug.toLowerCase().trim());
        return team?.gender === 'boys' || (!team && slug.trim().toUpperCase().startsWith('B'));
      });
      teamsToRemove.push(...boysTeams);
    }
    
    // Check if girls teams were just disabled (unchecked)
    if (!includeGirlsTeams && prevIncludeGirls) {
      const girlsTeams = selectedClubTeams.filter(slug => {
        const team = teamSlugMap.get(slug.toLowerCase().trim());
        return team?.gender === 'girls' || (!team && slug.trim().toUpperCase().startsWith('G'));
      });
      teamsToRemove.push(...girlsTeams);
    }
    
    // Check if boys teams were just enabled (newly checked)
    if (includeBoysTeams && !prevIncludeBoys) {
      const boysTeams = availableClubTeams
        .filter(team => {
          const dbTeam = teamSlugMap.get(team.slug.toLowerCase().trim());
          return dbTeam?.gender === 'boys' || (!dbTeam && team.slug.trim().toUpperCase().startsWith('B'));
        })
        .map(team => team.slug);
      teamsToAutoSelect.push(...boysTeams);
    }
    
    // Check if girls teams were just enabled (newly checked)
    if (includeGirlsTeams && !prevIncludeGirls) {
      const girlsTeams = availableClubTeams
        .filter(team => {
          const dbTeam = teamSlugMap.get(team.slug.toLowerCase().trim());
          return dbTeam?.gender === 'girls' || (!dbTeam && team.slug.trim().toUpperCase().startsWith('G'));
        })
        .map(team => team.slug);
      teamsToAutoSelect.push(...girlsTeams);
    }
    
    // Check if black teams were just enabled (newly checked)
    if (includeBlackTeams && !prevIncludeBlack) {
      const blackTeams = availableClubTeams
        .filter(team => {
          const dbTeam = teamSlugMap.get(team.slug.toLowerCase().trim());
          return dbTeam?.variant === 'black' || (!dbTeam && (team.slug.trim().toUpperCase().includes('BLACK') || team.slug.trim().toUpperCase().includes('-BL-')));
        })
        .map(team => team.slug);
      teamsToAutoSelect.push(...blackTeams);
    }
    
    // Update previous options
    prevAdditionalOptionsRef.current = additionalOptions;
    
    // If teams need to be removed, add a delay for smooth animation
    if (teamsToRemove.length > 0) {
      // Delay removal to allow charts to animate out
      setTimeout(() => {
        setSelectedClubTeams(prev => prev.filter(team => !teamsToRemove.includes(team)));
      }, 300); // Match animation duration
    }
    
    // If teams need to be added, do it immediately for smooth animation in
    if (teamsToAutoSelect.length > 0) {
      const newSelectedTeams = [...new Set([...validSelectedTeams, ...teamsToAutoSelect])];
      if (JSON.stringify(newSelectedTeams.sort()) !== JSON.stringify(selectedClubTeams.sort())) {
        setSelectedClubTeams(newSelectedTeams);
      }
    } else if (teamsToRemove.length === 0) {
      // No changes, just update valid teams if needed
      if (JSON.stringify(validSelectedTeams.sort()) !== JSON.stringify(selectedClubTeams.sort())) {
        setSelectedClubTeams(validSelectedTeams);
      }
    }
  }, [additionalOptions, availableClubTeams, selectedClubTeams, includeBoysTeams, includeGirlsTeams, viewMode, setSelectedClubTeams]);

  // Club Data: Aggregate data by team for club overview
  const clubDataByTeam = useMemo(() => {
    if (viewMode !== 'club-data') return [];

    const teamKeyForClub = getTeamKey();
    const dateKey = columnKeys.find(key => 
      key.toLowerCase().includes('date')
    ) || '';
    
    if (!dateKey) return [];

    // Filter teams to only include selected teams (selectedClubTeams contains slugs)
    const selectedSlugs = new Set(selectedClubTeams);
    const teams = availableClubTeams.filter(team => selectedSlugs.has(team.slug));

    const nGames = lastNGames || 10;

    // Aggregate data for each team
    const aggregated: MatchData[] = [];
    
    teams.forEach(teamObj => {
      const teamSlug = teamObj.slug; // Use slug for filtering match data
      // Get all matches for this team
      let teamMatches = matchData.filter(match => {
        const matchTeamSlug = (match[teamKeyForClub] as string)?.trim();
        return matchTeamSlug === teamSlug;
      });

      // Sort by date (most recent first) and take last N games (or all if less than N)
      const matchesWithDates = teamMatches.map(match => ({
        match,
        date: parseDateHelper(match[dateKey])
      })).filter(item => item.date !== null);
      
      matchesWithDates.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.getTime() - a.date.getTime();
      });

      const recentMatches = matchesWithDates.slice(0, nGames).map(item => item.match);
      
      if (recentMatches.length === 0) return;

      // Calculate averages for all numeric columns
      // teamObj.slug is the slug, use it for the teamKey column
      // Use displayName for charts (opponentKey is used as x-axis label in charts)
      const opponentKeyForClub = getOpponentKey();
      const aggregatedMatch: MatchData = {
        [teamKeyForClub]: teamSlug, // Store slug in match data (for filtering)
        [opponentKeyForClub]: teamObj.displayName, // Use Display Name for x-axis display in charts
      } as MatchData;

      // Get all numeric columns and round to 2 decimal places
      columnKeys.forEach(key => {
        const values = recentMatches
          .map(m => m[key])
          .filter(val => typeof val === 'number' && !isNaN(val)) as number[];
        
        if (values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          // Round to nearest hundredth (2 decimal places)
          aggregatedMatch[key] = Math.round(avg * 100) / 100;
        }
      });

      aggregated.push(aggregatedMatch);
    });

    return aggregated;
  }, [viewMode, matchData, lastNGames, additionalOptions, columnKeys, parseDateHelper, includeBoysTeams, includeGirlsTeams, includeBlackTeams]);
  
  // Get team display name for labels (use display name from database or fallback to slug)
  const teamDisplayName = selectedTeam 
    ? getDisplayNameForSlug(selectedTeam, teamSlugMap) 
    : 'Team';

  // Get all numeric columns that should be charted
  const chartableColumns = useMemo(() => {
    if (dataToDisplay.length === 0) return [];
    
    const numericColumns: string[] = [];
    
    columnKeys.forEach(key => {
      // Skip non-numeric columns and metadata columns
      if (shouldExcludeColumn(key, teamKey, opponentKey)) return;
      
      // Check if this column has numeric values
      const hasNumericValue = dataToDisplay.some(match => {
        const value = match[key];
        return typeof value === 'number' && !isNaN(value);
      });
      
      if (hasNumericValue) {
        numericColumns.push(key);
      }
    });
    
    return numericColumns;
  }, [dataToDisplay, columnKeys, teamKey, opponentKey]);

  // Find column pairs (e.g., "Shots For" / "Shots Against")
  const columnPairs = useMemo(() => {
    return findColumnPairs(chartableColumns);
  }, [chartableColumns]);

  // Get columns that are already handled by special charts (to avoid duplicates)
  const specialChartColumns = useMemo(() => {
    const special: string[] = [];
    if (columnKeys.includes(getShotsForKey())) special.push(getShotsForKey());
    if (columnKeys.includes(getShotsAgainstKey())) special.push(getShotsAgainstKey());
    if (columnKeys.includes(getGoalsForKey())) special.push(getGoalsForKey());
    if (columnKeys.includes(getGoalsAgainstKey())) special.push(getGoalsAgainstKey());
    if (columnKeys.includes(getPossessionKey())) special.push(getPossessionKey());
    if (columnKeys.includes(getPassShareKey())) special.push(getPassShareKey());
    if (columnKeys.includes(getxGKey())) special.push(getxGKey());
    if (columnKeys.includes(getxGAKey())) special.push(getxGAKey());
    if (columnKeys.includes(getConversionRateKey())) special.push(getConversionRateKey());
    if (columnKeys.includes(getOppConversionRateKey())) special.push(getOppConversionRateKey());
    if (columnKeys.includes(getAttemptsKey())) special.push(getAttemptsKey());
    if (columnKeys.includes(getOppAttemptsKey())) special.push(getOppAttemptsKey());
    if (columnKeys.includes(getInsideBoxAttemptsPctKey())) special.push(getInsideBoxAttemptsPctKey());
    if (columnKeys.includes(getOutsideBoxAttemptsPctKey())) special.push(getOutsideBoxAttemptsPctKey());
    if (columnKeys.includes(getOppInsideBoxAttemptsPctKey())) special.push(getOppInsideBoxAttemptsPctKey());
    if (columnKeys.includes(getOppOutsideBoxAttemptsPctKey())) special.push(getOppOutsideBoxAttemptsPctKey());
    if (columnKeys.includes(getCornersForKey())) special.push(getCornersForKey());
    if (columnKeys.includes(getCornersAgainstKey())) special.push(getCornersAgainstKey());
    if (columnKeys.includes(getFreeKickForKey())) special.push(getFreeKickForKey());
    if (columnKeys.includes(getFreeKickAgainstKey())) special.push(getFreeKickAgainstKey());
    if (columnKeys.includes(getLPCAvgKey())) special.push(getLPCAvgKey());
    if (columnKeys.includes(getSPIKey())) special.push(getSPIKey());
    if (columnKeys.includes(getSPIWKey())) special.push(getSPIWKey());
    if (columnKeys.includes(getOppSPIKey())) special.push(getOppSPIKey());
    if (columnKeys.includes(getOppSPIWKey())) special.push(getOppSPIWKey());
    if (columnKeys.includes(getPassesForKey())) special.push(getPassesForKey());
    if (columnKeys.includes(getOppPassesKey())) special.push(getOppPassesKey());
    if (columnKeys.includes(getAvgPassLengthKey())) special.push(getAvgPassLengthKey());
    if (columnKeys.includes(getOppAvgPassLengthKey())) special.push(getOppAvgPassLengthKey());
    if (columnKeys.includes(getPPMKey())) special.push(getPPMKey());
    if (columnKeys.includes(getOppPPMKey())) special.push(getOppPPMKey());
    // Add pass string length columns
    getPassStrLengthKeys().forEach(key => {
      if (columnKeys.includes(key)) special.push(key);
    });
    getOppPassStrLengthKeys().forEach(key => {
      if (columnKeys.includes(key)) special.push(key);
    });
    // Add pass by zone columns
    getPassByZoneKeys().forEach(key => {
      if (columnKeys.includes(key)) special.push(key);
    });
    getOppPassByZoneKeys().forEach(key => {
      if (columnKeys.includes(key)) special.push(key);
    });
    return special;
  }, [columnKeys]);

  // Get columns for auto-charting (exclude special chart columns)
  const autoChartColumns = useMemo(() => {
    return chartableColumns.filter(col => !specialChartColumns.includes(col));
  }, [chartableColumns, specialChartColumns]);

  // Determine available charts based on column keys
  const availableCharts = useMemo<ChartType[]>(() => {
    const charts: ChartType[] = [];
    if (columnKeys.includes(getShotsForKey()) && columnKeys.includes(getShotsAgainstKey())) {
      charts.push('shots');
    }
    if (columnKeys.includes(getGoalsForKey()) && columnKeys.includes(getGoalsAgainstKey())) {
      charts.push('goals');
    }
    if (columnKeys.includes(getPossessionKey())) {
      charts.push('possession');
    }
    if (columnKeys.includes(getxGKey()) && columnKeys.includes(getxGAKey())) {
      charts.push('xg');
    }
    if (columnKeys.includes(getTSRKey()) || columnKeys.includes(getOppTSRKey())) {
      charts.push('tsr');
    }
    if (columnKeys.includes(getSPIKey()) || columnKeys.includes(getSPIWKey()) || 
        columnKeys.includes(getOppSPIKey()) || columnKeys.includes(getOppSPIWKey())) {
      charts.push('spi');
    }
    if (columnKeys.includes(getConversionRateKey()) || columnKeys.includes(getOppConversionRateKey())) {
      charts.push('conversionRate');
    }
    if (columnKeys.includes(getAttemptsKey()) && columnKeys.includes(getOppAttemptsKey())) {
      charts.push('attempts');
    }
    if ((columnKeys.includes(getInsideBoxAttemptsPctKey()) || columnKeys.includes(getOutsideBoxAttemptsPctKey())) &&
        (columnKeys.includes(getOppInsideBoxAttemptsPctKey()) || columnKeys.includes(getOppOutsideBoxAttemptsPctKey()))) {
      charts.push('positionalAttempts');
    }
    if ((columnKeys.includes(getCornersForKey()) || columnKeys.includes(getCornersAgainstKey())) &&
        (columnKeys.includes(getFreeKickForKey()) || columnKeys.includes(getFreeKickAgainstKey()))) {
      charts.push('miscStats');
    }
    if (columnKeys.includes(getPassesForKey()) && columnKeys.includes(getOppPassesKey())) {
      charts.push('passes');
    }
    if (columnKeys.includes(getAvgPassLengthKey()) && columnKeys.includes(getOppAvgPassLengthKey())) {
      charts.push('avgPassLength');
    }
    if (columnKeys.includes(getTeamPassStrings35Key()) && 
        columnKeys.includes(getTeamPassStrings6PlusKey()) && 
        columnKeys.includes(getLPCAvgKey())) {
      charts.push('passStrLength');
    }
    if (columnKeys.includes(getSPIKey()) || columnKeys.includes(getSPIWKey()) || 
        columnKeys.includes(getOppSPIKey()) || columnKeys.includes(getOppSPIWKey())) {
      charts.push('passingSPI');
    }
    if (getPassByZoneKeys().length > 0 && getOppPassByZoneKeys().length > 0) {
      charts.push('passByZone');
    }
    if (columnKeys.includes(getPPMKey()) && columnKeys.includes(getOppPPMKey())) {
      charts.push('ppm');
    }
    if (columnKeys.includes(getPassShareKey()) || columnKeys.includes(getOppPassShareKey())) {
      charts.push('passShare');
    }
    // Note: 'auto' charts removed from dropdown - can be re-enabled later if needed
    // if (autoChartColumns.length > 0) {
    //   charts.push('auto');
    // }
    // Include individual custom chart IDs (not 'customCharts' group)
    customCharts.forEach(chart => {
      charts.push(`custom-chart-${chart.id}`);
    });
    return charts;
  }, [columnKeys, autoChartColumns, customCharts]);

  // Track if charts came from URL on mount
  const chartsFromURLRef = useRef(false);
  const prevChartGroupRef = useRef<string | null>(selectedChartGroup); // Initialize to current value
  const chartsInitialMountRef = useRef(true);
  
  // Check if charts came from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('charts')) {
      chartsFromURLRef.current = true;
    }
    // Mark initial mount as complete after first render
    setTimeout(() => {
      chartsInitialMountRef.current = false;
    }, 0);
  }, []);

  // Handle chart group selection - only auto-select when user explicitly changes chart group
  useEffect(() => {
    // Skip on initial mount or if charts came from URL
    if (chartsInitialMountRef.current || chartsFromURLRef.current) {
      prevChartGroupRef.current = selectedChartGroup;
      return;
    }
    
    // Only auto-select if chart group actually changed (user action)
    const chartGroupChanged = prevChartGroupRef.current !== selectedChartGroup;
    prevChartGroupRef.current = selectedChartGroup;
    
    if (selectedChartGroup && chartGroupChanged && availableCharts.length > 0) {
      const group = CHART_GROUPS.find(g => g.id === selectedChartGroup);
      if (group) {
        // Filter to only include charts that are available
        const chartsToSelect = group.charts.filter(chart => availableCharts.includes(chart));
        if (chartsToSelect.length > 0) {
          setSelectedCharts(chartsToSelect);
        }
      }
    }
  }, [selectedChartGroup, availableCharts.length]);

  // Initialize charts when chart group is set but charts are empty and availableCharts becomes available
  useEffect(() => {
    // Skip if charts came from URL
    if (chartsFromURLRef.current) {
      return;
    }
    
    // If we have a chart group selected but no charts (or charts don't match the group), and availableCharts is ready, initialize
    if (selectedChartGroup && availableCharts.length > 0) {
      const group = CHART_GROUPS.find(g => g.id === selectedChartGroup);
      if (group) {
        // Filter to only include charts that are available
        const chartsToSelect = group.charts.filter(chart => availableCharts.includes(chart));
        
        // Only update if we have charts to select and current selection doesn't match
        if (chartsToSelect.length > 0) {
          const currentMatchesGroup = chartsToSelect.every(chart => selectedCharts.includes(chart)) &&
                                     selectedCharts.every(chart => chartsToSelect.includes(chart));
          
          if (!currentMatchesGroup) {
            setSelectedCharts(chartsToSelect);
          }
        }
      }
    }
  }, [selectedChartGroup, availableCharts, selectedCharts]);

  // Filter out invalid selected charts when availableCharts changes
  // This ensures charts that are no longer available (e.g., due to missing columns) are removed
  useEffect(() => {
    // Skip on initial mount or if charts came from URL
    if (chartsInitialMountRef.current || chartsFromURLRef.current) {
      return;
    }
    
    // Filter selectedCharts to only include charts that are still available
    // Handle both ChartType values and custom chart IDs
    const validCharts = selectedCharts.filter(chart => {
      // Check if it's a standard chart type
      if (availableCharts.includes(chart as ChartType)) {
        return true;
      }
      // Check if it's a custom chart ID that still exists
      if (typeof chart === 'string' && chart.startsWith('custom-chart-')) {
        const chartId = parseInt(chart.replace('custom-chart-', ''), 10);
        return customCharts.some(c => c.id === chartId);
      }
      return false;
    });
    
    // Only update if there's a difference (some charts were removed)
    if (validCharts.length !== selectedCharts.length) {
      setSelectedCharts(validCharts);
    }
  }, [availableCharts, selectedCharts]);

  // Don't auto-initialize with all charts - let user select charts explicitly
  // This prevents empty charts from being auto-filled and written to URL

  // Handle navigation from sidebar
  const handleNavigation = (view: 'dashboard' | 'chat' | 'team-data' | 'club-data' | 'game-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings' | 'glossary') => {
    if (view === 'chat') {
      setViewMode('chat');
    } else if (view === 'team-data') {
      setViewMode('dashboard');
      setSelectedTeam(null); // Reset to no team selected for Team Data home page
    } else if (view === 'game-data') {
      setViewMode('game-data');
    } else if (view === 'club-data') {
      setViewMode('club-data');
    } else if (view === 'upload-game-data') {
      setViewMode('upload-game-data');
    } else if (view === 'data-at-a-glance') {
      setViewMode('data-at-a-glance');
    } else if (view === 'settings') {
      setViewMode('settings');
    } else if (view === 'glossary') {
      setViewMode('glossary');
    } else {
      setViewMode('dashboard');
    }
  };

  // Show loading state (auth check in progress)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
          <p className="mt-2 text-sm text-gray-500">Setting up database...</p>
        </div>
      </div>
    );
  }

  // Show setup wizard if no users exist (check BEFORE any data loading)
  if (isSetupRequired) {
    return <SetupWizard />;
  }

  // Show login page if not authenticated (check BEFORE any data loading)
  if (!user) {
    // Check for password reset or email verification routes
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    
    // Check for password reset - be more flexible with path matching
    // Allow /reset-password, /reset-password/, or token in query string
    const isResetPassword = 
      path === '/reset-password' || 
      path === '/reset-password/' ||
      path.includes('/reset-password') ||
      hash.includes('reset-password') || 
      hash.includes('#reset-password') ||
      (token && (hash.includes('reset') || hash.includes('#reset')));
    
    // Check for email verification
    const isVerifyEmail = 
      path === '/verify-email' || 
      path === '/verify-email/' ||
      path.includes('/verify-email') ||
      hash.includes('verify-email') || 
      hash.includes('#verify-email') ||
      (token && (hash.includes('verify') || hash.includes('#verify')));
    
    if (isResetPassword) {
      return <PasswordResetForm />;
    }
    
    if (isVerifyEmail) {
      return <EmailVerification />;
    }
    
    return <LoginPage />;
  }

  // Show data loading state (separate from auth loading)
  // Only show this if user is authenticated
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded text-sm text-gray-600">
            <p className="font-semibold mb-2">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ensure <code className="bg-gray-200 px-1 rounded">GOOGLE_SHEETS_SPREADSHEET_ID</code> is set in backend environment variables</li>
              <li>Ensure <code className="bg-gray-200 px-1 rounded">GOOGLE_SHEETS_API_KEY</code> is set in backend environment variables</li>
              <li>Make sure your sheet is public or the API key has proper permissions</li>
              <li>Verify you are logged in (sheets API requires authentication)</li>
              <li>Check backend logs for detailed error messages</li>
            </ol>
            <p className="mt-2 text-xs">
              Note: Credentials are now managed by the backend for security. Contact your administrator if you need access.
            </p>
          </div>
          <button
            onClick={loadData}
            className="mt-4 w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (matchData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No match data found.</p>
          <button
            onClick={loadData}
            className="mt-4 text-white px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#6787aa' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#557799';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6787aa';
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Render chat-first view if selected
  if (viewMode === 'chat') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="chat" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16" data-tour="chat-content">
          <ChatFirstView matchData={matchData} columnKeys={columnKeys} sheetConfig={sheetConfig} />
        </div>
      </div>
    );
  }

  // Render Game Data view if selected
  if (viewMode === 'game-data') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="game-data" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16" data-tour="game-data-content">
          <GameDataView
            matchData={matchData}
            columnKeys={columnKeys}
            getTeamKey={getTeamKey}
            getOpponentKey={getOpponentKey}
            getLabelKey={getLabelKey}
            parseDateHelper={parseDateHelper}
            teamSlugMap={teamSlugMap}
            selectedOpponents={selectedOpponents}
            setSelectedOpponents={setSelectedOpponents}
            selectedShootingMetrics={selectedShootingMetrics}
            setSelectedShootingMetrics={setSelectedShootingMetrics}
            selectedPassingMetrics={selectedPassingMetrics}
            setSelectedPassingMetrics={setSelectedPassingMetrics}
            selectedPossessionMetrics={selectedPossessionMetrics}
            setSelectedPossessionMetrics={setSelectedPossessionMetrics}
            selectedJOGAMetrics={selectedJOGAMetrics}
            setSelectedJOGAMetrics={setSelectedJOGAMetrics}
            selectedDefenseMetrics={selectedDefenseMetrics}
            setSelectedDefenseMetrics={setSelectedDefenseMetrics}
            selectedSetPiecesMetrics={selectedSetPiecesMetrics}
            setSelectedSetPiecesMetrics={setSelectedSetPiecesMetrics}
            selectedOtherMetrics={selectedOtherMetrics}
            setSelectedOtherMetrics={setSelectedOtherMetrics}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
          />
        </div>
      </div>
    );
  }

  // Render upload game data view if selected
  if (viewMode === 'upload-game-data') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="upload-game-data" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16">
          <UploadGameDataView matchData={matchData} columnKeys={columnKeys} sheetConfig={sheetConfig} teamSlugMap={teamSlugMap} />
        </div>
      </div>
    );
  }

  // Render Data at a Glance view if selected
  if (viewMode === 'data-at-a-glance') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="data-at-a-glance" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16">
          <DataAtAGlanceView matchData={matchData} columnKeys={columnKeys} teamSlugMap={teamSlugMap} />
        </div>
      </div>
    );
  }

  // Render Settings view if selected
  if (viewMode === 'settings') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="settings" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16">
          <SettingsView />
        </div>
        {showWalkthrough && (
          <WalkthroughOverlay onClose={() => setShowWalkthrough(false)} />
        )}
      </div>
    );
  }

  // Render Glossary view if selected
  if (viewMode === 'glossary') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="glossary" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16">
          <Glossary />
        </div>
      </div>
    );
  }

  // Custom Charts view removed - now managed via chart selector and Settings

  // Render Club Data view if selected
  if (viewMode === 'club-data') {
    return (
      <div className="flex h-screen bg-gray-50 relative">
        <Sidebar currentView="club-data" onNavigate={handleNavigation} />
        <div className="flex-1 ml-16 flex flex-col overflow-auto" data-tour="club-data-content">
          <ClubDataView
            matchData={matchData}
            columnKeys={columnKeys}
            clubDataByTeam={clubDataByTeam}
            availableClubTeams={availableClubTeams}
            selectedClubTeams={selectedClubTeams}
            setSelectedClubTeams={setSelectedClubTeams}
            teamSlugMap={teamSlugMap}
            lastNGames={lastNGames}
            setLastNGames={setLastNGames}
            selectedChartGroup={selectedChartGroup}
            setSelectedChartGroup={setSelectedChartGroup}
            selectedCharts={selectedCharts}
            setSelectedCharts={setSelectedCharts}
            additionalOptions={additionalOptions}
            setAdditionalOptions={setAdditionalOptions}
            availableCharts={availableCharts}
            autoChartColumns={autoChartColumns}
            columnPairs={columnPairs}
            getTeamKey={getTeamKey}
            getShotsForKey={getShotsForKey}
            getShotsAgainstKey={getShotsAgainstKey}
            getGoalsForKey={getGoalsForKey}
            getGoalsAgainstKey={getGoalsAgainstKey}
            getPossessionKey={getPossessionKey}
            getOppPossessionKey={getOppPossessionKey}
            getPassShareKey={getPassShareKey}
            getxGKey={getxGKey}
            getxGAKey={getxGAKey}
            getTSRKey={getTSRKey}
            getOppTSRKey={getOppTSRKey}
            getSPIKey={getSPIKey}
            getSPIWKey={getSPIWKey}
            getOppSPIKey={getOppSPIKey}
            getOppSPIWKey={getOppSPIWKey}
            getConversionRateKey={getConversionRateKey}
            getOppConversionRateKey={getOppConversionRateKey}
            getAttemptsKey={getAttemptsKey}
            getOppAttemptsKey={getOppAttemptsKey}
            getInsideBoxAttemptsPctKey={getInsideBoxAttemptsPctKey}
            getOutsideBoxAttemptsPctKey={getOutsideBoxAttemptsPctKey}
            getOppInsideBoxAttemptsPctKey={getOppInsideBoxAttemptsPctKey}
            getOppOutsideBoxAttemptsPctKey={getOppOutsideBoxAttemptsPctKey}
            getCornersForKey={getCornersForKey}
            getCornersAgainstKey={getCornersAgainstKey}
            getFreeKickForKey={getFreeKickForKey}
            getFreeKickAgainstKey={getFreeKickAgainstKey}
            getPassesForKey={getPassesForKey}
            getOppPassesKey={getOppPassesKey}
            getAvgPassLengthKey={getAvgPassLengthKey}
            getOppAvgPassLengthKey={getOppAvgPassLengthKey}
            getTeamPassStrings35Key={getTeamPassStrings35Key}
            getTeamPassStrings6PlusKey={getTeamPassStrings6PlusKey}
            getLPCAvgKey={getLPCAvgKey}
            getPassByZoneKeys={getPassByZoneKeys}
            getOppPassByZoneKeys={getOppPassByZoneKeys}
            getPPMKey={getPPMKey}
            getOppPPMKey={getOppPPMKey}
            getOppPassShareKey={getOppPassShareKey}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <Sidebar currentView="dashboard" onNavigate={handleNavigation} />
      <div className="flex-1 ml-16 flex flex-col overflow-auto" data-tour="team-data-content">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-tour="team-data-header">Team Data Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Charts and Visualizations of Team Match Data</p>
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
              <select
                data-tour="team-selector"
                value={selectedTeam || ''}
                onChange={(e) => {
                  setSelectedTeam(e.target.value || null);
                }}
                className="px-3 py-1.5 text-sm border-2 border-[#ceff00] rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap"
                style={{ borderColor: '#ceff00', width: 'auto', minWidth: '140px' }}
              >
                <option value="">Choose a team...</option>
                {teams.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Opponent Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opponent</label>
              <select
                value={selectedOpponent || ''}
                onChange={(e) => {
                  setSelectedOpponent(e.target.value || null);
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap"
                style={{ width: 'auto', minWidth: '140px' }}
              >
                <option value="">All Opponents</option>
                {availableOpponents.map((opponent) => (
                  <option key={opponent} value={opponent}>
                    {opponent}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <DateFilter
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              availableDates={availableDates}
            />

            {/* Chart Group Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Chart Group</label>
              <select
                data-tour="chart-group-selector"
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap"
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <option value="">Select Group...</option>
                {CHART_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Selector - Custom multiselect dropdown */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Charts</label>
              <MultiSelectDropdown
                options={availableCharts.map(chart => {
                  // Handle custom chart IDs
                  if (typeof chart === 'string' && chart.startsWith('custom-chart-')) {
                    const chartId = parseInt(chart.replace('custom-chart-', ''), 10);
                    const customChart = customCharts.find(c => c.id === chartId);
                    return {
                      value: chart,
                      label: customChart?.name || `Chart ${chartId}`
                    };
                  }
                  // Standard chart type
                  return {
                    value: chart,
                    label: CHART_LABELS[chart as ChartType]
                  };
                })}
                selectedValues={selectedCharts.map(c => String(c))}
                onSelectionChange={(values) => {
                  setSelectedCharts(values as (ChartType | string)[]);
                  setSelectedChartGroup(null);
                }}
                placeholder="Select charts..."
                className="min-w-[180px]"
                customAction={{
                  label: 'Create Custom Chart',
                  onClick: () => {
                    setEditingChart(null);
                    setIsChartBuilderOpen(true);
                  }
                }}
              />
            </div>

            {/* Options */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Options</label>
              <MultiSelectDropdown
                options={[
                  { value: 'showChartLabels', label: 'Show Chart Labels' },
                  { value: 'includeOpponents', label: 'Include Opponents' }
                ]}
                selectedValues={dashboardOptions}
                onSelectionChange={setDashboardOptions}
                placeholder="Select options..."
                className="min-w-[180px]"
              />
            </div>

            {/* Last N Games Filter - Last in the group */}
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
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50" data-tour="charts-area">
        <div className="max-w-[1600px] mx-auto w-full">

        {selectedTeam === null ? (
          <div 
            className="relative w-full rounded-lg"
            style={{
              backgroundImage: 'url(/joga-logo-bw.png)',
              backgroundSize: '60% auto',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              minWidth: '100%',
              minHeight: 'calc(min(60vw, 960px) + 4rem)',
              paddingTop: '2rem',
              paddingBottom: '2rem',
              opacity: 0.2,
            }}
          >
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">
              {selectedOpponent 
                ? `No matches found for ${selectedTeam} against ${selectedOpponent}`
                : `No matches found for ${selectedTeam}`}
            </p>
          </div>
        ) : (
          <>
            {/* Extract global dashboard options */}
            {(() => {
              const showLabels = dashboardOptions.includes('showChartLabels');
              // Note: globalIncludeOpponent is available for future use when implementing
              // global opponent data toggle that works with chart-specific configs
              // const globalIncludeOpponent = dashboardOptions.includes('includeOpponents');
              
              return (
                <>
                  {/* Summary Stats */}
                  <div className="mb-8">
              {/* Shooting Section */}
              {selectedChartGroup === 'shooting' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Shooting</h2>
                  {selectedTeam !== null && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {/* [Team Name] Shooting Card */}
                      {(() => {
                        const hasAttempts = columnKeys.includes(getAttemptsKey());
                        const hasGoals = columnKeys.includes(getGoalsForKey());
                        const hasXG = columnKeys.includes(getxGKey());
                        
                        if (!hasAttempts && !hasGoals && !hasXG) return null;
                        
                        // Calculate xG data completeness
                        const xGKey = getxGKey();
                        const hasXGColumn = columnKeys.includes(xGKey);
                        let xGTooltip: string | undefined;
                        let isXGIncomplete = false;
                        
                        if (hasXGColumn) {
                          const gamesWithXG = filteredData.filter(match => {
                            const xgValue = match[xGKey];
                            return xgValue !== null && xgValue !== undefined && xgValue !== '';
                          }).length;
                          const totalGames = filteredData.length;
                          const xGComplete = gamesWithXG === totalGames;
                          
                          if (!xGComplete) {
                            isXGIncomplete = true;
                            if (gamesWithXG === 0) {
                              xGTooltip = `No xG data exists within the last ${lastNGames || 'N'} games.`;
                            } else {
                              xGTooltip = `xG data exists for ${gamesWithXG}/${totalGames} games.`;
                            }
                          }
                        }
                        
                        const requiredColumns = [getAttemptsKey(), getGoalsForKey(), getxGKey()].filter(col => columnKeys.includes(col));
                        const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                        
                        // Check if any data is missing for the top-right asterisk
                        const hasAnyMissingData = !hasAttempts || !hasGoals || isXGIncomplete;
                        
                        return (
                          <StatsCard
                            title={`${teamDisplayName} Shooting`}
                            values={[
                              { 
                                label: 'Attempts', 
                                value: hasAttempts 
                                  ? calculateAverage(getAttemptsKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: !hasAttempts
                              },
                              { 
                                label: 'Goals', 
                                value: hasGoals 
                                  ? calculateAverage(getGoalsForKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: !hasGoals
                              },
                              { 
                                label: 'xG', 
                                value: hasXG 
                                  ? calculateAverage(getxGKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: false,
                                tooltip: xGTooltip
                              }
                            ]}
                            color="joga-yellow"
                            isIncomplete={hasAnyMissingData}
                            incompleteTooltip={!hasAttempts ? 'Missing: Attempts' : !hasGoals ? 'Missing: Goals' : 'Missing: xG data'}
                            missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                            titleSize="lg"
                          />
                        );
                      })()}
                      {/* Opponent Shooting Card */}
                      {(() => {
                        const hasOppAttempts = columnKeys.includes(getOppAttemptsKey());
                        const hasOppGoals = columnKeys.includes(getGoalsAgainstKey());
                        const hasOppXG = columnKeys.includes(getxGAKey());
                        
                        if (!hasOppAttempts && !hasOppGoals && !hasOppXG) return null;
                        
                        // Calculate opponent xG data completeness
                        const xGAKey = getxGAKey();
                        const gamesWithXGA = filteredData.filter(match => {
                          const xgaValue = match[xGAKey];
                          return xgaValue !== null && xgaValue !== undefined && xgaValue !== '';
                        }).length;
                        const totalGames = filteredData.length;
                        const hasXGAColumn = columnKeys.includes(xGAKey);
                        const hasMissingXGA = hasXGAColumn && gamesWithXGA > 0 && gamesWithXGA < totalGames;
                        const hasNoXGA = hasXGAColumn && gamesWithXGA === 0;
                        const xGAComplete = hasXGAColumn && gamesWithXGA === totalGames;
                        
                        // Only check xG (Opp) data for the top-right asterisk
                        const missingInfo = columnKeys.includes(xGAKey) 
                          ? getMissingDataInfo(filteredData, [xGAKey], opponentKey)
                          : { affectedMatches: 0, completenessPercentage: 0, missingColumns: [], affectedOpponents: [] };
                        
                        // Check if xG (Opp) data is missing for the top-right asterisk
                        const hasAnyMissingData = (hasNoXGA || hasMissingXGA) && !xGAComplete;
                        
                        return (
                          <StatsCard
                            title="Opponent Shooting"
                            values={[
                              { 
                                label: 'Attempts', 
                                value: hasOppAttempts 
                                  ? calculateAverage(getOppAttemptsKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: false
                              },
                              { 
                                label: 'Goals', 
                                value: hasOppGoals 
                                  ? calculateAverage(getGoalsAgainstKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: false
                              },
                              { 
                                label: 'xG', 
                                value: hasOppXG 
                                  ? calculateAverage(getxGAKey(), filteredData).toFixed(1)
                                  : '-',
                                isIncomplete: false
                              }
                            ]}
                            color="joga-yellow"
                            isIncomplete={hasAnyMissingData}
                            incompleteTooltip={hasNoXGA ? 'No xG (Opp) data exists' : hasMissingXGA ? `xG (Opp) data exists for ${gamesWithXGA}/${totalGames} games` : 'Missing: xG (Opp) data'}
                            missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                            titleSize="lg"
                          />
                        );
                      })()}
                      {/* Team Field Pos. & Conversion Rate Card */}
                      {(() => {
                        const hasInsideBoxAttempts = columnKeys.includes(getInsideBoxAttemptsPctKey());
                        const hasOutsideBoxAttempts = columnKeys.includes(getOutsideBoxAttemptsPctKey());
                        const hasInsideBoxConv = columnKeys.includes(getInsideBoxConvRateKey());
                        const hasOutsideBoxConv = columnKeys.includes(getOutsideBoxConvRateKey());
                        
                        if (!hasInsideBoxAttempts && !hasOutsideBoxAttempts && !hasInsideBoxConv && !hasOutsideBoxConv) return null;
                        
                        const requiredColumns = [
                          getInsideBoxAttemptsPctKey(),
                          getOutsideBoxAttemptsPctKey(),
                          getInsideBoxConvRateKey(),
                          getOutsideBoxConvRateKey()
                        ].filter(col => columnKeys.includes(col));
                        const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                        
                        const insideBoxAttempts = hasInsideBoxAttempts ? calculateAverage(getInsideBoxAttemptsPctKey(), filteredData) : 0;
                        const insideBoxConv = hasInsideBoxConv ? calculateAverage(getInsideBoxConvRateKey(), filteredData) : 0;
                        const outsideBoxAttempts = hasOutsideBoxAttempts ? calculateAverage(getOutsideBoxAttemptsPctKey(), filteredData) : 0;
                        const outsideBoxConv = hasOutsideBoxConv ? calculateAverage(getOutsideBoxConvRateKey(), filteredData) : 0;
                        
                        return (
                          <StatsCard
                            title="Team Field Pos. & Conversion Rate"
                            values={[
                              { 
                                label: 'Inside Box', 
                                value: hasInsideBoxAttempts 
                                  ? `${insideBoxAttempts.toFixed(1)}%`
                                  : '-',
                                isIncomplete: !hasInsideBoxAttempts
                              },
                              { 
                                label: 'In Conv Rate', 
                                value: hasInsideBoxConv 
                                  ? `${insideBoxConv.toFixed(1)}%`
                                  : '-',
                                isIncomplete: !hasInsideBoxConv
                              },
                              { 
                                label: 'Outside Box', 
                                value: hasOutsideBoxAttempts 
                                  ? `${outsideBoxAttempts.toFixed(1)}%`
                                  : '-',
                                isIncomplete: !hasOutsideBoxAttempts
                              },
                              { 
                                label: 'Out Conv Rate', 
                                value: hasOutsideBoxConv 
                                  ? `${outsideBoxConv.toFixed(1)}%`
                                  : '-',
                                isIncomplete: !hasOutsideBoxConv
                              }
                            ]}
                            color="joga-yellow"
                            isIncomplete={!hasInsideBoxAttempts || !hasOutsideBoxAttempts || !hasInsideBoxConv || !hasOutsideBoxConv}
                            incompleteTooltip={[
                              !hasInsideBoxAttempts && 'Inside Box Attempts',
                              !hasInsideBoxConv && 'Inside Box Conv Rate',
                              !hasOutsideBoxAttempts && 'Outside Box Attempts',
                              !hasOutsideBoxConv && 'Outside Box Conv Rate'
                            ].filter(Boolean).join(', ')}
                            missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                            titleSize="lg"
                          />
                        );
                      })()}
                      {/* Opp Attempts by Field Pos. Card */}
                      {(columnKeys.includes(getOppInsideBoxAttemptsPctKey()) || columnKeys.includes(getOppOutsideBoxAttemptsPctKey())) && (() => {
                        const requiredColumns = [getOppInsideBoxAttemptsPctKey(), getOppOutsideBoxAttemptsPctKey()].filter(col => columnKeys.includes(col));
                        const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                        return (
                          <StatsCard
                            title="Opp Attempts by Field Pos."
                            value={columnKeys.includes(getOppInsideBoxAttemptsPctKey()) ? `${calculateAverage(getOppInsideBoxAttemptsPctKey(), filteredData).toFixed(1)}%` : '-'}
                            value2={columnKeys.includes(getOppOutsideBoxAttemptsPctKey()) ? `${calculateAverage(getOppOutsideBoxAttemptsPctKey(), filteredData).toFixed(1)}%` : '-'}
                            label1="Inside Box"
                            label2="Outside Box"
                            color="joga-yellow"
                            isIncomplete={!columnKeys.includes(getOppInsideBoxAttemptsPctKey()) || !columnKeys.includes(getOppOutsideBoxAttemptsPctKey())}
                            incompleteTooltip={!columnKeys.includes(getOppInsideBoxAttemptsPctKey()) ? 'Missing: Opp Inside Box Attempts %' : !columnKeys.includes(getOppOutsideBoxAttemptsPctKey()) ? 'Missing: Opp Outside Box Attempts %' : 'Missing: Both columns'}
                            missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                            titleSize="lg"
                            narrowCard={true}
                          />
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* Possession Section */}
              {selectedChartGroup === 'possession' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Possession</h2>
                  {selectedTeam !== null && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Avg Possession Card - show if at least one column exists */}
                {(columnKeys.includes(getPossessionKey()) || columnKeys.includes(getOppPossessionKey())) && (() => {
                  const requiredColumns = [getPossessionKey(), getOppPossessionKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Avg Possession"
                      value={columnKeys.includes(getPossessionKey()) ? `${calculateAverage(getPossessionKey(), filteredData).toFixed(1)}%` : 'N/A'}
                      value2={columnKeys.includes(getOppPossessionKey()) ? `${calculateAverage(getOppPossessionKey(), filteredData).toFixed(1)}%` : 'N/A'}
                      label1={teamDisplayName}
                      label2="Opponent"
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(getPossessionKey()) || !columnKeys.includes(getOppPossessionKey())}
                      incompleteTooltip={!columnKeys.includes(getPossessionKey()) ? 'Missing: Possession' : !columnKeys.includes(getOppPossessionKey()) ? 'Missing: Opp Possession' : 'Missing: Both columns'}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                    />
                  );
                })()}
              </div>
              )}
                </>
              )}

              {/* Passing Section */}
              {selectedChartGroup === 'passing' && (
                <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Passing</h2>
              {selectedTeam !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* [Team Name] Pass Strings Card */}
                {(columnKeys.includes(getTeamPassStrings35Key()) || columnKeys.includes(getTeamPassStrings6PlusKey()) || columnKeys.includes(getLPCAvgKey())) && (() => {
                  const requiredColumns = [
                    getTeamPassStrings35Key(),
                    getTeamPassStrings6PlusKey(),
                    getLPCAvgKey()
                  ].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title={`${teamDisplayName} Pass Strings`}
                      values={[
                        { 
                          label: '3–5 Passes', 
                          value: columnKeys.includes(getTeamPassStrings35Key()) 
                            ? calculateAverage(getTeamPassStrings35Key(), filteredData).toFixed(1) 
                            : 'N/A',
                          isIncomplete: !columnKeys.includes(getTeamPassStrings35Key())
                        },
                        { 
                          label: '6+ Passes', 
                          value: columnKeys.includes(getTeamPassStrings6PlusKey()) 
                            ? calculateAverage(getTeamPassStrings6PlusKey(), filteredData).toFixed(1) 
                            : 'N/A',
                          isIncomplete: !columnKeys.includes(getTeamPassStrings6PlusKey())
                        },
                        { 
                          label: 'LPC', 
                          value: columnKeys.includes(getLPCAvgKey()) 
                            ? calculateAverage(getLPCAvgKey(), filteredData).toFixed(1) 
                            : 'N/A',
                          isIncomplete: !columnKeys.includes(getLPCAvgKey())
                        }
                      ]}
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(getTeamPassStrings35Key()) || 
                                   !columnKeys.includes(getTeamPassStrings6PlusKey()) || 
                                   !columnKeys.includes(getLPCAvgKey())}
                      incompleteTooltip={[
                        !columnKeys.includes(getTeamPassStrings35Key()) && 'Pass Strings (3–5)',
                        !columnKeys.includes(getTeamPassStrings6PlusKey()) && 'Pass Strings (6+)',
                        !columnKeys.includes(getLPCAvgKey()) && 'LPC'
                      ].filter(Boolean).join(', ')}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                    />
                  );
                })()}
                {/* Opponent Pass Strings Card */}
                {(columnKeys.includes(getOppPassStrings35Key()) || columnKeys.includes(getOppPassStrings6PlusKey())) && (() => {
                  const requiredColumns = [getOppPassStrings35Key(), getOppPassStrings6PlusKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Opponent Pass Strings"
                      value={columnKeys.includes(getOppPassStrings35Key()) ? calculateAverage(getOppPassStrings35Key(), filteredData).toFixed(1) : 'N/A'}
                      value2={columnKeys.includes(getOppPassStrings6PlusKey()) ? calculateAverage(getOppPassStrings6PlusKey(), filteredData).toFixed(1) : 'N/A'}
                      label1="3–5 Passes"
                      label2="6+ Passes"
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(getOppPassStrings35Key()) || !columnKeys.includes(getOppPassStrings6PlusKey())}
                      incompleteTooltip={!columnKeys.includes(getOppPassStrings35Key()) ? 'Missing: Opp Pass Strings (3–5)' : !columnKeys.includes(getOppPassStrings6PlusKey()) ? 'Missing: Opp Pass Strings (6+)' : 'Missing: Both columns'}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                    />
                  );
                })()}
                {/* Sustained Passing Index Card */}
                {(() => {
                  const spiKey = getSPIKey();
                  const spiWKey = getSPIWKey();
                  const oppSpiKey = getOppSPIKey();
                  const oppSpiWKey = getOppSPIWKey();
                  const hasSPI = columnKeys.includes(spiKey);
                  const hasSPIW = columnKeys.includes(spiWKey);
                  const hasOppSPI = columnKeys.includes(oppSpiKey);
                  const hasOppSPIW = columnKeys.includes(oppSpiWKey);
                  
                  return hasSPI || hasSPIW || hasOppSPI || hasOppSPIW;
                })() && (() => {
                  const spiKey = getSPIKey();
                  const spiWKey = getSPIWKey();
                  const oppSpiKey = getOppSPIKey();
                  const oppSpiWKey = getOppSPIWKey();
                  const requiredColumns = [spiKey, spiWKey, oppSpiKey, oppSpiWKey].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Sustained Passing Index"
                      values={[
                        { 
                          label: teamDisplayName, 
                          value: columnKeys.includes(spiKey) 
                            ? `${calculateAverage(spiKey, filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !columnKeys.includes(spiKey)
                        },
                        { 
                          label: 'SPI(w)', 
                          value: columnKeys.includes(spiWKey) 
                            ? calculateAverage(spiWKey, filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !columnKeys.includes(spiWKey)
                        },
                        { 
                          label: 'Opponent', 
                          value: columnKeys.includes(oppSpiKey) 
                            ? `${calculateAverage(oppSpiKey, filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !columnKeys.includes(oppSpiKey)
                        },
                        { 
                          label: 'Opp SPI(w)', 
                          value: columnKeys.includes(oppSpiWKey) 
                            ? calculateAverage(oppSpiWKey, filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !columnKeys.includes(oppSpiWKey)
                        }
                      ]}
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(spiKey) || !columnKeys.includes(spiWKey) || !columnKeys.includes(oppSpiKey) || !columnKeys.includes(oppSpiWKey)}
                      incompleteTooltip={[
                        !columnKeys.includes(spiKey) && 'SPI',
                        !columnKeys.includes(spiWKey) && 'SPI(w)',
                        !columnKeys.includes(oppSpiKey) && 'Opp SPI',
                        !columnKeys.includes(oppSpiWKey) && 'Opp SPI(w)'
                      ].filter(Boolean).join(', ')}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      titleSize="lg"
                    />
                  );
                })()}
                {/* [Team Name] Passing Card */}
                {(() => {
                  const hasPPM = columnKeys.includes(getPPMKey());
                  const hasPPG = columnKeys.includes(getPassesForKey());
                  const hasPassShare = columnKeys.includes(getPassShareKey());
                  
                  if (!hasPPM && !hasPPG && !hasPassShare) return null;
                  
                  const requiredColumns = [getPPMKey(), getPassesForKey(), getPassShareKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  
                  return (
                    <StatsCard
                      title={`${teamDisplayName} Passing`}
                      values={[
                        { 
                          label: 'Passes Per Min', 
                          value: hasPPM 
                            ? calculateAverage(getPPMKey(), filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !hasPPM
                        },
                        { 
                          label: 'Passes Per Game', 
                          value: hasPPG 
                            ? calculateAverage(getPassesForKey(), filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !hasPPG
                        },
                        { 
                          label: 'Pass Share', 
                          value: hasPassShare 
                            ? `${calculateAverage(getPassShareKey(), filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !hasPassShare
                        }
                      ]}
                      color="joga-yellow"
                      isIncomplete={!hasPPM || !hasPPG || !hasPassShare}
                      incompleteTooltip={[
                        !hasPPM && 'Passes Per Min',
                        !hasPPG && 'Passes Per Game',
                        !hasPassShare && 'Pass Share'
                      ].filter(Boolean).join(', ')}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      titleSize="lg"
                    />
                  );
                })()}
                {/* Opponent Passing Card */}
                {(() => {
                  const hasOppPPM = columnKeys.includes(getOppPPMKey());
                  const hasOppPPG = columnKeys.includes(getOppPassesKey());
                  const hasOppPassShare = columnKeys.includes(getOppPassShareKey());
                  
                  if (!hasOppPPM && !hasOppPPG && !hasOppPassShare) return null;
                  
                  const requiredColumns = [getOppPPMKey(), getOppPassesKey(), getOppPassShareKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  
                  return (
                    <StatsCard
                      title="Opponent Passing"
                      values={[
                        { 
                          label: 'Passes Per Min', 
                          value: hasOppPPM 
                            ? calculateAverage(getOppPPMKey(), filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !hasOppPPM
                        },
                        { 
                          label: 'Passes Per Game', 
                          value: hasOppPPG 
                            ? calculateAverage(getOppPassesKey(), filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !hasOppPPG
                        },
                        { 
                          label: 'Pass Share', 
                          value: hasOppPassShare 
                            ? `${calculateAverage(getOppPassShareKey(), filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !hasOppPassShare
                        }
                      ]}
                      color="joga-yellow"
                      isIncomplete={!hasOppPPM || !hasOppPPG || !hasOppPassShare}
                      incompleteTooltip={[
                        !hasOppPPM && 'Opp Passes Per Min',
                        !hasOppPPG && 'Opp Passes Per Game',
                        !hasOppPassShare && 'Opp Pass Share'
                      ].filter(Boolean).join(', ')}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      titleSize="lg"
                    />
                  );
                })()}
                    </div>
                  )}
                </>
              )}

              {/* JOGA Metrics Section */}
              {selectedChartGroup === 'performance' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">JOGA Metrics</h2>
                  {selectedTeam !== null && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Sustained Passing Index Card */}
                {(() => {
                  const spiKey = getSPIKey();
                  const spiWKey = getSPIWKey();
                  const oppSpiKey = getOppSPIKey();
                  const oppSpiWKey = getOppSPIWKey();
                  const hasSPI = columnKeys.includes(spiKey);
                  const hasSPIW = columnKeys.includes(spiWKey);
                  const hasOppSPI = columnKeys.includes(oppSpiKey);
                  const hasOppSPIW = columnKeys.includes(oppSpiWKey);
                  
                  return hasSPI || hasSPIW || hasOppSPI || hasOppSPIW;
                })() && (() => {
                  const spiKey = getSPIKey();
                  const spiWKey = getSPIWKey();
                  const oppSpiKey = getOppSPIKey();
                  const oppSpiWKey = getOppSPIWKey();
                  const requiredColumns = [spiKey, spiWKey, oppSpiKey, oppSpiWKey].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Sustained Passing Index"
                      values={[
                        { 
                          label: teamDisplayName, 
                          value: columnKeys.includes(spiKey) 
                            ? `${calculateAverage(spiKey, filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !columnKeys.includes(spiKey)
                        },
                        { 
                          label: 'SPI(w)', 
                          value: columnKeys.includes(spiWKey) 
                            ? calculateAverage(spiWKey, filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !columnKeys.includes(spiWKey)
                        },
                        { 
                          label: 'Opponent', 
                          value: columnKeys.includes(oppSpiKey) 
                            ? `${calculateAverage(oppSpiKey, filteredData).toFixed(1)}%`
                            : '-',
                          isIncomplete: !columnKeys.includes(oppSpiKey)
                        },
                        { 
                          label: 'Opp SPI(w)', 
                          value: columnKeys.includes(oppSpiWKey) 
                            ? calculateAverage(oppSpiWKey, filteredData).toFixed(1)
                            : '-',
                          isIncomplete: !columnKeys.includes(oppSpiWKey)
                        }
                      ]}
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(spiKey) || !columnKeys.includes(spiWKey) || !columnKeys.includes(oppSpiKey) || !columnKeys.includes(oppSpiWKey)}
                      incompleteTooltip={[
                        !columnKeys.includes(spiKey) && 'SPI',
                        !columnKeys.includes(spiWKey) && 'SPI(w)',
                        !columnKeys.includes(oppSpiKey) && 'Opp SPI',
                        !columnKeys.includes(oppSpiWKey) && 'Opp SPI(w)'
                      ].filter(Boolean).join(', ')}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      titleSize="lg"
                    />
                  );
                })()}
                {/* Passes Per Min Card */}
                {(columnKeys.includes(getPPMKey()) || columnKeys.includes(getOppPPMKey())) && (() => {
                  const requiredColumns = [getPPMKey(), getOppPPMKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Passes Per Min"
                      value={columnKeys.includes(getPPMKey()) ? calculateAverage(getPPMKey(), filteredData).toFixed(1) : '-'}
                      value2={columnKeys.includes(getOppPPMKey()) ? calculateAverage(getOppPPMKey(), filteredData).toFixed(1) : '-'}
                      label1={teamDisplayName}
                      label2="Opponent"
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(getPPMKey()) || !columnKeys.includes(getOppPPMKey())}
                      incompleteTooltip={!columnKeys.includes(getPPMKey()) ? 'Missing: PPM' : !columnKeys.includes(getOppPPMKey()) ? 'Missing: Opp PPM' : 'Missing: Both columns'}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      narrowCard={true}
                    />
                  );
                })()}
                {/* Avg Possession Card */}
                {(columnKeys.includes(getPossessionKey()) || columnKeys.includes(getOppPossessionKey())) && (() => {
                  const requiredColumns = [getPossessionKey(), getOppPossessionKey()].filter(col => columnKeys.includes(col));
                  const missingInfo = getMissingDataInfo(filteredData, requiredColumns, opponentKey);
                  return (
                    <StatsCard
                      title="Avg Possession"
                      value={columnKeys.includes(getPossessionKey()) ? `${calculateAverage(getPossessionKey(), filteredData).toFixed(1)}%` : '-'}
                      value2={columnKeys.includes(getOppPossessionKey()) ? `${calculateAverage(getOppPossessionKey(), filteredData).toFixed(1)}%` : '-'}
                      label1={teamDisplayName}
                      label2="Opponent"
                      color="joga-yellow"
                      isIncomplete={!columnKeys.includes(getPossessionKey()) || !columnKeys.includes(getOppPossessionKey())}
                      incompleteTooltip={!columnKeys.includes(getPossessionKey()) ? 'Missing: Possession' : !columnKeys.includes(getOppPossessionKey()) ? 'Missing: Opp Possession' : 'Missing: Both columns'}
                      missingDataInfo={missingInfo.affectedMatches > 0 ? missingInfo : undefined}
                      narrowCard={true}
                    />
                  );
                })()}
              </div>
              )}
                </>
              )}
            </div>

                  {/* Special Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {(() => {
                const showLabels = dashboardOptions.includes('showChartLabels');
                const globalIncludeOpponents = dashboardOptions.includes('includeOpponents');
                return (
                  <>
              {selectedCharts.includes('shots') && columnKeys.includes(getShotsForKey()) && columnKeys.includes(getShotsAgainstKey()) && (
                <div className={expandedCharts['shots'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <div data-tour="first-chart">
                      <ShotsChart
                        data={dataToDisplay}
                        shotsForKey={getShotsForKey()}
                        shotsAgainstKey={getShotsAgainstKey()}
                        opponentKey={opponentKey}
                        showLabels={showLabels}
                        attemptsForKey={columnKeys.includes(getAttemptsKey()) ? getAttemptsKey() : undefined}
                        attemptsAgainstKey={columnKeys.includes(getOppAttemptsKey()) ? getOppAttemptsKey() : undefined}
                        goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                        goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                        onExpansionChange={handleChartExpansionChange('shots')}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedCharts.includes('goals') && columnKeys.includes(getGoalsForKey()) && columnKeys.includes(getGoalsAgainstKey()) && (
                <div className={expandedCharts['goals'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <GoalsChart
                      data={dataToDisplay}
                      goalsForKey={getGoalsForKey()}
                      goalsAgainstKey={getGoalsAgainstKey()}
                      opponentKey={opponentKey}
                      showLabels={showLabels}
                      xGKey={columnKeys.includes(getxGKey()) ? getxGKey() : undefined}
                      xGAKey={columnKeys.includes(getxGAKey()) ? getxGAKey() : undefined}
                      shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                      shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                      onExpansionChange={handleChartExpansionChange('goals')}
                    />
                  )}
                </div>
              )}

              {selectedCharts.includes('possession') && columnKeys.includes(getPossessionKey()) && (
                <div className={expandedCharts['possession'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <PossessionChart
                      data={dataToDisplay}
                      possessionKey={getPossessionKey()}
                      passShareKey={getPassShareKey()}
                      opponentKey={opponentKey}
                      oppPossessionKey={columnKeys.includes(getOppPossessionKey()) ? getOppPossessionKey() : undefined}
                      oppPassShareKey={columnKeys.includes(getOppPassShareKey()) ? getOppPassShareKey() : undefined}
                      onExpansionChange={handleChartExpansionChange('possession')}
                      globalIncludeOpponents={globalIncludeOpponents}
                    />
                  )}
                </div>
              )}

              {selectedCharts.includes('xg') && columnKeys.includes(getxGKey()) && columnKeys.includes(getxGAKey()) && (
                <div className={expandedCharts['xg'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <XGChart
                      data={dataToDisplay}
                      xGKey={getxGKey()}
                      xGAKey={getxGAKey()}
                      opponentKey={opponentKey}
                      showLabels={showLabels}
                      goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                      goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                      shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                      shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                      onExpansionChange={handleChartExpansionChange('xg')}
                      globalIncludeOpponents={globalIncludeOpponents}
                    />
                  )}
                </div>
              )}

              {selectedCharts.includes('tsr') && (columnKeys.includes(getTSRKey()) || columnKeys.includes(getOppTSRKey())) && (
                <div className={expandedCharts['tsr'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <TSRChart
                      data={dataToDisplay}
                      tsrKey={columnKeys.includes(getTSRKey()) ? getTSRKey() : undefined}
                      oppTSRKey={columnKeys.includes(getOppTSRKey()) ? getOppTSRKey() : undefined}
                      opponentKey={opponentKey}
                      showLabels={showLabels}
                      shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                      shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                      onExpansionChange={handleChartExpansionChange('tsr')}
                    />
                  )}
                </div>
              )}

              {selectedCharts.includes('spi') && (columnKeys.includes(getSPIKey()) || 
                columnKeys.includes(getSPIWKey()) || 
                columnKeys.includes(getOppSPIKey()) || 
                columnKeys.includes(getOppSPIWKey())) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <SPIChart
                    data={dataToDisplay}
                    spiKey={getSPIKey()}
                    spiWKey={getSPIWKey()}
                    oppSpiKey={getOppSPIKey()}
                    oppSpiWKey={getOppSPIWKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('spi')}
                  />
                )
              )}

              {selectedCharts.includes('conversionRate') && (columnKeys.includes(getConversionRateKey()) || columnKeys.includes(getOppConversionRateKey())) && (
                <div className={expandedCharts['conversionRate'] ? 'lg:col-span-2' : ''}>
                  {selectedTeam === null ? (
                    <EmptyChart showTitle={false} />
                  ) : (
                    <ConversionRateChart
                      data={dataToDisplay}
                      conversionRateKey={getConversionRateKey()}
                      oppConversionRateKey={getOppConversionRateKey()}
                      opponentKey={opponentKey}
                      showLabels={showLabels}
                      shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                      shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                      goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                      goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                      onExpansionChange={handleChartExpansionChange('conversionRate')}
                      globalIncludeOpponents={globalIncludeOpponents}
                    />
                  )}
                </div>
              )}
                  </>
                );
              })()}

              {selectedCharts.includes('attempts') && columnKeys.includes(getAttemptsKey()) && columnKeys.includes(getOppAttemptsKey()) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <AttemptsChart
                    data={dataToDisplay}
                    attemptsKey={getAttemptsKey()}
                    oppAttemptsKey={getOppAttemptsKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    shotsForKey={columnKeys.includes(getShotsForKey()) ? getShotsForKey() : undefined}
                    shotsAgainstKey={columnKeys.includes(getShotsAgainstKey()) ? getShotsAgainstKey() : undefined}
                    goalsForKey={columnKeys.includes(getGoalsForKey()) ? getGoalsForKey() : undefined}
                    goalsAgainstKey={columnKeys.includes(getGoalsAgainstKey()) ? getGoalsAgainstKey() : undefined}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('attempts')}
                  />
                )
              )}

              {selectedCharts.includes('positionalAttempts') && 
               (columnKeys.includes(getInsideBoxAttemptsPctKey()) || columnKeys.includes(getOutsideBoxAttemptsPctKey())) &&
               (columnKeys.includes(getOppInsideBoxAttemptsPctKey()) || columnKeys.includes(getOppOutsideBoxAttemptsPctKey())) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PositionalAttemptsChart
                    data={dataToDisplay}
                    insideBoxAttemptsPctKey={getInsideBoxAttemptsPctKey()}
                    outsideBoxAttemptsPctKey={getOutsideBoxAttemptsPctKey()}
                    oppInsideBoxAttemptsPctKey={getOppInsideBoxAttemptsPctKey()}
                    oppOutsideBoxAttemptsPctKey={getOppOutsideBoxAttemptsPctKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('positionalAttempts')}
                  />
                )
              )}

              {selectedCharts.includes('miscStats') && 
               (columnKeys.includes(getCornersForKey()) || columnKeys.includes(getCornersAgainstKey())) &&
               (columnKeys.includes(getFreeKickForKey()) || columnKeys.includes(getFreeKickAgainstKey())) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <MiscStatsChart
                    data={dataToDisplay}
                    cornersForKey={getCornersForKey()}
                    cornersAgainstKey={getCornersAgainstKey()}
                    freeKickForKey={getFreeKickForKey()}
                    freeKickAgainstKey={getFreeKickAgainstKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('miscStats')}
                  />
                )
              )}

              {selectedCharts.includes('passes') && columnKeys.includes(getPassesForKey()) && columnKeys.includes(getOppPassesKey()) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PassesChart
                    data={dataToDisplay}
                    passesForKey={getPassesForKey()}
                    oppPassesKey={getOppPassesKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('passes')}
                  />
                )
              )}

              {selectedCharts.includes('avgPassLength') && columnKeys.includes(getAvgPassLengthKey()) && columnKeys.includes(getOppAvgPassLengthKey()) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <AvgPassLengthChart
                    data={dataToDisplay}
                    avgPassLengthKey={getAvgPassLengthKey()}
                    oppAvgPassLengthKey={getOppAvgPassLengthKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('avgPassLength')}
                  />
                )
              )}

              {selectedCharts.includes('passStrLength') && 
               columnKeys.includes(getTeamPassStrings35Key()) && 
               columnKeys.includes(getTeamPassStrings6PlusKey()) && 
               columnKeys.includes(getLPCAvgKey()) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PassStrLengthChart
                    data={dataToDisplay}
                    passStrings35Key={getTeamPassStrings35Key()}
                    passStrings6PlusKey={getTeamPassStrings6PlusKey()}
                    lpcKey={getLPCAvgKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    onExpansionChange={handleChartExpansionChange('passStrLength')}
                  />
                )
              )}

              {selectedCharts.includes('passingSPI') && (columnKeys.includes(getSPIKey()) || 
                columnKeys.includes(getSPIWKey()) || 
                columnKeys.includes(getOppSPIKey()) || 
                columnKeys.includes(getOppSPIWKey())) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <SPIChart
                    data={dataToDisplay}
                    spiKey={getSPIKey()}
                    spiWKey={getSPIWKey()}
                    oppSpiKey={getOppSPIKey()}
                    oppSpiWKey={getOppSPIWKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('spi')}
                  />
                )
              )}

              {selectedCharts.includes('passByZone') && getPassByZoneKeys().length > 0 && getOppPassByZoneKeys().length > 0 && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PassByZoneChart
                    data={dataToDisplay}
                    passByZoneKeys={getPassByZoneKeys()}
                    oppPassByZoneKeys={getOppPassByZoneKeys()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('passByZone')}
                  />
                )
              )}

              {selectedCharts.includes('ppm') && columnKeys.includes(getPPMKey()) && columnKeys.includes(getOppPPMKey()) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PPMChart
                    data={dataToDisplay}
                    ppmKey={getPPMKey()}
                    oppPPMKey={getOppPPMKey()}
                    opponentKey={opponentKey}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('ppm')}
                  />
                )
              )}

              {selectedCharts.includes('passShare') && (columnKeys.includes(getPassShareKey()) || columnKeys.includes(getOppPassShareKey())) && (
                selectedTeam === null ? (
                  <EmptyChart showTitle={false} />
                ) : (
                  <PassShareChart
                    data={dataToDisplay}
                    passShareKey={getPassShareKey()}
                    oppPassShareKey={getOppPassShareKey()}
                    opponentKey={opponentKey}
                    possessionKey={columnKeys.includes(getPossessionKey()) ? getPossessionKey() : undefined}
                    oppPossessionKey={columnKeys.includes(getOppPossessionKey()) ? getOppPossessionKey() : undefined}
                    showLabels={showLabels}
                    globalIncludeOpponents={dashboardOptions.includes('includeOpponents')}
                    onExpansionChange={handleChartExpansionChange('passShare')}
                  />
                )
              )}
                  </div>

                        {/* User-Created Custom Charts - Individual charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {selectedCharts
                      .filter(chart => typeof chart === 'string' && chart.startsWith('custom-chart-'))
                      .map(chartId => {
                        const id = parseInt(String(chartId).replace('custom-chart-', ''), 10);
                        const chart = customCharts.find(c => c.id === id);
                        if (!chart) return null;
                        
                        const chartKey = `custom-chart-${chart.id}`;
                        const isExpanded = expandedCharts[chartKey] ?? false;
                        
                        const chartData = customChartData[chart.id];
                        if (!chartData) {
                          return (
                            <div key={chart.id} className={isExpanded ? 'lg:col-span-2' : ''}>
                              <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{chart.name}</h3>
                                <p className="text-sm text-gray-500">Loading chart data...</p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={chart.id} className={isExpanded ? 'lg:col-span-2' : ''}>
                            <div className="bg-white rounded-lg shadow-md p-6 relative group">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-gray-800">{chart.name}</h3>
                                <div className="flex items-center gap-2">
                                  <ChartExpandButton
                                    isExpanded={isExpanded}
                                    onToggle={() => {
                                      handleChartExpansionChange(chartKey)(!isExpanded);
                                    }}
                                  />
                                </div>
                              </div>
                              {chart.description && (
                                <p className="text-sm text-gray-600 mb-4">{chart.description}</p>
                              )}
                              <DynamicChartRenderer
                                chartType={chart.chartType}
                                data={chartData}
                                height={400}
                                showLabels={showLabels}
                              />
                            </div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>

                        {/* Defense Section - Auto Charts Only */}
                  {selectedChartGroup === 'defense' && selectedCharts.includes('auto') && autoChartColumns.length > 0 && (() => {
              const processedPairs = new Set<string>();
              // Filter to defense-related columns when Defense group is selected
              const columnsToShow = autoChartColumns.filter(col => {
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
                  });
              
              if (columnsToShow.length === 0) return null;
              
                    return (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 mt-8">Defensive Statistics</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {columnsToShow.map((columnKey) => {
                      // Skip if this column was already processed as part of a pair
                      if (processedPairs.has(columnKey)) {
                        return null;
                      }
                      
                      const pairColumn = columnPairs.get(columnKey);
                      
                      // Debug logging (can be removed later)
                      if (import.meta.env.DEV && columnKey.toLowerCase().includes('goal')) {
                        console.log('Column:', columnKey, 'Pair:', pairColumn, 'Pairs map:', Array.from(columnPairs.entries()));
                      }
                      
                      // If there's a pair, use combo chart type
                      const config = getChartConfig(columnKey, !!pairColumn);
                      if (pairColumn && config.type !== 'combo') {
                        config.type = 'combo';
                      }
                      
                      // Mark both columns as processed if it's a pair
                      if (pairColumn) {
                        processedPairs.add(columnKey);
                        processedPairs.add(pairColumn);
                      }
                      
                      return (
                        selectedTeam === null ? (
                          <EmptyChart key={columnKey} showTitle={false} />
                        ) : (
                          <AutoChart
                            key={columnKey}
                            data={dataToDisplay}
                            columnKey={columnKey}
                            opponentKey={opponentKey}
                            config={config}
                            pairColumnKey={pairColumn || undefined}
                            showLabels={showLabels}
                            onExpansionChange={handleChartExpansionChange('auto')}
                          />
                        )
                      );
                        })}
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </>
        )}

        </div>
      </main>
      </div>
      {showWalkthrough && (
        <WalkthroughOverlay onClose={() => setShowWalkthrough(false)} />
      )}

      {/* Chart Builder Modal */}
      <Modal
        isOpen={isChartBuilderOpen}
        onClose={() => {
          setIsChartBuilderOpen(false);
          setEditingChart(null);
        }}
        maxWidth="2xl"
      >
        <CustomChartBuilder
          chart={editingChart}
          sheetConfig={sheetConfig}
          columnKeys={columnKeys}
          matchData={matchData}
          onClose={() => {
            setIsChartBuilderOpen(false);
            setEditingChart(null);
            // Reload custom charts after save - data will be processed automatically by useEffect
            const loadCustomCharts = async () => {
              if (user && matchData.length > 0) {
                try {
                  const charts = await getCustomCharts();
                  setCustomCharts(charts);
                } catch (err) {
                  console.error('Failed to load custom charts:', err);
                }
              }
            };
            loadCustomCharts();
          }}
        />
      </Modal>
    </div>
  );
}

export default App;

