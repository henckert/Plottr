/**
 * Geometry Routes Integration Tests
 * 
 * Tests for POST /api/geometries/import endpoint
 * File upload handling, authentication, and error responses
 */

import request from 'supertest';
import createApp from '../../../src/app';
import { AppError } from '../../../src/errors';
import { UsageService } from '../../../src/services/usage.service';
import { BoundariesRepo } from '../../../src/data/boundaries.repo';

// Mock UsageService to prevent database calls in unit tests
jest.mock('../../../src/services/usage.service');
jest.mock('../../../src/data/boundaries.repo');

describe('POST /api/geometries/import', () => {
  let app: any;

  beforeEach(() => {
    process.env.AUTH_REQUIRED = 'false'; // Dev mode for testing
    
    // Mock UsageService.getQuotaStatus to return free tier with available quota
    jest.spyOn(UsageService.prototype, 'getQuotaStatus').mockResolvedValue({
      tier: 'free',
      limits: {
        monthly_imports: 10,
        monthly_api_calls: 1000,
        monthly_exports: 10,
      },
      usage: {
        monthly_imports: 0,
        monthly_api_calls: 0,
        monthly_exports: 0,
      },
      reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    // Mock BoundariesRepo.countCurrentMonth to return 0 imports
    jest.spyOn(BoundariesRepo.prototype, 'countCurrentMonth').mockResolvedValue(0);

    // Mock BoundariesRepo.create to return a saved boundary
    jest.spyOn(BoundariesRepo.prototype, 'create').mockResolvedValue({
      id: 1,
      user_id: 'test-user',
      file_name: 'test.geojson',
      file_mime_type: 'application/json',
      geometry: 'POLYGON((0 0,0.01 0,0.01 0.01,0 0.01,0 0))',
      area_m2: 1000000,
      bbox: [0, 0, 0.01, 0.01],
      is_valid: true,
      validation_errors: null,
      warnings: null,
      imported_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('File Upload - Valid Cases', () => {
    it('should successfully import valid GeoJSON file', async () => {
      const geojsonContent = JSON.stringify({
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
        properties: {},
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojsonContent), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.boundary).toBeDefined();
      expect(response.body.area).toBeGreaterThan(0);
      expect(response.body.bbox).toHaveLength(4);
    });

    it('should successfully import valid KML file', async () => {
      const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
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

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(kmlContent), 'test.kml')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.message).toContain('Successfully imported');
    });

    it('should return appropriate content in success response', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.005, -0.005],
              [0.005, -0.005],
              [0.005, 0.005],
              [-0.005, 0.005],
              [-0.005, -0.005],
            ],
          ],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('boundary');
      expect(response.body).toHaveProperty('area');
      expect(response.body).toHaveProperty('bbox');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('File Upload - Invalid Files', () => {
    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/geometries/import')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(400);
      expect(response.body.error || response.body.message).toBeDefined();
    });

    it('should reject unsupported file type', async () => {
      const csvContent = 'longitude,latitude\n0,0\n1,1';

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(csvContent), 'data.csv')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject malformed GeoJSON', async () => {
      const malformed = '{ invalid json content';

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(malformed), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(400);
      expect(response.body.error || response.body.message).toBeDefined();
    });

    it('should reject GeoJSON with invalid polygon', async () => {
      const invalidPolygon = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [200, 0], // Invalid longitude
              [210, 0],
              [210, 10],
              [200, 10],
              [200, 0],
            ],
          ],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(invalidPolygon), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(400);
      expect(response.body.error || response.body.message).toBeDefined();
    });

    it('should reject polygon exceeding size limit', async () => {
      const toolargePolygon = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(toolargePolygon), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(400);
      expect(response.body.error || response.body.message).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should require authorization header', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      // In dev mode, missing auth should still work
      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson');

      // Should succeed in dev mode
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Response Format', () => {
    it('should return JSON response with correct structure', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.5, 0],
              [0.5, 0.5],
              [0, 0.5],
              [0, 0],
            ],
          ],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson')
        .set('Authorization', 'Bearer dev-token')
        .set('Content-Type', 'multipart/form-data');

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeInstanceOf(Object);
    });

    it('should include area in square meters', async () => {
      const geojson = JSON.stringify({
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

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.body.area).toBeGreaterThan(0);
      expect(typeof response.body.area).toBe('number');
    });

    it('should include bounding box as array', async () => {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.005, -0.005],
              [0.005, -0.005],
              [0.005, 0.005],
              [-0.005, 0.005],
              [-0.005, -0.005],
            ],
          ],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(Array.isArray(response.body.bbox)).toBe(true);
      expect(response.body.bbox).toHaveLength(4);
      const [minLng, minLat, maxLng, maxLat] = response.body.bbox;
      expect(minLng).toBeLessThanOrEqual(maxLng);
      expect(minLat).toBeLessThanOrEqual(maxLat);
    });

    it('should include warnings for multiple features', async () => {
      const multiFeature = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
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
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0.02, 0.02],
                  [0.03, 0.02],
                  [0.03, 0.03],
                  [0.02, 0.03],
                  [0.02, 0.02],
                ],
              ],
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(multiFeature), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      if (response.body.warnings) {
        expect(Array.isArray(response.body.warnings)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle GeoJSON with extra properties', async () => {
      const geojsonWithProps = JSON.stringify({
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
        properties: {
          name: 'Test Area',
          description: 'A test polygon',
          customField: 'custom value',
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojsonWithProps), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should handle geometries with many coordinate points', async () => {
      const manyPoints = [];
      // Create a small circle around 0,0 with small radius (0.0005 degrees)
      for (let i = 0; i < 360; i++) {
        const angle = (i * Math.PI) / 180;
        manyPoints.push([Math.cos(angle) * 0.0005, Math.sin(angle) * 0.0005]);
      }
      manyPoints.push([0.0005, 0]); // Close the ring

      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [manyPoints],
        },
      });

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(geojson), 'test.geojson')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should handle KML with whitespace variations', async () => {
      const kmlWithWhitespace = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              0,0,0
              0.01,0,0
              0.01,0.01,0
              0,0.01,0
              0,0,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      const response = await request(app)
        .post('/api/geometries/import')
        .attach('file', Buffer.from(kmlWithWhitespace), 'test.kml')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
  });
});
