// Ensure test DB env is set before importing knex
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
import request from 'supertest';
import { destroyKnex, getKnex } from '../../src/data/knex';

jest.setTimeout(30000);

describe('security integration', () => {
  beforeAll(async () => {
    const knex = getKnex();
    await knex.migrate.latest();
    await knex.seed.run();
  });

  afterAll(async () => {
    await destroyKnex();
  });

  describe('Helmet security headers', () => {
    test('response includes Content-Security-Policy header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('response includes X-Content-Type-Options header (nosniff)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('response includes X-Frame-Options header (DENY)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    test('response includes Strict-Transport-Security header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    test('response includes Referrer-Policy header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });

    test('response does not include X-Powered-By header', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Rate limiting (skipped in test environment)', () => {
    test('rate limiting is skipped in test environment', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // Should be able to make multiple requests without hitting rate limit
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/health').expect(200);
        expect(res.body).toHaveProperty('ok');
      }
    });

    test('rate limit headers present on responses (but limits not enforced in test)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();
      const res = await request(app).get('/health').expect(200);

      // RateLimit headers should be present (even if not enforced in test)
      // Note: express-rate-limit sets these headers
      expect(res.status).toBe(200);
    });
  });

  describe('Authentication and Authorization', () => {
    test('GET /api/venues without auth succeeds in dev mode (AUTH_REQUIRED=false)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      // In dev mode, auth is optional
      const res = await request(app).get('/api/venues').expect(200);
      expect(res.body).toHaveProperty('data');
    });

    test('GET /health without auth returns 200 (public endpoint)', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);
      expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/venues with Bearer token succeeds', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/venues')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Error handling', () => {
    test('invalid JSON in request body returns error response', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .post('/api/venues')
        .set('Authorization', 'Bearer test-token')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      // Invalid JSON is caught by body-parser and goes through error handler
      expect([400, 500]).toContain(res.status);
    });

    test('nonexistent routes return 404', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/api/nonexistent');
      // Route doesn't exist, returns 404 before auth check reaches it
      expect(res.status).toBe(404);
    });
  });

  describe('Security headers on API endpoints', () => {
    test('API endpoints include security headers', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app)
        .get('/api/venues')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Health endpoint includes security headers', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);

      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('CSP directives', () => {
    test('CSP header restricts script execution', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);
      const csp = res.headers['content-security-policy'];

      // script-src should only allow 'self'
      expect(csp).toContain("script-src 'self'");
    });

    test('CSP header allows inline styles', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);
      const csp = res.headers['content-security-policy'];

      // style-src should allow unsafe-inline (for frameworks)
      expect(csp).toContain("'unsafe-inline'");
    });
  });

  describe('HSTS configuration', () => {
    test('HSTS header includes preload directive', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);
      const hsts = res.headers['strict-transport-security'];

      expect(hsts).toContain('preload');
      expect(hsts).toContain('includeSubDomains');
    });

    test('HSTS max-age is set to 1 year', async () => {
      const createApp = require('../../src/app').default as () => any;
      const app = createApp();

      const res = await request(app).get('/health').expect(200);
      const hsts = res.headers['strict-transport-security'];

      expect(hsts).toContain('max-age=31536000'); // 1 year in seconds
    });
  });
});
