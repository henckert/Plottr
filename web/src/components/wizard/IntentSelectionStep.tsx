'use client';

import { Target, Dumbbell, Store, Music, HardHat, Siren, Film, ParkingCircle, Pencil } from 'lucide-react';

export type IntentType = 
  | 'sports_tournament'
  | 'sports_training'
  | 'market'
  | 'festival'
  | 'construction'
  | 'emergency'
  | 'film'
  | 'car_park'
  | 'custom';

export interface IntentOption {
  id: IntentType;
  title: string;
  description: string;
  icon: React.ElementType;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'sports_tournament',
    title: 'Sports Tournament / League Round',
    description: 'Competitive matches with spectators and officials',
    icon: Target,
  },
  {
    id: 'sports_training',
    title: 'Sports Day / Training',
    description: 'Practice sessions and skill development',
    icon: Dumbbell,
  },
  {
    id: 'market',
    title: 'Market / Stalls / Fair',
    description: 'Vendor spaces, walkways, and loading zones',
    icon: Store,
  },
  {
    id: 'festival',
    title: 'Festival / Concert / Stage',
    description: 'Performance areas, crowds, and safety zones',
    icon: Music,
  },
  {
    id: 'construction',
    title: 'Construction / Temporary Works',
    description: 'Site compounds, laydown areas, welfare',
    icon: HardHat,
  },
  {
    id: 'emergency',
    title: 'Emergency / Safety Planning',
    description: 'Cordons, muster points, road closures',
    icon: Siren,
  },
  {
    id: 'film',
    title: 'Film / TV Unit Base',
    description: 'Production zones, parking, generators',
    icon: Film,
  },
  {
    id: 'car_park',
    title: 'Car-Park Operations / Traffic',
    description: 'Lanes, bays, counting posts',
    icon: ParkingCircle,
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Start with a blank canvas',
    icon: Pencil,
  },
];

interface IntentSelectionStepProps {
  selectedIntent: IntentType | null;
  onSelectIntent: (intent: IntentType) => void;
}

export default function IntentSelectionStep({
  selectedIntent,
  onSelectIntent,
}: IntentSelectionStepProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        What are you planning?
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Choose the option that best describes your use case
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
        {INTENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedIntent === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelectIntent(option.id)}
              className={`
                relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg transition-colors
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}
                `}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm mb-1">
                  {option.title}
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">
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

export { INTENT_OPTIONS };
