/**
 * Calculate zoom level from a radius
 * Useful for fitting map to search results
 */
export function radiusToZoom(radiusKm: number): number {
  // Approximate zoom levels for different radii
  // Based on map projection at equator
  if (radiusKm < 0.5) return 17;
  if (radiusKm < 1) return 16;
  if (radiusKm < 2) return 15;
  if (radiusKm < 5) return 14;
  if (radiusKm < 10) return 13;
  if (radiusKm < 25) return 12;
  if (radiusKm < 50) return 11;
  if (radiusKm < 100) return 10;
  if (radiusKm < 250) return 9;
  if (radiusKm < 500) return 8;
  return 7;
}

/**
 * Calculate distance between two points in kilometers
 * Using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bounds to fit multiple points with padding
 */
export function calculateBounds(
  points: Array<{ lat: number; lon: number }>,
  padding = 0.1
): { north: number; south: number; east: number; west: number } {
  if (points.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  }

  // Add padding
  const latPad = (maxLat - minLat) * padding;
  const lonPad = (maxLon - minLon) * padding;

  return {
    north: maxLat + latPad,
    south: minLat - latPad,
    east: maxLon + lonPad,
    west: minLon - lonPad,
  };
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  lat: number,
  lon: number,
  decimals = 6
): string {
  return `${lat.toFixed(decimals)}, ${lon.toFixed(decimals)}`;
}

/**
 * Validate bounds
 */
export function isValidBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): boolean {
  return (
    bounds.north >= -90 &&
    bounds.north <= 90 &&
    bounds.south >= -90 &&
    bounds.south <= 90 &&
    bounds.east >= -180 &&
    bounds.east <= 180 &&
    bounds.west >= -180 &&
    bounds.west <= 180 &&
    bounds.north >= bounds.south &&
    bounds.east >= bounds.west
  );
}

/**
 * Get center point of bounds
 */
export function getBoundsCenter(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): { lat: number; lon: number } {
  return {
    lat: (bounds.north + bounds.south) / 2,
    lon: (bounds.east + bounds.west) / 2,
  };
}

/**
 * Convert decimal degrees to degrees/minutes/seconds
 */
export function decimalToDMS(
  decimal: number,
  isLongitude: boolean
): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

  const direction = isLongitude
    ? decimal > 0
      ? 'E'
      : 'W'
    : decimal > 0
    ? 'N'
    : 'S';

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}
