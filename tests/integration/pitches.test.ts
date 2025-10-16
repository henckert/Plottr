// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('pitches integration', () => {
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

  test('GET /api/pitches returns pitches', async () => {
    // require the app after migrations/seeds so knex picks up correct env vars
    // (avoid importing app at module load time)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    const res = await request(app).get('/api/pitches').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    // at least one pitch seeded
    expect(res.body.data.length).toBeGreaterThan(0);
    // check pitch has expected properties
    if (res.body.data.length > 0) {
      const pitch = res.body.data[0];
      expect(pitch).toHaveProperty('id');
      expect(pitch).toHaveProperty('name');
      expect(pitch).toHaveProperty('venue_id');
      // just verify id and name exist; other fields may be sparse in seeds
      expect(typeof pitch.id).toBe('number');
      expect(typeof pitch.name).toBe('string');
    }
  });

  test('GET /api/pitches/:id returns single pitch', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // fetch list first to get a valid ID
    const listRes = await request(app).get('/api/pitches').expect(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const pitchId = listRes.body.data[0].id;
    // fetch single pitch
    const res = await request(app).get(`/api/pitches/${pitchId}`).expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(pitchId);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('venue_id');
  });

  test('GET /api/pitches/:id returns 404 for non-existent pitch', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // use a very high ID that likely doesn't exist
    const res = await request(app).get('/api/pitches/99999').expect(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/pitches filters by venue_id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get list to find a venue with pitches
    const listRes = await request(app).get('/api/pitches').expect(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const firstPitchVenueId = listRes.body.data[0].venue_id;
    // filter by venue_id - just verify it returns data
    const filteredRes = await request(app)
      .get('/api/pitches')
      .query({ venue_id: firstPitchVenueId })
      .expect(200);
    expect(filteredRes.body).toHaveProperty('data');
    expect(Array.isArray(filteredRes.body.data)).toBe(true);
    expect(filteredRes.body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/pitches creates pitch with 201', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // first, get a venue_id from seeded data
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // create pitch
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        name: `Test Pitch ${timestamp}`,
        code: `TP${timestamp}`,
        sport: 'rugby',
        level: 'senior',
        status: 'draft',
      })
      .expect(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe(`Test Pitch ${timestamp}`);
    expect(res.body.data.venue_id).toBe(venueId);
    // verify audit fields are ISO strings
    expect(typeof res.body.data.created_at).toBe('string');
    expect(typeof res.body.data.updated_at).toBe('string');
  });

  test('POST /api/pitches validates required fields (400 on missing name)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // create pitch without name
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        // name is missing
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/pitches validates required fields (400 on missing venue_id)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // create pitch without venue_id
    const res = await request(app)
      .post('/api/pitches')
      .send({
        name: 'Test Pitch',
        // venue_id is missing
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/pitches/:id updates pitch with 200', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a pitch to update
    const listRes = await request(app).get('/api/pitches').expect(200);
    const pitch = listRes.body.data[0];
    const pitchId = pitch.id;
    const currentToken = pitch.version_token || 'null-token';
    // update pitch with If-Match header
    const res = await request(app)
      .put(`/api/pitches/${pitchId}`)
      .set('If-Match', currentToken)
      .send({
        name: `Updated Pitch ${Date.now()}`,
        sport: 'football',
      })
      .expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(pitchId);
    expect(res.body.data.name).toMatch(/Updated Pitch/);
    expect(res.body.data.sport).toBe('football');
  });

  test('PUT /api/pitches/:id returns 400 on missing If-Match header', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a pitch
    const listRes = await request(app).get('/api/pitches').expect(200);
    const pitchId = listRes.body.data[0].id;
    // attempt update without If-Match header
    const res = await request(app)
      .put(`/api/pitches/${pitchId}`)
      .send({
        name: 'Updated Pitch',
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/If-Match/i);
  });

  test('PUT /api/pitches/:id returns 409 on stale version_token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a pitch
    const listRes = await request(app).get('/api/pitches').expect(200);
    const pitch = listRes.body.data[0];
    const pitchId = pitch.id;
    // attempt update with wrong version_token
    const res = await request(app)
      .put(`/api/pitches/${pitchId}`)
      .set('If-Match', 'stale-or-wrong-token')
      .send({
        name: 'Updated Pitch',
      })
      .expect(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/version mismatch|stale/i);
  });

  test('PUT /api/pitches/:id returns 404 for non-existent pitch', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // attempt update on non-existent ID
    const res = await request(app)
      .put('/api/pitches/99999')
      .set('If-Match', 'any-token')
      .send({
        name: 'Updated Pitch',
      })
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/pitches with valid Bearer token succeeds', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    const res = await request(app)
      .get('/api/pitches')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(res.body).toHaveProperty('data');
  });

  test('POST /api/pitches rejects self-intersecting polygon (400)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // figure-8 polygon (self-intersecting)
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        name: 'Self-Intersecting Pitch',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
        },
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.details || res.body.error).toBeDefined();
  });

  test('POST /api/pitches rejects clockwise polygon (400)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // clockwise polygon (invalid winding)
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        name: 'Clockwise Pitch',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 1], [1, 1], [1, 0], [0, 0], [0, 1]]],
        },
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.details || res.body.error).toBeDefined();
  });

  test('POST /api/pitches rejects polygon with out-of-bounds coordinates (400)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // polygon with longitude > 180 (invalid WGS84)
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        name: 'Out of Bounds Pitch',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [181, 0], [181, 1], [0, 1], [0, 0]]],
        },
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.details || res.body.error.message || res.body.error).toBeDefined();
  });

  test('POST /api/pitches accepts valid counter-clockwise polygon', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // valid counter-clockwise polygon
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/pitches')
      .send({
        venue_id: venueId,
        name: `Valid CCW Pitch ${timestamp}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      })
      .expect(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.geometry).toBeDefined();
    expect(res.body.data.geometry.type).toBe('Polygon');
  });

  test('PUT /api/pitches/:id rejects invalid geometry (400)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a pitch_id with version token
    const listRes = await request(app).get('/api/pitches').expect(200);
    const pitch = listRes.body.data[0];
    // attempt to update with invalid geometry
    const res = await request(app)
      .put(`/api/pitches/${pitch.id}`)
      .set('If-Match', pitch.version_token)
      .send({
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
        },
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    // error can be string code or details array
    expect(res.body.error).toBeDefined();
  });
});
