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

type Zone = components['schemas']['Zone'];

interface MapCanvasProps {
  zones: Zone[];
  selectedZoneId?: number | null;
  onZoneClick?: (zoneId: number) => void;
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  className?: string;
}

export function MapCanvas({
  zones,
  selectedZoneId,
  onZoneClick,
  center = [-122.4194, 37.7749], // Default: San Francisco
  zoom = 15,
  className = '',
}: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
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
      },
      center,
      zoom,
      minZoom: 10,
      maxZoom: 22,
    });

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
      setIsLoaded(true);
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  // Render zones as GeoJSON layers
  useEffect(() => {
    if (!map.current || !isLoaded || zones.length === 0) return;

    const mapInstance = map.current;

    // Convert zones to GeoJSON FeatureCollection
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: zones.map((zone) => ({
        type: 'Feature',
        id: zone.id,
        properties: {
          id: zone.id,
          name: zone.name || '',
          zone_type: zone.zone_type || '',
          surface: zone.surface || '',
          color: zone.color || '#3b82f6', // Default blue
          area_sqm: zone.area_sqm || null,
        },
        geometry: zone.boundary as unknown as GeoJSON.Geometry,
      })),
    };

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

    // Add zone labels (zone names)
    const labelLayerId = 'zones-labels';
    if (!mapInstance.getLayer(labelLayerId)) {
      mapInstance.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#000000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
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

    // Cleanup event listeners
    return () => {
      if (mapInstance.getLayer(fillLayerId)) {
        mapInstance.off('click', fillLayerId, handleClick);
      }
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
      if (zone.boundary?.type === 'Polygon') {
        const coords = (zone.boundary as any).coordinates[0] as Array<[number, number]>;
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
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}

      {/* Zone count indicator */}
      {isLoaded && zones.length > 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded shadow-md text-sm">
          <span className="font-semibold">{zones.length}</span> zones
        </div>
      )}
    </div>
  );
}
