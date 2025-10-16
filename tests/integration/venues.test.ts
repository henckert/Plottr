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
});
