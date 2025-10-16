// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('sessions integration', () => {
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

  test('GET /api/sessions returns sessions', async () => {
    // require the app after migrations/seeds so knex picks up correct env vars
    // (avoid importing app at module load time)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    const res = await request(app).get('/api/sessions').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    // at least one session seeded
    expect(res.body.data.length).toBeGreaterThan(0);
    // check session has expected properties
    if (res.body.data.length > 0) {
      const session = res.body.data[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('pitch_id');
      expect(session).toHaveProperty('venue_id');
      // just verify basic id fields; timestamps may be null or sparse
      expect(typeof session.id).toBe('number');
    }
  });

  test('GET /api/sessions/:id returns single session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // fetch list first to get a valid ID
    const listRes = await request(app).get('/api/sessions').expect(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const sessionId = listRes.body.data[0].id;
    // fetch single session
    const res = await request(app).get(`/api/sessions/${sessionId}`).expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(sessionId);
    expect(res.body.data).toHaveProperty('pitch_id');
    expect(res.body.data).toHaveProperty('start_ts');
    expect(res.body.data).toHaveProperty('end_ts');
  });

  test('GET /api/sessions/:id returns 404 for non-existent session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // use a very high ID that likely doesn't exist
    const res = await request(app).get('/api/sessions/99999').expect(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/sessions filters by pitch_id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get list to find a pitch with sessions
    const listRes = await request(app).get('/api/sessions').expect(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const firstSessionPitchId = listRes.body.data[0].pitch_id;
    // filter by pitch_id - just verify it returns data
    const filteredRes = await request(app)
      .get('/api/sessions')
      .query({ pitch_id: firstSessionPitchId })
      .expect(200);
    expect(filteredRes.body).toHaveProperty('data');
    expect(Array.isArray(filteredRes.body.data)).toBe(true);
    expect(filteredRes.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/sessions - basic date range filter', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get list - just verify date filtering doesn't break the API
    const res = await request(app)
      .get('/api/sessions')
      .query({ start_ts_gte: '2025-01-01T00:00:00Z' })
      .expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/sessions creates session with 201', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // first, get a venue_id and pitch_id from seeded data
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    const pitchRes = await request(app).get('/api/pitches').expect(200);
    const pitchId = pitchRes.body.data[0].id;
    // create session
    const now = new Date();
    const startTs = new Date(now.getTime() + 86400000).toISOString(); // tomorrow
    const endTs = new Date(now.getTime() + 90000000).toISOString(); // tomorrow + 1 hour
    const res = await request(app)
      .post('/api/sessions')
      .send({
        venue_id: venueId,
        pitch_id: pitchId,
        start_ts: startTs,
        end_ts: endTs,
        notes: 'Test Session',
      })
      .expect(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.venue_id).toBe(venueId);
    expect(res.body.data.pitch_id).toBe(pitchId);
    // verify audit fields are ISO strings
    expect(typeof res.body.data.created_at).toBe('string');
    expect(typeof res.body.data.updated_at).toBe('string');
  });

  test('POST /api/sessions validates required fields (400 on missing venue_id)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // create session without venue_id
    const res = await request(app)
      .post('/api/sessions')
      .send({
        pitch_id: 1,
        // venue_id is missing
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/sessions validates datetime format (400 on invalid start_ts)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a venue_id
    const venueRes = await request(app).get('/api/venues').expect(200);
    const venueId = venueRes.body.data[0].id;
    // create session with invalid datetime
    const res = await request(app)
      .post('/api/sessions')
      .send({
        venue_id: venueId,
        start_ts: 'not-a-datetime',
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/sessions/:id updates session with 200', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a session to update
    const listRes = await request(app).get('/api/sessions').expect(200);
    const session = listRes.body.data[0];
    const sessionId = session.id;
    const currentToken = session.version_token || 'null-token';
    // update session with If-Match header
    const res = await request(app)
      .put(`/api/sessions/${sessionId}`)
      .set('If-Match', currentToken)
      .send({
        notes: `Updated Session ${Date.now()}`,
      })
      .expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(sessionId);
    expect(res.body.data.notes).toMatch(/Updated Session/);
  });

  test('PUT /api/sessions/:id returns 400 on missing If-Match header', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a session
    const listRes = await request(app).get('/api/sessions').expect(200);
    const sessionId = listRes.body.data[0].id;
    // attempt update without If-Match header
    const res = await request(app)
      .put(`/api/sessions/${sessionId}`)
      .send({
        notes: 'Updated Session',
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/If-Match/i);
  });

  test('PUT /api/sessions/:id returns 409 on stale version_token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // get a session
    const listRes = await request(app).get('/api/sessions').expect(200);
    const session = listRes.body.data[0];
    const sessionId = session.id;
    // attempt update with wrong version_token
    const res = await request(app)
      .put(`/api/sessions/${sessionId}`)
      .set('If-Match', 'stale-or-wrong-token')
      .send({
        notes: 'Updated Session',
      })
      .expect(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/version mismatch|stale/i);
  });

  test('PUT /api/sessions/:id returns 404 for non-existent session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createApp = require('../../src/app').default as () => any;
    const app = createApp();
    // attempt update on non-existent ID
    const res = await request(app)
      .put('/api/sessions/99999')
      .set('If-Match', 'any-token')
      .send({
        notes: 'Updated Session',
      })
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });
});
