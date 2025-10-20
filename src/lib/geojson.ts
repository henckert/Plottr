/**
 * GeoJSON Normalization Utilities
 * 
 * Ensures consistent Geometry JSON strings for PostGIS ST_GeomFromGeoJSON()
 */

export type AnyGeoJson = any;

/**
 * Normalize any GeoJSON input (FeatureCollection, Feature, or Geometry)
 * to a pure Geometry JSON string suitable for PostGIS ST_GeomFromGeoJSON()
 * 
 * @param input - GeoJSON as string or object
 * @returns JSON string of the Geometry object only
 * @throws Error if input is not valid GeoJSON
 */
export function toGeometryJson(input: string | object): string {
  const obj: AnyGeoJson = typeof input === 'string' ? JSON.parse(input) : input;
  
  // Handle FeatureCollection - extract first feature's geometry
  if (obj?.type === 'FeatureCollection') {
    if (!obj.features?.length) {
      throw new Error('Empty FeatureCollection');
    }
    if (!obj.features[0].geometry) {
      throw new Error('First feature in FeatureCollection missing geometry');
    }
    return JSON.stringify(obj.features[0].geometry);
  }
  
  // Handle Feature - extract geometry
  if (obj?.type === 'Feature') {
    if (!obj.geometry) {
      throw new Error('Feature missing geometry');
    }
    return JSON.stringify(obj.geometry);
  }
  
  // Handle Geometry directly (Polygon, MultiPolygon, etc.)
  if (obj?.type && obj?.coordinates) {
    return JSON.stringify(obj);
  }
  
  throw new Error('Unsupported GeoJSON payload');
}
