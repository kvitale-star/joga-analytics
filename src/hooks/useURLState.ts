import { useState, useEffect, useCallback } from 'react';

/**
 * Deep equality check for values (handles primitives, arrays, objects)
 */
function isEqual<T>(a: T, b: T): boolean {
  // Primitive comparison
  if (a === b) return true;
  
  // Handle null/undefined
  if (a == null || b == null) return a === b;
  
  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => isEqual(val, b[idx]));
  }
  
  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isEqual((a as any)[key], (b as any)[key]));
  }
  
  return false;
}

/**
 * Get current URL search params
 */
function getSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Update URL search params without page reload
 */
function updateSearchParams(updater: (params: URLSearchParams) => void, replace: boolean = true): void {
  const params = getSearchParams();
  updater(params);
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  
  if (replace) {
    window.history.replaceState({}, '', newUrl);
  } else {
    window.history.pushState({}, '', newUrl);
  }
}

/**
 * Custom hook to sync state with URL query parameters
 * @param key - The query parameter key
 * @param defaultValue - Default value if not in URL
 * @param options - Options for parsing/serializing
 */
export function useURLState<T>(
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    validate?: (value: T) => boolean;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const getValueFromURL = useCallback((): T => {
    const params = getSearchParams();
    const urlValue = params.get(key);
    
    if (urlValue === null) {
      return defaultValue;
    }
    
    try {
      let parsed: T;
      if (options?.deserialize) {
        parsed = options.deserialize(urlValue);
      } else {
        // Default deserialization
        if (typeof defaultValue === 'boolean') {
          parsed = (urlValue === 'true') as T;
        } else if (typeof defaultValue === 'number') {
          const num = parseFloat(urlValue);
          parsed = (isNaN(num) ? defaultValue : num) as T;
        } else if (Array.isArray(defaultValue)) {
          try {
            const parsedArray = JSON.parse(urlValue);
            parsed = Array.isArray(parsedArray) ? parsedArray as T : defaultValue;
          } catch {
            parsed = defaultValue;
          }
        } else {
          parsed = urlValue as T;
        }
      }
      
      if (options?.validate && !options.validate(parsed)) {
        return defaultValue;
      }
      
      return parsed;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue, options]);

  const [state, setState] = useState<T>(getValueFromURL);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      // Only write to URL if value differs from default
      const isDefaultValue = isEqual(newValue, defaultValue);
      
      // Update URL
      updateSearchParams((params) => {
        if (isDefaultValue || newValue === null || newValue === undefined || newValue === '') {
          // Remove from URL if it's the default value or empty
          params.delete(key);
        } else {
          // Only write non-default values to URL
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
          
          if (serialized) {
            params.set(key, serialized);
          } else {
            params.delete(key);
          }
        }
      });
      
      return newValue;
    });
  }, [key, defaultValue, options]);

  // Sync state from URL on mount and on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const urlValue = getValueFromURL();
      setState(urlValue);
    };

    // Sync from URL on initial mount only
    const urlValue = getValueFromURL();
    setState(prevState => {
      // Only update if different to avoid unnecessary re-renders
      if (JSON.stringify(prevState) !== JSON.stringify(urlValue)) {
        return urlValue;
      }
      return prevState;
    });

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - getValueFromURL is stable enough for initial read

  return [state, setValue];
}

