/**
 * Custom MapLibre Draw styles for zone polygons
 * Provides color-coded zones by type, selection states, and vertex editing UI
 */

// Zone type color mapping (16 categories from PRD)
export const ZONE_TYPE_COLORS: Record<string, string> = {
  vendor: '#3B82F6',       // Blue
  parking: '#94A3B8',      // Slate Gray
  competition: '#10B981',  // Emerald Green
  stage: '#8B5CF6',        // Violet
  restroom: '#06B6D4',     // Cyan
  entrance: '#F59E0B',     // Amber
  medical: '#EF4444',      // Red
  security: '#DC2626',     // Dark Red
  vip: '#F59E0B',          // Gold
  media: '#6366F1',        // Indigo
  catering: '#EC4899',     // Pink
  storage: '#78716C',      // Stone
  green_space: '#22C55E',  // Lime
  buffer: '#FDE047',       // Yellow
  restricted: '#991B1B',   // Dark Red
  other: '#6B7280',        // Gray
};

/**
 * Get zone color by type (with fallback)
 */
export function getZoneColor(zoneType: string): string {
  return ZONE_TYPE_COLORS[zoneType] || ZONE_TYPE_COLORS.other;
}

/**
 * MapLibre Draw custom styles
 * Overrides default Draw styles to match zone categories
 */
export const customDrawStyles = [
  // Polygon fill - inactive (not selected)
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_color'], '#3B82F6'],
      'fill-opacity': 0.3,
    },
  },
  
  // Polygon outline - inactive
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#3B82F6'],
      'line-width': 2,
    },
  },

  // Polygon fill - active (selected)
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#FCD34D', // Yellow highlight
      'fill-opacity': 0.4,
    },
  },

  // Polygon outline - active (selected)
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'line-color': '#F59E0B', // Amber
      'line-width': 3,
      'line-dasharray': [0.2, 2],
    },
  },

  // Polygon fill - static (non-editable, used for display)
  {
    id: 'gl-draw-polygon-fill-static',
    type: 'fill',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_color'], '#3B82F6'],
      'fill-opacity': 0.3,
    },
  },

  // Polygon outline - static
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], '#3B82F6'],
      'line-width': 2,
    },
  },

  // Vertices (control points) - active
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#FFFFFF',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#F59E0B',
    },
  },

  // Midpoints (for adding vertices)
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#FFFFFF',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#F59E0B',
      'circle-opacity': 0.8,
    },
  },

  // Halo for selected vertices
  {
    id: 'gl-draw-polygon-and-line-vertex-halo-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 8,
      'circle-color': '#FFFFFF',
      'circle-opacity': 0.3,
    },
  },

  // Line being drawn (preview)
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#F59E0B',
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },

  // Points being drawn
  {
    id: 'gl-draw-point',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['!=', 'meta', 'vertex']],
    paint: {
      'circle-radius': 6,
      'circle-color': '#F59E0B',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  },
];

/**
 * Default Draw options for polygon mode
 */
export const defaultDrawOptions = {
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true,
  },
  defaultMode: 'simple_select' as const,
  styles: customDrawStyles,
  // User properties that can be set on features
  userProperties: true,
};

/**
 * Helper to create a feature with zone properties
 */
export function createZoneFeature(geometry: any, properties?: { color?: string; name?: string; id?: string }) {
  return {
    type: 'Feature',
    properties: {
      user_color: properties?.color || ZONE_TYPE_COLORS.other,
      user_name: properties?.name || '',
      user_id: properties?.id || '',
    },
    geometry,
  };
}
