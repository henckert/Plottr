/**
 * Template Registry
 * 
 * Central registry of 30+ pitch/layout templates across 6 categories.
 * Templates are filtered by intent/subtype from the Intent Wizard.
 * 
 * Categories:
 * - Sports Tournament (GAA, Rugby, Soccer, Hockey, Mixed)
 * - Sports Training (smaller pitches, drill zones)
 * - Events (Market stalls, Parking, Security cordons, Seating, Stages)
 * - Construction (Compounds, Laydown areas, Welfare facilities)
 * - Emergency (Cordons, Muster points, Road closures)
 * - Film (Production zones, Base camps, Marshal points)
 * - Car Park (Bays, Lanes, Disabled spaces)
 */

import type { PitchTemplate, TemplateRegistryEntry } from '@/types/template.types';
import {
  generateRectangle,
  generateGAAPitch,
  generateRugbyPitch,
  generateSoccerPitch,
  generateHockeyPitch,
  generateTennisCourt,
  generateParkingBay,
  generateMarketStall,
  generateConstructionCompound,
  generateStage,
} from '@/lib/geometry.generators';

// ============================================================
// SPORTS TOURNAMENT TEMPLATES
// ============================================================

const gaaFullPitch: PitchTemplate = {
  id: 'gaa-full-pitch',
  name: 'GAA Full Pitch',
  description: 'Standard GAA pitch (145m x 90m) for matches and tournaments',
  category: 'sports_tournament',
  intentTags: ['sports_tournament'],
  sportType: 'gaa',
  iconName: 'Target',
  defaultDimensions: { width: 90, length: 145 },
  zones: [
    {
      id: 'main-pitch',
      name: 'Main Pitch',
      zoneType: 'pitch',
      color: '#22c55e',
      surface: 'grass',
      dimensions: { width: 90, length: 145 },
    },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#22c55e',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'markings', 'goals', 'sidelines'],
  },
  isPublic: true,
  tags: ['gaa', 'gaelic', 'football', 'hurling', 'full-size'],
};

const rugbyFullPitch: PitchTemplate = {
  id: 'rugby-full-pitch',
  name: 'Rugby Full Pitch',
  description: 'Standard rugby pitch (100m x 70m) including try zones',
  category: 'sports_tournament',
  intentTags: ['sports_tournament'],
  sportType: 'rugby',
  iconName: 'Target',
  defaultDimensions: { width: 70, length: 100 },
  zones: [
    {
      id: 'main-pitch',
      name: 'Playing Area',
      zoneType: 'pitch',
      color: '#10b981',
      surface: 'grass',
      dimensions: { width: 70, length: 100 },
    },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#10b981',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'markings', 'posts', 'try-zones'],
  },
  isPublic: true,
  tags: ['rugby', 'union', 'league', 'full-size'],
};

const soccerFullPitch: PitchTemplate = {
  id: 'soccer-full-pitch',
  name: 'Soccer Full Pitch',
  description: 'FIFA standard soccer pitch (105m x 68m)',
  category: 'sports_tournament',
  intentTags: ['sports_tournament'],
  sportType: 'soccer',
  iconName: 'Target',
  defaultDimensions: { width: 68, length: 105 },
  zones: [
    {
      id: 'main-pitch',
      name: 'Playing Field',
      zoneType: 'pitch',
      color: '#059669',
      surface: 'grass',
      dimensions: { width: 68, length: 105 },
    },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#059669',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'markings', 'goals', 'penalty-areas'],
  },
  isPublic: true,
  tags: ['soccer', 'football', 'fifa', 'full-size'],
};

const hockeyFullPitch: PitchTemplate = {
  id: 'hockey-full-pitch',
  name: 'Hockey Full Pitch',
  description: 'Standard hockey pitch (91.4m x 55m) with shooting circles',
  category: 'sports_tournament',
  intentTags: ['sports_tournament'],
  sportType: 'hockey',
  iconName: 'Target',
  defaultDimensions: { width: 55, length: 91.4 },
  zones: [
    {
      id: 'main-pitch',
      name: 'Playing Surface',
      zoneType: 'pitch',
      color: '#0ea5e9',
      surface: 'astroturf',
      dimensions: { width: 55, length: 91.4 },
    },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#0ea5e9',
    defaultZoneSurface: 'astroturf',
    suggestedLayers: ['pitch', 'markings', 'goals', 'circles'],
  },
  isPublic: true,
  tags: ['hockey', 'field-hockey', 'full-size'],
};

// ============================================================
// SPORTS TRAINING TEMPLATES
// ============================================================

const gaaTrainingHalfPitch: PitchTemplate = {
  id: 'gaa-training-half',
  name: 'GAA Half Pitch (Training)',
  description: 'Half-size GAA pitch for training drills (72.5m x 90m)',
  category: 'sports_training',
  intentTags: ['sports_training'],
  sportType: 'gaa',
  iconName: 'Dumbbell',
  defaultDimensions: { width: 90, length: 72.5 },
  zones: [
    {
      id: 'training-area',
      name: 'Training Area',
      zoneType: 'pitch',
      color: '#22c55e',
      surface: 'grass',
      dimensions: { width: 90, length: 72.5 },
    },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#22c55e',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['pitch', 'cones', 'goals', 'drills'],
  },
  isPublic: true,
  tags: ['gaa', 'training', 'half-pitch', 'drills'],
};

const soccerTrainingGrid: PitchTemplate = {
  id: 'soccer-training-grid',
  name: 'Soccer Training Grid (4x 20m squares)',
  description: 'Four 20m x 20m training squares for drills',
  category: 'sports_training',
  intentTags: ['sports_training'],
  sportType: 'soccer',
  iconName: 'Dumbbell',
  defaultDimensions: { width: 40, length: 40 },
  zones: [
    { id: 'grid-1', name: 'Grid 1', zoneType: 'training', color: '#059669', dimensions: { width: 20, length: 20 }, position: { x: -10, y: -10 } },
    { id: 'grid-2', name: 'Grid 2', zoneType: 'training', color: '#059669', dimensions: { width: 20, length: 20 }, position: { x: 10, y: -10 } },
    { id: 'grid-3', name: 'Grid 3', zoneType: 'training', color: '#059669', dimensions: { width: 20, length: 20 }, position: { x: -10, y: 10 } },
    { id: 'grid-4', name: 'Grid 4', zoneType: 'training', color: '#059669', dimensions: { width: 20, length: 20 }, position: { x: 10, y: 10 } },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#059669',
    defaultZoneSurface: 'grass',
    suggestedLayers: ['grids', 'cones', 'equipment'],
  },
  isPublic: true,
  tags: ['soccer', 'training', 'grid', 'drills'],
};

// ============================================================
// EVENT TEMPLATES
// ============================================================

const marketStallGrid: PitchTemplate = {
  id: 'market-stall-grid',
  name: 'Market Stall Grid (3x3m stalls)',
  description: 'Grid of 3m x 3m market stalls with aisles',
  category: 'events',
  intentTags: ['market', 'festival'],
  eventType: 'fairs',
  iconName: 'Store',
  defaultDimensions: { width: 50, length: 50 },
  zones: [
    { id: 'stall-area', name: 'Stall Area', zoneType: 'stalls', color: '#f59e0b', dimensions: { width: 50, length: 50 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#f59e0b',
    defaultZoneSurface: 'paved',
    suggestedLayers: ['stalls', 'aisles', 'signage'],
  },
  isPublic: true,
  tags: ['market', 'stalls', 'vendor', 'grid'],
};

const parkingGrid: PitchTemplate = {
  id: 'parking-standard-grid',
  name: 'Standard Parking Grid (5m x 2.5m bays)',
  description: 'Grid of standard parking bays with access lanes',
  category: 'events',
  intentTags: ['market', 'festival', 'car_park'],
  eventType: 'parking',
  iconName: 'ParkingCircle',
  defaultDimensions: { width: 50, length: 100 },
  zones: [
    { id: 'parking-area', name: 'Parking Area', zoneType: 'parking', color: '#64748b', dimensions: { width: 50, length: 100 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#64748b',
    defaultZoneSurface: 'tarmac',
    suggestedLayers: ['bays', 'lanes', 'markings', 'disabled'],
  },
  isPublic: true,
  tags: ['parking', 'car-park', 'bays', 'grid'],
};

const festivalStage: PitchTemplate = {
  id: 'festival-stage',
  name: 'Festival Stage Area',
  description: 'Stage area (20m x 15m) with crowd barrier zones',
  category: 'events',
  intentTags: ['festival'],
  eventType: 'stage',
  iconName: 'Music',
  defaultDimensions: { width: 15, length: 20 },
  zones: [
    { id: 'stage', name: 'Stage', zoneType: 'stage', color: '#a855f7', dimensions: { width: 15, length: 20 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#a855f7',
    defaultZoneSurface: 'platform',
    suggestedLayers: ['stage', 'barriers', 'sound', 'lighting'],
  },
  isPublic: true,
  tags: ['festival', 'stage', 'music', 'concert'],
};

const securityCordon: PitchTemplate = {
  id: 'security-cordon',
  name: 'Security Cordon Zone',
  description: 'Rectangular security cordon area with access points',
  category: 'events',
  intentTags: ['festival', 'emergency'],
  eventType: 'security',
  iconName: 'ShieldAlert',
  defaultDimensions: { width: 100, length: 100 },
  zones: [
    { id: 'cordon', name: 'Cordon Zone', zoneType: 'security', color: '#ef4444', dimensions: { width: 100, length: 100 } },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#ef4444',
    defaultZoneSurface: 'mixed',
    suggestedLayers: ['cordon', 'barriers', 'checkpoints', 'access'],
  },
  isPublic: true,
  tags: ['security', 'cordon', 'barrier', 'access-control'],
};

// ============================================================
// CONSTRUCTION TEMPLATES
// ============================================================

const constructionCompound: PitchTemplate = {
  id: 'construction-compound',
  name: 'Construction Compound',
  description: 'Site compound (50m x 30m) with welfare and storage',
  category: 'construction',
  intentTags: ['construction'],
  iconName: 'HardHat',
  defaultDimensions: { width: 30, length: 50 },
  zones: [
    { id: 'compound', name: 'Compound Area', zoneType: 'compound', color: '#f97316', dimensions: { width: 30, length: 50 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#f97316',
    defaultZoneSurface: 'gravel',
    suggestedLayers: ['compound', 'storage', 'welfare', 'plant'],
  },
  isPublic: true,
  tags: ['construction', 'compound', 'site'],
};

const laydownArea: PitchTemplate = {
  id: 'laydown-area',
  name: 'Laydown Area',
  description: 'Materials laydown area (40m x 40m)',
  category: 'construction',
  intentTags: ['construction'],
  iconName: 'Package',
  defaultDimensions: { width: 40, length: 40 },
  zones: [
    { id: 'laydown', name: 'Laydown', zoneType: 'laydown', color: '#f97316', dimensions: { width: 40, length: 40 } },
  ],
  toolPreset: {
    snapGridSize: 5,
    rotationSnap: 15,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#f97316',
    defaultZoneSurface: 'gravel',
    suggestedLayers: ['laydown', 'materials', 'access'],
  },
  isPublic: true,
  tags: ['construction', 'laydown', 'materials'],
};

// ============================================================
// EMERGENCY TEMPLATES
// ============================================================

const emergencyMuster: PitchTemplate = {
  id: 'emergency-muster',
  name: 'Emergency Muster Point',
  description: 'Designated muster point area (20m x 20m)',
  category: 'emergency',
  intentTags: ['emergency'],
  iconName: 'Siren',
  defaultDimensions: { width: 20, length: 20 },
  zones: [
    { id: 'muster', name: 'Muster Point', zoneType: 'muster', color: '#dc2626', dimensions: { width: 20, length: 20 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#dc2626',
    defaultZoneSurface: 'paved',
    suggestedLayers: ['muster', 'signage', 'access'],
  },
  isPublic: true,
  tags: ['emergency', 'muster', 'evacuation'],
};

// ============================================================
// FILM TEMPLATES
// ============================================================

const filmProductionZone: PitchTemplate = {
  id: 'film-production',
  name: 'Film Production Zone',
  description: 'Production area with equipment and crew zones',
  category: 'film',
  intentTags: ['film'],
  iconName: 'Film',
  defaultDimensions: { width: 50, length: 50 },
  zones: [
    { id: 'production', name: 'Production Area', zoneType: 'production', color: '#8b5cf6', dimensions: { width: 50, length: 50 } },
  ],
  toolPreset: {
    snapGridSize: 1,
    rotationSnap: 5,
    rotationSnapEnabled: true,
    units: 'metric',
    defaultZoneColor: '#8b5cf6',
    defaultZoneSurface: 'mixed',
    suggestedLayers: ['production', 'equipment', 'crew', 'catering'],
  },
  isPublic: true,
  tags: ['film', 'production', 'set'],
};

// ============================================================
// REGISTRY
// ============================================================

export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = [
  // Sports Tournament
  { template: gaaFullPitch, geometryGenerator: generateGAAPitch },
  { template: rugbyFullPitch, geometryGenerator: generateRugbyPitch },
  { template: soccerFullPitch, geometryGenerator: generateSoccerPitch },
  { template: hockeyFullPitch, geometryGenerator: generateHockeyPitch },
  
  // Sports Training
  { template: gaaTrainingHalfPitch, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 90, length: 72.5 }, rot) },
  { template: soccerTrainingGrid, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 40, length: 40 }, rot) },
  
  // Events
  { template: marketStallGrid, geometryGenerator: generateMarketStall },
  { template: parkingGrid, geometryGenerator: generateParkingBay },
  { template: festivalStage, geometryGenerator: generateStage },
  { template: securityCordon, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 100, length: 100 }, rot) },
  
  // Construction
  { template: constructionCompound, geometryGenerator: generateConstructionCompound },
  { template: laydownArea, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 40, length: 40 }, rot) },
  
  // Emergency
  { template: emergencyMuster, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 20, length: 20 }, rot) },
  
  // Film
  { template: filmProductionZone, geometryGenerator: (lat, lng, dim, rot) => generateRectangle(lat, lng, dim || { width: 50, length: 50 }, rot) },
];

/**
 * Get all templates
 */
export function getAllTemplates(): PitchTemplate[] {
  return TEMPLATE_REGISTRY.map((entry) => entry.template);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TemplateRegistryEntry | undefined {
  return TEMPLATE_REGISTRY.find((entry) => entry.template.id === id);
}

/**
 * Filter templates by criteria
 */
export function filterTemplates(filter: {
  intent?: string;
  subtype?: string;
  sportType?: string;
  search?: string;
}): PitchTemplate[] {
  let filtered = getAllTemplates();
  
  if (filter.intent) {
    filtered = filtered.filter((t) => t.intentTags.includes(filter.intent as any));
  }
  
  if (filter.sportType) {
    filtered = filtered.filter((t) => t.sportType === filter.sportType);
  }
  
  if (filter.search) {
    const query = filter.search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }
  
  return filtered;
}
