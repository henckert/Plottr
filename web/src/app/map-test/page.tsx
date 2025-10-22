/**
 * Map Test Page
 * Demonstrates MapCanvas component with real API data
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapCanvas } from '@/components/editor/MapCanvasRobust';
import { MapErrorBoundary } from '@/components/editor/MapErrorBoundary';
import { useZones } from '@/hooks/useZones';
import { getZoneTypeColor } from '@/lib/maplibre-config';

export default function MapTestPage() {
  const searchParams = useSearchParams();
  const layoutId = searchParams.get('layoutId') ? parseInt(searchParams.get('layoutId')!) : 1;
  
  // Fetch zones from API (backend max limit is 100)
  const { data: zonesData, isLoading, error } = useZones({ layoutId, limit: 100 });
  const zones = zonesData?.data || [];
  
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Map Test - Layout {layoutId}</h1>
        <p className="text-sm text-gray-600 mt-1">
          Testing MapCanvas component with real backend API
        </p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Map Container */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-lg overflow-hidden h-full">
            <MapErrorBoundary>
              <MapCanvas
                zones={zones}
                selectedZoneId={selectedZoneId}
                onZoneClick={setSelectedZoneId}
                isLoading={isLoading}
                className="h-full"
              />
            </MapErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6 overflow-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zone Info</h2>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-semibold mb-2">Failed to load zones</p>
                <p className="text-xs text-red-600">{(error as any).message || 'Unknown error'}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && zones.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-3">🗺️</div>
                <p className="text-gray-600">No zones found for this layout</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try creating zones via the API or switch to a different layout
                </p>
              </div>
            )}

            {/* Stats */}
            {!isLoading && !error && zones.length > 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Zones</p>
                  <p className="text-2xl font-bold text-blue-600">{zones.length}</p>
                </div>

                {selectedZone ? (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Zone</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-semibold text-gray-900">{selectedZone.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: selectedZone.color || getZoneTypeColor(selectedZone.zone_type) }}
                          />
                          <p className="text-sm text-gray-900">{selectedZone.zone_type}</p>
                        </div>
                      </div>
                      {selectedZone.surface && (
                        <div>
                          <p className="text-xs text-gray-500">Surface</p>
                          <p className="text-sm text-gray-900">{selectedZone.surface}</p>
                        </div>
                      )}
                      {selectedZone.area_sqm && (
                        <div>
                          <p className="text-xs text-gray-500">Area</p>
                          <p className="text-sm text-gray-900">{selectedZone.area_sqm.toFixed(1)} m²</p>
                        </div>
                      )}
                      {selectedZone.perimeter_m && (
                        <div>
                          <p className="text-xs text-gray-500">Perimeter</p>
                          <p className="text-sm text-gray-900">{selectedZone.perimeter_m.toFixed(1)} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    Click a zone on the map to see details
                  </div>
                )}

                {/* Zone List */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">All Zones</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {zones.map((zone) => (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedZoneId === zone.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: zone.color || getZoneTypeColor(zone.zone_type) }}
                          />
                          <span className="truncate">{zone.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-600">Layout ID:</span>
              <span className="ml-2 font-mono text-gray-900">{layoutId}</span>
            </div>
            <div>
              <span className="text-gray-600">API:</span>
              <span className="ml-2 font-mono text-gray-900">
                {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-semibold ${
                isLoading ? 'text-yellow-600' : error ? 'text-red-600' : 'text-green-600'
              }`}>
                {isLoading ? 'Loading' : error ? 'Error' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
