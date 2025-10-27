'use client';

import { useEffect, useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Feature } from 'geojson';

export interface DrawingToolbarProps {
  /**
   * MapLibre map instance
   */
  map: MaplibreMap | null;
  
  /**
   * Callback when a feature is created
   */
  onFeatureCreated?: (feature: Feature) => void;
  
  /**
   * Callback when a feature is updated
   */
  onFeatureUpdated?: (feature: Feature) => void;
  
  /**
   * Callback when a feature is deleted
   */
  onFeatureDeleted?: (featureId: string) => void;
  
  /**
   * Callback when drawing mode changes
   */
  onModeChange?: (mode: string) => void;
  
  /**
   * Initial drawing mode
   * @default 'simple_select'
   */
  initialMode?: 'draw_polygon' | 'draw_point' | 'draw_line_string' | 'simple_select';
  
  /**
   * CSS class for toolbar container
   */
  className?: string;
}

/**
 * Drawing toolbar for creating zones, assets, and boundaries
 * 
 * Modes:
 * - draw_polygon: Draw closed polygons (zones)
 * - draw_point: Place individual points (assets)
 * - draw_line_string: Draw lines (fences, boundaries)
 * - simple_select: Select and edit existing features
 * 
 * @example
 * ```tsx
 * <DrawingToolbar
 *   map={map}
 *   onFeatureCreated={(feature) => {
 *     console.log('Created:', feature);
 *     // Save to backend
 *   }}
 * />
 * ```
 */
export function DrawingToolbar({
  map,
  onFeatureCreated,
  onFeatureUpdated,
  onFeatureDeleted,
  onModeChange,
  initialMode = 'simple_select',
  className = '',
}: DrawingToolbarProps) {
  const draw = useRef<MapboxDraw | null>(null);
  const [currentMode, setCurrentMode] = useState<string>(initialMode);

  // Initialize MapboxDraw (compatible with MapLibre)
  useEffect(() => {
    if (!map) return;

    // Custom styles for drawing features
    const drawStyles = [
      // Polygon fill (zones)
      {
        id: 'gl-draw-polygon-fill-inactive',
        type: 'fill',
        filter: ['all',
          ['==', 'active', 'false'],
          ['==', '$type', 'Polygon'],
          ['!=', 'mode', 'static']
        ],
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3,
        },
      },
      {
        id: 'gl-draw-polygon-fill-active',
        type: 'fill',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.3,
        },
      },
      // Polygon outline
      {
        id: 'gl-draw-polygon-stroke-inactive',
        type: 'line',
        filter: ['all',
          ['==', 'active', 'false'],
          ['==', '$type', 'Polygon'],
          ['!=', 'mode', 'static']
        ],
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      },
      {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
        },
      },
      // Line string
      {
        id: 'gl-draw-line-inactive',
        type: 'line',
        filter: ['all',
          ['==', 'active', 'false'],
          ['==', '$type', 'LineString'],
          ['!=', 'mode', 'static']
        ],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
        },
      },
      {
        id: 'gl-draw-line-active',
        type: 'line',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
        },
      },
      // Points
      {
        id: 'gl-draw-point-inactive',
        type: 'circle',
        filter: ['all',
          ['==', 'active', 'false'],
          ['==', '$type', 'Point'],
          ['!=', 'mode', 'static']
        ],
        paint: {
          'circle-radius': 6,
          'circle-color': '#ef4444',
        },
      },
      {
        id: 'gl-draw-point-active',
        type: 'circle',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 8,
          'circle-color': '#ef4444',
        },
      },
      // Vertices
      {
        id: 'gl-draw-polygon-and-line-vertex-inactive',
        type: 'circle',
        filter: ['all',
          ['==', 'meta', 'vertex'],
          ['==', '$type', 'Point'],
          ['!=', 'mode', 'static']
        ],
        paint: {
          'circle-radius': 4,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
        },
      },
      {
        id: 'gl-draw-polygon-and-line-vertex-active',
        type: 'circle',
        filter: ['all',
          ['==', 'meta', 'vertex'],
          ['==', '$type', 'Point'],
          ['==', 'active', 'true']
        ],
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#10b981',
        },
      },
      // Midpoints (for adding vertices)
      {
        id: 'gl-draw-polygon-midpoint',
        type: 'circle',
        filter: ['all',
          ['==', '$type', 'Point'],
          ['==', 'meta', 'midpoint']
        ],
        paint: {
          'circle-radius': 3,
          'circle-color': '#f59e0b',
        },
      },
    ];

    // Initialize draw control
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      // @ts-ignore - MapboxDraw works with MapLibre despite type mismatch
      styles: drawStyles,
      userProperties: true,
    });

    // @ts-ignore - MapLibre types don't include IControl but MapboxDraw implements it
    map.addControl(draw.current, 'top-left');

    // Set initial mode
    if (initialMode !== 'simple_select') {
      draw.current.changeMode(initialMode);
      setCurrentMode(initialMode);
    }

    // Event handlers
    map.on('draw.create', (e: any) => {
      if (onFeatureCreated && e.features && e.features[0]) {
        onFeatureCreated(e.features[0]);
      }
    });

    map.on('draw.update', (e: any) => {
      if (onFeatureUpdated && e.features && e.features[0]) {
        onFeatureUpdated(e.features[0]);
      }
    });

    map.on('draw.delete', (e: any) => {
      if (onFeatureDeleted && e.features && e.features[0]) {
        onFeatureDeleted(e.features[0].id);
      }
    });

    map.on('draw.modechange', (e: any) => {
      if (e.mode) {
        setCurrentMode(e.mode);
        if (onModeChange) {
          onModeChange(e.mode);
        }
      }
    });

    // Cleanup
    return () => {
      if (draw.current && map) {
        // @ts-ignore
        map.removeControl(draw.current);
      }
    };
  }, [map]);

  /**
   * Change drawing mode
   */
  const changeMode = (mode: 'draw_polygon' | 'draw_point' | 'draw_line_string' | 'simple_select' | 'direct_select') => {
    if (draw.current) {
      draw.current.changeMode(mode as any);
      setCurrentMode(mode);
    }
  };

  // Expose draw instance via ref if needed
  useEffect(() => {
    if (draw.current && typeof (window as any) !== 'undefined') {
      (window as any).__mapboxDraw = draw.current;
    }
  }, [draw.current]);

  if (!map) return null;

  return (
    <div className={`absolute top-4 left-20 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-10 ${className}`}>
      {/* Draw Zone (Polygon) */}
      <button
        onClick={() => changeMode('draw_polygon')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          currentMode === 'draw_polygon'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Draw zone (polygon)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </button>

      {/* Place Asset (Point) */}
      <button
        onClick={() => changeMode('draw_point')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          currentMode === 'draw_point'
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Place asset (point)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Draw Line (Fence/Boundary) */}
      <button
        onClick={() => changeMode('draw_line_string')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          currentMode === 'draw_line_string'
            ? 'bg-amber-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Draw line (fence/boundary)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </button>

      {/* Select Mode */}
      <button
        onClick={() => changeMode('simple_select')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          currentMode === 'simple_select' || currentMode === 'direct_select'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Select and edit"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={() => {
          if (draw.current) {
            const selectedFeatures = draw.current.getSelected();
            if (selectedFeatures.features.length > 0) {
              const ids = selectedFeatures.features.map((f: any) => f.id);
              draw.current.delete(ids);
            }
          }
        }}
        className="px-4 py-2 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 transition-colors"
        title="Delete selected"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
