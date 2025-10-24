/**
 * Client-side geospatial validation and calculations using Turf.js
 * Mirrors backend validation logic from src/lib/geospatial.ts
 * Used for polygon validation before sending to server
 */

import * as turf from '@turf/turf';

export interface ValidationError {
  code: 'INVALID_POLYGON' | 'SELF_INTERSECTING' | 'INVALID_WINDING' | 'OUT_OF_BOUNDS' | 'INSUFFICIENT_POINTS';
  message: string;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Validates polygon structure (type, coordinates array, minimum points)
 */
export function validatePolygonStructure(geometry: any): ValidationError | null {
  if (!geometry) {
    return { code: 'INVALID_POLYGON', message: 'Geometry is required' };
  }

  if (geometry.type !== 'Polygon') {
    return { code: 'INVALID_POLYGON', message: 'Geometry must be a Polygon' };
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    return { code: 'INVALID_POLYGON', message: 'Polygon coordinates must be a non-empty array' };
  }

  const exterior = geometry.coordinates[0];
  if (!Array.isArray(exterior) || exterior.length < 4) {
    return {
      code: 'INSUFFICIENT_POINTS',
      message: 'Polygon exterior ring must have at least 4 points (3 unique + 1 closing)',
    };
  }

  // Check that first and last points are the same (closed ring)
  const first = exterior[0];
  const last = exterior[exterior.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return { code: 'INVALID_POLYGON', message: 'Polygon ring must be closed (first point == last point)' };
  }

  // Validate each coordinate is a [lon, lat] pair
  for (let i = 0; i < exterior.length; i++) {
    const coord = exterior[i];
    if (!Array.isArray(coord) || coord.length !== 2) {
      return { code: 'INVALID_POLYGON', message: `Point ${i} is not a valid [longitude, latitude] pair` };
    }
    const [lon, lat] = coord;
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return { code: 'INVALID_POLYGON', message: `Point ${i} contains non-numeric coordinates` };
    }
  }

  return null;
}

/**
 * Validates WGS84 bounds: longitude [-180, 180], latitude [-90, 90]
 */
export function validateWGS84Bounds(geometry: GeoPolygon): ValidationError | null {
  const exterior = geometry.coordinates[0];
  for (let i = 0; i < exterior.length; i++) {
    const [lon, lat] = exterior[i];
    if (lon < -180 || lon > 180) {
      return { code: 'OUT_OF_BOUNDS', message: `Point ${i}: longitude ${lon} is outside WGS84 range [-180, 180]` };
    }
    if (lat < -90 || lat > 90) {
      return { code: 'OUT_OF_BOUNDS', message: `Point ${i}: latitude ${lat} is outside WGS84 range [-90, 90]` };
    }
  }
  return null;
}

/**
 * Detects self-intersecting polygon rings using Turf.js kinks detection
 */
export function checkSelfIntersection(geometry: GeoPolygon): ValidationError | null {
  try {
    const poly = turf.polygon(geometry.coordinates);
    const kinks = turf.kinks(poly);
    
    if (kinks.features.length > 0) {
      return {
        code: 'SELF_INTERSECTING',
        message: `Polygon self-intersects at ${kinks.features.length} point(s)`,
      };
    }
  } catch (err) {
    return {
      code: 'INVALID_POLYGON',
      message: `Failed to validate polygon: ${(err as Error).message}`,
    };
  }

  return null;
}

/**
 * Validates polygon winding order (should be counter-clockwise for exterior ring per RFC 7946)
 * Uses Turf.js to compute area (positive = CCW in standard cartesian coords)
 */
export function validateWindingOrder(geometry: GeoPolygon): ValidationError | null {
  try {
    // Turf.js booleanClockwise returns true if ring is clockwise
    const isClockwise = turf.booleanClockwise(geometry.coordinates[0]);
    
    if (isClockwise) {
      return {
        code: 'INVALID_WINDING',
        message: 'Polygon exterior ring must be counter-clockwise (RFC 7946). Ring is currently clockwise.',
      };
    }
  } catch (err) {
    return {
      code: 'INVALID_POLYGON',
      message: `Failed to validate winding order: ${(err as Error).message}`,
    };
  }

  return null;
}

/**
 * Master validation function: runs all checks on a polygon
 * Returns the first error found, or null if valid
 */
export function validatePolygon(geometry: any): ValidationError | null {
  // 1. Validate structure
  const structureError = validatePolygonStructure(geometry);
  if (structureError) return structureError;

  const geom = geometry as GeoPolygon;

  // 2. Validate WGS84 bounds (SRID 4326)
  const boundsError = validateWGS84Bounds(geom);
  if (boundsError) return boundsError;

  // 3. Check for self-intersections
  const selfIntersectError = checkSelfIntersection(geom);
  if (selfIntersectError) return selfIntersectError;

  // 4. Validate winding order
  const windingError = validateWindingOrder(geom);
  if (windingError) return windingError;

  return null;
}

/**
 * Calculate area in square meters and square feet
 */
export function calculateArea(geometry: GeoPolygon): { m2: number; ft2: number } {
  try {
    const poly = turf.polygon(geometry.coordinates);
    const m2 = turf.area(poly);
    const ft2 = m2 * 10.7639; // 1 m² = 10.7639 ft²
    return {
      m2: Math.round(m2 * 100) / 100,
      ft2: Math.round(ft2 * 100) / 100,
    };
  } catch (err) {
    console.error('Failed to calculate area:', err);
    return { m2: 0, ft2: 0 };
  }
}

/**
 * Calculate perimeter in meters and feet
 */
export function calculatePerimeter(geometry: GeoPolygon): { m: number; ft: number } {
  try {
    const poly = turf.polygon(geometry.coordinates);
    const km = turf.length(poly, { units: 'kilometers' });
    const m = km * 1000;
    const ft = m * 3.28084; // 1 m = 3.28084 ft
    return {
      m: Math.round(m * 100) / 100,
      ft: Math.round(ft * 100) / 100,
    };
  } catch (err) {
    console.error('Failed to calculate perimeter:', err);
    return { m: 0, ft: 0 };
  }
}

/**
 * Format area with units
 */
export function formatArea(m2: number, imperial = false): string {
  if (imperial) {
    const ft2 = m2 * 10.7639;
    return `${ft2.toLocaleString()} ft²`;
  }
  return `${m2.toLocaleString()} m²`;
}

/**
 * Format perimeter with units
 */
export function formatPerimeter(m: number, imperial = false): string {
  if (imperial) {
    const ft = m * 3.28084;
    return `${ft.toLocaleString()} ft`;
  }
  return `${m.toLocaleString()} m`;
}

/**
 * Snap coordinates to grid (for snap-to-grid feature)
 * @param lngLat - [longitude, latitude]
 * @param gridSize - Grid increment in degrees (default 0.00001° ≈ 1.1m)
 */
export function snapToGrid(lngLat: [number, number], gridSize = 0.00001): [number, number] {
  return [
    Math.round(lngLat[0] / gridSize) * gridSize,
    Math.round(lngLat[1] / gridSize) * gridSize,
  ];
}

/**
 * Check if polygon fits within a bounding box
 */
export function fitsWithinBounds(
  polygon: GeoPolygon,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number }
): boolean {
  const exterior = polygon.coordinates[0];
  for (const [lon, lat] of exterior) {
    if (lon < bounds.minLon || lon > bounds.maxLon || lat < bounds.minLat || lat > bounds.maxLat) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate centroid of polygon
 */
export function calculateCentroid(geometry: GeoPolygon): [number, number] {
  try {
    const poly = turf.polygon(geometry.coordinates);
    const centroid = turf.centroid(poly);
    return centroid.geometry.coordinates as [number, number];
  } catch (err) {
    console.error('Failed to calculate centroid:', err);
    return [0, 0];
  }
}
