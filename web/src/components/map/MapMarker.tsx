'use client';

import React from 'react';

export type MarkerType = 'search-result' | 'selected' | 'current-location' | 'poi' | 'building';

interface MapMarkerProps {
  position: {
    lat: number;
    lon: number;
  };
  type?: MarkerType;
  label?: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const markerColors: Record<MarkerType, { bg: string; text: string; icon: string }> = {
  'search-result': { bg: 'bg-blue-500', text: 'text-white', icon: '📍' },
  'selected': { bg: 'bg-blue-700', text: 'text-white', icon: '📌' },
  'current-location': { bg: 'bg-green-500', text: 'text-white', icon: '📍' },
  'poi': { bg: 'bg-amber-500', text: 'text-white', icon: '🏢' },
  'building': { bg: 'bg-purple-500', text: 'text-white', icon: '🏛️' },
};

/**
 * MapMarker component for custom marker styling in MapLibre GL
 * Provides styled markers with different colors and icons based on type
 */
export const MapMarker: React.FC<MapMarkerProps> = ({
  position,
  type = 'search-result',
  label,
  isSelected = false,
  onClick,
  className,
}) => {
  const colors = markerColors[type];
  const bgColor = isSelected ? 'bg-blue-700' : colors.bg;
  const ring = isSelected ? 'ring-4 ring-blue-300' : '';

  return (
    <div
      className={`
        flex flex-col items-center cursor-pointer
        ${className}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      aria-label={label || `${type} marker at ${position.lat}, ${position.lon}`}
    >
      {/* Marker Pin */}
      <div
        className={`
          w-8 h-10 rounded-b-full flex items-center justify-center
          ${bgColor} ${colors.text} ${ring}
          shadow-lg hover:shadow-xl transition-shadow
          relative
        `}
      >
        {/* Marker Point */}
        <div
          className={`
            w-2 h-2 rounded-full bg-white absolute top-1
          `}
        />
        {/* Marker Icon */}
        <span className="text-sm mt-0.5">{colors.icon}</span>
      </div>

      {/* Label */}
      {label && (
        <div className="mt-1 bg-white text-gray-800 px-2 py-1 rounded shadow-md text-xs font-medium whitespace-nowrap max-w-xs truncate">
          {label}
        </div>
      )}
    </div>
  );
};

/**
 * Marker Icon Component - Exported for use with map icons
 * Used to render custom marker HTML for MapLibre GL
 */
export const MarkerIcon: React.FC<{ type?: MarkerType; isSelected?: boolean }> = ({
  type = 'search-result',
  isSelected = false,
}) => {
  const colors = markerColors[type];
  const bgColor = isSelected ? 'bg-blue-700' : colors.bg;

  return (
    <div className={`w-8 h-10 rounded-b-full flex items-center justify-center ${bgColor} ${colors.text} shadow-lg`}>
      <div className="w-2 h-2 rounded-full bg-white absolute top-1" />
      <span className="text-sm mt-0.5">{colors.icon}</span>
    </div>
  );
};
