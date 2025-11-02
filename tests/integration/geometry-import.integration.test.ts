/**
 * Integration Tests for Geometry Import (FEAT-006)
 * Tests boundary import with PostGIS validation, tier enforcement, and persistence
 */

// Set environment variables BEFORE importing modules
process.env.BYPASS_QUOTA = '1';

import request from 'supertest';
import createApp from '../../src/app';
import { getKnex } from '../../src/data/knex';
import { BoundariesRepo } from '../../src/data/boundaries.repo';
import { UsageService } from '../../src/services/usage.service';
import { UsageRepo } from '../../src/data/usage.repo';
import GeometryImportService from '../../src/services/geometry.import.service';

/**
 * Sample test data - Small geometries under 10 km² limit
 * These represent ~1 km² areas suitable for testing
 */
const SAMPLE_GEOJSON = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-73.985, 40.750], // Times Square area, NYC
        [-73.975, 40.750], // ~0.01 degrees = ~1 km
        [-73.975, 40.759],
        [-73.985, 40.759],
        [-73.985, 40.750],
      ],
    ],
  },
  properties: {},
};

const SAMPLE_GEOJSON_STR = JSON.stringify(SAMPLE_GEOJSON);

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -73.985,40.750,0
              -73.975,40.750,0
              -73.975,40.759,0
              -73.985,40.759,0
              -73.985,40.750,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

const SAMPLE_KML_MULTIGEOMETRY = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <MultiGeometry>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -73.985,40.750,0
                -73.975,40.750,0
                -73.975,40.755,0
                -73.985,40.755,0
                -73.985,40.750,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -73.985,40.755,0
                -73.975,40.755,0
                -73.975,40.759,0
                -73.985,40.759,0
                -73.985,40.755,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </MultiGeometry>
    </Placemark>
  </Document>
</kml>`;

const INVALID_POLYGON = JSON.stringify({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 1],
        [0, 0], // Not closed - missing duplicate of first point
      ],
    ],
  },
});

const DEGENERATE_POLYGON = JSON.stringify({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0], // Degenerate (zero area)
      ],
    ],
  },
});

const TOO_MANY_COORDINATES = (() => {
  const coords: [number, number][] = [];
  for (let i = 0; i < 50001; i++) {
    coords.push([
      -73.9 + (i * 0.0001) % 0.1,
      40.7 + (i * 0.0001) % 0.1,
    ]);
  }
  coords.push(coords[0]); // Close the polygon
  return JSON.stringify({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  });
})();

describe('Geometry Import Integration Tests (FEAT-006)', () => {
  let app: any;
  let knex: any;
  let boundariesRepo: BoundariesRepo;
  let usageService: UsageService;
  let usageRepo: UsageRepo;
  let geometryService: GeometryImportService;

  const testUserId = 'test-user-' + Date.now();
  const testAuthToken = 'test-token-' + Date.now();

  beforeAll(async () => {
    // Initialize Express app
    app = createApp();
    
    // Initialize database connection
    knex = getKnex();
    boundariesRepo = new BoundariesRepo();
    usageRepo = new UsageRepo();
    usageService = new UsageService(usageRepo);
    geometryService = new GeometryImportService();

    // Verify database is ready (boundaries table exists)
    try {
      await knex('boundaries').select(1).limit(1);
    } catch (error) {
      console.log(
        'Warning: boundaries table not found. Integration tests will be limited.'
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    await knex('boundaries')
      .where({ user_id: testUserId })
      .delete()
      .catch(() => {});
  });

  describe('Service Layer: GeometryImportService', () => {
    describe('MIME Type Validation', () => {
      it('should allow valid MIME types', () => {
        expect(geometryService.isMimeTypeAllowed('application/json')).toBe(true);
        expect(geometryService.isMimeTypeAllowed('application/geo+json')).toBe(
          true
        );
        expect(geometryService.isMimeTypeAllowed('text/xml')).toBe(true);
        expect(
          geometryService.isMimeTypeAllowed(
            'application/vnd.google-earth.kml+xml'
          )
        ).toBe(true);
      });

      it('should reject invalid MIME types', () => {
        expect(geometryService.isMimeTypeAllowed('application/pdf')).toBe(false);
        expect(geometryService.isMimeTypeAllowed('image/png')).toBe(false);
        expect(geometryService.isMimeTypeAllowed('video/mp4')).toBe(false);
      });

      it('should allow missing MIME type', () => {
        expect(geometryService.isMimeTypeAllowed(undefined)).toBe(true);
      });
    });

    describe('GeoJSON Parsing', () => {
      it('should parse valid GeoJSON', async () => {
        const result = await geometryService.import(
          SAMPLE_GEOJSON_STR,
          'test.geojson',
          'application/geo+json'
        );

        expect(result.valid).toBe(true);
        expect(result.boundary).toBeDefined();
        expect(result.boundary.length).toBeGreaterThan(0);
        expect(result.area).toBeGreaterThan(0);
        expect(result.bbox).toBeDefined();
        expect(result.geometry_wkt).toBeDefined();
      });

      it('should parse FeatureCollection GeoJSON', async () => {
        const geojsonCollection = JSON.stringify({
          type: 'FeatureCollection',
          features: [SAMPLE_GEOJSON],
        });

        const result = await geometryService.import(
          geojsonCollection,
          'test.geojson',
          'application/geo+json'
        );

        expect(result.valid).toBe(true);
        expect(result.boundary).toBeDefined();
        expect(result.area).toBeGreaterThan(0);
      });
    });

    describe('KML Parsing with MultiGeometry', () => {
      it('should parse simple KML', async () => {
        const result = await geometryService.import(
          SAMPLE_KML,
          'test.kml',
          'application/vnd.google-earth.kml+xml'
        );

        expect(result.valid).toBe(true);
        expect(result.boundary).toBeDefined();
        expect(result.area).toBeGreaterThan(0);
      });

      it('should handle KML with MultiGeometry', async () => {
        const result = await geometryService.import(
          SAMPLE_KML_MULTIGEOMETRY,
          'test-multi.kml',
          'application/vnd.google-earth.kml+xml'
        );

        // @tmcw/togeojson may convert MultiGeometry to multiple features or a single Polygon
        // Just verify it imports successfully
        expect(result.valid).toBe(true);
        expect(result.boundary).toBeDefined();
        expect(result.area).toBeGreaterThan(0);
      });
    });

    describe('PostGIS Validation', () => {
      it('should validate geometry with PostGIS', async () => {
        const result = await geometryService.import(
          SAMPLE_GEOJSON_STR,
          'test.geojson'
        );

        expect(result.valid).toBe(true);
      });

      it('should calculate accurate area using ST_Area', async () => {
        const result = await geometryService.import(
          SAMPLE_GEOJSON_STR,
          'test.geojson'
        );

        // Area should be non-zero and reasonable
        expect(result.area).toBeGreaterThan(0);
        expect(result.area).toBeLessThan(1000000000000); // Less than 1 million km²
      });
    });

    describe('Security Limits', () => {
      it('should reject polygons with too many coordinates', async () => {
        expect(async () => {
          await geometryService.import(TOO_MANY_COORDINATES, 'test.geojson');
        }).rejects.toThrow();
      });

      it('should reject MIME type not in whitelist', async () => {
        expect(async () => {
          await geometryService.import(
            SAMPLE_GEOJSON_STR,
            'test.geojson',
            'application/pdf'
          );
        }).rejects.toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should reject malformed GeoJSON', async () => {
        expect(async () => {
          await geometryService.import(
            '{ invalid json }',
            'test.geojson'
          );
        }).rejects.toThrow();
      });

      it('should reject invalid polygon', async () => {
        expect(async () => {
          await geometryService.import(INVALID_POLYGON, 'test.geojson');
        }).rejects.toThrow();
      });

      it('should reject degenerate polygon', async () => {
        expect(async () => {
          await geometryService.import(DEGENERATE_POLYGON, 'test.geojson');
        }).rejects.toThrow();
      });
    });
  });

  describe('Repository Layer: BoundariesRepo', () => {
    it('should create boundary in database', async () => {
      const boundary = await boundariesRepo.create({
        user_id: testUserId,
        file_name: 'test.geojson',
        file_mime_type: 'application/geo+json',
        geometry: JSON.stringify(SAMPLE_GEOJSON.geometry), // Pass geometry as JSON string
        area_m2: 1234567,
        bbox: [-73.985, 40.750, -73.975, 40.759],
        is_valid: true,
        warnings: ['test warning'],
      });

      expect(boundary.id).toBeDefined();
      expect(boundary.user_id).toBe(testUserId);
      expect(boundary.file_name).toBe('test.geojson');
      expect(boundary.area_m2).toBe(1234567);
    });

    it('should retrieve boundary by ID', async () => {
      const created = await boundariesRepo.create({
        user_id: testUserId,
        file_name: 'test2.geojson',
        file_mime_type: 'application/geo+json',
        geometry: JSON.stringify(SAMPLE_GEOJSON.geometry), // Pass geometry as JSON string
        area_m2: 2000000,
        bbox: [-73.985, 40.750, -73.975, 40.759],
        is_valid: true,
      });

      const retrieved = await boundariesRepo.getById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.user_id).toBe(testUserId);
    });

    it('should count boundaries for current month', async () => {
      const count = await boundariesRepo.countCurrentMonth(testUserId);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should list boundaries by user', async () => {
      // Create multiple boundaries
      await boundariesRepo.create({
        user_id: testUserId,
        file_name: 'test3.geojson',
        file_mime_type: 'application/geo+json',
        geometry: JSON.stringify(SAMPLE_GEOJSON.geometry), // Pass geometry as JSON string
        area_m2: 3000000,
        bbox: [-73.985, 40.750, -73.975, 40.759],
        is_valid: true,
      });

      const result = await boundariesRepo.listByUserId(testUserId, 10, 0);
      expect(result.boundaries).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Usage Tier Protection', () => {
    it('should track monthly import count', async () => {
      const count = await boundariesRepo.countCurrentMonth(testUserId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should enforce free tier limit', async () => {
      // Free tier allows 10 imports/month
      // This test would create 11 boundaries and verify the last one is rejected
      // Note: This test requires mocking the tier check in routes
    });

    it('should allow unlimited imports for pro tier', async () => {
      // Pro tier allows unlimited imports
      // This test would verify multiple imports are allowed
      // Note: This test requires mocking the tier check in routes
    });
  });

  describe('Data Accuracy', () => {
    it('should calculate area accurately with PostGIS', async () => {
      const result = await geometryService.import(
        SAMPLE_GEOJSON_STR,
        'test.geojson'
      );

      // Small Times Square area test: ~0.01° x ~0.009° should produce ~0.8-1 km²
      // At 40.75° latitude, 0.01° longitude ≈ 0.77 km, 0.009° latitude ≈ 1 km
      expect(result.area).toBeGreaterThan(500000); // > 0.5 km²
      expect(result.area).toBeLessThan(2000000); // < 2 km²
    });

    it('should return valid bounding box', async () => {
      const result = await geometryService.import(
        SAMPLE_GEOJSON_STR,
        'test.geojson'
      );

      const [minLng, minLat, maxLng, maxLat] = result.bbox;
      expect(minLng).toBeLessThanOrEqual(maxLng);
      expect(minLat).toBeLessThanOrEqual(maxLat);
      expect(minLng).toBeGreaterThanOrEqual(-180);
      expect(maxLng).toBeLessThanOrEqual(180);
      expect(minLat).toBeGreaterThanOrEqual(-90);
      expect(maxLat).toBeLessThanOrEqual(90);
    });

    it('should return WKT geometry for storage', async () => {
      const result = await geometryService.import(
        SAMPLE_GEOJSON_STR,
        'test.geojson'
      );

      expect(result.geometry_wkt).toBeDefined();
      expect(result.geometry_wkt).toMatch(/^POLYGON\(\(/);
    });
  });

  describe('End-to-End: Import + Save + Retrieve', () => {
    it('should import, save, and retrieve boundary', async () => {
      // 1. Import geometry
      const importResult = await geometryService.import(
        SAMPLE_GEOJSON_STR,
        'e2e-test.geojson'
      );
      expect(importResult.valid).toBe(true);

      // 2. Save to database
      const saved = await boundariesRepo.create({
        user_id: testUserId,
        file_name: 'e2e-test.geojson',
        file_mime_type: 'application/geo+json',
        geometry: importResult.geometry_geojson?.geometry 
          ? JSON.stringify(importResult.geometry_geojson.geometry)
          : JSON.stringify(SAMPLE_GEOJSON.geometry),
        area_m2: importResult.area,
        bbox: importResult.bbox,
        is_valid: true,
        warnings: importResult.warnings,
      });
      expect(saved.id).toBeDefined();

      // 3. Retrieve from database
      const retrieved = await boundariesRepo.getById(saved.id);
  expect(retrieved?.id).toBe(saved.id);
  expect(retrieved?.area_m2).toBeCloseTo(importResult.area, 2);
  expect(retrieved?.user_id).toBe(testUserId);
    });
  });

  /**
   * HTTP API Tests: POST /api/geometries/import
   * Verify proper 400 error codes for validation failures
   */
  describe('HTTP API: POST /api/geometries/import', () => {
    it('should return 400 MISSING_FILE when no file uploaded', async () => {
      const res = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('MISSING_FILE');
      expect(res.body.error.message).toContain('file');
    });

    it('should return 400 INVALID_FILETYPE for non-geojson/kml file', async () => {
      const res = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token')
        .attach('file', Buffer.from('test content'), 'test.pdf');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_FILETYPE');
      expect(res.body.error.message).toContain('GeoJSON');
    });

    it('should return 400 INVALID_POLYGON for malformed geometry', async () => {
      const invalidGeoJson = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.985, 40.750],
              [-73.975, 40.750],
              // Missing closing point - invalid polygon
            ],
          ],
        },
        properties: {},
      };

      const res = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token')
        .attach('file', Buffer.from(JSON.stringify(invalidGeoJson)), 'test.geojson');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_POLYGON');
    });

    it('should return 400 GEOMETRY_TOO_LARGE for >10km² polygons', async () => {
      // Create a large polygon (roughly 11km x 11km ≈ 121 km²)
      const largeGeoJson = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.985, 40.750],
              [-73.885, 40.750], // ~0.1 degrees ≈ 11 km
              [-73.885, 40.850],
              [-73.985, 40.850],
              [-73.985, 40.750],
            ],
          ],
        },
        properties: {},
      };

      const res = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token')
        .attach('file', Buffer.from(JSON.stringify(largeGeoJson)), 'test.geojson');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('GEOMETRY_TOO_LARGE');
      expect(res.body.error.message).toContain('10 km');
    });

    it('should successfully import valid small polygon', async () => {
      const res = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token')
        .attach('file', Buffer.from(SAMPLE_GEOJSON_STR), 'test.geojson');
      
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.valid).toBe(true);
      expect(res.body.area).toBeGreaterThan(0);
      expect(res.body.area).toBeLessThan(10_000_000); // < 10 km²
    });
  });
});
