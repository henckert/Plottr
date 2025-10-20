/**
 * Geometry Import Service (Production-Grade)
 * 
 * Handles GeoJSON/KML file parsing, validation, and import
 * Integrates PostGIS for advanced geometry validation and accurate calculations
 * Uses @tmcw/togeojson for proper XML/KML parsing with MultiGeometry support
 */

import { AppError } from '../errors';
import { getKnex } from '../data/knex';
import { DOMParser } from 'xmldom';
import * as togeojson from '@tmcw/togeojson';

/**
 * Bounding box: [minLng, minLat, maxLng, maxLat]
 */
export type BoundingBox = [number, number, number, number];

/**
 * Supported file formats
 */
export enum FileFormat {
  GEOJSON = 'geojson',
  KML = 'kml',
}

/**
 * Geometry validation result
 */
export interface GeometryValidationResult {
  valid: boolean;
  coordinates: [number, number][];
  area: number; // in square meters
  bbox: BoundingBox;
  errors: string[];
  warnings: string[];
}

/**
 * Import result
 */
export interface ImportResult {
  valid: boolean;
  boundary: [number, number][];
  area: number; // in m²
  bbox: BoundingBox;
  message: string;
  warnings?: string[];
  geometry_wkt?: string; // WKT format for PostGIS persistence
  geometry_geojson?: GeoJSONFeature; // GeoJSON format for API
}

/**
 * GeoJSON Feature structure
 */
interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString';
    coordinates: any[];
  };
  properties?: Record<string, any>;
}

/**
 * GeoJSON FeatureCollection structure
 */
interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * KML Placemark structure (simplified)
 */
interface KMLPlacemark {
  Placemark?: Array<{
    Polygon?: Array<{
      outerBoundaryIs?: Array<{
        LinearRing?: Array<{
          coordinates?: string[];
        }>;
      }>;
    }>;
    Point?: Array<{
      coordinates?: string[];
    }>;
  }>;
}

export class GeometryImportService {
  // Maximum geometry size: 10 km² (configurable via env for testing)
  private readonly MAX_AREA_M2 = Number(process.env.GEOMETRY_MAX_AREA_M2 ?? 10_000_000);
  
  // Minimum valid polygon area (to catch degenerate cases)
  private readonly MIN_AREA_M2 = 1;

  // Maximum number of coordinates per geometry (DoS prevention)
  private readonly MAX_COORDINATES = 50_000;

  // Allowed MIME types for file upload
  private readonly ALLOWED_MIME_TYPES = [
    'application/json',
    'application/geo+json',
    'text/plain',
    'application/xml',
    'text/xml',
    'application/vnd.google-earth.kml+xml',
  ];

  private knex = getKnex();

  /**
   * Detect file format from file content
   */
  private detectFormat(content: string): FileFormat {
    const trimmed = content.trim();

    if (trimmed.startsWith('{') && trimmed.includes('"type"')) {
      return FileFormat.GEOJSON;
    }

    if (trimmed.includes('<?xml') && trimmed.includes('<kml')) {
      return FileFormat.KML;
    }

    throw new AppError(
      'Unsupported file format. Please provide valid GeoJSON or KML file.',
      400,
      'INVALID_FORMAT'
    );
  }

  /**
   * Validate MIME type against whitelist
   */
  isMimeTypeAllowed(mimeType?: string): boolean {
    if (!mimeType) {
      return true; // Allow if not specified
    }
    return this.ALLOWED_MIME_TYPES.includes(mimeType);
  }
  private parseGeoJSON(content: string): GeoJSONFeature[] {
    try {
      const data = JSON.parse(content);

      // Handle FeatureCollection
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        return data.features.filter(
          (f: any) =>
            f.type === 'Feature' &&
            f.geometry &&
            ['Polygon', 'MultiPolygon'].includes(f.geometry.type)
        );
      }

      // Handle single Feature
      if (
        data.type === 'Feature' &&
        data.geometry &&
        ['Polygon', 'MultiPolygon'].includes(data.geometry.type)
      ) {
        return [data];
      }

      // Handle Geometry object directly
      if (
        data.type &&
        ['Polygon', 'MultiPolygon'].includes(data.type) &&
        Array.isArray(data.coordinates)
      ) {
        return [
          {
            type: 'Feature',
            geometry: data,
            properties: {},
          },
        ];
      }

      throw new Error('No valid polygon features found in GeoJSON');
    } catch (error) {
      throw new AppError(
        `Invalid GeoJSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400,
        'INVALID_GEOJSON'
      );
    }
  }

  /**
   * Parse KML file using @tmcw/togeojson with proper XML DOM parsing
   * Supports MultiGeometry elements (converted to GeometryCollection)
   */
  private parseKML(content: string): GeoJSONFeature[] {
    try {
      // Parse XML with proper namespace support
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'application/xml');

      // Check for XML parsing errors
      if (xmlDoc.documentElement.tagName === 'parsererror') {
        throw new Error('Failed to parse KML as valid XML');
      }

      // Convert KML to GeoJSON using @tmcw/togeojson
      const geojson = togeojson.kml(xmlDoc);

      // Extract features
      const features: GeoJSONFeature[] = [];

      if (geojson.type === 'FeatureCollection' && geojson.features) {
        for (const feature of geojson.features) {
          if (!feature.geometry) continue;

          // Handle GeometryCollection (from KML MultiGeometry)
          if (feature.geometry.type === 'GeometryCollection') {
            // Extract all Polygons from GeometryCollection
            const geometries = (feature.geometry as any).geometries || [];
            for (const geom of geometries) {
              if (geom.type === 'Polygon') {
                features.push({
                  type: 'Feature',
                  properties: feature.properties || {},
                  geometry: geom,
                } as GeoJSONFeature);
              }
            }
          }
          // Handle regular Polygon and MultiPolygon
          else if (['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
            features.push(feature as GeoJSONFeature);
          }
        }
      }

      if (features.length === 0) {
        throw new Error('No valid polygon features found in KML');
      }

      return features;
    } catch (error) {
      throw new AppError(
        `Invalid KML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400,
        'INVALID_KML'
      );
    }
  }

  /**
   * Extract coordinates from polygon feature
   */
  private extractPolygonCoordinates(feature: GeoJSONFeature): [number, number][] {
    const { geometry } = feature;

    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      // Return outer ring (first element)
      const ring = geometry.coordinates[0];
      if (Array.isArray(ring) && ring.length >= 4) {
        return ring as [number, number][];
      }
    }

    if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
      // Return outer ring of first polygon
      const polygon = geometry.coordinates[0];
      if (Array.isArray(polygon) && Array.isArray(polygon[0])) {
        const ring = polygon[0];
        if (ring.length >= 4) {
          return ring as [number, number][];
        }
      }
    }

    throw new Error('Could not extract valid polygon coordinates');
  }

  /**
   * Validate polygon coordinates
   */
  private validatePolygonCoordinates(coords: [number, number][]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check coordinate count limit (DoS prevention)
    if (coords.length > this.MAX_COORDINATES) {
      errors.push(
        `Polygon has too many coordinates (${coords.length}). Maximum allowed: ${this.MAX_COORDINATES}.`
      );
    }

    // Check minimum points (at least 4 for closed polygon)
    if (coords.length < 4) {
      errors.push('Polygon must have at least 4 coordinates (including closing point)');
    }

    // Check closure (first and last coordinates should match)
    if (coords.length >= 2) {
      const first = coords[0];
      const last = coords[coords.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        errors.push('Polygon must be closed (first and last coordinates must match)');
      }
    }

    // Check valid coordinate ranges
    for (let i = 0; i < coords.length; i++) {
      const [lon, lat] = coords[i];

      if (lon < -180 || lon > 180) {
        errors.push(`Invalid longitude at point ${i}: ${lon}`);
      }

      if (lat < -90 || lat > 90) {
        errors.push(`Invalid latitude at point ${i}: ${lat}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for self-intersections and validate geometry using PostGIS
   * Returns: { valid: boolean, reason?: string }
   */
  private async validateWithPostGIS(
    coordinates: [number, number][]
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Convert coordinates to WKT (Well-Known Text) format
      const wkt = this.coordinatesToWKT(coordinates);

      // Use PostGIS to validate geometry
      // ST_IsValid() checks for self-intersections, closure, etc.
      // ST_IsValidReason() provides detailed error message if invalid
      const result = await this.knex.raw(
        `SELECT 
          ST_IsValid(ST_GeomFromText(?, 4326)) as is_valid,
          ST_IsValidReason(ST_GeomFromText(?, 4326)) as reason
        `,
        [wkt, wkt]
      );

      const row = result.rows[0];

      return {
        valid: row.is_valid,
        reason: row.reason,
      };
    } catch (error) {
      // If PostGIS validation fails, return generic valid=false
      return {
        valid: false,
        reason: `PostGIS validation error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Convert polygon coordinates to WKT (Well-Known Text) format
   * Format: POLYGON((lon lat, lon lat, ...))
   */
  private coordinatesToWKT(coords: [number, number][]): string {
    const coordString = coords.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
    return `POLYGON((${coordString}))`;
  }

  /**
   * Calculate polygon area using PostGIS
   * Returns area in m² using geodetic calculation for accuracy
   */
  private async calculateAreaWithPostGIS(
    coordinates: [number, number][]
  ): Promise<number> {
    try {
      const wkt = this.coordinatesToWKT(coordinates);

      // Use PostGIS ST_Area with geography type for geodetic accuracy
      // geography type calculates area in meters (not degrees)
      const result = await this.knex.raw(
        `SELECT ST_Area(ST_GeomFromText(?, 4326)::geography) as area_m2`,
        [wkt]
      );

      const area = result.rows[0].area_m2 || 0;
      return Math.abs(Number(area));
    } catch (error) {
      // Fallback to client-side calculation
      console.error('PostGIS area calculation failed, using fallback:', error);
      return this.calculateAreaFallback(coordinates);
    }
  }

  /**
   * Fallback area calculation using Shoelace formula (less accurate)
   * Used only if PostGIS is unavailable
   */
  private calculateAreaFallback(coords: [number, number][]): number {
    // Convert degrees to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // Shoelace formula in degrees (approximation)
    let area = 0;
    const n = coords.length;

    for (let i = 0; i < n - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];

      area += (lon2 - lon1) * (lat2 + lat1);
    }

    area = Math.abs(area) / 2;

    // Convert square degrees to square meters (rough approximation)
    // At equator: 1 degree ≈ 111.32 km
    const meterPerDegree = 111320;
    const areaM2 = area * meterPerDegree * meterPerDegree;

    return Math.abs(areaM2);
  }

  /**
   * Calculate bounding box
   */
  private calculateBoundingBox(coords: [number, number][]): BoundingBox {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coords) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Main import method - accepts file content and returns validation result
   * Integrates PostGIS for validation and accurate area calculation
   */
  async import(
    fileContent: string,
    fileName: string,
    mimeType?: string
  ): Promise<ImportResult> {
    // Validate MIME type
    if (!this.isMimeTypeAllowed(mimeType)) {
      throw new AppError(
        `MIME type '${mimeType}' is not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
        400,
        'INVALID_MIME_TYPE'
      );
    }

    // Detect format
    const format = this.detectFormat(fileContent);

    let features: GeoJSONFeature[] = [];
    try {
      if (format === FileFormat.GEOJSON) {
        features = this.parseGeoJSON(fileContent);
      } else {
        features = this.parseKML(fileContent);
      }
    } catch (error) {
      throw error;
    }

    if (features.length === 0) {
      throw new AppError(
        'No valid polygon features found in file',
        400,
        'NO_POLYGONS'
      );
    }

    // Use first feature (most files have one main boundary)
    const feature = features[0];
    const warnings: string[] = [];

    if (features.length > 1) {
      warnings.push(`File contains ${features.length} polygons. Using first polygon.`);
    }

    // Extract coordinates
    let coordinates: [number, number][];
    try {
      coordinates = this.extractPolygonCoordinates(feature);
    } catch (error) {
      throw new AppError(
        `Could not extract polygon: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400,
        'INVALID_POLYGON'
      );
    }

    // Validate coordinates
    const coordValidation = this.validatePolygonCoordinates(coordinates);
    if (!coordValidation.valid) {
      throw new AppError(
        `Invalid polygon: ${coordValidation.errors.join('; ')}`,
        400,
        'INVALID_POLYGON'
      );
    }

    // Validate with PostGIS (self-intersection, closure, winding order)
    const postgisValidation = await this.validateWithPostGIS(coordinates);
    if (!postgisValidation.valid) {
      throw new AppError(
        `PostGIS validation failed: ${postgisValidation.reason || 'Unknown error'}`,
        400,
        'POSTGIS_VALIDATION_FAILED'
      );
    }

    // Calculate area using PostGIS for accuracy
    const area = await this.calculateAreaWithPostGIS(coordinates);

    // Check size limits
    if (area > this.MAX_AREA_M2) {
      throw new AppError(
        `Polygon is too large (${(area / 1_000_000).toFixed(2)} km²). Maximum allowed: 10 km².`,
        400,
        'GEOMETRY_TOO_LARGE'
      );
    }

    if (area < this.MIN_AREA_M2) {
      throw new AppError(
        'Polygon area is too small (likely degenerate geometry)',
        400,
        'GEOMETRY_TOO_SMALL'
      );
    }

    // Calculate bounding box
    const bbox = this.calculateBoundingBox(coordinates);

    // Convert to WKT for storage
    const geometry_wkt = this.coordinatesToWKT(coordinates);

    return {
      valid: true,
      boundary: coordinates,
      area,
      bbox,
      geometry_wkt,
      geometry_geojson: feature,
      message: `Successfully imported ${format.toUpperCase()} file. Polygon area: ${(area / 1_000_000).toFixed(2)} km².`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export default GeometryImportService;
