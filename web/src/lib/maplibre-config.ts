/**
 * MapLibre configuration and utilities
 * Base map styles, layer configurations, and helper functions
 */

import type { StyleSpecification } from 'maplibre-gl';

/**
 * OpenStreetMap base map style
 */
export const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Satellite imagery style (requires Mapbox token)
 * Falls back to OSM if token not available
 */
export function getSatelliteStyle(mapboxToken?: string): StyleSpecification {
  if (!mapboxToken) {
    console.warn('Mapbox token not provided, falling back to OSM');
    return osmStyle;
  }

  return {
    version: 8,
    sources: {
      'mapbox-satellite': {
        type: 'raster',
        tiles: [
          `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${mapboxToken}`,
        ],
        tileSize: 256,
        attribution: '© Mapbox © OpenStreetMap',
      },
    },
    layers: [
      {
        id: 'satellite-layer',
        type: 'raster',
        source: 'mapbox-satellite',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

/**
 * Zone type color mapping
 * Default colors for each zone type
 */
export const zoneTypeColors: Record<string, string> = {
  pitch: '#22c55e', // Green
  goal_area: '#3b82f6', // Blue
  penalty_area: '#eab308', // Yellow
  training_zone: '#f97316', // Orange
  competition: '#ef4444', // Red
  parking: '#6b7280', // Gray
  seating: '#a855f7', // Purple
  entrance: '#14b8a6', // Teal
  exit: '#f43f5e', // Rose
  restroom: '#06b6d4', // Cyan
  concession: '#ec4899', // Pink
  vendor: '#8b5cf6', // Violet
  medical: '#dc2626', // Red-600
  equipment: '#84cc16', // Lime
  other: '#64748b', // Slate
};

/**
 * Get default color for zone type
 */
export function getZoneTypeColor(zoneType: string): string {
  return zoneTypeColors[zoneType] || '#3b82f6'; // Default blue
}

/**
 * Convert hex color to RGBA for MapLibre
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate polygon centroid for label placement
 */
export function getPolygonCentroid(coordinates: number[][][]): [number, number] {
  const ring = coordinates[0]; // Exterior ring
  let x = 0;
  let y = 0;
  let count = ring.length - 1; // Exclude closing point

  for (let i = 0; i < count; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }

  return [x / count, y / count];
}

/**
 * Format area in square meters to human-readable string
 */
export function formatArea(areaSqm: number | null): string {
  if (!areaSqm) return 'N/A';
  
  if (areaSqm >= 10000) {
    return `${(areaSqm / 10000).toFixed(2)} ha`; // Hectares
  }
  return `${areaSqm.toFixed(0)} m²`;
}

/**
 * Format perimeter in meters to human-readable string
 */
export function formatPerimeter(perimeterM: number | null): string {
  if (!perimeterM) return 'N/A';
  
  if (perimeterM >= 1000) {
    return `${(perimeterM / 1000).toFixed(2)} km`;
  }
  return `${perimeterM.toFixed(0)} m`;
}
