'use client';

import type { IntentType } from './IntentSelectionStep';

export type SubtypeMap = {
  sports_tournament: 'gaa' | 'rugby' | 'soccer' | 'hockey' | 'mixed';
  sports_training: 'gaa' | 'rugby' | 'soccer' | 'hockey' | 'mixed';
  market: 'fairs' | 'parking' | 'security' | 'seating' | 'stage';
  festival: 'fairs' | 'parking' | 'security' | 'seating' | 'stage';
  construction: 'compound' | 'laydown' | 'welfare';
  emergency: 'cordons' | 'muster' | 'closures';
  film: 'production' | 'base' | 'marshals';
  car_park: 'lanes' | 'bays' | 'posts';
  custom: never;
};

export type Subtype = SubtypeMap[keyof SubtypeMap];

interface SubtypeOption {
  id: string;
  label: string;
  description: string;
}

const SUBTYPE_OPTIONS: Record<IntentType, SubtypeOption[]> = {
  sports_tournament: [
    { id: 'gaa', label: 'GAA', description: 'Gaelic football and hurling' },
    { id: 'rugby', label: 'Rugby', description: '15s and 7s formats' },
    { id: 'soccer', label: 'Soccer', description: 'Full-size and small-sided' },
    { id: 'hockey', label: 'Hockey', description: 'Field hockey' },
    { id: 'mixed', label: 'Mixed', description: 'Multiple sports' },
  ],
  sports_training: [
    { id: 'gaa', label: 'GAA', description: 'Gaelic football and hurling' },
    { id: 'rugby', label: 'Rugby', description: '15s and 7s formats' },
    { id: 'soccer', label: 'Soccer', description: 'Full-size and small-sided' },
    { id: 'hockey', label: 'Hockey', description: 'Field hockey' },
    { id: 'mixed', label: 'Mixed', description: 'Multiple sports' },
  ],
  market: [
    { id: 'fairs', label: 'Fairs & Stalls', description: 'Vendor layout and aisles' },
    { id: 'parking', label: 'Parking', description: 'Visitor and vendor parking' },
    { id: 'security', label: 'Security', description: 'Perimeter and checkpoints' },
    { id: 'seating', label: 'Seating', description: 'Public seating areas' },
    { id: 'stage', label: 'Stage', description: 'Performance or announcement stage' },
  ],
  festival: [
    { id: 'fairs', label: 'Fairs & Stalls', description: 'Vendor layout and aisles' },
    { id: 'parking', label: 'Parking', description: 'Visitor and vendor parking' },
    { id: 'security', label: 'Security', description: 'Perimeter and checkpoints' },
    { id: 'seating', label: 'Seating', description: 'Public seating areas' },
    { id: 'stage', label: 'Stage', description: 'Performance or announcement stage' },
  ],
  construction: [
    { id: 'compound', label: 'Site Compound', description: 'Office and storage' },
    { id: 'laydown', label: 'Laydown Area', description: 'Material storage zones' },
    { id: 'welfare', label: 'Welfare Facilities', description: 'Mess and toilets' },
  ],
  emergency: [
    { id: 'cordons', label: 'Cordons', description: 'Exclusion zones' },
    { id: 'muster', label: 'Muster Points', description: 'Assembly areas' },
    { id: 'closures', label: 'Road Closures', description: 'Traffic diversions' },
  ],
  film: [
    { id: 'production', label: 'Production Zones', description: 'Filming areas' },
    { id: 'base', label: 'Unit Base', description: 'Crew facilities' },
    { id: 'marshals', label: 'Parking Marshals', description: 'Vehicle management' },
  ],
  car_park: [
    { id: 'lanes', label: 'Lane Configuration', description: 'Traffic flow' },
    { id: 'bays', label: 'Disabled/EV Bays', description: 'Special parking' },
    { id: 'posts', label: 'Counting Posts', description: 'Entry/exit monitoring' },
  ],
  custom: [],
};

interface SubtypeSelectionStepProps {
  intent: IntentType;
  selectedSubtype: string | null;
  onSelectSubtype: (subtype: string) => void;
}

export default function SubtypeSelectionStep({
  intent,
  selectedSubtype,
  onSelectSubtype,
}: SubtypeSelectionStepProps) {
  const options = SUBTYPE_OPTIONS[intent];

  // Skip this step for custom intent
  if (intent === 'custom' || options.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        What's your focus?
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Select the specific type that matches your needs
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selectedSubtype === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelectSubtype(option.id)}
              className={`
                relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm mb-1">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500">
                  {option.description}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SUBTYPE_OPTIONS };
