/**
 * Geospatial validation utilities for pitch polygons.
 * Handles WGS84 (SRID 4326) validation, geometry checks, and bounds validation.
 */

export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lon, lat], [lon, lat], ...]]
}

export interface GeometryError {
  code: 'INVALID_POLYGON' | 'SELF_INTERSECTING' | 'INVALID_WINDING' | 'INVALID_SRID' | 'OUT_OF_BOUNDS' | 'INSUFFICIENT_POINTS' | 'INVALID_GEOMETRY' | 'INVALID_POINT' | 'INVALID_LINESTRING';
  message: string;
}

/**
 * Validates that a geometry is a valid GeoJSON polygon.
 * Checks: structure, coordinates array, minimum points (4 for a valid polygon).
 */
export function validatePolygonStructure(geometry: any): GeometryError | null {
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
 * Validates WGS84 bounds: longitude [-180, 180], latitude [-90, 90].
 */
export function validateWGS84Bounds(geometry: GeoPolygon): GeometryError | null {
  const exterior = geometry.coordinates[0];
  for (let i = 0; i < exterior.length; i++) {
    const [lon, lat] = exterior[i];
    if (lon < -180 || lon > 180) {
      return { code: 'INVALID_SRID', message: `Point ${i}: longitude ${lon} is outside WGS84 range [-180, 180]` };
    }
    if (lat < -90 || lat > 90) {
      return { code: 'INVALID_SRID', message: `Point ${i}: latitude ${lat} is outside WGS84 range [-90, 90]` };
    }
  }
  return null;
}

/**
 * Detects self-intersecting polygon rings using the Bentley-Ottmann algorithm (simplified).
 * For basic validation, checks if any two non-adjacent edges intersect.
 */
export function checkSelfIntersection(geometry: GeoPolygon): GeometryError | null {
  const exterior = geometry.coordinates[0];
  const n = exterior.length - 1; // Exclude closing point

  // Check only the exterior ring (ignore holes for now)
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent segments and the closing segment wrap-around
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;

      const p1 = exterior[i];
      const p2 = exterior[i + 1];
      const p3 = exterior[j];
      const p4 = exterior[j + 1];

      if (segmentsIntersect(p1, p2, p3, p4)) {
        return {
          code: 'SELF_INTERSECTING',
          message: `Polygon self-intersects: edge ${i}-${i + 1} crosses edge ${j}-${j + 1}`,
        };
      }
    }
  }

  return null;
}

/**
 * Checks if two line segments intersect (excluding endpoints touching).
 * Uses the cross-product method for 2D line segments.
 */
function segmentsIntersect(p1: number[], p2: number[], p3: number[], p4: number[]): boolean {
  const ccw = (A: number[], B: number[], C: number[]): boolean => {
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
  };

  // Returns true if segments intersect (proper intersection, not just touching endpoints)
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Validates polygon winding order (should be counter-clockwise for WGS84 per RFC 7946).
 * Uses the signed area method: positive area = CCW, negative = CW.
 */
export function validateWindingOrder(geometry: GeoPolygon): GeometryError | null {
  const exterior = geometry.coordinates[0];
  const signedArea = computeSignedArea(exterior);

  // RFC 7946: exterior ring should have positive area (counter-clockwise).
  // The shoelace formula for (lon, lat) points gives negative for CCW, positive for CW.
  // So we need to check for negative area (which represents CCW in geographic coordinates).
  if (signedArea >= 0) {
    return {
      code: 'INVALID_WINDING',
      message: 'Polygon exterior ring must be counter-clockwise (RFC 7946). Ring is currently clockwise.',
    };
  }

  return null;
}

/**
 * Computes the signed area of a polygon ring using the shoelace formula.
 * In standard coordinates: Positive = CCW, Negative = CW
 * Returns raw signed area value (sign indicates direction).
 */
function computeSignedArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    area += (lon2 - lon1) * (lat2 + lat1);
  }
  return area;
}

/**
 * Master validation function: runs all checks on a pitch polygon.
 * Returns the first error found, or null if valid.
 */
export function validatePitchPolygon(geometry: any): GeometryError | null {
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
 * Validates that a pitch polygon fits within a venue bounding box.
 * Venue bbox is expected to be a POLYGON geography in WGS84.
 */
export function validatePitchFitsInVenue(pitchGeometry: GeoPolygon, venueBbox: GeoPolygon | null): GeometryError | null {
  if (!venueBbox) {
    // No venue bbox constraint; pitch is valid
    return null;
  }

  const pitchExterior = pitchGeometry.coordinates[0];
  const venueBboxExterior = venueBbox.coordinates[0];

  // Simple bounds check: all pitch points must be within venue bbox min/max coordinates
  let minVenueLon = Infinity,
    maxVenueLon = -Infinity;
  let minVenueLat = Infinity,
    maxVenueLat = -Infinity;

  for (const [lon, lat] of venueBboxExterior) {
    minVenueLon = Math.min(minVenueLon, lon);
    maxVenueLon = Math.max(maxVenueLon, lon);
    minVenueLat = Math.min(minVenueLat, lat);
    maxVenueLat = Math.max(maxVenueLat, lat);
  }

  for (let i = 0; i < pitchExterior.length - 1; i++) {
    const [lon, lat] = pitchExterior[i];
    if (lon < minVenueLon || lon > maxVenueLon || lat < minVenueLat || lat > maxVenueLat) {
      return {
        code: 'OUT_OF_BOUNDS',
        message: `Pitch point (${lon}, ${lat}) is outside venue bounds [lon: ${minVenueLon}-${maxVenueLon}, lat: ${minVenueLat}-${maxVenueLat}]`,
      };
    }
  }

  return null;
}

/**
 * Validates asset geometry (POINT or LINESTRING only)
 * Assets cannot be polygons - they must be point features or linear features
 */
export function validateAssetGeometry(geometry: any): GeometryError | null {
  if (!geometry) {
    return { code: 'INVALID_GEOMETRY', message: 'Geometry is required for assets' };
  }

  if (!geometry.type) {
    return { code: 'INVALID_GEOMETRY', message: 'Geometry must have a type property' };
  }

  // Assets can only be Point or LineString
  if (geometry.type !== 'Point' && geometry.type !== 'LineString') {
    return {
      code: 'INVALID_GEOMETRY',
      message: 'Asset geometry must be Point or LineString (polygons not allowed)',
    };
  }

  // Validate Point geometry
  if (geometry.type === 'Point') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
      return {
        code: 'INVALID_POINT',
        message: 'Point coordinates must be [longitude, latitude]',
      };
    }

    const [lon, lat] = geometry.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return {
        code: 'INVALID_POINT',
        message: 'Point coordinates must be numeric values',
      };
    }

    // Validate WGS84 bounds
    if (lon < -180 || lon > 180) {
      return {
        code: 'INVALID_SRID',
        message: `Longitude ${lon} is outside WGS84 range [-180, 180]`,
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        code: 'INVALID_SRID',
        message: `Latitude ${lat} is outside WGS84 range [-90, 90]`,
      };
    }
  }

  // Validate LineString geometry
  if (geometry.type === 'LineString') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      return {
        code: 'INVALID_LINESTRING',
        message: 'LineString must have at least 2 points',
      };
    }

    // Validate each point in the line
    for (let i = 0; i < geometry.coordinates.length; i++) {
      const point = geometry.coordinates[i];
      if (!Array.isArray(point) || point.length !== 2) {
        return {
          code: 'INVALID_LINESTRING',
          message: `Point ${i} in LineString must be [longitude, latitude]`,
        };
      }

      const [lon, lat] = point;
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        return {
          code: 'INVALID_LINESTRING',
          message: `Point ${i} in LineString must have numeric coordinates`,
        };
      }

      // Validate WGS84 bounds
      if (lon < -180 || lon > 180) {
        return {
          code: 'INVALID_SRID',
          message: `Point ${i}: longitude ${lon} is outside WGS84 range [-180, 180]`,
        };
      }

      if (lat < -90 || lat > 90) {
        return {
          code: 'INVALID_SRID',
          message: `Point ${i}: latitude ${lat} is outside WGS84 range [-90, 90]`,
        };
      }
    }
  }

  return null;
}
