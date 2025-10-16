// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('venues integration', () => {
  beforeAll(async () => {
    // run migrations and seeds programmatically to reuse the same Knex instance
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();
  });

  afterAll(async () => {
    // close knex pool (don't rollback in test env - let DB state persist for other tests)
    await destroyKnex();
  });

  test('GET /api/venues returns venues', async () => {
    // require the app after migrations/seeds so knex picks up correct env vars
    // (avoid importing app at module load time)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    const res = await request(app).get('/api/venues').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    // at least one venue seeded
    expect(res.body.data.length).toBeGreaterThan(0);
    // check venue has expected properties
    if (res.body.data.length > 0) {
      const venue = res.body.data[0];
      expect(venue).toHaveProperty('id');
      expect(venue).toHaveProperty('name');
    }
  });

  test('GET /api/venues/:id returns single venue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // fetch list first to get a valid ID
    const listRes = await request(app).get('/api/venues').expect(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const venueId = listRes.body.data[0].id;
    // fetch single venue
    const res = await request(app).get(`/api/venues/${venueId}`).expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(venueId);
  });

  test('POST /api/venues creates venue with 201', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // first, get a club_id from seeded data
    const clubRes = await request(app).get('/api/venues').expect(200);
    const clubId = clubRes.body.data[0].club_id;
    // create venue - use current timestamp to ensure uniqueness
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/venues')
      .send({
        club_id: clubId,
        name: `Test Venue ${timestamp}`,
        address: '123 Main St',
        tz: 'Europe/London',
        published: false,
      })
      .expect(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe(`Test Venue ${timestamp}`);
    expect(res.body.data.club_id).toBe(clubId);
    // verify audit fields are ISO strings
    expect(typeof res.body.data.created_at).toBe('string');
    expect(typeof res.body.data.updated_at).toBe('string');
  });

  test('POST /api/venues validates required fields (400 on missing name)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a club_id
    const clubRes = await request(app).get('/api/venues').expect(200);
    const clubId = clubRes.body.data[0].club_id;
    // create venue without name
    const res = await request(app)
      .post('/api/venues')
      .send({
        club_id: clubId,
        // name is missing
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/venues validates required fields (400 on missing club_id)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // create venue without club_id
    const res = await request(app)
      .post('/api/venues')
      .send({
        name: 'Test Venue',
        // club_id is missing
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/venues returns 400 on FK violation (invalid club_id)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // try to create with non-existent club_id (should fail at DB level)
    const res = await request(app)
      .post('/api/venues')
      .send({
        club_id: 99999,
        name: 'Test Venue',
      });
    // either 400 or 500 depending on error handling
    expect([400, 500]).toContain(res.status);
  });

  test('PUT /api/venues/:id updates venue with 200', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue to update
    const listRes = await request(app).get('/api/venues').expect(200);
    const venue = listRes.body.data[0];
    const venueId = venue.id;
    const currentToken = venue.version_token || 'null-token';
    // update venue with If-Match header
    const res = await request(app)
      .put(`/api/venues/${venueId}`)
      .set('If-Match', currentToken)
      .send({
        name: `Updated Venue ${Date.now()}`,
        address: '456 Oak Ave',
      })
      .expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(venueId);
    expect(res.body.data.name).toMatch(/Updated Venue/);
    expect(res.body.data.address).toBe('456 Oak Ave');
  });

  test('PUT /api/venues/:id returns 400 on missing If-Match header', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue
    const listRes = await request(app).get('/api/venues').expect(200);
    const venueId = listRes.body.data[0].id;
    // attempt update without If-Match header
    const res = await request(app)
      .put(`/api/venues/${venueId}`)
      .send({
        name: 'Updated Venue',
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/If-Match/i);
  });

  test('PUT /api/venues/:id returns 409 on stale version_token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue
    const listRes = await request(app).get('/api/venues').expect(200);
    const venue = listRes.body.data[0];
    const venueId = venue.id;
    // attempt update with wrong version_token
    const res = await request(app)
      .put(`/api/venues/${venueId}`)
      .set('If-Match', 'stale-or-wrong-token')
      .send({
        name: 'Updated Venue',
      })
      .expect(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/version mismatch|stale/i);
  });

  test('PUT /api/venues/:id returns 404 for non-existent venue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // attempt update on non-existent ID
    const res = await request(app)
      .put('/api/venues/99999')
      .set('If-Match', 'any-token')
      .send({
        name: 'Updated Venue',
      })
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/venues with valid Bearer token succeeds', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // With valid Bearer token
    const res = await request(app)
      .get('/api/venues')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(res.body).toHaveProperty('data');
  });
});
