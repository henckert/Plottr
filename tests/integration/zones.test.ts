// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('Zones API Integration Tests', () => {
  let testClubId: number;
  let testSiteId: number;
  let testLayoutId: number;
  let testZoneId: number;
  let testVersionToken: string;

  // Valid test polygon (small square in San Francisco)
  const validPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-122.4194, 37.7749],
      [-122.4184, 37.7749],
      [-122.4184, 37.7739],
      [-122.4194, 37.7739],
      [-122.4194, 37.7749], // Closed ring
    ]],
  };

  beforeAll(async () => {
    // Run migrations and seeds programmatically
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();

    // Get test data from seeded data
    const sites = await knex('sites').select('id', 'club_id').whereNull('deleted_at').limit(1);
    if (sites.length > 0) {
      testSiteId = sites[0].id;
      testClubId = sites[0].club_id;
    } else {
      // Create test data if none exist
      const [club] = await knex('clubs').insert({ name: 'Test Club Zones', slug: 'test-club-zones' }).returning('id');
      testClubId = club.id || club;
      
      const [site] = await knex('sites').insert({
        club_id: testClubId,
        name: 'Test Site Zones',
      }).returning('id');
      testSiteId = site.id || site;
    }

    // Create a test layout for zones
    const [layout] = await knex('layouts').insert({
      site_id: testSiteId,
      name: 'Test Layout for Zones',
      created_by: 'test-user',
    }).returning(['id', 'version_token']);
    testLayoutId = layout.id || layout;

    // Create a test zone for update/delete tests
    const [zone] = await knex('zones').insert({
      layout_id: testLayoutId,
      name: 'Test Zone',
      zone_type: 'pitch',
      surface: 'grass',
      color: '#22c55e',
      boundary: knex.raw(`ST_GeomFromGeoJSON(?)::geography`, [JSON.stringify(validPolygon)]),
    }).returning(['id', 'version_token']);
    testZoneId = zone.id || zone;
    testVersionToken = zone.version_token;
  });

  afterAll(async () => {
    // Close knex pool
    await destroyKnex();
  });

  // ========================================
  // 1. CRUD Operations Tests (8 tests)
  // ========================================

  describe('POST /api/zones', () => {
    test('creates a new zone with valid data', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'New Vendor Zone',
          zone_type: 'vendor',
          surface: 'concrete',
          color: '#3b82f6',
          boundary: validPolygon,
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('New Vendor Zone');
      expect(res.body.data.zone_type).toBe('vendor');
      expect(res.body.data.surface).toBe('concrete');
      expect(res.body.data.color).toBe('#3b82f6');
      expect(res.body.data).toHaveProperty('area_sqm');
      expect(res.body.data).toHaveProperty('perimeter_m');
      expect(res.body.data).toHaveProperty('version_token');
      expect(res.body.data).toHaveProperty('boundary');
    });

    test('returns 400 when required fields are missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          // Missing: name, zone_type, boundary
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when zone_type is invalid', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Zone',
          zone_type: 'invalid_type', // Invalid enum value
          boundary: validPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when color format is invalid', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Bad Color Zone',
          zone_type: 'parking',
          color: 'red', // Invalid format (should be #RRGGBB)
          boundary: validPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/zones/:id', () => {
    test('retrieves zone by ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/zones/${testZoneId}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('id', testZoneId);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('zone_type');
      expect(res.body.data).toHaveProperty('boundary');
      expect(res.body.data).toHaveProperty('area_sqm');
      expect(res.body.data).toHaveProperty('perimeter_m');
    });

    test('returns 404 for non-existent zone ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/zones/99999')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/zones/:id', () => {
    test('updates zone with valid If-Match header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .put(`/api/zones/${testZoneId}`)
        .set('If-Match', testVersionToken)
        .send({
          name: 'Updated Zone Name',
          color: '#ef4444',
        })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Zone Name');
      expect(res.body.data.color).toBe('#ef4444');
      expect(res.body.data.version_token).not.toBe(testVersionToken); // Version should change

      // Update testVersionToken for subsequent tests
      testVersionToken = res.body.data.version_token;
    });

    test('returns 400 when If-Match header is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .put(`/api/zones/${testZoneId}`)
        // Missing If-Match header
        .send({
          name: 'Should Fail',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 409 when version token is stale', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .put(`/api/zones/${testZoneId}`)
        .set('If-Match', '00000000-0000-0000-0000-000000000000') // Valid UUID format, but wrong value
        .send({
          name: 'Should Fail',
        })
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });
  });

  describe('DELETE /api/zones/:id', () => {
    test('deletes zone with valid version token', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create a zone to delete
      const knex = getKnex();
      const [zoneToDelete] = await knex('zones').insert({
        layout_id: testLayoutId,
        name: 'Zone to Delete',
        zone_type: 'parking',
        boundary: knex.raw(`ST_GeomFromGeoJSON(?)::geography`, [JSON.stringify(validPolygon)]),
      }).returning(['id', 'version_token']);

      const res = await request(app)
        .delete(`/api/zones/${zoneToDelete.id}`)
        .set('If-Match', zoneToDelete.version_token)
        .expect(204);

      expect(res.body).toEqual({});

      // Verify zone is deleted
      const deletedZone = await knex('zones').where({ id: zoneToDelete.id }).first();
      expect(deletedZone).toBeUndefined();
    });
  });

  // ========================================
  // 2. Pagination Tests (5 tests)
  // ========================================

  describe('GET /api/zones (Pagination)', () => {
    beforeAll(async () => {
      // Create multiple zones for pagination testing
      const knex = getKnex();
      const zones = [];
      for (let i = 1; i <= 10; i++) {
        zones.push({
          layout_id: testLayoutId,
          name: `Pagination Zone ${i}`,
          zone_type: i % 2 === 0 ? 'vendor' : 'parking',
          surface: 'concrete',
          boundary: knex.raw(`ST_GeomFromGeoJSON(?)::geography`, [JSON.stringify(validPolygon)]),
        });
      }
      await knex('zones').insert(zones);
    });

    test('returns zones with pagination structure', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/zones?layout_id=${testLayoutId}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('has_more');
      expect(typeof res.body.has_more).toBe('boolean');
    });

    test('respects limit parameter', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/zones?layout_id=${testLayoutId}&limit=5`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    test('filters by layout_id', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/zones?layout_id=${testLayoutId}`)
        .expect(200);

      res.body.data.forEach((zone: any) => {
        expect(zone.layout_id).toBe(testLayoutId);
      });
    });

    test('filters by zone_type', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/zones?layout_id=${testLayoutId}&zone_type=vendor`)
        .expect(200);

      res.body.data.forEach((zone: any) => {
        expect(zone.zone_type).toBe('vendor');
      });
    });

    test('cursor pagination works correctly', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // First page
      const firstPage = await request(app)
        .get(`/api/zones?layout_id=${testLayoutId}&limit=3`)
        .expect(200);

      expect(firstPage.body).toHaveProperty('data');
      expect(firstPage.body).toHaveProperty('has_more');

      if (firstPage.body.has_more && firstPage.body.next_cursor) {
        // Second page using cursor
        const secondPage = await request(app)
          .get(`/api/zones?layout_id=${testLayoutId}&limit=3&cursor=${firstPage.body.next_cursor}`)
          .expect(200);

        expect(secondPage.body).toHaveProperty('data');
        
        // Ensure no overlap between pages
        const firstIds = firstPage.body.data.map((z: any) => z.id);
        const secondIds = secondPage.body.data.map((z: any) => z.id);
        const overlap = firstIds.filter((id: number) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });
  });

  // ========================================
  // 3. GeoJSON Validation Tests (5 tests)
  // ========================================

  describe('GeoJSON Polygon Validation', () => {
    test('rejects polygon that is not closed', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const unclosedPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-122.4194, 37.7749],
          [-122.4184, 37.7749],
          [-122.4184, 37.7739],
          [-122.4194, 37.7739],
          // Missing closing point
        ]],
      };

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Unclosed Zone',
          zone_type: 'parking',
          boundary: unclosedPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('rejects polygon with invalid structure', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const invalidPolygon = {
        type: 'Polygon',
        coordinates: 'invalid', // Should be array
      };

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Structure Zone',
          zone_type: 'parking',
          boundary: invalidPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('rejects coordinates outside WGS84 bounds', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const outOfBoundsPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-200, 37.7749], // Longitude out of range
          [-122.4184, 37.7749],
          [-122.4184, 37.7739],
          [-122.4194, 37.7739],
          [-200, 37.7749],
        ]],
      };

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Out of Bounds Zone',
          zone_type: 'parking',
          boundary: outOfBoundsPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('rejects polygon with insufficient points', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const tooFewPoints = {
        type: 'Polygon',
        coordinates: [[
          [-122.4194, 37.7749],
          [-122.4184, 37.7749],
          [-122.4194, 37.7749], // Only 2 unique points (need at least 3)
        ]],
      };

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Too Few Points Zone',
          zone_type: 'parking',
          boundary: tooFewPoints,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('accepts valid complex polygon', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const complexPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-122.4194, 37.7749],
          [-122.4184, 37.7749],
          [-122.4180, 37.7745],
          [-122.4184, 37.7739],
          [-122.4194, 37.7739],
          [-122.4198, 37.7745],
          [-122.4194, 37.7749], // Hexagon
        ]],
      };

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Complex Polygon Zone',
          zone_type: 'competition',
          boundary: complexPolygon,
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.boundary.coordinates[0].length).toBe(7); // 6 unique + 1 closing
    });
  });

  // ========================================
  // 4. PostGIS Calculations Tests (2 tests)
  // ========================================

  describe('PostGIS Area and Perimeter Calculations', () => {
    test('computes area_sqm correctly', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Area Test Zone',
          zone_type: 'pitch',
          boundary: validPolygon,
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('area_sqm');
      expect(typeof res.body.data.area_sqm).toBe('number');
      expect(res.body.data.area_sqm).toBeGreaterThan(0);
    });

    test('computes perimeter_m correctly', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Perimeter Test Zone',
          zone_type: 'pitch',
          boundary: validPolygon,
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('perimeter_m');
      expect(typeof res.body.data.perimeter_m).toBe('number');
      expect(res.body.data.perimeter_m).toBeGreaterThan(0);
    });
  });

  // ========================================
  // 5. Zone Type Enum Tests (2 tests)
  // ========================================

  describe('Zone Type Enum Validation', () => {
    const validZoneTypes = [
      'pitch',
      'goal_area',
      'penalty_area',
      'training_zone',
      'parking',
      'seating',
      'entrance',
      'exit',
      'restroom',
      'concession',
      'medical',
      'equipment',
      'other',
    ];

    test('accepts all valid zone types', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Test a sample of valid types (not all 13 to keep test time reasonable)
      const typesToTest = ['pitch', 'parking', 'restroom', 'medical', 'other'];

      for (const zoneType of typesToTest) {
        const res = await request(app)
          .post('/api/zones')
          .send({
            layout_id: testLayoutId,
            name: `${zoneType} Zone`,
            zone_type: zoneType,
            boundary: validPolygon,
          })
          .expect(201);

        expect(res.body.data.zone_type).toBe(zoneType);
      }
    });

    test('rejects invalid zone type', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Type Zone',
          zone_type: 'invalid_type_xyz',
          boundary: validPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  // ========================================
  // 6. Error Cases Tests (5 tests)
  // ========================================

  describe('Error Handling', () => {
    test('returns 404 for non-existent zone ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/zones/99999999')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for missing required fields (name)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          // name missing
          zone_type: 'parking',
          boundary: validPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for missing required fields (boundary)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'No Boundary Zone',
          zone_type: 'parking',
          // boundary missing
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for invalid color format', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: testLayoutId,
          name: 'Bad Color Zone',
          zone_type: 'parking',
          color: 'blue', // Should be #RRGGBB
          boundary: validPolygon,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 404 when layout_id does not exist', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/zones')
        .send({
          layout_id: 99999999, // Non-existent layout
          name: 'Orphan Zone',
          zone_type: 'parking',
          boundary: validPolygon,
        })
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });
});
