"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
const supertest_1 = __importDefault(require("supertest"));
const knex_1 = require("../../src/data/knex");
jest.setTimeout(30000);
describe('templates integration', () => {
    beforeAll(async () => {
        // run migrations and seeds programmatically to reuse the same Knex instance
        const knex = (0, knex_1.getKnex)();
        await knex.migrate.latest();
        await knex.seed.run();
    });
    afterAll(async () => {
        // close knex pool (don't rollback in test env - let DB state persist for other tests)
        await (0, knex_1.destroyKnex)();
    });
    test('GET /api/templates returns templates', async () => {
        // require the app after migrations/seeds so knex picks up correct env vars
        // (avoid importing app at module load time)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const createApp = require('../../src/app').default;
        const app = createApp();
        const res = await (0, supertest_1.default)(app).get('/api/templates').expect(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        // at least one template seeded
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});
