'use client';

import React from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp?: number;
}

interface LocationDisplayProps {
  location: LocationData | null;
  onClear?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

/**
 * LocationDisplay component for showing current user location
 * Displays latitude, longitude, accuracy, and optional address
 */
export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  onClear,
  loading = false,
  error,
  className,
}) => {
  const formatCoordinate = (value: number, places: number = 6): string => {
    return value.toFixed(places);
  };

  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 1000) {
      return `${accuracy.toFixed(0)}m`;
    }
    return `${(accuracy / 1000).toFixed(2)}km`;
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">❌</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-red-900">Location Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-spin">🔄</span>
          <p className="text-sm font-medium text-blue-700">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl flex-shrink-0">📍</span>
            <h4 className="font-semibold text-green-900">Your Location</h4>
          </div>

          {/* Address */}
          {location.address && (
            <p className="text-sm text-green-800 mb-3 break-words">{location.address}</p>
          )}

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Latitude */}
            <div>
              <label className="text-xs font-medium text-green-700">Latitude</label>
              <p className="text-sm font-mono text-green-900 bg-white rounded px-2 py-1 mt-1">
                {formatCoordinate(location.latitude)}
              </p>
            </div>

            {/* Longitude */}
            <div>
              <label className="text-xs font-medium text-green-700">Longitude</label>
              <p className="text-sm font-mono text-green-900 bg-white rounded px-2 py-1 mt-1">
                {formatCoordinate(location.longitude)}
              </p>
            </div>
          </div>

          {/* Accuracy */}
          {location.accuracy !== undefined && (
            <div className="text-xs text-green-700 mb-3">
              <span className="font-medium">Accuracy:</span> ±{formatAccuracy(location.accuracy)}
            </div>
          )}

          {/* Timestamp */}
          {location.timestamp && (
            <div className="text-xs text-green-600">
              Updated {new Date(location.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Clear Button */}
        {onClear && (
          <button
            onClick={onClear}
            className="flex-shrink-0 p-2 hover:bg-green-100 rounded transition-colors"
            title="Clear location"
            aria-label="Clear current location"
          >
            ✕
          </button>
        )}
      </div>

      {/* Copy Coordinates Button */}
      <button
        onClick={() => {
          const coords = `${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`;
          navigator.clipboard.writeText(coords);
        }}
        className="w-full mt-3 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
      >
        Copy Coordinates
      </button>
    </div>
  );
};
