// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('share-links integration', () => {
  let layoutId: number;
  let shareSlug: string;
  let shareLinkId: number;

  beforeAll(async () => {
    // Run migrations and seeds programmatically to reuse the same Knex instance
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();

    // Get a valid layout ID from the database for testing
    const layouts = await knex('layouts').select('id').limit(1);
    if (layouts.length === 0) {
      throw new Error('No layouts found in test database - ensure seeds have run');
    }
    layoutId = layouts[0].id;
  });

  afterAll(async () => {
    // Close knex pool
    await destroyKnex();
  });

  test('POST /api/share-links creates a new share link', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: layoutId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('slug');
    expect(res.body.data.layout_id).toBe(layoutId);
    expect(res.body.data.view_count).toBe(0);
    expect(res.body.data.expires_at).toBeNull();

    // Save for later tests
    shareSlug = res.body.data.slug;
    shareLinkId = res.body.data.id;
  });

  test('POST /api/share-links creates share link with expiration', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    const res = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: layoutId,
        expires_at: futureDate.toISOString(),
      })
      .expect(201);

    expect(res.body.data.expires_at).toBeTruthy();
    expect(new Date(res.body.data.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  test('POST /api/share-links rejects past expiration date', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const res = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: layoutId,
        expires_at: pastDate.toISOString(),
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/share-links rejects invalid layout ID', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: 999999, // Non-existent layout
      })
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/share-links returns share links for layout', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app)
      .get('/api/share-links')
      .query({ layout_id: layoutId })
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Check that all returned links belong to the layout
    res.body.data.forEach((link: any) => {
      expect(link.layout_id).toBe(layoutId);
    });
  });

  test('GET /api/share-links/:id returns single share link', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app).get(`/api/share-links/${shareLinkId}`).expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(shareLinkId);
    expect(res.body.data.slug).toBe(shareSlug);
    expect(res.body.data.layout_id).toBe(layoutId);
  });

  test('GET /api/share-links/:id returns 404 for invalid ID', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app).get('/api/share-links/999999').expect(404);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /share/:slug returns public layout view', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app).get(`/share/${shareSlug}`).expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('layout');
    expect(res.body.data).toHaveProperty('zones');
    expect(res.body.data).toHaveProperty('assets');
    expect(res.body.data).toHaveProperty('share_link');

    // Verify layout data
    expect(res.body.data.layout.id).toBe(layoutId);
    expect(res.body.data.layout).toHaveProperty('name');

    // Verify share link metadata
    expect(res.body.data.share_link).toHaveProperty('view_count');
    expect(res.body.data.share_link).toHaveProperty('created_at');
  });

  test('GET /share/:slug increments view count', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    // Get initial view count
    const res1 = await request(app).get(`/share/${shareSlug}`).expect(200);
    const initialViewCount = res1.body.data.share_link.view_count;

    // Access again
    const res2 = await request(app).get(`/share/${shareSlug}`).expect(200);
    const newViewCount = res2.body.data.share_link.view_count;

    // View count should have incremented
    expect(newViewCount).toBe(initialViewCount + 1);
  });

  test('GET /share/:slug updates last_accessed_at', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    // Get initial timestamp
    const res1 = await request(app).get(`/share/${shareSlug}`).expect(200);
    const initialTimestamp = res1.body.data.share_link.last_accessed_at;

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Access again
    const res2 = await request(app).get(`/share/${shareSlug}`).expect(200);
    const newTimestamp = res2.body.data.share_link.last_accessed_at;

    // Timestamp should have updated
    expect(new Date(newTimestamp).getTime()).toBeGreaterThan(
      new Date(initialTimestamp).getTime()
    );
  });

  test('GET /share/:slug returns 404 for invalid slug', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app).get('/share/invalid-slug-123').expect(404);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /share/:slug returns 404 for expired link', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    // Create a share link that's already expired
    const pastDate = new Date();
    pastDate.setSeconds(pastDate.getSeconds() - 1); // 1 second ago

    const createRes = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: layoutId,
        expires_at: pastDate.toISOString(),
      })
      .expect(400); // Should reject past dates

    // The above should fail validation, so let's create one with future date
    // and manually update it to expired in the database
    const knex = getKnex();
    const expiredSlug = 'expired-test-slug';
    await knex('share_links').insert({
      layout_id: layoutId,
      slug: expiredSlug,
      expires_at: pastDate.toISOString(),
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Try to access expired link
    const res = await request(app).get(`/share/${expiredSlug}`).expect(404);

    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/share-links/:id revokes share link', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    // Create a new share link to delete
    const createRes = await request(app)
      .post('/api/share-links')
      .send({
        layout_id: layoutId,
      })
      .expect(201);

    const linkIdToDelete = createRes.body.data.id;
    const slugToDelete = createRes.body.data.slug;

    // Delete the link
    const deleteRes = await request(app)
      .delete(`/api/share-links/${linkIdToDelete}`)
      .expect(200);

    expect(deleteRes.body).toHaveProperty('message');

    // Verify it's no longer accessible
    const getRes = await request(app).get(`/share/${slugToDelete}`).expect(404);

    expect(getRes.body).toHaveProperty('error');
  });

  test('DELETE /api/share-links/:id returns 404 for invalid ID', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    const res = await request(app).delete('/api/share-links/999999').expect(404);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/share-links supports pagination', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();

    // Create multiple share links
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/share-links')
          .send({
            layout_id: layoutId,
          })
      );
    }
    await Promise.all(promises);

    // Fetch with small limit
    const res = await request(app)
      .get('/api/share-links')
      .query({ layout_id: layoutId, limit: 3 })
      .expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(3);
    expect(res.body).toHaveProperty('has_more');

    // If there are more results, test cursor pagination
    if (res.body.has_more && res.body.next_cursor) {
      const res2 = await request(app)
        .get('/api/share-links')
        .query({ layout_id: layoutId, limit: 3, cursor: res.body.next_cursor })
        .expect(200);

      expect(res2.body.data.length).toBeGreaterThan(0);

      // Ensure no overlap between pages
      const firstPageIds = res.body.data.map((link: any) => link.id);
      const secondPageIds = res2.body.data.map((link: any) => link.id);
      const overlap = firstPageIds.some((id: number) => secondPageIds.includes(id));
      expect(overlap).toBe(false);
    }
  });
});
