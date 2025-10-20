/**
 * Map Test Page
 * Demonstrates MapCanvas component with sample zones
 */

'use client';

import { useState } from 'react';
import { MapCanvas } from '@/components/editor/MapCanvas';
import type { components } from '@/types/api';

type Zone = components['schemas']['Zone'];

// Sample zones for testing (San Francisco location)
const sampleZones = [
  {
    id: 1,
    layout_id: 1,
    name: 'Main Pitch',
    zone_type: 'pitch',
    surface: 'grass',
    color: '#22c55e',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.4200, 37.7750],
          [-122.4190, 37.7750],
          [-122.4190, 37.7745],
          [-122.4200, 37.7745],
          [-122.4200, 37.7750], // Closing point
        ],
      ],
    },
    area_sqm: 7500,
    perimeter_m: 350,
    version_token: 'test-uuid-1',
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z',
  },
  {
    id: 2,
    layout_id: 1,
    name: 'Goal Area North',
    zone_type: 'goal_area',
    surface: 'grass',
    color: '#3b82f6',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.4198, 37.7750],
          [-122.4192, 37.7750],
          [-122.4192, 37.7749],
          [-122.4198, 37.7749],
          [-122.4198, 37.7750],
        ],
      ],
    },
    area_sqm: 180,
    perimeter_m: 54,
    version_token: 'test-uuid-2',
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z',
  },
  {
    id: 3,
    layout_id: 1,
    name: 'Parking Lot',
    zone_type: 'parking',
    surface: 'asphalt',
    color: '#6b7280',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.4205, 37.7748],
          [-122.4200, 37.7748],
          [-122.4200, 37.7743],
          [-122.4205, 37.7743],
          [-122.4205, 37.7748],
        ],
      ],
    },
    area_sqm: 1200,
    perimeter_m: 140,
    version_token: 'test-uuid-3',
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z',
  },
];

export default function MapTestPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const handleZoneClick = (zoneId: number) => {
    setSelectedZoneId(zoneId);
    const zone = sampleZones.find((z) => z.id === zoneId);
    console.log('Zone clicked:', zone?.name);
  };

  const selectedZone = sampleZones.find((z) => z.id === selectedZoneId);

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-800 text-white px-6 py-4">
        <h1 className="text-2xl font-bold">MapCanvas Test - Layout Editor</h1>
        <p className="text-sm text-gray-300 mt-1">
          Testing MapLibre integration with sample zones in San Francisco
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapCanvas
            zones={sampleZones as any}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            center={[-122.4195, 37.7747]}
            zoom={16}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-l overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Zones</h2>
            
            <div className="space-y-2">
              {sampleZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneClick(zone.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedZoneId === zone.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="font-medium">{zone.name}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {zone.zone_type} • {zone.surface}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {zone.area_sqm} m² • {zone.perimeter_m} m perimeter
                  </div>
                </button>
              ))}
            </div>

            {selectedZone && (
              <div className="mt-6 p-4 bg-white rounded border">
                <h3 className="font-semibold mb-3">Selected Zone</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>{' '}
                    <span className="font-medium">{selectedZone.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>{' '}
                    <span className="font-medium">{selectedZone.zone_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Surface:</span>{' '}
                    <span className="font-medium">{selectedZone.surface}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Area:</span>{' '}
                    <span className="font-medium">{selectedZone.area_sqm} m²</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Color:</span>{' '}
                    <div className="inline-flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: selectedZone.color }}
                      />
                      <span className="font-mono text-xs">{selectedZone.color}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200 text-sm">
              <p className="font-semibold text-blue-900 mb-2">Test Features:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Click zones to select</li>
                <li>Zoom/pan with mouse</li>
                <li>Auto-fit to zones bounds</li>
                <li>Zone labels on map</li>
                <li>Color-coded polygons</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
