/**
 * Integration tests for Assets API
 * Tests CRUD operations with cursor pagination, version tokens, and geometry validation
 */

// Set test DB URL BEFORE importing getKnex to avoid module-load race
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import request from 'supertest';
import { getKnex } from '../../src/data/knex';
import createApp from '../../src/app';

describe('Assets API', () => {
  const knex = getKnex();
  const app = createApp();
  let authToken: string;
  let testClubId: number;
  let testSiteId: number;
  let testLayoutId: number;
  let testZoneId: number;

  beforeAll(async () => {
    // Run migrations and seeds
    await knex.migrate.latest();
    await knex.seed.run();

    // Create test user via /api/test/user endpoint (requires E2E=true)
    process.env.E2E = 'true';
    const userRes = await request(app)
      .post('/api/test/user')
      .send({
        clerkId: 'test-assets-user',
        email: 'assets@test.com',
        tier: 'free',
      });
    authToken = userRes.body.token;

    // Get test data from seeded data instead of creating new
    const sites = await knex('sites').select('id', 'club_id').whereNull('deleted_at').limit(1);
    if (sites.length > 0) {
      testSiteId = sites[0].id;
      testClubId = sites[0].club_id;
    } else {
      throw new Error('No test sites found in seed data');
    }

    // Create test layout for asset tests
    const [layout] = await knex('layouts').insert({
      site_id: testSiteId,
      name: 'Test Layout Assets',
      created_by: 'test-user',
    }).returning('id');
    testLayoutId = layout.id || layout;

    // Create test zone
    const [zone] = await knex('zones').insert({
      layout_id: testLayoutId,
      name: 'Test Zone',
      zone_type: 'pitch',
      boundary: knex.raw(`ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[0,0],[0,0.001],[0.001,0.001],[0.001,0],[0,0]]]}')`),
    }).returning('id');
    testZoneId = zone.id || zone;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('POST /api/assets', () => {
    it('should create asset with POINT geometry', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Test Goal',
          asset_type: 'goal',
          icon: 'fa-futbol',
          geometry: {
            type: 'Point',
            coordinates: [0.0005, 0.0005],
          },
          rotation_deg: 90,
          properties: { color: 'white' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        layout_id: testLayoutId,
        name: 'Test Goal',
        asset_type: 'goal',
        icon: 'fa-futbol',
        rotation_deg: 90,
        properties: { color: 'white' },
      });
      expect(res.body.data.geometry.type).toBe('Point');
      expect(res.body.data.version_token).toBeDefined();
    });

    it('should create asset with LINESTRING geometry', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Test Fence',
          asset_type: 'fence',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [0, 0.001],
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.geometry.type).toBe('LineString');
    });

    it('should create asset associated with zone', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          zone_id: testZoneId,
          name: 'Zone Bench',
          asset_type: 'bench',
          icon: 'fa-chair',
          geometry: {
            type: 'Point',
            coordinates: [0.0002, 0.0002],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.zone_id).toBe(testZoneId);
    });

    it('should reject invalid geometry type (Polygon)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Asset',
          asset_type: 'other',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });

    it('should reject out-of-bounds WGS84 coordinates', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Coords',
          asset_type: 'marker',
          geometry: {
            type: 'Point',
            coordinates: [200, 100], // Invalid lon/lat
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('outside WGS84 range');
    });

    it('should reject invalid asset_type', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Invalid Type',
          asset_type: 'invalid_type',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject zone from different layout', async () => {
      // Create another layout directly in DB
      const [layout2] = await knex('layouts').insert({
        site_id: testSiteId,
        name: 'Other Layout',
        created_by: 'test-user',
      }).returning('id');
      const layout2Id = layout2.id || layout2;

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: layout2Id,
          zone_id: testZoneId, // Zone belongs to testLayoutId
          name: 'Mismatched Zone',
          asset_type: 'marker',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('does not belong to');
    });
  });

  describe('GET /api/assets', () => {
    let asset1Id: number;
    let asset2Id: number;

    beforeAll(async () => {
      // Create test assets
      const res1 = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Asset 1',
          asset_type: 'goal',
          geometry: { type: 'Point', coordinates: [0, 0] },
        });
      asset1Id = res1.body.data.id;

      const res2 = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          zone_id: testZoneId,
          name: 'Asset 2',
          asset_type: 'bench',
          geometry: { type: 'Point', coordinates: [0.0001, 0.0001] },
        });
      asset2Id = res2.body.data.id;
    });

    it('should list all assets', async () => {
      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.has_more).toBeDefined();
    });

    it('should filter assets by layout_id', async () => {
      const res = await request(app)
        .get(`/api/assets?layout_id=${testLayoutId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((a: any) => a.layout_id === testLayoutId)).toBe(true);
    });

    it('should filter assets by zone_id', async () => {
      const res = await request(app)
        .get(`/api/assets?zone_id=${testZoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((a: any) => a.zone_id === testZoneId)).toBe(true);
    });

    it('should filter assets by asset_type', async () => {
      const res = await request(app)
        .get('/api/assets?asset_type=goal')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((a: any) => a.asset_type === 'goal')).toBe(true);
    });

    it('should support cursor pagination', async () => {
      const res1 = await request(app)
        .get('/api/assets?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.length).toBe(1);

      if (res1.body.next_cursor) {
        const res2 = await request(app)
          .get(`/api/assets?limit=1&cursor=${res1.body.next_cursor}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res2.status).toBe(200);
        expect(res2.body.data[0].id).not.toBe(res1.body.data[0].id);
      }
    });
  });

  describe('GET /api/assets/:id', () => {
    let assetId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Single Asset',
          asset_type: 'marker',
          geometry: { type: 'Point', coordinates: [0.0003, 0.0003] },
        });
      assetId = res.body.data.id;
    });

    it('should get single asset by ID', async () => {
      const res = await request(app)
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(assetId);
      expect(res.body.data.name).toBe('Single Asset');
    });

    it('should return 404 for non-existent asset', async () => {
      const res = await request(app)
        .get('/api/assets/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/assets/:id', () => {
    let assetId: number;
    let versionToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Update Test',
          asset_type: 'flag',
          geometry: { type: 'Point', coordinates: [0, 0] },
        });
      assetId = res.body.data.id;
      versionToken = res.body.data.version_token;
    });

    it('should update asset with valid version token', async () => {
      const res = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken)
        .send({
          name: 'Updated Name',
          icon: 'fa-flag',
          rotation_deg: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.icon).toBe('fa-flag');
      expect(res.body.data.rotation_deg).toBe(45);
      expect(res.body.data.version_token).not.toBe(versionToken); // New token
    });

    it('should update asset geometry', async () => {
      const res = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken)
        .send({
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [0.0001, 0.0001]],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.geometry.type).toBe('LineString');
    });

    it('should reject update without If-Match header', async () => {
      const res = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'No Version' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_IF_MATCH');
    });

    it('should reject update with stale version token', async () => {
      // Make first update to change version
      await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken)
        .send({ name: 'First Update' });

      // Try to update with old token
      const res = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken) // Stale token
        .send({ name: 'Second Update' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('version conflict');
    });

    it('should reject invalid geometry in update', async () => {
      const res = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken)
        .send({
          geometry: {
            type: 'Polygon', // Not allowed for assets
            coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
          },
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/assets/:id', () => {
    let assetId: number;
    let versionToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          layout_id: testLayoutId,
          name: 'Delete Test',
          asset_type: 'cone',
          geometry: { type: 'Point', coordinates: [0, 0] },
        });
      assetId = res.body.data.id;
      versionToken = res.body.data.version_token;
    });

    it('should delete asset with valid version token', async () => {
      const res = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken);

      expect(res.status).toBe(204);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should reject delete without If-Match header', async () => {
      const res = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_IF_MATCH');
    });

    it('should reject delete with stale version token', async () => {
      // Make an update to change version
      await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken)
        .send({ name: 'Updated Before Delete' });

      // Try to delete with old token
      const res = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', versionToken); // Stale

      expect(res.status).toBe(409);
    });
  });
});
