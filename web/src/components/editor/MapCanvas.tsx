/**
 * MapCanvas - Interactive MapLibre map component for layout editor
 * Renders zones as GeoJSON layers with color styling
 * Handles zoom, pan, and viewport controls
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { components } from '@/types/api';
import { zonesToFeatureCollection } from '@/lib/map/mappers';

type Zone = components['schemas']['Zone'];

interface MapCanvasProps {
  zones: Zone[];
  selectedZoneId?: number | null;
  onZoneClick?: (zoneId: number) => void;
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  className?: string;
  isLoading?: boolean;
}

export function MapCanvas({
  zones,
  selectedZoneId,
  onZoneClick,
  center = [-122.4194, 37.7749], // Default: San Francisco
  zoom = 15,
  className = '',
  isLoading = false,
}: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initializingRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || initializingRef.current) return;
    
    initializingRef.current = true;

    // Ensure container is in the DOM and has dimensions
    const container = mapContainer.current;
    const { clientWidth, clientHeight } = container;
    
    if (clientWidth === 0 || clientHeight === 0) {
      console.warn('Map container has zero dimensions, deferring initialization');
      return;
    }

    try {
      console.log('Initializing MapLibre map...');
      
      const mapStyle: maplibregl.StyleSpecification = {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
          },
        ],
      } as const;
      
      console.log('Map style being set:', JSON.stringify(mapStyle, null, 2));
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center,
        zoom,
      });
    } catch (error) {
      console.error('MapLibre initialization error:', error);
      throw error; // Re-throw to trigger error boundary
    }

    // Add navigation controls (zoom buttons)
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Wait for map to load before rendering zones
    map.current.on('load', () => {
      console.log('MapLibre map loaded successfully');
      const style = map.current?.getStyle();
      console.log('Map style:', style);
      console.log('Map layers:', style?.layers);
      console.log('Map sources:', style?.sources);
      
      // Check if OSM layer is present
      const osmLayer = style?.layers?.find((l: any) => l.id === 'osm-layer');
      console.log('OSM layer found?', osmLayer);
      
      // Check if OSM source is present
      const osmSource = style?.sources?.['osm'];
      console.log('OSM source found?', osmSource);
      
      // Force resize to ensure canvas dimensions are correct
      setTimeout(() => {
        map.current?.resize();
        console.log('Map resized');
      }, 100);
      
      setIsLoaded(true);
    });

    // Handle map errors
    map.current.on('error', (e) => {
      console.error('MapLibre error event:', e);
    });

    // Cleanup on unmount
    return () => {
      initializingRef.current = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty deps - initialize once only

  // Update center/zoom when props change
  useEffect(() => {
    if (map.current && center && zoom) {
      map.current.setCenter(center);
      map.current.setZoom(zoom);
    }
  }, [center, zoom]);

  // Render zones as GeoJSON layers
  useEffect(() => {
    if (!map.current || !isLoaded || zones.length === 0) return;

    const mapInstance = map.current;

    // Ensure style is fully loaded before manipulating sources/layers
    // This prevents "Style is not done loading" error
    const addZonesWhenReady = () => {
      if (!mapInstance.isStyleLoaded()) {
        console.log('Waiting for map style...');
        mapInstance.once('idle', addZonesWhenReady);
        return;
      }

      console.log('Adding zones to map');

      // Convert zones to GeoJSON FeatureCollection using type-safe mapper
      const geojson = zonesToFeatureCollection(zones);

      // Add or update zones source
      const sourceId = 'zones';
      if (mapInstance.getSource(sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });
      }

      // Add zone fill layer (colored polygons)
      const fillLayerId = 'zones-fill';
      if (!mapInstance.getLayer(fillLayerId)) {
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.4,
          },
        });
      }

      // Add zone outline layer
      const outlineLayerId = 'zones-outline';
      if (!mapInstance.getLayer(outlineLayerId)) {
        mapInstance.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
          },
        });
      }

      // Handle zone clicks
      const handleClick = (e: maplibregl.MapMouseEvent) => {
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: [fillLayerId],
        });

        if (features.length > 0 && onZoneClick) {
          const feature = features[0];
          const zoneId = feature.properties?.id;
          if (typeof zoneId === 'number') {
            onZoneClick(zoneId);
          }
        }
      };

      mapInstance.on('click', fillLayerId, handleClick);

      // Change cursor on hover
      mapInstance.on('mouseenter', fillLayerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', fillLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    };

    // Start the process of adding zones
    addZonesWhenReady();

    // Cleanup event listeners
    return () => {
      // Event listeners will be cleaned up when map is removed
      // mapInstance.off() requires the actual function reference, not layer ID
    };
  }, [zones, isLoaded, onZoneClick]);

  // Highlight selected zone
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const mapInstance = map.current;
    const outlineLayerId = 'zones-outline';

    if (mapInstance.getLayer(outlineLayerId)) {
      // Update outline to highlight selected zone
      mapInstance.setPaintProperty(outlineLayerId, 'line-width', [
        'case',
        ['==', ['get', 'id'], selectedZoneId ?? -1],
        4, // Selected zone: thicker outline
        2, // Other zones: normal outline
      ]);

      mapInstance.setPaintProperty(outlineLayerId, 'line-color', [
        'case',
        ['==', ['get', 'id'], selectedZoneId ?? -1],
        '#ef4444', // Selected zone: red outline
        ['get', 'color'], // Other zones: original color
      ]);
    }
  }, [selectedZoneId, isLoaded]);

  // Fit map to zones bounds on initial load
  useEffect(() => {
    if (!map.current || !isLoaded || zones.length === 0) return;

    const mapInstance = map.current;

    // Calculate bounds from all zones
    const bounds = new maplibregl.LngLatBounds();
    zones.forEach((zone) => {
      // Cast boundary to proper type (OpenAPI generator types it incorrectly)
      const boundary = zone.boundary as unknown as { type: 'Polygon'; coordinates: number[][][] };
      if (boundary?.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
        const coords = boundary.coordinates[0] as Array<[number, number]>;
        coords.forEach(([lng, lat]: [number, number]) => {
          bounds.extend([lng, lat]);
        });
      }
    });

    // Fit map to bounds with padding
    if (!bounds.isEmpty()) {
      mapInstance.fitBounds(bounds, {
        padding: 50,
        maxZoom: 18,
      });
    }
  }, [zones, isLoaded]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: '500px' }}>
      <div ref={mapContainer} className="absolute inset-0" style={{ zIndex: 0 }} />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ zIndex: 10 }}>
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}

      {/* Zones loading skeleton */}
      {isLoading && isLoaded && (
        <div className="absolute top-4 left-4 bg-white px-4 py-3 rounded shadow-md text-sm" style={{ zIndex: 20 }}>
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Loading zones...</span>
          </div>
        </div>
      )}

      {/* Zone count indicator */}
      {isLoaded && !isLoading && zones.length > 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded shadow-md text-sm" style={{ zIndex: 20 }}>
          <span className="font-semibold">{zones.length}</span> zones
        </div>
      )}
    </div>
  );
}
