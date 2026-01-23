import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage-based state
 * Similar to useURLState but stores in localStorage instead of URL
 * Useful for UI preferences that don't need to be in URLs
 * 
 * @param key - Storage key (will be prefixed with view name if view is provided)
 * @param defaultValue - Default value if not in storage
 * @param options - Options for parsing/serializing
 * 
 * @example
 * const [metrics, setMetrics] = useLocalStorageState('gameData.shootingMetrics', []);
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const getValueFromStorage = useCallback((): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        return defaultValue;
      }
      
      let parsed: T;
      if (options?.deserialize) {
        parsed = options.deserialize(stored);
      } else {
        // Default deserialization
        if (typeof defaultValue === 'boolean') {
          parsed = (stored === 'true') as T;
        } else if (typeof defaultValue === 'number') {
          const num = parseFloat(stored);
          parsed = (isNaN(num) ? defaultValue : num) as T;
        } else if (Array.isArray(defaultValue)) {
          try {
            const parsedArray = JSON.parse(stored);
            parsed = Array.isArray(parsedArray) ? parsedArray as T : defaultValue;
          } catch {
            parsed = defaultValue;
          }
        } else {
          parsed = stored as T;
        }
      }
      
      return parsed;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue, options]);

  const [state, setState] = useState<T>(getValueFromStorage);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      try {
        let serialized: string;
        if (options?.serialize) {
          serialized = options.serialize(newValue);
        } else {
          // Default serialization
          if (typeof newValue === 'boolean') {
            serialized = newValue.toString();
          } else if (Array.isArray(newValue)) {
            serialized = JSON.stringify(newValue);
          } else {
            serialized = String(newValue);
          }
        }
        
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
      return newValue;
    });
  }, [key, options]);

  // Sync state from storage on mount
  useEffect(() => {
    const storedValue = getValueFromStorage();
    setState(prevState => {
      // Only update if different to avoid unnecessary re-renders
      if (JSON.stringify(prevState) !== JSON.stringify(storedValue)) {
        return storedValue;
      }
      return prevState;
    });
  }, [getValueFromStorage]);

  return [state, setValue];
}
