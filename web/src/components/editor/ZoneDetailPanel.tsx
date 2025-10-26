/**
 * ZoneDetailPanel - Read-only zone information panel
 * Displays zone details when a zone is selected but not being edited
 * Slides in from the right side
 */

'use client';

import { X, Edit, Trash2, Copy, Download } from 'lucide-react';
import type { components } from '@/types/api';
import { formatArea, formatPerimeter } from '@/lib/geospatial-client';

type Zone = components['schemas']['Zone'];

interface ZoneDetailPanelProps {
  zone: Zone;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

// Map zone types to human-readable labels
const zoneTypeLabels: Record<string, string> = {
  pitch: 'Pitch',
  goal_area: 'Goal Area',
  penalty_area: 'Penalty Area',
  training_zone: 'Training Zone',
  competition: 'Competition',
  parking: 'Parking',
  seating: 'Seating',
  entrance: 'Entrance',
  restroom: 'Restroom',
  concession: 'Concession',
  vendor: 'Vendor',
  media: 'Media',
  vip: 'VIP',
  other: 'Other',
};

// Map surface types to human-readable labels
const surfaceTypeLabels: Record<string, string> = {
  grass: 'Grass',
  turf: 'Turf',
  concrete: 'Concrete',
  asphalt: 'Asphalt',
  dirt: 'Dirt',
  gravel: 'Gravel',
  other: 'Other',
};

export function ZoneDetailPanel({
  zone,
  onEdit,
  onDelete,
  onClose,
}: ZoneDetailPanelProps) {
  // Format timestamps
  const createdAt = new Date(zone.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const updatedAt = new Date(zone.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo = '';
  if (diffDays > 0) {
    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = 'just now';
  }

  // Get zone type label
  const zoneTypeLabel = zoneTypeLabels[zone.zone_type] || zone.zone_type;

  // Get surface type label (if exists)
  const surfaceLabel = zone.surface
    ? surfaceTypeLabels[zone.surface] || zone.surface
    : null;

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Zone Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Zone Name */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{zone.name}</h3>
          <div className="flex items-center gap-2">
            {/* Color swatch */}
            {zone.color && (
              <div
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: zone.color }}
                title={zone.color}
              />
            )}
            {/* Category badge */}
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
              {zoneTypeLabel}
            </span>
          </div>
        </div>

        {/* Measurements */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Area
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {zone.area_sqm ? formatArea(zone.area_sqm, false) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {zone.area_sqm ? `(${formatArea(zone.area_sqm, true)})` : ''}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Perimeter
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {zone.perimeter_m ? formatPerimeter(zone.perimeter_m, false) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {zone.perimeter_m ? `(${formatPerimeter(zone.perimeter_m, true)})` : ''}
            </p>
          </div>
        </div>

        {/* Surface Type */}
        {surfaceLabel && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Surface</p>
            <p className="text-gray-900">{surfaceLabel}</p>
          </div>
        )}

        {/* Notes - Note: 'notes' field not in backend schema yet, placeholder for future */}
        {/* {zone.notes && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-gray-900 text-sm whitespace-pre-wrap">{zone.notes}</p>
          </div>
        )} */}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Created</span>
            <span>{createdAt}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Last Updated</span>
            <span>{timeAgo}</span>
          </div>
          {zone.version_token && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>Version</span>
              <span className="font-mono">{zone.version_token.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>

        <button
          onClick={() => {
            // Copy zone as GeoJSON (future feature)
            console.log('Duplicate zone:', zone.id);
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          title="Duplicate (coming soon)"
          disabled
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            // Export zone as GeoJSON (future feature)
            console.log('Export zone:', zone.id);
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          title="Export (coming soon)"
          disabled
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          title="Delete zone"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
