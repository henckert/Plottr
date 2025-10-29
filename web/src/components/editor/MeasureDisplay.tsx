/**
 * MeasureDisplay - Shows real-time measurements during polygon drawing
 * Displays perimeter and area in metric or imperial units
 */

'use client';

import { useState } from 'react';
import { Ruler } from 'lucide-react';

interface MeasureDisplayProps {
  perimeter_m?: number;
  area_m2?: number;
  imperialUnits?: boolean;
  className?: string;
}

export function MeasureDisplay({
  perimeter_m,
  area_m2,
  imperialUnits = false,
  className = '',
}: MeasureDisplayProps) {
  const [showImperial, setShowImperial] = useState(imperialUnits);

  if (!perimeter_m && !area_m2) {
    return null;
  }

  // Conversion functions
  const formatPerimeter = (meters: number) => {
    if (showImperial) {
      const feet = meters * 3.28084;
      if (feet < 1000) {
        return `${feet.toFixed(1)} ft`;
      }
      const miles = feet / 5280;
      return `${miles.toFixed(2)} mi`;
    }
    if (meters < 1000) {
      return `${meters.toFixed(1)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatArea = (sqMeters: number) => {
    if (showImperial) {
      const sqFeet = sqMeters * 10.7639;
      if (sqFeet < 43560) {
        return `${sqFeet.toFixed(0)} ft²`;
      }
      const acres = sqFeet / 43560;
      return `${acres.toFixed(2)} acres`;
    }
    if (sqMeters < 10000) {
      return `${sqMeters.toFixed(1)} m²`;
    }
    const hectares = sqMeters / 10000;
    return `${hectares.toFixed(2)} ha`;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg px-4 py-3 border border-gray-200 ${className}`}
      style={{ zIndex: 20 }}
    >
      <div className="flex items-start gap-3">
        <Ruler className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Measurements
            </h3>
            <button
              onClick={() => setShowImperial(!showImperial)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showImperial ? 'Metric' : 'Imperial'}
            </button>
          </div>
          
          <div className="space-y-1">
            {perimeter_m !== undefined && (
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Perimeter:</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatPerimeter(perimeter_m)}
                </span>
              </div>
            )}
            
            {area_m2 !== undefined && (
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Area:</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatArea(area_m2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
