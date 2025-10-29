'use client';

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export interface GridOverlayProps {
  /**
   * MapLibre map instance
   */
  map: MaplibreMap | null;
  
  /**
   * Grid spacing in meters
   * @default 10
   */
  gridSize?: number;
  
  /**
   * Enable/disable grid visibility
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Grid line color
   * @default '#94a3b8'
   */
  color?: string;
  
  /**
   * Grid line opacity
   * @default 0.4
   */
  opacity?: number;
}

/**
 * Grid overlay for snap-to-grid functionality
 */
export function GridOverlay({
  map,
  gridSize = 10,
  enabled = true,
  color = '#94a3b8',
  opacity = 0.4,
}: GridOverlayProps) {
  useEffect(() => {
    if (!map) return;

    // Wait for map to load
    const initializeGrid = () => {
      if (!enabled) {
        // Remove grid if disabled
        if (map.getLayer('grid-lines')) {
          map.removeLayer('grid-lines');
        }
        if (map.getSource('grid')) {
          map.removeSource('grid');
        }
        return;
      }

      // Add grid source if not exists
      if (!map.getSource('grid')) {
        map.addSource('grid', {
          type: 'geojson',
          data: generateGridGeoJSON(map, gridSize),
        });
      }

      // Add grid layer if not exists
      if (!map.getLayer('grid-lines')) {
        map.addLayer({
          id: 'grid-lines',
          type: 'line',
          source: 'grid',
          paint: {
            'line-color': color,
            'line-width': 0.5,
            'line-opacity': opacity,
          },
        });
      }
    };

    if (map.loaded()) {
      initializeGrid();
    } else {
      map.once('load', initializeGrid);
    }

    // Update grid when map moves
    const updateGrid = () => {
      if (!enabled) return;
      
      const source = map.getSource('grid');
      if (source && source.type === 'geojson') {
        (source as any).setData(generateGridGeoJSON(map, gridSize));
      }
    };

    // Debounce grid updates for performance
    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updateGrid, 100);
    };

    map.on('moveend', debouncedUpdate);
    map.on('zoomend', debouncedUpdate);

    // Cleanup
    return () => {
      clearTimeout(updateTimeout);
      map.off('moveend', debouncedUpdate);
      map.off('zoomend', debouncedUpdate);
      
      if (map.getLayer('grid-lines')) {
        map.removeLayer('grid-lines');
      }
      if (map.getSource('grid')) {
        map.removeSource('grid');
      }
    };
  }, [map, gridSize, enabled, color, opacity]);

  // Render toggle button
  return (
    <div className="absolute bottom-24 left-4 bg-white rounded-lg shadow-md p-2 z-10">
      <button
        onClick={() => {
          // This will be controlled by parent component's enabled prop
          // For now, just show current state
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          enabled
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
        }`}
        title={`Grid: ${gridSize}m spacing`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
        <span>{gridSize}m</span>
      </button>
    </div>
  );
}

/**
 * Generate grid GeoJSON based on map bounds and grid size
 */
function generateGridGeoJSON(map: MaplibreMap, gridSize: number): FeatureCollection {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  // Calculate grid spacing in degrees (approximate conversion from meters)
  // At equator: 1 degree latitude ≈ 111km
  // Longitude spacing varies with latitude
  const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
  const metersPerDegreeLat = 111000; // approximately
  const metersPerDegreeLng = 111000 * Math.cos(centerLat * Math.PI / 180);
  
  const latSpacing = gridSize / metersPerDegreeLat;
  const lngSpacing = gridSize / metersPerDegreeLng;
  
  // Adjust grid density based on zoom level
  // Higher zoom = finer grid
  const densityFactor = Math.max(1, Math.floor(20 - zoom));
  const adjustedLatSpacing = latSpacing * densityFactor;
  const adjustedLngSpacing = lngSpacing * densityFactor;
  
  const features: Feature<LineString>[] = [];
  
  // Generate vertical lines (longitude)
  const west = bounds.getWest();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  const south = bounds.getSouth();
  
  // Snap to grid
  const startLng = Math.floor(west / adjustedLngSpacing) * adjustedLngSpacing;
  const endLng = Math.ceil(east / adjustedLngSpacing) * adjustedLngSpacing;
  
  for (let lng = startLng; lng <= endLng; lng += adjustedLngSpacing) {
    features.push({
      type: 'Feature',
      properties: { type: 'vertical' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [lng, south],
          [lng, north],
        ],
      },
    });
  }
  
  // Generate horizontal lines (latitude)
  const startLat = Math.floor(south / adjustedLatSpacing) * adjustedLatSpacing;
  const endLat = Math.ceil(north / adjustedLatSpacing) * adjustedLatSpacing;
  
  for (let lat = startLat; lat <= endLat; lat += adjustedLatSpacing) {
    features.push({
      type: 'Feature',
      properties: { type: 'horizontal' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [west, lat],
          [east, lat],
        ],
      },
    });
  }
  
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Snap a coordinate to the nearest grid intersection
 * 
 * @param lng - Longitude
 * @param lat - Latitude
 * @param gridSize - Grid spacing in meters
 * @returns Snapped [lng, lat] coordinates
 */
export function snapToGrid(lng: number, lat: number, gridSize: number): [number, number] {
  // Convert grid size from meters to degrees
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLng = 111000 * Math.cos(lat * Math.PI / 180);
  
  const latSpacing = gridSize / metersPerDegreeLat;
  const lngSpacing = gridSize / metersPerDegreeLng;
  
  // Snap to nearest grid point
  const snappedLng = Math.round(lng / lngSpacing) * lngSpacing;
  const snappedLat = Math.round(lat / latSpacing) * latSpacing;
  
  return [snappedLng, snappedLat];
}

/**
 * Snap a polygon's coordinates to grid
 */
export function snapPolygonToGrid(
  coordinates: number[][][],
  gridSize: number
): number[][][] {
  return coordinates.map((ring) =>
    ring.map(([lng, lat]) => snapToGrid(lng, lat, gridSize))
  );
}

/**
 * Snap a linestring's coordinates to grid
 */
export function snapLineStringToGrid(
  coordinates: number[][],
  gridSize: number
): number[][] {
  return coordinates.map(([lng, lat]) => snapToGrid(lng, lat, gridSize));
}
