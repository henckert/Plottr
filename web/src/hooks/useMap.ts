'use client';

import { useRef, useCallback, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  label?: string;
}

interface MapState {
  center: { lat: number; lng: number } | null;
  zoom: number;
  markers: Record<string, MapMarker>;
}

/**
 * useMap hook for managing MapLibre GL map instance
 * Handles map reference, markers, center, zoom, and common operations
 */
export const useMap = () => {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    center: null,
    zoom: 10,
    markers: {},
  });

  /**
   * Set the map instance reference
   */
  const setMap = useCallback((map: MapLibreMap | null) => {
    mapRef.current = map;
    if (map) {
      setMapState((prev) => ({
        ...prev,
        center: {
          lat: map.getCenter().lat,
          lng: map.getCenter().lng,
        },
        zoom: map.getZoom(),
      }));
    }
  }, []);

  /**
   * Get the current map instance
   */
  const getMap = useCallback((): MapLibreMap | null => {
    return mapRef.current;
  }, []);

  /**
   * Set map center
   */
  const setCenter = useCallback(
    (lat: number, lng: number, options?: { zoom?: number; animate?: boolean }) => {
      if (!mapRef.current) return;

      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: options?.zoom ?? mapRef.current.getZoom(),
        duration: options?.animate ? 1000 : 0,
      });

      setMapState((prev) => ({
        ...prev,
        center: { lat, lng },
      }));
    },
    []
  );

  /**
   * Get current map center
   */
  const getCenter = useCallback((): { lat: number; lng: number } | null => {
    if (!mapRef.current) return null;
    const center = mapRef.current.getCenter();
    return { lat: center.lat, lng: center.lng };
  }, []);

  /**
   * Set map zoom level
   */
  const setZoom = useCallback((zoom: number, options?: { animate?: boolean }) => {
    if (!mapRef.current) return;

    if (options?.animate) {
      mapRef.current.easeTo({ zoom, duration: 500 });
    } else {
      mapRef.current.setZoom(zoom);
    }

    setMapState((prev) => ({
      ...prev,
      zoom,
    }));
  }, []);

  /**
   * Get current zoom level
   */
  const getZoom = useCallback((): number => {
    if (!mapRef.current) return 10;
    return mapRef.current.getZoom();
  }, []);

  /**
   * Add a marker to the map
   */
  const addMarker = useCallback((marker: MapMarker) => {
    setMapState((prev) => ({
      ...prev,
      markers: {
        ...prev.markers,
        [marker.id]: marker,
      },
    }));
  }, []);

  /**
   * Remove a marker from the map
   */
  const removeMarker = useCallback((markerId: string) => {
    setMapState((prev) => {
      const { [markerId]: _, ...remainingMarkers } = prev.markers;
      return {
        ...prev,
        markers: remainingMarkers,
      };
    });
  }, []);

  /**
   * Update a marker
   */
  const updateMarker = useCallback((marker: MapMarker) => {
    setMapState((prev) => ({
      ...prev,
      markers: {
        ...prev.markers,
        [marker.id]: marker,
      },
    }));
  }, []);

  /**
   * Clear all markers
   */
  const clearMarkers = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      markers: {},
    }));
  }, []);

  /**
   * Get all markers
   */
  const getMarkers = useCallback((): Record<string, MapMarker> => {
    return mapState.markers;
  }, [mapState.markers]);

  /**
   * Fit bounds to show all markers
   */
  const fitBounds = useCallback(
    (options?: { padding?: number; animate?: boolean }) => {
      if (!mapRef.current || Object.keys(mapState.markers).length === 0) return;

      const markers = Object.values(mapState.markers);
      if (markers.length === 0) return;

      // Calculate bounds
      let minLat = markers[0].lat;
      let maxLat = markers[0].lat;
      let minLon = markers[0].lon;
      let maxLon = markers[0].lon;

      markers.forEach((marker) => {
        minLat = Math.min(minLat, marker.lat);
        maxLat = Math.max(maxLat, marker.lat);
        minLon = Math.min(minLon, marker.lon);
        maxLon = Math.max(maxLon, marker.lon);
      });

      // Fit bounds
      mapRef.current.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        {
          padding: options?.padding ?? 50,
          duration: options?.animate ? 1000 : 0,
        }
      );
    },
    [mapState.markers]
  );

  /**
   * Reset map to initial state
   */
  const reset = useCallback((initialCenter?: { lat: number; lng: number }, initialZoom?: number) => {
    if (!mapRef.current) return;

    const lat = initialCenter?.lat ?? 0;
    const lng = initialCenter?.lng ?? 0;
    const zoom = initialZoom ?? 10;

    mapRef.current.setCenter([lng, lat]);
    mapRef.current.setZoom(zoom);

    setMapState({
      center: { lat, lng },
      zoom,
      markers: {},
    });
  }, []);

  return {
    // Reference
    mapRef,
    getMap,
    setMap,

    // State
    mapState,

    // Center operations
    setCenter,
    getCenter,

    // Zoom operations
    setZoom,
    getZoom,

    // Marker operations
    addMarker,
    removeMarker,
    updateMarker,
    clearMarkers,
    getMarkers,
    fitBounds,

    // General
    reset,
  };
};
