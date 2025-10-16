import request from 'supertest';
import createApp from '../../src/app';
import { getConfig } from '../../src/config';
import { destroyKnex } from '../../src/data/knex';
import { execSync } from 'child_process';

jest.setTimeout(30000);

describe('templates integration', () => {
  beforeAll(() => {
    // ensure test DB env
    process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
    // run migrations and seeds
    execSync('npx knex --knexfile src/db/knexfile.ts migrate:latest --env test', { stdio: 'inherit' });
    execSync('npx knex --knexfile src/db/knexfile.ts seed:run --env test', { stdio: 'inherit' });
  });

  afterAll(() => {
    // rollback migrations to keep DB clean for repeated runs
    execSync('npx knex --knexfile src/db/knexfile.ts migrate:rollback --env test', { stdio: 'inherit' });
    // close knex pool
    return destroyKnex();
  });

  test('GET /api/templates returns templates', async () => {
    const app = createApp();
    const res = await request(app).get('/api/templates').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    // at least one template seeded
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
