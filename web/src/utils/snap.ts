// web/src/utils/snap.ts
// TODO: nearest point/line snapping helpers using @turf/turf

/**
 * Snap a point to grid based on meter spacing
 * @param lng Longitude
 * @param lat Latitude
 * @param _meters Grid spacing in meters (not yet implemented)
 * @returns Snapped coordinates
 */
export function snapToGrid(lng: number, lat: number, _meters: number) {
  // TODO: Convert meters to degrees at current latitude
  // TODO: Round coordinates to grid
  return { lng, lat }; // stub
}

/**
 * Snap a point to nearest feature vertex or edge
 * @param lng Longitude
 * @param lat Latitude
 * @param _features GeoJSON features to snap to (not yet implemented)
 * @param _threshold Maximum snap distance in meters (not yet implemented)
 * @returns Snapped coordinates or original if no snap target found
 */
export function snapToFeatures(
  lng: number,
  lat: number,
  _features: any[],
  _threshold: number = 5
) {
  // TODO: Use @turf/nearest-point-on-line and @turf/distance
  // TODO: Find closest point on any feature within threshold
  return { lng, lat }; // stub
}

/**
 * Check if coordinates should snap to straight line (0°, 90°, 180°, 270°)
 * @param angle Current angle in degrees
 * @param threshold Snap threshold in degrees
 * @returns Snapped angle or original
 */
export function snapToCardinal(angle: number, threshold: number = 5): number {
  const cardinals = [0, 90, 180, 270, 360];
  for (const cardinal of cardinals) {
    if (Math.abs(angle - cardinal) < threshold) {
      return cardinal % 360;
    }
  }
  return angle;
}
