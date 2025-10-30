/**
 * Tool Presets Configuration
 * 
 * Default tool settings applied when creating layouts via Intent Wizard.
 * Each intent category has optimized snap grid, rotation, and units.
 */

import type { IntentType } from '@/components/wizard/IntentSelectionStep';
import type { ToolPreset } from '@/types/template.types';

/**
 * Default tool preset (fallback)
 */
export const DEFAULT_TOOL_PRESET: ToolPreset = {
  snapGridSize: 1,
  rotationSnap: 5,
  rotationSnapEnabled: true,
  units: 'metric',
  defaultZoneColor: '#3b82f6',
  defaultZoneSurface: 'grass',
  suggestedLayers: ['zones', 'assets', 'markings'],
};

/**
 * Intent-specific tool presets
 */
export const INTENT_TOOL_PRESETS: Record<IntentType, ToolPreset> = {
  sports_tournament: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#22c55e',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'markings', 'goals', 'sidelines'],
  },
  
  sports_training: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#22c55e',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'cones', 'goals', 'drills'],
  },
  
  market: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#f59e0b',
    defaultZoneSurface: 'paved',
    suggestedLayers: ['stalls', 'aisles', 'signage', 'utilities'],
  },
  
  festival: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#a855f7',
    defaultZoneSurface: 'mixed',
    suggestedLayers: ['stage', 'barriers', 'facilities', 'vendors'],
  },
  
  construction: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#f97316',
    defaultZoneSurface: 'gravel',
    suggestedLayers: ['compound', 'storage', 'welfare', 'plant'],
  },
  
  emergency: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#dc2626',
    defaultZoneSurface: 'mixed',
    suggestedLayers: ['cordon', 'muster', 'access', 'signage'],
  },
  
  film: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#8b5cf6',
    defaultZoneSurface: 'mixed',
    suggestedLayers: ['production', 'equipment', 'crew', 'catering'],
  },
  
  car_park: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#64748b',
    defaultZoneSurface: 'tarmac',
    suggestedLayers: ['bays', 'lanes', 'markings', 'disabled'],
  },
  
  custom: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#3b82f6',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['zones', 'assets', 'markings'],
  },
};

/**
 * Get tool preset for a specific intent
 */
export function getToolPresetForIntent(intent: IntentType): ToolPreset {
  return INTENT_TOOL_PRESETS[intent] || DEFAULT_TOOL_PRESET;
}

/**
 * Sport-specific tool presets (for finer control)
 */
export const SPORT_TOOL_PRESETS: Record<string, Partial<ToolPreset>> = {
  gaa: {
    snapGridSize: 5,
    defaultZoneColor: '#22c55e',
    suggestedLayers: ['pitch', 'markings', 'goals', 'sidelines'],
  },
  
  rugby: {
    snapGridSize: 5,
    defaultZoneColor: '#10b981',
    suggestedLayers: ['pitch', 'markings', 'posts', 'try-zones'],
  },
  
  soccer: {
    snapGridSize: 5,
    defaultZoneColor: '#059669',
    suggestedLayers: ['pitch', 'markings', 'goals', 'penalty-areas'],
  },
  
  hockey: {
    snapGridSize: 5,
    defaultZoneColor: '#0ea5e9',
    defaultZoneSurface: 'astroturf',
    suggestedLayers: ['pitch', 'markings', 'goals', 'circles'],
  },
  
  tennis: {
    snapGridSize: 1,
    defaultZoneColor: '#14b8a6',
    defaultZoneSurface: 'hard-court',
    suggestedLayers: ['court', 'markings', 'net', 'service-boxes'],
  },
};

/**
 * Get merged tool preset for intent + subtype
 */
export function getToolPreset(intent: IntentType, subtype?: string): ToolPreset {
  const intentPreset = getToolPresetForIntent(intent);
  
  // If subtype provided and has specific preset, merge it
  if (subtype && SPORT_TOOL_PRESETS[subtype]) {
    return {
      ...intentPreset,
      ...SPORT_TOOL_PRESETS[subtype],
    };
  }
  
  return intentPreset;
}
