'use client';

import React, { useState, useCallback, useRef } from 'react';
import { searchLocations, type GeocodingError } from '@/lib/geocoding';
import { validateSearchQuery, type Location } from '@/lib/validateSearch';

interface SearchState {
  query: string;
  results: Location[];
  loading: boolean;
  error: GeocodingError | null;
  rateLimit: {
    remaining: number;
    reset: number;
  };
  cached: boolean;
}

interface UseSearchReturn extends SearchState {
  performSearch: (query: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Hook for managing geocoding search state and operations
 */
export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    rateLimit: { remaining: 0, reset: 0 },
    cached: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(
    async (query: string) => {
      // Clear previous error
      setState((prev) => ({ ...prev, error: null }));

      // Validate query
      const validation = validateSearchQuery({ query });
      if (!validation.valid) {
        setState((prev) => ({
          ...prev,
          error: {
            message: validation.error || 'Invalid search query',
            code: 'VALIDATION_ERROR',
            status: 400,
          },
        }));
        return;
      }

      // Clear debounce timer and set new one
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setState((prev) => ({ ...prev, loading: true }));

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const response = await searchLocations(validation.data!);

          setState((prev) => ({
            ...prev,
            query,
            results: response.results,
            loading: false,
            cached: response.cached,
            rateLimit: {
              remaining: response.remaining,
              reset: response.reset,
            },
          }));
        } catch (error) {
          setState((prev) => ({
            ...prev,
            error: error as GeocodingError,
            loading: false,
          }));
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: '',
      results: [],
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    performSearch,
    clearResults,
    clearError,
  };
}
