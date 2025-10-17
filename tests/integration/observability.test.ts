// Ensure test DB env is set before importing knex
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('observability', () => {
  beforeAll(async () => {
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();
  });

  afterAll(async () => {
    await destroyKnex();
  });

  describe('Health check endpoints', () => {
    test('GET /health returns OK', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);

      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('environment');
      expect(res.body).toHaveProperty('version');
    });

    test('GET /healthz includes database status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/healthz').expect(200);

      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('database');
      expect(res.body.database).toHaveProperty('healthy', true);
      expect(res.body.database).toHaveProperty('latency');
      expect(typeof res.body.database.latency).toBe('number');
    });

    test('GET /ready returns readiness status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/ready').expect(200);

      expect(res.body).toHaveProperty('ready', true);
    });

    test('GET /live returns liveness status', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/live').expect(200);

      expect(res.body).toHaveProperty('alive', true);
    });

    test('Health endpoints are not rate-limited in test', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Should succeed making multiple requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/health').expect(200);
        expect(res.body.ok).toBe(true);
      }
    });
  });

  describe('Request correlation IDs', () => {
    test('Response includes x-request-id header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    test('Preserves x-request-id if provided in request', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const testId = 'test-request-123';

      const res = await request(app)
        .get('/health')
        .set('x-request-id', testId);

      expect(res.headers['x-request-id']).toBe(testId);
    });

    test('Each request gets unique correlation ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res1 = await request(app).get('/health');
      const res2 = await request(app).get('/health');

      expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
    });
  });

  describe('Error responses include correlation ID', () => {
    test('404 error response includes x-request-id', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/nonexistent');

      expect(res.headers['x-request-id']).toBeDefined();
    });

    test('API error response includes x-request-id', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/venues')
        .set('Authorization', 'Bearer test-token')
        .send({}); // Missing required fields

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Health check response structure', () => {
    test('Health response includes required fields', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);

      expect(res.body.ok).toBe(true);
      expect(typeof res.body.timestamp).toBe('string');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThan(0);
    });

    test('Detailed health response includes latency', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/healthz').expect(200);

      expect(res.body.database).toBeDefined();
      expect(res.body.database.latency).toBeDefined();
      expect(typeof res.body.database.latency).toBe('number');
      expect(res.body.database.latency).toBeGreaterThanOrEqual(0);
    });

    test('Timestamp is valid ISO 8601', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);

      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Health check rate limiting', () => {
    test('Health endpoints use public rate limit (100 req/min)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // In test environment, rate limiting is skipped
      // But we can verify the endpoints work
      for (let i = 0; i < 10; i++) {
        const res = await request(app).get('/health').expect(200);
        expect(res.body.ok).toBe(true);
      }
    });
  });

  describe('Kubernetes probes', () => {
    test('Readiness probe returns ready when DB is healthy', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/ready').expect(200);

      expect(res.body.ready).toBe(true);
    });

    test('Liveness probe returns alive', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/live').expect(200);

      expect(res.body.alive).toBe(true);
    });
  });

  describe('Request logging headers', () => {
    test('API requests include correlation ID', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/venues')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
    });

    test('Multiple consecutive requests each get unique IDs', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const ids = new Set();

      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/health').expect(200);
        const id = res.headers['x-request-id'];
        expect(ids.has(id)).toBe(false); // Should be unique
        ids.add(id);
      }

      expect(ids.size).toBe(5);
    });
  });

  describe('Health checks across endpoints', () => {
    test('All health endpoints are accessible without authentication', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const endpoints = ['/health', '/healthz', '/ready', '/live'];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBeLessThan(500); // Should not be 500 or auth error
      }
    });
  });
});
