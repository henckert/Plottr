/**
 * ShapePalette - Pre-defined pitch templates and basic shapes
 * Provides quick access to standard pitch dimensions for GAA, Rugby, Soccer, etc.
 */

'use client';

import { useState } from 'react';
import { Square, ChevronDown, ChevronUp } from 'lucide-react';

export interface PitchTemplate {
  id: string;
  name: string;
  sport: string;
  width_m: number;
  length_m: number;
  description?: string;
}

// Standard pitch dimensions (in meters)
export const PITCH_TEMPLATES: PitchTemplate[] = [
  // GAA Pitches
  {
    id: 'gaa-full',
    name: 'GAA Full Pitch',
    sport: 'GAA',
    width_m: 90,
    length_m: 145,
    description: 'Standard GAA full-size pitch',
  },
  {
    id: 'gaa-training',
    name: 'GAA Training Pitch',
    sport: 'GAA',
    width_m: 70,
    length_m: 120,
    description: 'Smaller training pitch',
  },
  
  // Rugby Pitches
  {
    id: 'rugby-full',
    name: 'Rugby Full Pitch',
    sport: 'Rugby',
    width_m: 70,
    length_m: 100,
    description: 'Standard rugby pitch (excluding in-goals)',
  },
  {
    id: 'rugby-7s',
    name: 'Rugby 7s Pitch',
    sport: 'Rugby',
    width_m: 70,
    length_m: 100,
    description: 'Same as full pitch, 7s uses full size',
  },
  
  // Soccer Pitches
  {
    id: 'soccer-full',
    name: 'Soccer Full Pitch',
    sport: 'Soccer',
    width_m: 68,
    length_m: 105,
    description: 'FIFA standard full-size pitch',
  },
  {
    id: 'soccer-small',
    name: 'Soccer Small Pitch',
    sport: 'Soccer',
    width_m: 45,
    length_m: 90,
    description: 'Small-sided pitch (U12-U16)',
  },
  {
    id: 'soccer-5-a-side',
    name: '5-a-side Pitch',
    sport: 'Soccer',
    width_m: 25,
    length_m: 40,
    description: '5-a-side pitch',
  },
  
  // Other Sports
  {
    id: 'hockey-full',
    name: 'Hockey Pitch',
    sport: 'Hockey',
    width_m: 55,
    length_m: 91.4,
    description: 'Standard field hockey pitch',
  },
  {
    id: 'lacrosse-full',
    name: 'Lacrosse Field',
    sport: 'Lacrosse',
    width_m: 55,
    length_m: 100,
    description: 'Standard lacrosse field',
  },
];

interface ShapePaletteProps {
  onSelectTemplate: (template: PitchTemplate) => void;
  onSelectRectangle: () => void;
  className?: string;
}

export function ShapePalette({ onSelectTemplate, onSelectRectangle, className = '' }: ShapePaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const sports = ['all', ...Array.from(new Set(PITCH_TEMPLATES.map(t => t.sport)))];
  
  const filteredTemplates = selectedSport === 'all' 
    ? PITCH_TEMPLATES 
    : PITCH_TEMPLATES.filter(t => t.sport === selectedSport);

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Square className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Shape Templates</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Quick Actions */}
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={onSelectRectangle}
              className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" />
              Draw Rectangle
            </button>
          </div>

          {/* Sport Filter */}
          <div className="p-3 border-b border-gray-100">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Filter by Sport
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sports.map(sport => (
                <option key={sport} value={sport}>
                  {sport === 'all' ? 'All Sports' : sport}
                </option>
              ))}
            </select>
          </div>

          {/* Templates List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {template.width_m}m × {template.length_m}m
                    </div>
                    {template.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {template.sport}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No templates found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
