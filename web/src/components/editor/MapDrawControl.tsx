/**
 * MapDrawControl - Polygon drawing toolbar for venue boundaries and zones
 * Uses @mapbox/mapbox-gl-draw for interactive polygon creation/editing
 * Validates polygons with Turf.js before saving
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import { Pencil, Square, Trash2, Save, X } from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';

interface MapDrawControlProps {
  map: MapLibreMap;
  onPolygonComplete: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonUpdate: (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonDelete: (id: string) => Promise<void>;
  mode?: 'venue' | 'zone';
  venueId?: number;
  onRefreshZones?: () => void;
  onSetZoneFilter?: (excludeId: string | null) => void;
  onStartEditingRef?: React.MutableRefObject<((id: string, feature: any) => void) | null>;
}

type DrawMode = 'draw_polygon' | 'simple_select' | 'direct_select' | null;

export function MapDrawControl({
  map,
  onPolygonComplete,
  onPolygonUpdate,
  onPolygonDelete,
  mode = 'zone',
  venueId,
  onRefreshZones,
  onSetZoneFilter,
  onStartEditingRef,
}: MapDrawControlProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  
  // Refs to store handlers that need to be called from outside useEffect
  const handleDrawUpdateRef = useRef<((e: any) => Promise<void>) | null>(null);
  const handleDrawDeleteRef = useRef<((e: any) => Promise<void>) | null>(null);

  // Initialize MapboxDraw
  useEffect(() => {
    if (!map || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': mode === 'venue' ? '#3b82f6' : '#10b981',
            'fill-opacity': 0.3,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': mode === 'venue' ? '#2563eb' : '#059669',
            'line-width': 2,
          },
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-and-line-vertex-halo',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 7,
            'circle-color': '#fff',
          },
        },
        {
          id: 'gl-draw-polygon-and-line-vertex',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': mode === 'venue' ? '#2563eb' : '#059669',
          },
        },
      ],
    });

    map.addControl(draw as any, 'top-left');
    drawRef.current = draw;

    // Function to start editing an existing zone
    const startEditing = (id: string, feature: any) => {
      console.log('[MapDrawControl] Starting edit for zone:', id);
      
      setEditingZoneId(id);
      
      // Hide the original zone from the zones layer
      if (onSetZoneFilter) {
        onSetZoneFilter(id);
      }
      
      // Add a copy to the draw layer with a temp edit ID
      const editFeature = {
        ...feature,
        id: `edit-${id}`,
        type: 'Feature' as const,
      };
      
      if (draw) {
        draw.add(editFeature);
        draw.changeMode('direct_select', { featureId: `edit-${id}` });
      }
      
      setActiveMode('direct_select');
      console.log('[MapDrawControl] Zone loaded into draw layer for editing');
    };
    
    // Expose startEditing to parent via ref
    if (onStartEditingRef) {
      onStartEditingRef.current = startEditing;
    }

    // Event handlers
    const handleDrawCreate = async (e: any) => {
      const feature = e.features[0];
      if (!feature || feature.geometry.type !== 'Polygon') return;
      
      const error = validatePolygon(feature);
      if (error) {
        setValidationError(error);
        if (draw) draw.delete(feature.id);
        return;
      }
      
      setValidationError(null);
      console.log('[MapDrawControl] Polygon created, saving to backend...');
      
      try {
        // Save to backend via parent handler (parent will reload zones)
        await onPolygonComplete(feature);
        
        console.log('[MapDrawControl] Saved successfully, removing from draw layer');
        // Delete temp feature from draw layer
        if (draw) draw.delete(feature.id);
        
        // Note: Parent reloads zones and updates zones prop, which triggers
        // useEffect in MapCanvas to refresh the zones source automatically.
        // We don't need to call onRefreshZones() here.
        
        // Switch to select mode
        if (draw) draw.changeMode('simple_select');
        setActiveMode('simple_select');
        
      } catch (err) {
        console.error('[MapDrawControl] Failed to save polygon:', err);
        setValidationError('Failed to save polygon. Please try again.');
        // Keep in draw layer so user can try again
      }
    };

    const handleDrawUpdate = async (e: any) => {
      const feature = e.features[0];
      if (!feature || feature.geometry.type !== 'Polygon') return;
      
      // Check if we're editing an existing zone
      if (editingZoneId && feature.id === `edit-${editingZoneId}`) {
        console.log('[MapDrawControl] Saving edit for zone:', editingZoneId);
        
        const error = validatePolygon(feature);
        if (error) {
          setValidationError(error);
          return;
        }
        setValidationError(null);
        
        try {
          // Save changes to backend (parent will reload zones)
          await onPolygonUpdate(editingZoneId, feature);
          
          console.log('[MapDrawControl] Edit saved successfully');
          
          // Remove temp edit feature from draw layer
          if (draw) draw.delete(`edit-${editingZoneId}`);
          
          // Clear zone filter to show updated zone
          if (onSetZoneFilter) onSetZoneFilter(null);
          
          // Note: Parent reloads zones and updates zones prop, which triggers
          // useEffect in MapCanvas to refresh the zones source automatically.
          
          // Reset editing state
          setEditingZoneId(null);
          
          // Switch back to select mode
          if (draw) draw.changeMode('simple_select');
          setActiveMode('simple_select');
          
        } catch (err) {
          console.error('[MapDrawControl] Failed to save edit:', err);
          setValidationError('Failed to save changes. Please try again.');
        }
      }
    };
    handleDrawUpdateRef.current = handleDrawUpdate;

    const handleDrawDelete = async (e: any) => {
      const feature = e.features[0];
      if (!feature) return;
      
      // Check if we're deleting an edited zone
      if (editingZoneId && feature.id === `edit-${editingZoneId}`) {
        console.log('[MapDrawControl] Deleting zone:', editingZoneId);
        
        try {
          // Delete from backend (parent will reload zones)
          await onPolygonDelete(editingZoneId);
          
          console.log('[MapDrawControl] Zone deleted successfully');
          
          // Clear zone filter
          if (onSetZoneFilter) onSetZoneFilter(null);
          
          // Note: Parent reloads zones and updates zones prop, which triggers
          // useEffect in MapCanvas to refresh the zones source automatically.
          
          // Reset editing state
          setEditingZoneId(null);
          
          // Switch back to select mode
          if (draw) draw.changeMode('simple_select');
          setActiveMode('simple_select');
          
        } catch (err) {
          console.error('[MapDrawControl] Failed to delete zone:', err);
          setValidationError('Failed to delete zone. Please try again.');
        }
      }
    };
    handleDrawDeleteRef.current = handleDrawDelete;

    const handleDrawSelectionChange = (e: any) => {
      if (e.features.length > 0) {
        setSelectedFeatureId(e.features[0].id);
      } else {
        setSelectedFeatureId(null);
      }
    };

    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawDelete);
    map.on('draw.selectionchange', handleDrawSelectionChange);

    return () => {
      map.off('draw.create', handleDrawCreate);
      map.off('draw.update', handleDrawUpdate);
      map.off('draw.delete', handleDrawDelete);
      map.off('draw.selectionchange', handleDrawSelectionChange);
      if (drawRef.current) {
        map.removeControl(drawRef.current as any);
        drawRef.current = null;
      }
    };
  }, [map, mode, onPolygonComplete, onPolygonUpdate, onPolygonDelete]);

  // Validate polygon using Turf.js and geospatial lib logic
  const validatePolygon = (feature: GeoJSON.Feature<GeoJSON.Polygon>): string | null => {
    try {
      const coords = feature.geometry.coordinates[0];

      // Check minimum points (4: 3 unique + 1 closing)
      if (coords.length < 4) {
        return 'Polygon must have at least 3 unique points';
      }

      // Check ring closure
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return 'Polygon must be closed (first point must equal last point)';
      }

      // Check WGS84 bounds
      for (let i = 0; i < coords.length; i++) {
        const [lon, lat] = coords[i];
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          return `Point ${i} is outside WGS84 bounds (lon: ${lon}, lat: ${lat})`;
        }
      }

      // Check for self-intersection using Turf
      const turfPolygon = turf.polygon([coords]);
      const kinks = turf.kinks(turfPolygon);
      if (kinks.features.length > 0) {
        return 'Polygon cannot self-intersect';
      }

      // Check area (venues: max 10 km², zones: max 1 km²)
      const areaM2 = turf.area(turfPolygon);
      const areaKm2 = areaM2 / 1_000_000;
      const maxArea = mode === 'venue' ? 10 : 1;
      if (areaKm2 > maxArea) {
        return `${mode === 'venue' ? 'Venue' : 'Zone'} is too large (${areaKm2.toFixed(2)} km²). Maximum: ${maxArea} km²`;
      }

      // Check winding order (should be counter-clockwise for exterior ring per RFC 7946)
      const bbox = turf.bbox(turfPolygon);
      const turfCoords = turfPolygon.geometry.coordinates[0];
      const signedArea = turfCoords.reduce((sum, curr, i, arr) => {
        const next = arr[(i + 1) % arr.length];
        return sum + (next[0] - curr[0]) * (next[1] + curr[1]);
      }, 0);
      
      if (signedArea >= 0) {
        return 'Polygon must be counter-clockwise (right-hand rule)';
      }

      return null;
    } catch (err) {
      return `Validation error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  };

  // Drawing mode controls
  const startDrawing = () => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('draw_polygon');
    setActiveMode('draw_polygon');
    setValidationError(null);
  };

  const startSelectMode = () => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('simple_select');
    setActiveMode('simple_select');
  };

  const deleteSelected = () => {
    if (!drawRef.current || !selectedFeatureId) return;
    drawRef.current.delete(selectedFeatureId);
    setSelectedFeatureId(null);
  };

  const saveEdit = async () => {
    if (!drawRef.current || !editingZoneId) return;
    
    const editFeatureId = `edit-${editingZoneId}`;
    const features = drawRef.current.getAll();
    const feature = features.features.find((f: any) => f.id === editFeatureId);
    
    if (feature && feature.geometry.type === 'Polygon' && handleDrawUpdateRef.current) {
      // Trigger update handler manually
      await handleDrawUpdateRef.current({ features: [feature] });
    }
  };

  const deleteEdit = async () => {
    if (!drawRef.current || !editingZoneId) return;
    
    const editFeatureId = `edit-${editingZoneId}`;
    const features = drawRef.current.getAll();
    const feature = features.features.find((f: any) => f.id === editFeatureId);
    
    if (feature && handleDrawDeleteRef.current) {
      // Trigger delete handler manually
      await handleDrawDeleteRef.current({ features: [feature] });
    }
  };

  const cancelEdit = () => {
    if (!drawRef.current || !editingZoneId) return;
    
    console.log('[MapDrawControl] Canceling edit for zone:', editingZoneId);
    
    // Remove temp edit feature
    drawRef.current.delete(`edit-${editingZoneId}`);
    
    // Clear zone filter to show original
    if (onSetZoneFilter) onSetZoneFilter(null);
    
    // Reset editing state
    setEditingZoneId(null);
    
    // Switch to select mode
    drawRef.current.changeMode('simple_select');
    setActiveMode('simple_select');
    
    console.log('[MapDrawControl] Edit canceled');
  };

  const cancelDrawing = () => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('simple_select');
    setActiveMode(null);
    setValidationError(null);
  };

  return (
    <>
      {/* Drawing toolbar */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex flex-col space-y-2 z-40">
        {/* Show edit controls when editing */}
        {editingZoneId ? (
          <>
            <button
              onClick={saveEdit}
              className="p-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Save changes"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={deleteEdit}
              className="p-2 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Delete zone"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors border-t pt-2"
              title="Cancel editing"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startDrawing}
              className={`p-2 rounded transition-colors ${
                activeMode === 'draw_polygon'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title={`Draw ${mode === 'venue' ? 'venue boundary' : 'zone'}`}
            >
              <Pencil className="w-5 h-5" />
            </button>

            {activeMode && (
              <button
                onClick={cancelDrawing}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors border-t pt-2"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Validation error message */}
      {validationError && (
        <div className="absolute top-20 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-40 max-w-md">
          <div className="flex items-start space-x-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">
                Invalid Polygon
              </h4>
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {activeMode === 'draw_polygon' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm z-40 max-w-md">
          <div className="font-semibold mb-1">Drawing Polygon</div>
          <div className="text-xs opacity-90">
            Click to add points • Click <strong>first point</strong> or press <kbd className="px-1 py-0.5 bg-blue-700 rounded">Enter</kbd> to finish
          </div>
        </div>
      )}
    </>
  );
}
