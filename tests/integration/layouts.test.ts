// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('Layouts API Integration Tests', () => {
  let testClubId: number;
  let testSiteId: number;
  let testLayoutId: number;
  let testVersionToken: string;

  beforeAll(async () => {
    // Run migrations and seeds programmatically
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();

    // Get a test club_id and site_id from seeded data
    const sites = await knex('sites').select('id', 'club_id').whereNull('deleted_at').limit(1);
    if (sites.length > 0) {
      testSiteId = sites[0].id;
      testClubId = sites[0].club_id;
    } else {
      // Create test data if none exist
      const [club] = await knex('clubs').insert({ name: 'Test Club' }).returning('id');
      testClubId = club.id;
      
      const [site] = await knex('sites').insert({
        club_id: testClubId,
        name: 'Test Site',
      }).returning('id');
      testSiteId = site.id;
    }

    // Create a test layout for update/delete tests
    const [layout] = await knex('layouts').insert({
      site_id: testSiteId,
      name: 'Test Layout',
      created_by: 'test-user',
    }).returning(['id', 'version_token']);
    testLayoutId = layout.id;
    testVersionToken = layout.version_token;
  });

  afterAll(async () => {
    // Close knex pool
    await destroyKnex();
  });

  describe('GET /api/layouts', () => {
    test('returns layouts with pagination structure', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}&club_id=${testClubId}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('has_more');
      expect(typeof res.body.has_more).toBe('boolean');
    });

    test('returns 400 when site_id is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts?club_id=${testClubId}`)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('MISSING_SITE_ID');
    });

    test('defaults to club_id=1 when club_id is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      // In dev mode, missing club_id defaults to 1
    });

    test('returns 403 when site does not belong to club', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const wrongClubId = testClubId + 9999;

      const res = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}&club_id=${wrongClubId}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('respects limit parameter', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Create additional test layouts
      const knex = getKnex();
      await knex('layouts').insert([
        { site_id: testSiteId, name: 'Layout 1', created_by: 'test-user' },
        { site_id: testSiteId, name: 'Layout 2', created_by: 'test-user' },
        { site_id: testSiteId, name: 'Layout 3', created_by: 'test-user' },
      ]);

      const res = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}&club_id=${testClubId}&limit=2`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    test('returns next_cursor when has_more is true', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}&club_id=${testClubId}&limit=1`)
        .expect(200);

      if (res.body.has_more) {
        expect(res.body).toHaveProperty('next_cursor');
        expect(typeof res.body.next_cursor).toBe('string');
      }
    });

    test('cursor pagination works correctly', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // First page
      const firstPage = await request(app)
        .get(`/api/layouts?site_id=${testSiteId}&club_id=${testClubId}&limit=2`)
        .expect(200);

      expect(firstPage.body).toHaveProperty('data');
      expect(firstPage.body).toHaveProperty('has_more');

      // If there's a next page, fetch it
      if (firstPage.body.next_cursor) {
        const secondPage = await request(app)
          .get(`/api/layouts?site_id=${testSiteId}&club_id=${testClubId}&limit=2&cursor=${firstPage.body.next_cursor}`)
          .expect(200);

        expect(secondPage.body).toHaveProperty('data');
        // Ensure different results
        if (firstPage.body.data.length > 0 && secondPage.body.data.length > 0) {
          expect(firstPage.body.data[0].id).not.toBe(secondPage.body.data[0].id);
        }
      }
    });
  });

  describe('GET /api/layouts/:id', () => {
    test('returns single layout by ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts/${testLayoutId}?club_id=${testClubId}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(testLayoutId);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('site_id');
      expect(res.body.data).toHaveProperty('version_token');
    });

    test('returns 404 for non-existent layout', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const nonExistentId = 999999;

      const res = await request(app)
        .get(`/api/layouts/${nonExistentId}?club_id=${testClubId}`)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('LAYOUT_NOT_FOUND');
    });

    test('returns 400 for invalid layout ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get(`/api/layouts/invalid-id?club_id=${testClubId}`)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('INVALID_ID');
    });

    test('returns 403 when layout site does not belong to club', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const wrongClubId = testClubId + 9999;

      const res = await request(app)
        .get(`/api/layouts/${testLayoutId}?club_id=${wrongClubId}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/layouts', () => {
    test('creates layout with 201 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const layoutData = {
        site_id: testSiteId,
        name: 'New Test Layout',
        description: 'A test layout description',
        is_published: false,
      };

      const res = await request(app)
        .post(`/api/layouts?club_id=${testClubId}`)
        .send(layoutData)
        .expect(201);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(layoutData.name);
      expect(res.body.data.description).toBe(layoutData.description);
      expect(res.body.data.is_published).toBe(false);
      expect(res.body.data).toHaveProperty('version_token');
      expect(res.body.data).toHaveProperty('created_by');
    });

    test('returns 400 when site_id is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const layoutData = {
        name: 'Layout without site',
      };

      const res = await request(app)
        .post(`/api/layouts?club_id=${testClubId}`)
        .send(layoutData)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 when name is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const layoutData = {
        site_id: testSiteId,
      };

      const res = await request(app)
        .post(`/api/layouts?club_id=${testClubId}`)
        .send(layoutData)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 404 when site does not exist', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const nonExistentSiteId = 999999;
      const layoutData = {
        site_id: nonExistentSiteId,
        name: 'Layout for non-existent site',
      };

      const res = await request(app)
        .post(`/api/layouts?club_id=${testClubId}`)
        .send(layoutData)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('SITE_NOT_FOUND');
    });

    test('returns 403 when site does not belong to club', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const wrongClubId = testClubId + 9999;
      const layoutData = {
        site_id: testSiteId,
        name: 'Unauthorized layout',
      };

      const res = await request(app)
        .post(`/api/layouts?club_id=${wrongClubId}`)
        .send(layoutData)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/layouts/:id', () => {
    let updateTestLayoutId: number;
    let updateTestVersionToken: string;

    beforeEach(async () => {
      // Create a fresh layout for each update test
      const knex = getKnex();
      const [layout] = await knex('layouts').insert({
        site_id: testSiteId,
        name: 'Layout to Update',
        created_by: 'test-user',
      }).returning(['id', 'version_token']);
      updateTestLayoutId = layout.id;
      updateTestVersionToken = layout.version_token;
    });

    test('updates layout with 200 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const updateData = {
        name: 'Updated Layout Name',
        description: 'Updated description',
        is_published: true,
      };

      const res = await request(app)
        .put(`/api/layouts/${updateTestLayoutId}?club_id=${testClubId}`)
        .set('If-Match', updateTestVersionToken)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.description).toBe(updateData.description);
      expect(res.body.data.is_published).toBe(true);
      // Version token should have changed
      expect(res.body.data.version_token).not.toBe(updateTestVersionToken);
    });

    test('returns 400 when If-Match header is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const updateData = {
        name: 'Updated Name',
      };

      const res = await request(app)
        .put(`/api/layouts/${updateTestLayoutId}?club_id=${testClubId}`)
        .send(updateData)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('MISSING_IF_MATCH');
    });

    test('returns 409 for stale version_token', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const staleToken = '00000000-0000-0000-0000-000000000000';
      const updateData = {
        name: 'This should fail',
      };

      const res = await request(app)
        .put(`/api/layouts/${updateTestLayoutId}?club_id=${testClubId}`)
        .set('If-Match', staleToken)
        .send(updateData)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });

    test('returns 404 for non-existent layout', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const nonExistentId = 999999;
      const updateData = {
        name: 'Updated Name',
      };

      const res = await request(app)
        .put(`/api/layouts/${nonExistentId}?club_id=${testClubId}`)
        .set('If-Match', updateTestVersionToken)
        .send(updateData)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('LAYOUT_NOT_FOUND');
    });

    test('returns 403 when layout site does not belong to club', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const wrongClubId = testClubId + 9999;
      const updateData = {
        name: 'Unauthorized update',
      };

      const res = await request(app)
        .put(`/api/layouts/${updateTestLayoutId}?club_id=${wrongClubId}`)
        .set('If-Match', updateTestVersionToken)
        .send(updateData)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/layouts/:id', () => {
    let deleteTestLayoutId: number;
    let deleteTestVersionToken: string;

    beforeEach(async () => {
      // Create a fresh layout for each delete test
      const knex = getKnex();
      const [layout] = await knex('layouts').insert({
        site_id: testSiteId,
        name: 'Layout to Delete',
        created_by: 'test-user',
      }).returning(['id', 'version_token']);
      deleteTestLayoutId = layout.id;
      deleteTestVersionToken = layout.version_token;
    });

    test('deletes layout with 204 status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      await request(app)
        .delete(`/api/layouts/${deleteTestLayoutId}?club_id=${testClubId}`)
        .set('If-Match', deleteTestVersionToken)
        .expect(204);

      // Verify layout is deleted
      const knex = getKnex();
      const deleted = await knex('layouts').where({ id: deleteTestLayoutId }).first();
      expect(deleted).toBeUndefined();
    });

    test('returns 400 when If-Match header is missing', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .delete(`/api/layouts/${deleteTestLayoutId}?club_id=${testClubId}`)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('MISSING_IF_MATCH');
    });

    test('returns 409 for stale version_token', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const staleToken = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/layouts/${deleteTestLayoutId}?club_id=${testClubId}`)
        .set('If-Match', staleToken)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });

    test('returns 404 for non-existent layout', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const nonExistentId = 999999;

      const res = await request(app)
        .delete(`/api/layouts/${nonExistentId}?club_id=${testClubId}`)
        .set('If-Match', deleteTestVersionToken)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('LAYOUT_NOT_FOUND');
    });

    test('returns 403 when layout site does not belong to club', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const wrongClubId = testClubId + 9999;

      const res = await request(app)
        .delete(`/api/layouts/${deleteTestLayoutId}?club_id=${wrongClubId}`)
        .set('If-Match', deleteTestVersionToken)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
