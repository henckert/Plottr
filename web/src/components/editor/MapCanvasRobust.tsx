/**
 * MapCanvas - Robust MapLibre implementation with comprehensive size/visibility handling
 * Fixes: zero-size containers, late sizing, hidden elements, resize events
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { components } from '@/types/api';
import { zonesToFeatureCollection } from '@/lib/map/mappers';
import { MapGeocodingSearch } from './MapGeocodingSearch';
import { MapDrawControl } from './MapDrawControl';

type Zone = components['schemas']['Zone'];

interface MapCanvasProps {
  zones: Zone[];
  selectedZoneId?: number | null;
  onStartEdit?: (id: string, feature: any) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  isLoading?: boolean;
  enableDrawing?: boolean;
  drawMode?: 'venue' | 'zone';
  venueId?: number;
  layoutId?: number;
  onPolygonCreate?: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonUpdate?: (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonDelete?: (id: string) => Promise<void>;
  onRefreshZones?: (refreshFn: () => Promise<void>) => void;
  onStartEditingRef?: React.MutableRefObject<((id: string, feature: any) => void) | null>;
}

export function MapCanvas({
  zones,
  selectedZoneId,
  onStartEdit,
  center = [-6.2603, 53.3498], // Galway, Ireland
  zoom = 10,
  className = '',
  isLoading = false,
  enableDrawing = false,
  drawMode = 'zone',
  venueId,
  layoutId = 15,
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonDelete,
  onRefreshZones,
  onStartEditingRef,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZones, setCurrentZones] = useState<Zone[]>(zones);
  const [diagnostics, setDiagnostics] = useState({
    containerWidth: 0,
    containerHeight: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    styleLoaded: false,
    visible: false,
  });

  // Initialize map with comprehensive hardening
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const el = containerRef.current;
    
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

    console.log('[MapCanvas] Initializing...');
    
    const map = new maplibregl.Map({
      container: el,
      style: mapStyle,
      center,
      zoom,
    });

    mapRef.current = map;

    // Add controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    let visiblePoll: NodeJS.Timeout | null = null;
    let ro: ResizeObserver | null = null;

    const onResize = () => {
      try {
        map.resize();
        updateDiagnostics();
      } catch (err) {
        console.warn('[MapCanvas] Resize failed:', err);
      }
    };

    const updateDiagnostics = () => {
      const canvas = el.querySelector('canvas');
      setDiagnostics({
        containerWidth: el.clientWidth,
        containerHeight: el.clientHeight,
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
        styleLoaded: (map as any).isStyleLoaded ? (map as any).isStyleLoaded() : false,
        visible: !!el.offsetParent,
      });
    };

    const waitVisible = (): Promise<void> =>
      new Promise((resolve) => {
        const isVisible = () => !!el.offsetParent && el.clientWidth > 0 && el.clientHeight > 0;
        if (isVisible()) {
          console.log('[MapCanvas] Container visible');
          return resolve();
        }
        console.log('[MapCanvas] Waiting for container to become visible...');
        visiblePoll = setInterval(() => {
          if (isVisible()) {
            clearInterval(visiblePoll!);
            console.log('[MapCanvas] Container now visible');
            resolve();
          }
        }, 300);
      });

    const waitStyle = (): Promise<void> =>
      new Promise((resolve) => {
        if ((map as any).isStyleLoaded && (map as any).isStyleLoaded()) {
          console.log('[MapCanvas] Style already loaded');
          return resolve();
        }
        console.log('[MapCanvas] Waiting for style to load...');
        const onIdle = () => {
          if ((map as any).isStyleLoaded && (map as any).isStyleLoaded()) {
            map.off('idle', onIdle);
            console.log('[MapCanvas] Style loaded');
            resolve();
          }
        };
        map.on('idle', onIdle);
      });

    const computeBounds = (zoneList: Zone[]): maplibregl.LngLatBounds | null => {
      if (!zoneList || zoneList.length === 0) return null;
      const bounds = new maplibregl.LngLatBounds();
      zoneList.forEach((zone) => {
        const boundary = zone.boundary as any;
        if (boundary?.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
          const coords = boundary.coordinates[0] as Array<[number, number]>;
          coords.forEach(([lng, lat]: [number, number]) => {
            bounds.extend([lng, lat]);
          });
        }
      });
      return bounds.isEmpty() ? null : bounds;
    };

    // Main initialization flow
    (async () => {
      try {
        await waitVisible();
        await waitStyle();
        
        // Force resize twice
        onResize();
        setTimeout(onResize, 0);
        
        console.log('[MapCanvas] Adding zones source and layers...');
        
        // Add zones source and layers
        if (zones && zones.length > 0) {
          const geojson = zonesToFeatureCollection(zones);
          
          if (!map.getSource('zones')) {
            map.addSource('zones', {
              type: 'geojson',
              data: geojson,
            });
          }
          
          if (!map.getLayer('zones-fill')) {
            map.addLayer({
              id: 'zones-fill',
              type: 'fill',
              source: 'zones',
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.4,
              },
            });
          }
          
          if (!map.getLayer('zones-outline')) {
            map.addLayer({
              id: 'zones-outline',
              type: 'line',
              source: 'zones',
              paint: {
                'line-color': ['get', 'color'],
                'line-width': 2,
              },
            });
          }
          
          // Add click handler for editing
          map.on('click', 'zones-fill', (e) => {
            if (e.features && e.features.length > 0 && onStartEdit) {
              const feature = e.features[0];
              const zoneId = feature.properties?.id;
              if (zoneId) {
                // Pass full feature with id, geometry, and properties
                onStartEdit(String(zoneId), {
                  type: 'Feature',
                  id: zoneId,
                  geometry: feature.geometry,
                  properties: feature.properties,
                });
              }
            }
          });
          
          // Change cursor on hover
          map.on('mouseenter', 'zones-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          
          map.on('mouseleave', 'zones-fill', () => {
            map.getCanvas().style.cursor = '';
          });
          
          // Fit bounds
          try {
            const bounds = computeBounds(zones);
            if (bounds) {
              map.fitBounds(bounds, { padding: 40, duration: 0 });
              console.log('[MapCanvas] Fitted bounds to zones');
            }
          } catch (err) {
            console.warn('[MapCanvas] fitBounds failed:', err);
          }
        }
        
        // Set up ResizeObserver
        ro = new ResizeObserver((entries) => {
          const { contentRect } = entries[0];
          if (contentRect.width > 0 && contentRect.height > 0) {
            onResize();
          }
        });
        ro.observe(el);
        
        // Window resize handler
        window.addEventListener('resize', onResize);
        
        setIsLoaded(true);
        updateDiagnostics();
        console.log('[MapCanvas] Initialization complete');
        
      } catch (err) {
        console.error('[MapCanvas] Initialization failed:', err);
      }
    })();

    // Cleanup
    return () => {
      if (visiblePoll) clearInterval(visiblePoll);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
      try {
        map.remove();
        mapRef.current = null;
      } catch (err) {
        console.warn('[MapCanvas] Cleanup failed:', err);
      }
    };
  }, []); // Initialize once only

  // Refresh zones from zones prop
  const refreshZonesFromProp = () => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    console.log('[MapCanvas] Refreshing zones from prop:', zones);

    try {
      const geojson = zonesToFeatureCollection(zones);
      const source = map.getSource('zones') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojson);
        console.log('[MapCanvas] Zones refreshed:', geojson.features.length, 'features');
      }
    } catch (err) {
      console.error('[MapCanvas] Failed to refresh zones:', err);
    }
  };

  // Set layer filters to hide/show specific zones (for editing)
  const setZoneLayerFilters = (excludeId: string | null) => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    try {
      if (excludeId !== null) {
        // Convert string ID to number for comparison
        const numericId = Number(excludeId);
        const filter: any = ["all", ["!=", ["get", "id"], numericId]];
        if (map.getLayer('zones-fill')) map.setFilter('zones-fill', filter);
        if (map.getLayer('zones-line')) map.setFilter('zones-line', filter);
        console.log('[MapCanvas] Filtered out zone ID:', excludeId);
      } else {
        if (map.getLayer('zones-fill')) map.setFilter('zones-fill', null);
        if (map.getLayer('zones-line')) map.setFilter('zones-line', null);
        console.log('[MapCanvas] Cleared zone filters');
      }
    } catch (err) {
      console.error('[MapCanvas] Failed to set zone filters:', err);
    }
  };

  // Update zones when they change
  useEffect(() => {
    refreshZonesFromProp();
  }, [zones, isLoaded]);

  // Expose refresh function to parent via callback
  useEffect(() => {
    if (onRefreshZones && isLoaded) {
      onRefreshZones(async () => {
        // Parent will update zones prop, which triggers refreshZonesFromProp
        console.log('[MapCanvas] Refresh zones called from parent');
      });
    }
  }, [onRefreshZones, isLoaded]);

  // Update selected zone highlighting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    try {
      // Check if layer exists before trying to style it
      if (!map.getLayer('zones-outline')) return;

      if (selectedZoneId) {
        map.setFilter('zones-outline', ['==', ['get', 'id'], selectedZoneId]);
        map.setPaintProperty('zones-outline', 'line-color', '#ff0000');
        map.setPaintProperty('zones-outline', 'line-width', 3);
      } else {
        map.setFilter('zones-outline', null);
        map.setPaintProperty('zones-outline', 'line-color', ['get', 'color']);
        map.setPaintProperty('zones-outline', 'line-width', 2);
      }
    } catch (err) {
      console.warn('[MapCanvas] Failed to update selection:', err);
    }
  }, [selectedZoneId, isLoaded]);

  return (
    <div className={`relative w-full min-h-[70vh] flex flex-col ${className}`}>
      {/* Map container with explicit height */}
      <div 
        ref={containerRef} 
        className="relative grow min-h-[60vh]" 
        style={{ minHeight: '60vh' }}
      />

      {/* Geocoding search bar */}
      {isLoaded && !enableDrawing && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-30">
          <MapGeocodingSearch
            onResultSelect={(result) => {
              const map = mapRef.current;
              if (!map) return;

              if (result.bbox) {
                // Fly to bounding box
                const [minLng, minLat, maxLng, maxLat] = result.bbox;
                map.fitBounds(
                  [
                    [minLng, minLat],
                    [maxLng, maxLat],
                  ],
                  { padding: 50, duration: 1500 }
                );
              } else {
                // Fly to center point
                map.flyTo({
                  center: result.center,
                  zoom: 15,
                  duration: 1500,
                });
              }
            }}
          />
        </div>
      )}

      {/* Drawing control */}
      {isLoaded && enableDrawing && mapRef.current && onPolygonCreate && (
        <MapDrawControl
          map={mapRef.current}
          mode={drawMode}
          venueId={venueId}
          onPolygonComplete={async (geojson) => {
            try {
              await onPolygonCreate(geojson);
            } catch (err) {
              console.error('[MapCanvas] Failed to create polygon:', err);
            }
          }}
          onPolygonUpdate={async (id, geojson) => {
            if (onPolygonUpdate) {
              try {
                await onPolygonUpdate(id, geojson);
              } catch (err) {
                console.error('[MapCanvas] Failed to update polygon:', err);
              }
            }
          }}
          onPolygonDelete={async (id) => {
            if (onPolygonDelete) {
              try {
                await onPolygonDelete(id);
              } catch (err) {
                console.error('[MapCanvas] Failed to delete polygon:', err);
              }
            }
          }}
          onRefreshZones={refreshZonesFromProp}
          onSetZoneFilter={setZoneLayerFilters}
          onStartEditingRef={onStartEditingRef}
        />
      )}

      {/* Diagnostics HUD */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs font-mono p-2 rounded z-50 pointer-events-none">
          <div>Container: {diagnostics.containerWidth}x{diagnostics.containerHeight}</div>
          <div>Canvas: {diagnostics.canvasWidth}x{diagnostics.canvasHeight}</div>
          <div>Style: {diagnostics.styleLoaded ? '✓' : '✗'}</div>
          <div>Visible: {diagnostics.visible ? '✓' : '✗'}</div>
          <div>Zones: {zones?.length || 0}</div>
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}

      {/* Zones loading indicator */}
      {isLoading && isLoaded && (
        <div className="absolute top-4 left-4 bg-white px-4 py-3 rounded shadow-md text-sm z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Loading zones...</span>
          </div>
        </div>
      )}

      {/* Zone count badge */}
      {isLoaded && zones && zones.length > 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded shadow text-sm font-medium z-20">
          {zones.length} {zones.length === 1 ? 'zone' : 'zones'}
        </div>
      )}

      {/* Fit to Zones button */}
      {isLoaded && zones && zones.length > 0 && (
        <button
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            
            const bounds = new maplibregl.LngLatBounds();
            zones.forEach((zone) => {
              const boundary = zone.boundary as any;
              if (boundary?.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
                const coords = boundary.coordinates[0] as Array<[number, number]>;
                coords.forEach(([lng, lat]: [number, number]) => {
                  bounds.extend([lng, lat]);
                });
              }
            });
            
            if (!bounds.isEmpty()) {
              map.fitBounds(bounds, { padding: 50, duration: 1000 });
            }
          }}
          className="absolute top-16 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium z-20 transition-colors"
        >
          📍 Fit to Zones
        </button>
      )}
    </div>
  );
}
