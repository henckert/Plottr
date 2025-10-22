/**
 * Type definitions for map features and GeoJSON data
 * Provides type-safe zone data for MapLibre rendering
 */

import type { components } from '@/types/api';

type ZoneFromAPI = components['schemas']['Zone'];

/**
 * Zone with properly typed GeoJSON boundary
 * (OpenAPI generator incorrectly types boundary as Record<string, never>)
 */
export interface Zone extends Omit<ZoneFromAPI, 'boundary'> {
  boundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

/**
 * GeoJSON Feature for zone rendering
 * Compatible with MapLibre GL's GeoJSON source
 */
export interface ZoneFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    id: number;
    name: string;
    zone_type: string;
    surface: string | null;
    color: string | null;
    area_sqm: number | null;
    perimeter_m: number | null;
  };
}

/**
 * GeoJSON FeatureCollection for zone layers
 */
export interface ZoneFeatureCollection {
  type: 'FeatureCollection';
  features: ZoneFeature[];
}

/**
 * Convert Zone from API to GeoJSON Feature for map rendering
 */
export function zoneToFeature(zone: ZoneFromAPI): ZoneFeature {
  // Cast boundary to proper GeoJSON type (API returns it correctly, but OpenAPI generator types it wrong)
  const boundary = zone.boundary as unknown as { type: 'Polygon'; coordinates: number[][][] };
  
  return {
    type: 'Feature',
    id: zone.id,
    geometry: {
      type: 'Polygon',
      coordinates: boundary.coordinates,
    },
    properties: {
      id: zone.id,
      name: zone.name,
      zone_type: zone.zone_type,
      surface: zone.surface || null,
      color: zone.color || null,
      area_sqm: zone.area_sqm || null,
      perimeter_m: zone.perimeter_m || null,
    },
  };
}

/**
 * Convert array of Zones to FeatureCollection
 */
export function zonesToFeatureCollection(zones: ZoneFromAPI[]): ZoneFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map(zoneToFeature),
  };
}

/**
 * Validate zone has required geometry
 */
export function isValidZone(zone: any): zone is Zone {
  return (
    zone &&
    typeof zone.id === 'number' &&
    typeof zone.name === 'string' &&
    zone.boundary &&
    zone.boundary.type === 'Polygon' &&
    Array.isArray(zone.boundary.coordinates)
  );
}
