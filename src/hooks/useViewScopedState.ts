import { useURLState } from './useURLState';

type ViewMode = 'chat' | 'dashboard' | 'game-data' | 'club-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings' | 'glossary';

/**
 * Get the view-scoped key for a state variable
 * @param view - Current view mode
 * @param key - State key
 * @returns Scoped key like "dashboard.team" or "clubData.teams"
 */
function getViewScopedKey(view: ViewMode, key: string): string {
  // Map view modes to their URL prefixes
  const viewPrefixes: Record<ViewMode, string> = {
    'dashboard': 'dashboard',
    'game-data': 'gameData',
    'club-data': 'clubData',
    'upload-game-data': 'uploadGameData',
    'data-at-a-glance': 'dataAtAGlance',
    'settings': 'settings',
    'chat': 'chat',
    'glossary': 'glossary',
  };
  
  const prefix = viewPrefixes[view] || view;
  return `${prefix}.${key}`;
}

/**
 * Custom hook for view-scoped URL state
 * Automatically prefixes keys with the current view name
 * 
 * @param view - Current view mode
 * @param key - State key (will be prefixed with view name)
 * @param defaultValue - Default value if not in URL
 * @param options - Options for parsing/serializing
 * 
 * @example
 * // In dashboard view, this creates URL param "dashboard.team"
 * const [team, setTeam] = useViewScopedState('dashboard', 'team', null);
 * 
 * // In club-data view, this creates URL param "clubData.teams"
 * const [teams, setTeams] = useViewScopedState('club-data', 'teams', []);
 */
export function useViewScopedState<T>(
  view: ViewMode,
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    validate?: (value: T) => boolean;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const scopedKey = getViewScopedKey(view, key);
  return useURLState(scopedKey, defaultValue, options);
}
