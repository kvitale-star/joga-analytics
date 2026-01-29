/**
 * Custom hook for chart configuration
 * Reduces code duplication across chart components
 */

import { useState, useEffect, useRef } from 'react';
import { ChartConfig } from '../types/chartConfig';
import { getChartConfig, saveChartConfig, resetChartConfig } from '../services/chartPreferencesService';
import { useAuth } from '../contexts/AuthContext';

interface UseChartConfigOptions {
  chartType: string;
  defaultConfig: ChartConfig;
  globalIncludeOpponents?: boolean; // Global override for includeOpponent
  onExpansionChange?: (isExpanded: boolean) => void; // Callback when expansion state changes
}

export function useChartConfig({ chartType, defaultConfig, globalIncludeOpponents, onExpansionChange }: UseChartConfigOptions) {
  const { user } = useAuth();
  const [config, setConfig] = useState<ChartConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const lastNotifiedExpandedRef = useRef<boolean | undefined>(undefined);

  // Load user preferences on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (user) {
        try {
          const savedConfig = await getChartConfig(user.id, chartType);
          // Apply global override if provided
          const finalConfig = globalIncludeOpponents !== undefined
            ? { ...savedConfig, includeOpponent: globalIncludeOpponents }
            : savedConfig;
          setConfig(finalConfig);
        } catch (error) {
          console.error('Error loading chart config:', error);
        }
      } else {
        // No user - apply global override to default if provided
        if (globalIncludeOpponents !== undefined) {
          setConfig({ ...defaultConfig, includeOpponent: globalIncludeOpponents });
        } else {
          setConfig(defaultConfig);
        }
      }
      setIsLoading(false);
    };
    loadConfig();
  }, [user, chartType]);
  
  // Update config when global override changes (after initial load)
  useEffect(() => {
    if (!isLoading && globalIncludeOpponents !== undefined) {
      setConfig(prev => ({ ...prev, includeOpponent: globalIncludeOpponents }));
    }
  }, [globalIncludeOpponents, isLoading]);

  const handleConfigChange = (newConfig: ChartConfig) => {
    setConfig(newConfig);
  };

  const handleSave = async () => {
    if (user) {
      try {
        setIsSaving(true);
        await saveChartConfig(user.id, chartType, config);
      } catch (error) {
        console.error('Error saving chart config:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to save chart preferences';
        
        // Show more specific error message
        if (errorMessage.includes('401') || errorMessage.includes('Not authenticated')) {
          alert('Authentication required. Please log in again.');
        } else if (errorMessage.includes('CSRF')) {
          alert('Security token expired. Please refresh the page and try again.');
        } else if (errorMessage.includes('Network error')) {
          alert('Network error: Unable to connect to server. Please check your connection.');
        } else {
          alert(`Failed to save chart preferences: ${errorMessage}`);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Automatically save when expansion state changes
  const handleExpandToggle = async () => {
    const newExpandedState = !(config.isExpanded ?? false);
    const newConfig = {
      ...config,
      isExpanded: newExpandedState,
    };
    setConfig(newConfig);
    
    // Notify parent of expansion change
    if (onExpansionChange) {
      onExpansionChange(newExpandedState);
    }
    
    // Auto-save expansion state
    if (user) {
      try {
        await saveChartConfig(user.id, chartType, newConfig);
      } catch (error) {
        console.error('Error saving chart expansion state:', error);
        // Don't show alert for auto-save failures
      }
    }
  };
  
  // Notify parent of expansion state changes (only when value actually changes)
  useEffect(() => {
    if (!isLoading && onExpansionChange) {
      const currentExpanded = config.isExpanded ?? false;
      // Only call if the value has actually changed
      if (lastNotifiedExpandedRef.current !== currentExpanded) {
        lastNotifiedExpandedRef.current = currentExpanded;
        onExpansionChange(currentExpanded);
      }
    }
  }, [isLoading, config.isExpanded, onExpansionChange]);

  const handleReset = async () => {
    if (user) {
      try {
        await resetChartConfig(user.id, chartType);
        // Apply global override if provided, otherwise use default
        const resetConfig = globalIncludeOpponents !== undefined
          ? { ...defaultConfig, includeOpponent: globalIncludeOpponents }
          : defaultConfig;
        setConfig(resetConfig);
      } catch (error) {
        console.error('Error resetting chart config:', error);
      }
    } else {
      // No user - just reset local state with global override if provided
      const resetConfig = globalIncludeOpponents !== undefined
        ? { ...defaultConfig, includeOpponent: globalIncludeOpponents }
        : defaultConfig;
      setConfig(resetConfig);
    }
  };

  return {
    config,
    isLoading,
    isSaving,
    handleConfigChange,
    handleSave,
    handleReset,
    handleExpandToggle,
    isExpanded: config.isExpanded ?? false,
  };
}
