/**
 * Geocoding Service Types
 * 
 * Defines interfaces and types for location-based geocoding functionality.
 * Supports GeoJSON features and search results from MapTiler and OSM APIs.
 */

/**
 * GeoJSON Geometry types
 */
export type GeometryType = 'Point' | 'Polygon' | 'LineString';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/**
 * GeoJSON Feature represents a location/place
 */
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONPoint | GeoJSONPolygon;
  properties: {
    name: string;
    type: string;
    country?: string;
    region?: string;
    city?: string;
    postcode?: string;
    place_name?: string;
    short_code?: string;
    [key: string]: any;
  };
}

/**
 * Geocoding search request
 */
export interface GeocodingRequest {
  query: string;
  limit?: number;
  language?: string;
  proximity?: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

/**
 * Geocoding search result
 */
export interface GeocodingResult {
  features: GeoJSONFeature[];
  attribution?: string;
  cached: boolean; // Whether result came from cache
  cacheExpiry?: Date; // When cache expires
  source: 'maptiler' | 'osm' | 'cache'; // Data source
  executionTime: number; // Time in ms to fetch result
}

/**
 * Cache entry for geocoding results
 */
export interface GeocodingCacheEntry {
  query: string;
  results: GeoJSONFeature[];
  timestamp: Date;
  expiresAt: Date;
  source: 'maptiler' | 'osm';
  hits: number; // Number of times this entry was used
}

/**
 * Geocoding service configuration
 */
export interface GeocodingConfig {
  maptilerKey: string;
  cacheEnabled: boolean;
  cacheTTL: number; // Time-to-live in seconds (24h = 86400)
  maxResults: number;
  requestTimeout: number; // Timeout in ms
  enableFallback: boolean; // Fall back to OSM if MapTiler fails
}

/**
 * Error response for geocoding failures
 */
export interface GeocodingError {
  message: string;
  code: string;
  source?: 'maptiler' | 'osm' | 'cache' | 'validation';
  originalError?: any;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number; // 0-1 (hits / (hits + misses))
  entries: number;
  size: number; // Approximate size in bytes
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * Type guard to check if result is an error
 */
export function isGeocodingError(value: any): value is GeocodingError {
  return value && typeof value === 'object' && 'code' in value && 'message' in value;
}

/**
 * Type guard to check if geometry is Point
 */
export function isPointGeometry(geom: any): geom is GeoJSONPoint {
  return geom && geom.type === 'Point' && Array.isArray(geom.coordinates);
}

/**
 * Extract coordinates from a feature safely
 */
export function getFeatureCoordinates(feature: GeoJSONFeature): [number, number] | null {
  if (isPointGeometry(feature.geometry)) {
    return feature.geometry.coordinates;
  }
  return null;
}

/**
 * Get feature display name
 */
export function getFeatureDisplayName(feature: GeoJSONFeature): string {
  return feature.properties.place_name ||
         feature.properties.name ||
         'Unnamed Location';
}
