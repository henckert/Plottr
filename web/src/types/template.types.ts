/**
 * Template System Types
 * 
 * Defines types for pitch layout templates, tool presets, and geometry generators.
 * Templates are filtered by intent/subtype from the Intent Wizard.
 */

import type { IntentType } from '@/components/wizard/IntentSelectionStep';

/**
 * Sport types for sports-related templates
 */
export type SportType = 'gaa' | 'rugby' | 'soccer' | 'hockey' | 'mixed' | 'athletics' | 'tennis';

/**
 * Event types for event-related templates
 */
export type EventType = 'fairs' | 'parking' | 'security' | 'seating' | 'stage' | 'market' | 'festival';

/**
 * Template category grouping
 */
export type TemplateCategory = 
  | 'sports_tournament'
  | 'sports_training'
  | 'events'
  | 'construction'
  | 'emergency'
  | 'film'
  | 'car_park'
  | 'custom';

/**
 * Zone configuration for templates
 */
export interface TemplateZone {
  id: string;
  name: string;
  zoneType: string; // 'pitch' | 'goal' | 'bench' | 'parking' | 'stage' | etc.
  color?: string;
  surface?: string;
  dimensions?: {
    width: number;  // meters
    length: number; // meters
  };
  position?: {
    x: number; // relative to layout center
    y: number;
  };
  rotation?: number; // degrees
}

/**
 * Asset configuration for templates
 */
export interface TemplateAsset {
  id: string;
  name: string;
  assetType: string;
  icon?: string;
  position?: {
    x: number;
    y: number;
  };
  rotation?: number;
  properties?: Record<string, any>;
}

/**
 * Tool preset configuration
 * Applied when layout is created via wizard
 */
export interface ToolPreset {
  snapGridSize: number;        // meters (e.g., 1, 5, 10)
  rotationSnap: number;         // degrees (e.g., 5, 15, 45)
  rotationSnapEnabled: boolean;
  units: 'metric' | 'imperial';
  defaultZoneColor: string;
  defaultZoneSurface: string;
  suggestedLayers: string[];    // ['pitch', 'markings', 'equipment', 'facilities']
}

/**
 * Template definition
 */
export interface PitchTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  
  // Intent filtering
  intentTags: IntentType[];     // Which intents show this template
  sportType?: SportType;        // For sports templates
  eventType?: EventType;        // For event templates
  
  // Visual
  thumbnailUrl?: string;
  iconName?: string;            // Lucide icon name
  
  // Layout definition
  zones: TemplateZone[];
  assets?: TemplateAsset[];
  
  // Dimensions (for auto-scaling)
  defaultDimensions: {
    width: number;  // meters
    length: number; // meters
  };
  
  // Tool presets
  toolPreset?: ToolPreset;
  
  // Metadata
  isPublic: boolean;
  createdBy?: string;
  tags?: string[];
}

/**
 * Geometry generator function type
 * Generates GeoJSON polygon from dimensions and position
 */
export type GeometryGenerator = (
  centerLat: number,
  centerLng: number,
  dimensions: { width: number; length: number },
  rotation?: number
) => {
  type: 'Polygon';
  coordinates: number[][][];
};

/**
 * Template registry entry
 */
export interface TemplateRegistryEntry {
  template: PitchTemplate;
  geometryGenerator: GeometryGenerator;
}

/**
 * Filter criteria for template search
 */
export interface TemplateFilter {
  intent?: IntentType;
  subtype?: string;
  sportType?: SportType;
  eventType?: EventType;
  category?: TemplateCategory;
  search?: string; // Text search in name/description
}
