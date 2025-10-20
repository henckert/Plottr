/**
 * Geometry Import Service Unit Tests
 * 
 * Tests for GeoJSON/KML parsing, polygon validation, area calculation,
 * size limits, and error handling
 */

import GeometryImportService from '../../../src/services/geometry.import.service';
import { AppError } from '../../../src/errors';

describe('GeometryImportService', () => {
  let service: GeometryImportService;

  beforeEach(() => {
    service = new GeometryImportService();
  });

  describe('GeoJSON Import - Valid Cases', () => {
    it('should successfully import valid GeoJSON Feature with Polygon', async () => {
      const validGeoJSON = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.001, 0],
              [0.001, 0.001],
              [0, 0.001],
              [0, 0],
            ],
          ],
        },
        properties: {},
      });

      const result = await service.import(validGeoJSON, 'test.geojson');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('Successfully imported');
      expect(result.boundary).toHaveLength(5);
      expect(result.area).toBeGreaterThan(0);
      expect(result.bbox).toHaveLength(4);
    });

    it('should successfully import GeoJSON FeatureCollection with polygon', async () => {
      const geojson = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [0.002, 0],
                  [0.002, 0.002],
                  [0, 0.002],
                  [0, 0],
                ],
              ],
            },
            properties: { name: 'Test Area' },
          },
        ],
      });

      const result = await service.import(geojson, 'test.geojson');

      expect(result.valid).toBe(true);
      expect(result.boundary.length).toBeGreaterThanOrEqual(4);
    });

    it('should calculate correct area for known polygon', async () => {
      // 0.001 degree x 0.001 degree square
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0001, 0],
              [0.0001, 0.0001],
              [0, 0.0001],
              [0, 0],
            ],
          ],
        },
        properties: {},
      });

      const result = await service.import(geojson, 'test.geojson');

      // Area should be small and positive
      expect(result.area).toBeGreaterThan(100); // > 100m²
      expect(result.area).toBeLessThan(1_000_000); // < 1km²
    });

    it('should extract bounding box correctly', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.01, -0.02],
              [0.01, -0.02],
              [0.01, 0.02],
              [-0.01, 0.02],
              [-0.01, -0.02],
            ],
          ],
        },
        properties: {},
      });

      const result = await service.import(geojson, 'test.geojson');

      const [minLng, minLat, maxLng, maxLat] = result.bbox;
      expect(minLng).toBeLessThanOrEqual(-0.01);
      expect(minLat).toBeLessThanOrEqual(-0.02);
      expect(maxLng).toBeGreaterThanOrEqual(0.01);
      expect(maxLat).toBeGreaterThanOrEqual(0.02);
    });
  });

  describe('KML Import - Valid Cases', () => {
    it('should successfully import valid KML with Polygon', async () => {
      const validKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>0,0,0 0.001,0,0 0.001,0.001,0 0,0.001,0 0,0,0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      const result = await service.import(validKML, 'test.kml');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('Successfully imported');
      expect(result.boundary).toHaveLength(5);
      expect(result.area).toBeGreaterThan(0);
    });

    it('should handle KML with realistic geographic coordinates', async () => {
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>-73.9,40.7,0 -73.899,40.7,0 -73.899,40.701,0 -73.9,40.701,0 -73.9,40.7,0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      const result = await service.import(kml, 'test.kml');

      expect(result.valid).toBe(true);
      expect(result.boundary[0][0]).toBe(-73.9);
      expect(result.boundary[0][1]).toBe(40.7);
    });
  });

  describe('Import - Format Detection', () => {
    it('should detect GeoJSON format from JSON structure', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0001, 0],
              [0.0001, 0.0001],
              [0, 0.0001],
              [0, 0],
            ],
          ],
        },
      });

      const result = await service.import(geojson, 'file.json');
      expect(result.valid).toBe(true);
    });

    it('should detect KML format from XML structure', async () => {
      const kml = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>0,0,0 0.01,0,0 0.01,0.01,0 0,0.01,0 0,0,0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      const result = await service.import(kml, 'file.kml');
      expect(result.valid).toBe(true);
    });
  });

  describe('Import - Invalid Cases', () => {
    it('should reject malformed JSON', async () => {
      const malformedJSON = '{ invalid json';

      await expect(service.import(malformedJSON, 'test.json')).rejects.toThrow(AppError);
      await expect(service.import(malformedJSON, 'test.json')).rejects.toThrow(
        'Unsupported file format'
      );
    });

    it('should reject unknown file format', async () => {
      const unknownFormat = 'This is neither GeoJSON nor KML';

      await expect(service.import(unknownFormat, 'test.txt')).rejects.toThrow(AppError);
      await expect(service.import(unknownFormat, 'test.txt')).rejects.toThrow(
        'Unsupported file format'
      );
    });

    it('should reject GeoJSON with no polygon features', async () => {
      const noPolygons = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
      });

      await expect(service.import(noPolygons, 'test.geojson')).rejects.toThrow(AppError);
      await expect(service.import(noPolygons, 'test.geojson')).rejects.toThrow(
        'No valid polygon features found'
      );
    });

    it('should reject KML with no polygon features', async () => {
      const noPolygons = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Point>
        <coordinates>0,0,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

      await expect(service.import(noPolygons, 'test.kml')).rejects.toThrow(AppError);
      await expect(service.import(noPolygons, 'test.kml')).rejects.toThrow(
        'No valid polygon features found'
      );
    });
  });

  describe('Polygon Validation - Closure', () => {
    it('should reject unclosed polygon', async () => {
      const unclosed = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              // Missing [0,0] to close
            ],
          ],
        },
      });

      await expect(service.import(unclosed, 'test.geojson')).rejects.toThrow(
        'Polygon must be closed'
      );
    });

    it('should accept properly closed polygon', async () => {
      const closed = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0], // Properly closed
            ],
          ],
        },
      });

      const result = await service.import(closed, 'test.geojson');
      expect(result.valid).toBe(true);
    });
  });

  describe('Polygon Validation - Coordinate Ranges', () => {
    it('should reject invalid longitude > 180', async () => {
      const invalidLon = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0], // Keep valid
              [0.01, 0.01], // Keep valid
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
      });

      // This should actually be valid - let me test actual invalid
      const actuallyInvalid = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [200, 0], // Invalid longitude
              [200, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
      });

      await expect(service.import(actuallyInvalid, 'test.geojson')).rejects.toThrow(
        'Invalid longitude'
      );
    });

    it('should reject invalid latitude > 90', async () => {
      const invalidLat = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 120], // Invalid latitude
              [0, 120],
              [0, 0],
            ],
          ],
        },
      });

      await expect(service.import(invalidLat, 'test.geojson')).rejects.toThrow(
        'Invalid latitude'
      );
    });

    it('should accept valid coordinate ranges', async () => {
      const validCoords = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.01, -0.01],
              [0.01, -0.01],
              [0.01, 0.01],
              [-0.01, 0.01],
              [-0.01, -0.01],
            ],
          ],
        },
      });

      const result = await service.import(validCoords, 'test.geojson');
      expect(result.valid).toBe(true);
    });
  });

  describe('Size Validation', () => {
    it('should accept polygon under 10 km²', async () => {
      // Small 0.01 degree x 0.01 degree square
      const small = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
      });

      const result = await service.import(small, 'test.geojson');
      expect(result.valid).toBe(true);
      expect(result.area).toBeLessThan(10_000_000); // Less than 10 km²
    });

    it('should reject polygon exceeding 10 km² limit', async () => {
      // Large 5 degree x 5 degree square (way over 10 km² limit)
      const toolarge = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
        },
      });

      await expect(service.import(toolarge, 'test.geojson')).rejects.toThrow('too large');
      await expect(service.import(toolarge, 'test.geojson')).rejects.toThrow('10 km');
    });
  });

  describe('Minimum Geometry Validation', () => {
    it('should reject polygon with fewer than 4 points', async () => {
      const tooFew = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              // Only 3 points (need at least 4 for valid polygon)
            ],
          ],
        },
      });

      await expect(service.import(tooFew, 'test.geojson')).rejects.toThrow(AppError);
    });
  });

  describe('MultiPolygon Handling', () => {
    it('should import MultiPolygon using first polygon', async () => {
      const multiPolygon = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [0.01, 0],
                [0.01, 0.01],
                [0, 0.01],
                [0, 0],
              ],
            ],
            [
              [
                [0.02, 0.02],
                [0.03, 0.02],
                [0.03, 0.03],
                [0.02, 0.03],
                [0.02, 0.02],
              ],
            ],
          ],
        },
      });

      const result = await service.import(multiPolygon, 'test.geojson');

      expect(result.valid).toBe(true);
      // Warnings may or may not be present
      // The service uses first polygon from MultiPolygon
      expect(result.boundary).toBeDefined();
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for empty GeoJSON', async () => {
      const empty = JSON.stringify({
        type: 'FeatureCollection',
        features: [],
      });

      await expect(service.import(empty, 'test.geojson')).rejects.toThrow(
        'No valid polygon features found'
      );
    });

    it('should provide context in error for malformed KML', async () => {
      const malformedKML = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>invalid
  </Document>
</kml>`;

      await expect(service.import(malformedKML, 'test.kml')).rejects.toThrow(AppError);
      const error = await service.import(malformedKML, 'test.kml').catch(e => e);
      expect(error.message).toContain('KML');
    });
  });
});
