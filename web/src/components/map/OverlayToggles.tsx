'use client';

import { useState } from 'react';
import { Layers, ChevronDown } from 'lucide-react';

export interface OverlayState {
  buildings: boolean;
  pitches: boolean;
  parking: boolean;
}

interface OverlayTogglesProps {
  overlays: OverlayState;
  onToggle: (layer: keyof OverlayState) => void;
}

export function OverlayToggles({ overlays, onToggle }: OverlayTogglesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-200"
        title="Toggle map overlays"
      >
        <Layers className="w-4 h-4 text-gray-700" />
        <span className="text-sm font-medium text-gray-700">Overlays</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[200px]">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Show Footprints
            </div>
            
            <div className="space-y-2">
              {/* Buildings */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={overlays.buildings}
                  onChange={() => onToggle('buildings')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Buildings
                </span>
                <div className="ml-auto w-4 h-4 border-2 border-gray-400 rounded-sm" />
              </label>

              {/* Pitches */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={overlays.pitches}
                  onChange={() => onToggle('pitches')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Pitches
                </span>
                <div className="ml-auto w-4 h-4 bg-green-100 border-2 border-green-600 rounded-sm" />
              </label>

              {/* Parking */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={overlays.parking}
                  onChange={() => onToggle('parking')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Parking
                </span>
                <div className="ml-auto w-4 h-4 border-2 border-dashed border-blue-600 rounded-sm" />
              </label>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              Overlays from © OpenStreetMap
            </div>
          </div>
        </>
      )}
    </div>
  );
}
