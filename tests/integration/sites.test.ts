// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('Sites API Integration Tests', () => {
  let testClubId: number;

  beforeAll(async () => {
    // Run migrations and seeds programmatically
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();

    // Get a test club_id from seeded data (use venues table)
    const venues = await knex('venues').select('club_id').limit(1);
    if (venues.length > 0) {
      testClubId = venues[0].club_id;
    } else {
      // Create a test club if none exist
      const [club] = await knex('clubs').insert({ name: 'Test Club' }).returning('id');
      testClubId = club.id;
    }
  });

  afterAll(async () => {
    // Close knex pool
    await destroyKnex();
  });

  describe('GET /api/sites', () => {
    test('returns sites with pagination structure', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/sites?club_id=${testClubId}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('has_more');
      expect(typeof res.body.has_more).toBe('boolean');
    });

    test('returns 400 when club_id is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/sites')
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('MISSING_CLUB_ID');
    });

    test('respects limit parameter', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create a few test sites first
      const knex = getKnex();
      await knex('sites').insert([
        { club_id: testClubId, name: 'Site 1' },
        { club_id: testClubId, name: 'Site 2' },
        { club_id: testClubId, name: 'Site 3' },
      ]);

      const res = await request(app)
        .get(`/api/sites?club_id=${testClubId}&limit=2`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    test('returns next_cursor when has_more is true', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Ensure we have more than limit sites
      const knex = getKnex();
      await knex('sites').insert([
        { club_id: testClubId, name: 'Pagination Site 1' },
        { club_id: testClubId, name: 'Pagination Site 2' },
        { club_id: testClubId, name: 'Pagination Site 3' },
      ]);

      const res = await request(app)
        .get(`/api/sites?club_id=${testClubId}&limit=1`)
        .expect(200);

      if (res.body.has_more) {
        expect(res.body.next_cursor).toBeDefined();
        expect(typeof res.body.next_cursor).toBe('string');
      }
    });
  });

  describe('GET /api/sites/:id', () => {
    test('returns single site by ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create a test site
      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Test Site for GET' })
        .returning('*');

      const res = await request(app)
        .get(`/api/sites/${site.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(site.id);
      expect(res.body.data.name).toBe('Test Site for GET');
      expect(res.body.data).toHaveProperty('version_token');
      expect(res.body.data).toHaveProperty('created_at');
      expect(res.body.data).toHaveProperty('updated_at');
    });

    test('returns 404 for non-existent site', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/sites/99999')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for invalid site ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/sites/invalid-id')
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('INVALID_ID');
    });
  });

  describe('POST /api/sites', () => {
    test('creates site with 201 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: `New Site ${timestamp}`,
          address: '123 Main St',
          city: 'Dublin',
          country: 'Ireland',
        })
        .expect(201);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(`New Site ${timestamp}`);
      expect(res.body.data.club_id).toBe(testClubId);
      expect(res.body.data).toHaveProperty('version_token');
      expect(typeof res.body.data.created_at).toBe('string');
      expect(typeof res.body.data.updated_at).toBe('string');
    });

    test('creates site with manual GeoJSON location', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: 'Site with Manual Location',
          location: {
            type: 'Point',
            coordinates: [-6.3294, 53.3562], // Dublin
          },
        })
        .expect(201);

      expect(res.body.data.location).toEqual({
        type: 'Point',
        coordinates: [-6.3294, 53.3562],
      });
    });

    test('creates site with bbox polygon', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: 'Site with Bbox',
          bbox: {
            type: 'Polygon',
            coordinates: [
              [
                [-6.33, 53.35],
                [-6.32, 53.35],
                [-6.32, 53.36],
                [-6.33, 53.36],
                [-6.33, 53.35], // Closed ring
              ],
            ],
          },
        })
        .expect(201);

      expect(res.body.data.bbox).toBeDefined();
      expect(res.body.data.bbox.type).toBe('Polygon');
    });

    test('returns 400 when club_id is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          name: 'Site without Club',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    test('returns 400 when name is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for invalid GeoJSON Point (longitude out of range)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: 'Invalid Location Site',
          location: {
            type: 'Point',
            coordinates: [-200, 53.35], // Invalid longitude
          },
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for invalid GeoJSON Polygon (not closed)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: 'Invalid Bbox Site',
          bbox: {
            type: 'Polygon',
            coordinates: [
              [
                [-6.33, 53.35],
                [-6.32, 53.35],
                [-6.32, 53.36],
                // Missing closing point
              ],
            ],
          },
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/sites/:id', () => {
    test('updates site with 200 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create a site first
      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site to Update' })
        .returning('*');

      const res = await request(app)
        .put(`/api/sites/${site.id}`)
        .set('If-Match', site.version_token)
        .send({
          name: 'Updated Site Name',
          city: 'New City',
        })
        .expect(200);

      expect(res.body.data.id).toBe(site.id);
      expect(res.body.data.name).toBe('Updated Site Name');
      expect(res.body.data.city).toBe('New City');
      // Version token should change
      expect(res.body.data.version_token).not.toBe(site.version_token);
    });

    test('returns 400 when If-Match header is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site for Missing Header Test' })
        .returning('*');

      const res = await request(app)
        .put(`/api/sites/${site.id}`)
        .send({
          name: 'Updated Name',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('MISSING_IF_MATCH');
    });

    test('returns 409 for stale version_token', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site for Version Conflict' })
        .returning('*');

      const res = await request(app)
        .put(`/api/sites/${site.id}`)
        .set('If-Match', 'stale-version-token-uuid')
        .send({
          name: 'Updated Name',
        })
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });

    test('returns 404 for non-existent site', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .put('/api/sites/99999')
        .set('If-Match', 'any-token')
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    test('validates bbox on update', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site for Bbox Update' })
        .returning('*');

      const res = await request(app)
        .put(`/api/sites/${site.id}`)
        .set('If-Match', site.version_token)
        .send({
          bbox: {
            type: 'Polygon',
            coordinates: [
              [
                [-6.33, 53.35],
                [-6.32, 53.35],
                // Invalid: not enough points
              ],
            ],
          },
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/sites/:id', () => {
    test('soft deletes site with 204 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create a site to delete
      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site to Delete' })
        .returning('*');

      const res = await request(app)
        .delete(`/api/sites/${site.id}`)
        .set('If-Match', site.version_token)
        .expect(204);

      expect(res.body).toEqual({});

      // Verify soft delete (deleted_at should be set)
      const deleted = await knex('sites').where('id', site.id).first();
      expect(deleted.deleted_at).not.toBeNull();
    });

    test('returns 400 when If-Match header is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site for Delete Missing Header' })
        .returning('*');

      const res = await request(app)
        .delete(`/api/sites/${site.id}`)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('MISSING_IF_MATCH');
    });

    test('returns 409 for stale version_token', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const knex = getKnex();
      const [site] = await knex('sites')
        .insert({ club_id: testClubId, name: 'Site for Delete Version Conflict' })
        .returning('*');

      const res = await request(app)
        .delete(`/api/sites/${site.id}`)
        .set('If-Match', 'stale-version-token')
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });

    test('returns 404 for non-existent site', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .delete('/api/sites/99999')
        .set('If-Match', 'any-token')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Pagination', () => {
    test('cursor pagination works correctly', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create multiple sites for pagination
      const knex = getKnex();
      await knex('sites').insert([
        { club_id: testClubId, name: 'Cursor Test Site 1' },
        { club_id: testClubId, name: 'Cursor Test Site 2' },
        { club_id: testClubId, name: 'Cursor Test Site 3' },
      ]);

      // Fetch first page
      const firstPage = await request(app)
        .get(`/api/sites?club_id=${testClubId}&limit=2`)
        .expect(200);

      expect(firstPage.body.data.length).toBeLessThanOrEqual(2);

      // If there's a next page, fetch it
      if (firstPage.body.next_cursor) {
        const secondPage = await request(app)
          .get(`/api/sites?club_id=${testClubId}&limit=2&cursor=${firstPage.body.next_cursor}`)
          .expect(200);

        expect(secondPage.body).toHaveProperty('data');
        // Ensure different results
        const firstIds = firstPage.body.data.map((s: any) => s.id);
        const secondIds = secondPage.body.data.map((s: any) => s.id);
        expect(firstIds).not.toEqual(secondIds);
      }
    });
  });
});
