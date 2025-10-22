/**
 * Map Drawing Demo Page
 * Test interactive polygon drawing for venues and zones
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MapCanvas } from '@/components/editor/MapCanvasRobust';
import { MapErrorBoundary } from '@/components/editor/MapErrorBoundary';
import { MapGeocodingSearch } from '@/components/editor/MapGeocodingSearch';

export default function MapDrawingDemoPage() {
  const [mode, setMode] = useState<'venue' | 'zone'>('zone');
  const [savedPolygons, setSavedPolygons] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2603, 53.3498]); // Galway, Ireland
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref to call startEditing from MapDrawControl
  const startEditingRef = useRef<((id: string, feature: any) => void) | null>(null);

  // Load existing zones on mount
  useEffect(() => {
    const loadZones = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/zones?layout_id=15&limit=100');
        if (response.ok) {
          const result = await response.json();
          console.log('[DrawDemo] Loaded zones:', result.data);
          setSavedPolygons(result.data || []);
        }
      } catch (error) {
        console.error('[DrawDemo] Failed to load zones:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadZones();
  }, []);

  const handlePolygonCreate = async (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => {
    console.log('[DrawDemo] New polygon created:', geojson);
    
    try {
      // Call backend API to create zone
      const response = await fetch('http://localhost:3001/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layout_id: 15, // Default layout ID (you can make this dynamic later)
          name: `${mode === 'venue' ? 'Venue' : 'Zone'} ${savedPolygons.length + 1}`,
          zone_type: mode === 'venue' ? 'other' : 'pitch', // Map to valid enum values
          surface: 'grass',
          color: mode === 'venue' ? '#3b82f6' : '#10b981',
          boundary: geojson.geometry,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[DrawDemo] Failed to create zone:', error);
        alert(`Failed to save zone: ${error.error || 'Unknown error'}`);
        return;
      }

      const result = await response.json();
      console.log('[DrawDemo] Zone created successfully:', result.data);
      
      // Reload all zones from backend to ensure sync
      const reloadResponse = await fetch('http://localhost:3001/api/zones?layout_id=15&limit=100');
      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        setSavedPolygons(reloadResult.data || []);
      }
      
    } catch (error) {
      console.error('[DrawDemo] Error creating zone:', error);
      alert(`Error saving zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePolygonUpdate = async (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => {
    console.log('[DrawDemo] Polygon updated:', id, geojson);
    
    try {
      // Find the zone to get its version_token
      const zone = savedPolygons.find(p => p.id.toString() === id);
      if (!zone) {
        console.error('[DrawDemo] Zone not found for update:', id);
        return;
      }

      const response = await fetch(`http://localhost:3001/api/zones/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': zone.version_token, // Required for optimistic concurrency
        },
        body: JSON.stringify({
          name: zone.name,
          zone_type: zone.zone_type,
          surface: zone.surface,
          color: zone.color,
          boundary: geojson.geometry,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[DrawDemo] Failed to update zone:', error);
        alert(`Failed to update zone: ${error.error || 'Unknown error'}`);
        return;
      }

      const result = await response.json();
      console.log('[DrawDemo] Zone updated successfully:', result.data);
      
      // Reload all zones from backend to ensure sync
      const reloadResponse = await fetch('http://localhost:3001/api/zones?layout_id=15&limit=100');
      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        setSavedPolygons(reloadResult.data || []);
      }
      
    } catch (error) {
      console.error('[DrawDemo] Error updating zone:', error);
      alert(`Error updating zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePolygonDelete = async (id: string) => {
    console.log('[DrawDemo] Polygon deleted:', id);
    
    try {
      const response = await fetch(`http://localhost:3001/api/zones/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[DrawDemo] Failed to delete zone:', error);
        alert(`Failed to delete zone: ${error.error || 'Unknown error'}`);
        return;
      }

      console.log('[DrawDemo] Zone deleted successfully');
      
      // Reload all zones from backend to ensure sync
      const reloadResponse = await fetch('http://localhost:3001/api/zones?layout_id=15&limit=100');
      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        setSavedPolygons(reloadResult.data || []);
      }
      
    } catch (error) {
      console.error('[DrawDemo] Error deleting zone:', error);
      alert(`Error deleting zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLocationSelect = (result: any) => {
    console.log('[DrawDemo] Location selected:', result.place_name, result.center);
    setMapCenter(result.center);
    setMapZoom(16); // Zoom in when location is selected
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Interactive Map Drawing
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Draw venue boundaries and zones with polygon validation
              </p>
            </div>
            
            {/* Mode toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMode('venue')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'venue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Venue Mode
              </button>
              <button
                onClick={() => setMode('zone')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'zone'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Zone Mode
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-lg overflow-hidden relative" style={{ height: '70vh' }}>
            {/* Search bar overlay - shortened to not cover drawing tools */}
            <div className="absolute top-4 left-4 z-30" style={{ maxWidth: '300px' }}>
              <MapGeocodingSearch
                onResultSelect={handleLocationSelect}
              />
            </div>
            
            <MapErrorBoundary>
              <MapCanvas
                zones={savedPolygons} // Display saved polygons on map
                enableDrawing={true}
                drawMode={mode}
                onPolygonCreate={handlePolygonCreate}
                onPolygonUpdate={handlePolygonUpdate}
                onPolygonDelete={handlePolygonDelete}
                onStartEdit={(id, feature) => {
                  console.log('[DrawDemo] Starting edit for zone:', id);
                  if (startEditingRef.current) {
                    startEditingRef.current(id, feature);
                  }
                }}
                onStartEditingRef={startEditingRef}
                center={mapCenter}
                zoom={mapZoom}
                isLoading={isLoading}
              />
            </MapErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                How to Use
              </h2>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">✏️ Draw Polygon</h3>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Click the <strong>pencil icon</strong> to start drawing</li>
                    <li>Click on the map to add each corner point</li>
                    <li><strong>To finish:</strong> Either:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Click the <strong>first point</strong> again, OR</li>
                        <li>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd>, OR</li>
                        <li><strong>Double-click</strong> the last point</li>
                      </ul>
                    </li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">📝 Edit Shape</h3>
                  <p>Click square icon, select a polygon, then drag the vertices (white circles) to modify the shape.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">🗑️ Delete</h3>
                  <p>Select a polygon in edit mode, then click the trash icon to remove it.</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Validation Rules</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Minimum 3 unique points</li>
                  <li>• Must be closed (first = last)</li>
                  <li>• No self-intersections</li>
                  <li>• Counter-clockwise winding</li>
                  <li>• Max area: {mode === 'venue' ? '10 km²' : '1 km²'}</li>
                  <li>• Within WGS84 bounds</li>
                </ul>
              </div>
            </div>

            {/* Saved polygons */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Saved Polygons
              </h2>
              
              {savedPolygons.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No polygons saved yet.
                  <br />
                  Draw one to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {savedPolygons.map((polygon) => (
                    <div
                      key={polygon.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {polygon.name}
                        </span>
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: polygon.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{polygon.boundary.coordinates[0].length - 1} vertices</span>
                        <span className="text-gray-500">
                          {new Date(polygon.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
