'use client';

import { useState, useCallback } from 'react';
import { reverseGeocode } from '@/lib/geocoding';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  address: string | null;
  supported: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
}

/**
 * Hook for browser geolocation with reverse geocoding
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
    address: null,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const requestLocation = useCallback(async () => {
    if (!state.supported) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported in your browser',
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Try to reverse geocode
      try {
        const geocoded = await reverseGeocode(latitude, longitude);

        setState((prev) => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          address: geocoded.address,
          loading: false,
        }));
      } catch {
        // If reverse geocoding fails, still show the location
        setState((prev) => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          loading: false,
        }));
      }
    } catch (error) {
      let errorMessage = 'Failed to get location';

      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location not available';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out';
        }
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  }, [state.supported]);

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
      accuracy: null,
      address: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
