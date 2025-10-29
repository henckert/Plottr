// web/src/utils/arrayTool.ts
import * as turf from "@turf/turf";

/**
 * Generate an array of positions in a grid pattern
 * @param origin Starting point [lng, lat]
 * @param rows Number of rows
 * @param cols Number of columns
 * @param spacingM Spacing between items in meters
 * @param bearing Direction of array in degrees (0 = north)
 * @returns Array of [lng, lat] positions
 */
export function makeArrayPositions(
  origin: [number, number],
  rows: number,
  cols: number,
  spacingM: number,
  bearing: number = 90
): [number, number][] {
  const positions: [number, number][] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate offset from origin
      const northOffset = row * spacingM;
      const eastOffset = col * spacingM;

      // Create point at origin
      let point = turf.point(origin);

      // Move north
      if (northOffset > 0) {
        point = turf.destination(point, northOffset / 1000, 0, { units: "kilometers" });
      }

      // Move east (rotated by bearing)
      if (eastOffset > 0) {
        point = turf.destination(point, eastOffset / 1000, bearing, { units: "kilometers" });
      }

      positions.push(point.geometry.coordinates as [number, number]);
    }
  }

  return positions;
}

/**
 * Duplicate a feature multiple times in a grid
 * @param feature GeoJSON feature to duplicate
 * @param rows Number of rows
 * @param cols Number of columns
 * @param spacingM Spacing in meters
 * @param bearing Direction in degrees
 * @returns Array of duplicated features
 */
export function arrayFeature(
  feature: any,
  rows: number,
  cols: number,
  spacingM: number,
  bearing: number = 90
): any[] {
  // Get feature centroid as origin
  const centroid = turf.centroid(feature);
  const origin = centroid.geometry.coordinates as [number, number];

  // Generate grid positions
  const positions = makeArrayPositions(origin, rows, cols, spacingM, bearing);

  // Calculate offset from original centroid to each position
  return positions.map((pos) => {
    const dx = pos[0] - origin[0];
    const dy = pos[1] - origin[1];

    // Translate feature to new position
    return turf.transformTranslate(feature, Math.sqrt(dx * dx + dy * dy) * 111, // rough deg to km
      Math.atan2(dx, dy) * (180 / Math.PI), // angle
      { units: "kilometers" }
    );
  });
}
