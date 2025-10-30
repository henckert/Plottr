/**
 * Geometry Generators for Templates
 * 
 * Utilities to generate GeoJSON polygons from dimensions and center points.
 * Handles rotation, WGS84 coordinate conversion, and proper winding order.
 */

import type { GeometryGenerator } from '@/types/template.types';

/**
 * Convert meters to degrees latitude (approximate)
 * 1 degree latitude ≈ 111,320 meters
 */
function metersToDegLat(meters: number): number {
  return meters / 111320;
}

/**
 * Convert meters to degrees longitude at given latitude
 * Longitude degrees vary by latitude due to Earth's curvature
 */
function metersToDegLng(meters: number, lat: number): number {
  const metersPerDegree = 111320 * Math.cos((lat * Math.PI) / 180);
  return meters / metersPerDegree;
}

/**
 * Rotate a point around origin by degrees
 */
function rotatePoint(
  x: number,
  y: number,
  degrees: number
): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Generate rectangular polygon from center point and dimensions
 * 
 * @param centerLat - Center latitude (WGS84)
 * @param centerLng - Center longitude (WGS84)
 * @param dimensions - Width and length in meters
 * @param rotation - Rotation in degrees (0 = north-south orientation)
 * @returns GeoJSON Polygon with counter-clockwise winding
 */
export const generateRectangle: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions,
  rotation = 0
) => {
  const { width, length } = dimensions;
  
  // Convert dimensions to degrees
  const halfWidthDeg = metersToDegLng(width / 2, centerLat);
  const halfLengthDeg = metersToDegLat(length / 2);
  
  // Define rectangle corners (before rotation)
  let corners = [
    { x: -halfWidthDeg, y: -halfLengthDeg }, // bottom-left
    { x: halfWidthDeg, y: -halfLengthDeg },  // bottom-right
    { x: halfWidthDeg, y: halfLengthDeg },   // top-right
    { x: -halfWidthDeg, y: halfLengthDeg },  // top-left
  ];
  
  // Apply rotation if specified
  if (rotation !== 0) {
    corners = corners.map((corner) => rotatePoint(corner.x, corner.y, rotation));
  }
  
  // Convert to absolute coordinates and close the ring
  const coordinates = corners.map((corner) => [
    centerLng + corner.x,
    centerLat + corner.y,
  ]);
  
  // Close the polygon (first point === last point)
  coordinates.push(coordinates[0]);
  
  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
};

/**
 * Generate GAA pitch polygon (145m x 90m standard)
 */
export const generateGAAPitch: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 90, length: 145 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate Rugby pitch polygon (100m x 70m standard)
 */
export const generateRugbyPitch: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 70, length: 100 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate Soccer pitch polygon (105m x 68m standard)
 */
export const generateSoccerPitch: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 68, length: 105 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate Hockey pitch polygon (91.4m x 55m standard)
 */
export const generateHockeyPitch: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 55, length: 91.4 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate Tennis court polygon (23.77m x 10.97m standard)
 */
export const generateTennisCourt: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 10.97, length: 23.77 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate car park bay (5m x 2.5m standard)
 */
export const generateParkingBay: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 2.5, length: 5 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate market stall (3m x 3m standard)
 */
export const generateMarketStall: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 3, length: 3 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate construction compound (50m x 30m typical)
 */
export const generateConstructionCompound: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 30, length: 50 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Generate stage area (20m x 15m typical)
 */
export const generateStage: GeometryGenerator = (
  centerLat,
  centerLng,
  dimensions = { width: 15, length: 20 },
  rotation = 0
) => {
  return generateRectangle(centerLat, centerLng, dimensions, rotation);
};

/**
 * Calculate bounding box for a polygon
 * Returns center point and dimensions
 */
export function calculateBounds(polygon: {
  type: 'Polygon';
  coordinates: number[][][];
}): {
  center: { lat: number; lng: number };
  dimensions: { width: number; length: number };
} {
  const coords = polygon.coordinates[0];
  
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  // Convert degrees back to meters (approximate)
  const widthMeters = (maxLng - minLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
  const lengthMeters = (maxLat - minLat) * 111320;
  
  return {
    center: { lat: centerLat, lng: centerLng },
    dimensions: { width: widthMeters, length: lengthMeters },
  };
}
