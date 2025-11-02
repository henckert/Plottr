/**
 * MapCanvasWithDraw - MapCanvas with MapLibre Draw plugin for polygon creation
 * Extends MapCanvas with drawing toolbar, zone properties panel, and CRUD operations
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'react-hot-toast';
import type { components } from '@/types/api';
import { zonesToFeatureCollection } from '@/lib/map/mappers';
import { ZonePropertiesPanel } from '@/components/editor/ZonePropertiesPanel';
import { useCreateZone, useUpdateZone, useDeleteZone } from '@/hooks/useZones';
import { validatePolygon, calculateArea, calculatePerimeter } from '@/lib/geospatial-client';
import { customDrawStyles, getZoneColor } from '@/lib/maplibre-draw-styles';
import { createPitchFromTemplate, createRectangle } from '@/lib/map/shapes';

type Zone = components['schemas']['Zone'];
type ZoneCreate = components['schemas']['ZoneCreate'];

// DrawMode type (previously from DrawToolbar)
type DrawMode = 'none' | 'draw_polygon' | 'simple_select' | 'direct_select';

// Template types (previously from ShapePalette)
interface PitchTemplate {
  id: string;
  name: string;
  sport: string;
  dimensions: { length_m: number; width_m: number };
}

interface MapCanvasWithDrawProps {
  zones: Zone[];
  layoutId: number;
  selectedZoneId?: number | null;
  onZoneClick?: (zoneId: number) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  isLoading?: boolean;
  imperialUnits?: boolean;
}

interface ZoneFormData {
  id?: number;
  tempId?: string;
  name: string;
  zone_type: string;
  surface_type: string | null;
  color: string;
  notes: string | null;
  geometry: any;
  area_m2?: number;
  perimeter_m?: number;
}

export function MapCanvasWithDraw({
  zones,
  layoutId,
  onZoneClick,
  center = [-122.4194, 37.7749],
  zoom = 15,
  className = '',
  isLoading = false,
  imperialUnits = false,
}: MapCanvasWithDrawProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [selectedZone, setSelectedZone] = useState<ZoneFormData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false); // Track if actively drawing
  const [currentMeasurements, setCurrentMeasurements] = useState<{
    perimeter_m?: number;
    area_m2?: number;
  }>({});
  
  // Mutations
  const createZoneMutation = useCreateZone();
  const updateZoneMutation = useUpdateZone();
  const deleteZoneMutation = useDeleteZone();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.current.on('load', () => {
      console.log('Map loaded');
      setIsLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Initialize MapLibre Draw
  useEffect(() => {
    if (!map.current || !isLoaded || draw.current) return;

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false, // We'll use custom toolbar
        trash: false,
      },
      defaultMode: 'simple_select',
      styles: customDrawStyles as any,
      userProperties: true,
    });

    map.current.addControl(draw.current as any, 'top-left');

    // Handle polygon creation
    map.current.on('draw.create', handleDrawCreate);
    map.current.on('draw.update', handleDrawUpdate);
    map.current.on('draw.delete', handleDrawDelete);
    map.current.on('draw.selectionchange', handleSelectionChange);
    
    // Track drawing mode changes
    map.current.on('draw.modechange', (e: any) => {
      const isDrawingMode = e.mode === 'draw_polygon';
      setIsDrawing(isDrawingMode);
      if (!isDrawingMode) {
        setCurrentMeasurements({});
      }
    });
    
    // Track measurements in real-time while drawing
    map.current.on('draw.render', () => {
      if (!draw.current) return;
      
      const data = draw.current.getAll();
      const features = data.features.filter((f: any) => f.geometry.type === 'Polygon');
      
      if (features.length > 0) {
        const feature = features[0];
        const coords = (feature.geometry as any).coordinates[0];
        
        // Need at least 3 points to calculate area
        if (coords && coords.length >= 3) {
          try {
            const area = calculateArea(feature.geometry as any);
            const perimeter = calculatePerimeter(feature.geometry as any);
            setCurrentMeasurements({
              area_m2: area.m2,
              perimeter_m: perimeter.m,
            });
          } catch {
            // Incomplete polygon, ignore
          }
        }
      }
    });

    return () => {
      if (draw.current && map.current) {
        map.current.removeControl(draw.current as any);
        draw.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Handle draw mode changes
  const handleModeChange = useCallback((mode: DrawMode) => {
    if (!draw.current) return;

    setDrawMode(mode);

    switch (mode) {
      case 'draw_polygon':
        draw.current.changeMode('draw_polygon');
        setIsDrawing(true);
        setCurrentMeasurements({});
        break;
      case 'simple_select':
        draw.current.changeMode('simple_select');
        setIsDrawing(false);
        setCurrentMeasurements({});
        break;
      case 'direct_select':
        // direct_select requires a featureId - default to simple_select instead
        // (direct_select is only used when editing a specific zone)
        draw.current.changeMode('simple_select');
        setIsDrawing(false);
        setCurrentMeasurements({});
        break;
      case 'none':
        draw.current.changeMode('simple_select');
        const selected = draw.current.getSelected();
        if (selected.features.length > 0) {
          draw.current.delete(selected.features.map((f: any) => f.id));
        }
        setSelectedZone(null);
        setIsPanelOpen(false);
        setIsDrawing(false);
        setCurrentMeasurements({});
        break;
    }
  }, []);
  
  // Finish drawing polygon manually
  const handleFinishDrawing = useCallback(() => {
    if (!draw.current || !isDrawing) return;
    
    // Get the current drawing feature
    const data = draw.current.getAll();
    const currentFeature = data.features.find((f: any) => f.geometry.type === 'Polygon');
    
    if (currentFeature && (currentFeature.geometry as any).coordinates[0].length >= 4) {
      // Complete the polygon by triggering the create event
      // MapboxDraw automatically fires draw.create when we change mode
      draw.current.changeMode('simple_select');
      setIsDrawing(false);
      setCurrentMeasurements({});
    } else {
      toast.error('Need at least 3 points to create a polygon');
    }
  }, [isDrawing]);

  // Handle polygon creation
  const handleDrawCreate = useCallback((e: any) => {
    const feature = e.features[0];
    
    // Validate polygon
    const validation = validatePolygon(feature.geometry);
    if (validation) {
      toast.error(`Invalid polygon: ${validation.message}`);
      if (draw.current) {
        draw.current.delete(feature.id);
      }
      return;
    }

    // Calculate area and perimeter
    const area = calculateArea(feature.geometry);
    const perimeter = calculatePerimeter(feature.geometry);

    // Open properties panel
    setSelectedZone({
      tempId: feature.id,
      name: '',
      zone_type: 'other',
      surface_type: null,
      color: getZoneColor('other'),
      notes: null,
      geometry: feature.geometry,
      area_m2: area.m2,
      perimeter_m: perimeter.m,
    });
    setIsPanelOpen(true);
    setDrawMode('simple_select');
    if (draw.current) {
      draw.current.changeMode('simple_select');
    }
  }, []);

  // Handle polygon update
  const handleDrawUpdate = useCallback((e: any) => {
    const feature = e.features[0];
    
    // Validate updated polygon
    const validation = validatePolygon(feature.geometry);
    if (validation) {
      toast.error(`Invalid polygon: ${validation.message}`);
      return;
    }

    // If there's a selected zone with this tempId, update its geometry
    if (selectedZone?.tempId === feature.id && selectedZone) {
      const area = calculateArea(feature.geometry);
      const perimeter = calculatePerimeter(feature.geometry);
      setSelectedZone({
        id: selectedZone.id,
        tempId: selectedZone.tempId,
        name: selectedZone.name,
        zone_type: selectedZone.zone_type,
        surface_type: selectedZone.surface_type,
        color: selectedZone.color,
        notes: selectedZone.notes,
        geometry: feature.geometry,
        area_m2: area.m2,
        perimeter_m: perimeter.m,
      });
    }
  }, [selectedZone]);

  // Handle polygon deletion
  const handleDrawDelete = useCallback((e: any) => {
    console.log('Polygon deleted from draw', e);
    setSelectedZone(null);
    setIsPanelOpen(false);
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((e: any) => {
    const features = e.features;
    if (features.length > 0) {
      const feature = features[0];
      console.log('Selected feature:', feature);
      // Could open properties panel for existing zones here
    }
  }, []);

  // Save zone to backend
  const handleSaveZone = useCallback(async (data: ZoneFormData) => {
    try {
      if (data.id) {
        // Update existing zone
        const zone = zones.find((z) => z.id === data.id);
        if (!zone) {
          toast.error('Zone not found');
          return;
        }

        await updateZoneMutation.mutateAsync({
          zoneId: data.id,
          updates: {
            name: data.name,
            zone_type: data.zone_type as any,
            surface: data.surface_type as any,
            color: data.color,
            boundary: data.geometry,
          },
          versionToken: zone.version_token || '',
        });

        toast.success('Zone updated');
      } else {
        // Create new zone
        const zoneCreate: ZoneCreate = {
          layout_id: layoutId,
          name: data.name,
          zone_type: data.zone_type as any,
          surface: data.surface_type as any,
          color: data.color,
          boundary: data.geometry,
        };

        await createZoneMutation.mutateAsync(zoneCreate);

        // Remove temporary feature from draw
        if (draw.current && data.tempId) {
          draw.current.delete(data.tempId);
        }

        toast.success('Zone created');
      }

      setSelectedZone(null);
      setIsPanelOpen(false);
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error('Zone was modified by another user. Please refresh.');
      } else {
        toast.error(`Failed to save zone: ${error.message}`);
      }
    }
  }, [zones, layoutId, createZoneMutation, updateZoneMutation]);

  // Delete zone
  const handleDeleteZone = useCallback(async () => {
    if (!selectedZone?.id) return;

    if (!confirm('Delete this zone? This action cannot be undone.')) {
      return;
    }

    try {
      const zone = zones.find((z) => z.id === selectedZone.id);
      if (!zone) {
        toast.error('Zone not found');
        return;
      }

      await deleteZoneMutation.mutateAsync({
        zoneId: selectedZone.id,
        versionToken: zone.version_token || '',
      });

      toast.success('Zone deleted');
      setSelectedZone(null);
      setIsPanelOpen(false);
    } catch (error: any) {
      toast.error(`Failed to delete zone: ${error.message}`);
    }
  }, [selectedZone, zones, deleteZoneMutation]);

  // Render zones as GeoJSON layers
  useEffect(() => {
    if (!map.current || !isLoaded || zones.length === 0) return;

    const mapInstance = map.current;

    const addZonesWhenReady = () => {
      if (!mapInstance.isStyleLoaded()) {
        mapInstance.once('idle', addZonesWhenReady);
        return;
      }

      const geojson = zonesToFeatureCollection(zones);
      const sourceId = 'zones';

      if (mapInstance.getSource(sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });
      }

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
      mapInstance.on('mouseenter', fillLayerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', fillLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    };

    addZonesWhenReady();
  }, [zones, isLoaded, onZoneClick]);
  
  // Keyboard shortcuts for finishing polygon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key: Finish drawing polygon
      if (e.key === 'Enter' && isDrawing) {
        e.preventDefault();
        handleFinishDrawing();
      }
      
      // Escape key: Cancel drawing
      if (e.key === 'Escape' && isDrawing) {
        e.preventDefault();
        if (draw.current) {
          draw.current.trash();
          draw.current.changeMode('simple_select');
          setIsDrawing(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, handleFinishDrawing]);
  
  // Handle template selection
  const handleSelectTemplate = useCallback((template: PitchTemplate) => {
    if (!map.current || !draw.current) return;
    
    // Get map center as default placement
    const center = map.current.getCenter();
    
    // Convert template to legacy format for createPitchFromTemplate
    // TODO: Refactor to use new template system consistently
    const templateAny = template as any;
    const legacyTemplate = {
      ...template,
      width_m: templateAny.defaultDimensions?.width || templateAny.width_m || 100,
      length_m: templateAny.defaultDimensions?.length || templateAny.length_m || 60,
      sport: templateAny.sportType || templateAny.sport || 'Unknown',
      description: templateAny.description || '',
    } as any;
    
    // Create polygon from template
    const polygon = createPitchFromTemplate(legacyTemplate, center.lng, center.lat, 0);
    
    // Add to draw as a new feature
    const featureId = draw.current.add({
      type: 'Feature',
      properties: {},
      geometry: polygon,
    });
    
    // Calculate measurements
    const area = calculateArea(polygon);
    const perimeter = calculatePerimeter(polygon);
    
    // Open properties panel
    setSelectedZone({
      tempId: featureId[0],
      name: template.name,
      zone_type: 'pitch',
      surface_type: 'grass',
      color: getZoneColor('pitch'),
      notes: `${legacyTemplate.sport} - ${legacyTemplate.description}`,
      geometry: polygon,
      area_m2: area.m2,
      perimeter_m: perimeter.m,
    });
    setIsPanelOpen(true);
    
    toast.success(`Added ${template.name} template`);
  }, []);
  
  // Handle rectangle tool
  const handleSelectRectangle = useCallback(() => {
    if (!map.current || !draw.current) return;
    
    // Get map center
    const center = map.current.getCenter();
    
    // Create a 50m x 30m rectangle as starting point
    const polygon = createRectangle(center.lng, center.lat, 50, 30, 0);
    
    // Add to draw
    const featureId = draw.current.add({
      type: 'Feature',
      properties: {},
      geometry: polygon,
    });
    
    // Calculate measurements
    const area = calculateArea(polygon);
    const perimeter = calculatePerimeter(polygon);
    
    // Open properties panel
    setSelectedZone({
      tempId: featureId[0],
      name: 'Rectangle Zone',
      zone_type: 'other',
      surface_type: null,
      color: getZoneColor('other'),
      notes: null,
      geometry: polygon,
      area_m2: area.m2,
      perimeter_m: perimeter.m,
    });
    setIsPanelOpen(true);
    
    toast.success('Created rectangle - adjust size and position as needed');
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: '500px' }}>
      {/* Old DrawToolbar and ShapePalette removed - now handled by parent editor page */}
      
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* Loading Indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ zIndex: 10 }}>
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}

      {/* Zone Count */}
      {isLoaded && !isLoading && zones.length > 0 && !isDrawing && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded shadow-md text-sm" style={{ zIndex: 20 }}>
          <span className="font-semibold">{zones.length}</span> zones
        </div>
      )}
      
      {/* Real-time Measurements - now handled by BottomStatus component in parent */}
      
      {/* Finish Drawing Button - appears when actively drawing a polygon */}
      {isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2">
          <button
            onClick={handleFinishDrawing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Finish Drawing
          </button>
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg text-sm text-gray-600">
            <span className="font-semibold">Tip:</span> Double-click last point, press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs font-mono">Enter</kbd>, or click this button
          </div>
        </div>
      )}

      {/* Zone Properties Panel */}
      <ZonePropertiesPanel
        zone={selectedZone}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedZone(null);
          // Remove temporary draw feature
          if (draw.current && selectedZone?.tempId) {
            draw.current.delete(selectedZone.tempId);
          }
        }}
        onSave={handleSaveZone}
        onDelete={selectedZone?.id ? handleDeleteZone : undefined}
        isSaving={createZoneMutation.isPending || updateZoneMutation.isPending}
        isDeleting={deleteZoneMutation.isPending}
        imperialUnits={imperialUnits}
      />
    </div>
  );
}
