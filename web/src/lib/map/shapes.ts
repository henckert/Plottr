/**
 * Utilities for creating geometric shapes on the map
 * Handles coordinate transformations, rotations, and shape generation
 */

import type { PitchTemplate } from '@/components/editor/ShapePalette';

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Creates a rectangular polygon centered at the given coordinates
 * @param centerLng - Longitude of center point
 * @param centerLat - Latitude of center point
 * @param width_m - Width in meters
 * @param length_m - Length in meters
 * @param rotation_deg - Rotation in degrees (0 = north-south aligned)
 * @returns GeoJSON Polygon
 */
export function createRectangle(
  centerLng: number,
  centerLat: number,
  width_m: number,
  length_m: number,
  rotation_deg: number = 0
): GeoPolygon {
  // Convert meters to approximate degrees
  // At equator: 1 degree latitude ≈ 111,139 meters
  // 1 degree longitude ≈ 111,139 * cos(latitude) meters
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLng = 111139 * Math.cos(centerLat * Math.PI / 180);

  const halfWidth = width_m / 2;
  const halfLength = length_m / 2;

  // Create corners in local coordinates (meters)
  const corners = [
    { x: -halfWidth, y: -halfLength }, // Bottom-left
    { x: halfWidth, y: -halfLength },  // Bottom-right
    { x: halfWidth, y: halfLength },   // Top-right
    { x: -halfWidth, y: halfLength },  // Top-left
    { x: -halfWidth, y: -halfLength }, // Close the polygon
  ];

  // Apply rotation if specified
  const rotationRad = (rotation_deg * Math.PI) / 180;
  const cosAngle = Math.cos(rotationRad);
  const sinAngle = Math.sin(rotationRad);

  const rotatedCorners = corners.map(({ x, y }) => ({
    x: x * cosAngle - y * sinAngle,
    y: x * sinAngle + y * cosAngle,
  }));

  // Convert to lat/lng coordinates
  const coordinates = rotatedCorners.map(({ x, y }) => [
    centerLng + x / metersPerDegreeLng,
    centerLat + y / metersPerDegreeLat,
  ]);

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Creates a polygon from a pitch template
 * @param template - Pitch template with dimensions
 * @param centerLng - Longitude of center point
 * @param centerLat - Latitude of center point
 * @param rotation_deg - Optional rotation
 * @returns GeoJSON Polygon
 */
export function createPitchFromTemplate(
  template: PitchTemplate,
  centerLng: number,
  centerLat: number,
  rotation_deg: number = 0
): GeoPolygon {
  return createRectangle(
    centerLng,
    centerLat,
    template.width_m,
    template.length_m,
    rotation_deg
  );
}

/**
 * Get the center point of a polygon
 * @param polygon - GeoJSON Polygon
 * @returns [longitude, latitude]
 */
export function getPolygonCenter(polygon: GeoPolygon): [number, number] {
  const coords = polygon.coordinates[0];
  
  let sumLng = 0;
  let sumLat = 0;
  const numPoints = coords.length - 1; // Exclude closing point

  for (let i = 0; i < numPoints; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }

  return [sumLng / numPoints, sumLat / numPoints];
}

/**
 * Rotate a polygon around its center point
 * @param polygon - GeoJSON Polygon
 * @param angleDeg - Rotation angle in degrees
 * @returns Rotated polygon
 */
export function rotatePolygon(polygon: GeoPolygon, angleDeg: number): GeoPolygon {
  const [centerLng, centerLat] = getPolygonCenter(polygon);
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);

  const rotatedCoords = polygon.coordinates[0].map(([lng, lat]) => {
    // Translate to origin
    const x = lng - centerLng;
    const y = lat - centerLat;

    // Rotate
    const rotatedX = x * cosAngle - y * sinAngle;
    const rotatedY = x * sinAngle + y * cosAngle;

    // Translate back
    return [centerLng + rotatedX, centerLat + rotatedY];
  });

  return {
    type: 'Polygon',
    coordinates: [rotatedCoords],
  };
}
