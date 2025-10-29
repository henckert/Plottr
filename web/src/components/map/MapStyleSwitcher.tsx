'use client';

import { useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { MapStyle, MAP_STYLES } from '@/lib/mapStyles';

interface MapStyleSwitcherProps {
  currentStyle: MapStyle;
  onStyleChange: (style: MapStyle) => void;
}

export function MapStyleSwitcher({ currentStyle, onStyleChange }: MapStyleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-200"
        title="Change map style"
      >
        <MapIcon className="w-4 h-4 text-gray-700" />
        <span className="text-sm font-medium text-gray-700">
          {MAP_STYLES[currentStyle].name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[150px]">
            {Object.values(MAP_STYLES).map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onStyleChange(style.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                  currentStyle === style.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {style.name}
                {currentStyle === style.id && (
                  <span className="ml-2 text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
