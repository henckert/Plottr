"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure test DB env is set before importing knex so it picks up the value at module load time
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test';
const supertest_1 = __importDefault(require("supertest"));
const knex_1 = require("../../src/data/knex");
const pagination_1 = require("../../src/lib/pagination");
jest.setTimeout(30000);
describe('pagination integration', () => {
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
    describe('GET /api/venues pagination', () => {
        test('GET /api/venues with no params returns data and has_more', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app).get('/api/venues').expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('has_more');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(typeof res.body.has_more).toBe('boolean');
            // next_cursor exists only if has_more is true
            if (res.body.has_more) {
                expect(res.body).toHaveProperty('next_cursor');
            }
        });
        test('GET /api/venues?limit=1 returns 1 venue with next_cursor', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app).get('/api/venues?limit=1').expect(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.has_more).toBe(true);
            expect(res.body.next_cursor).toBeDefined();
            expect(typeof res.body.next_cursor).toBe('string');
        });
        test('GET /api/venues?limit=1&cursor=X returns next page', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            // Get first page
            const page1 = await (0, supertest_1.default)(app).get('/api/venues?limit=1').expect(200);
            expect(page1.body.data.length).toBe(1);
            expect(page1.body.next_cursor).toBeDefined();
            const firstVenueId = page1.body.data[0].id;
            // Get second page using cursor
            const page2 = await (0, supertest_1.default)(app)
                .get(`/api/venues?limit=1&cursor=${page1.body.next_cursor}`)
                .expect(200);
            expect(page2.body.data.length).toBe(1);
            expect(page2.body.data[0].id).not.toBe(firstVenueId);
        });
        test('invalid cursor returns 400', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app)
                .get('/api/venues?cursor=invalid-cursor')
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('INVALID_PAGINATION');
        });
        test('limit > 100 returns 400', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app)
                .get('/api/venues?limit=101')
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('INVALID_PAGINATION');
        });
        test('limit < 1 returns 400', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app)
                .get('/api/venues?limit=0')
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('INVALID_PAGINATION');
        });
        test('pagination cursor chain returns correct ordering', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            // Get all venues without pagination
            const allRes = await (0, supertest_1.default)(app).get('/api/venues?limit=100').expect(200);
            const allVenues = allRes.body.data.map((v) => v.id);
            // Paginate through venues one at a time
            const paginatedIds = [];
            let cursor;
            for (let i = 0; i < allVenues.length; i++) {
                const pageRes = cursor
                    ? await (0, supertest_1.default)(app).get(`/api/venues?limit=1&cursor=${cursor}`).expect(200)
                    : await (0, supertest_1.default)(app).get('/api/venues?limit=1').expect(200);
                expect(pageRes.body.data.length).toBe(1);
                paginatedIds.push(pageRes.body.data[0].id);
                cursor = pageRes.body.next_cursor;
                if (!cursor)
                    break;
            }
            // Should get same venues in same order
            expect(paginatedIds).toEqual(allVenues);
        });
    });
    describe('GET /api/pitches pagination', () => {
        test('GET /api/pitches returns data with pagination info', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app).get('/api/pitches').expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('has_more');
            expect(Array.isArray(res.body.data)).toBe(true);
            // next_cursor exists only if has_more is true
            if (res.body.has_more) {
                expect(res.body).toHaveProperty('next_cursor');
            }
        });
        test('GET /api/pitches?limit=2 returns 2 pitches with pagination info', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app).get('/api/pitches?limit=2').expect(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.length).toBeLessThanOrEqual(2);
            expect(typeof res.body.has_more).toBe('boolean');
        });
    });
    describe('GET /api/sessions pagination', () => {
        test('GET /api/sessions returns data with pagination info', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            const res = await (0, supertest_1.default)(app).get('/api/sessions').expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('has_more');
            expect(Array.isArray(res.body.data)).toBe(true);
            // next_cursor exists only if has_more is true
            if (res.body.has_more) {
                expect(res.body).toHaveProperty('next_cursor');
            }
        });
        test('GET /api/sessions?limit=1 returns 1 session with next_cursor if more exist', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            // Get total count first
            const allRes = await (0, supertest_1.default)(app).get('/api/sessions?limit=100').expect(200);
            const totalSessions = allRes.body.data.length;
            // Get first page
            const res = await (0, supertest_1.default)(app).get('/api/sessions?limit=1').expect(200);
            expect(res.body.data.length).toBe(1);
            if (totalSessions > 1) {
                expect(res.body.has_more).toBe(true);
                expect(res.body.next_cursor).toBeDefined();
            }
            else {
                expect(res.body.has_more).toBe(false);
                expect(res.body.next_cursor).toBeUndefined();
            }
        });
    });
    describe('pagination cursor encoding/decoding', () => {
        test('cursor can be decoded after encoding', async () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createApp = require('../../src/app').default;
            const app = createApp();
            // Get first page to get a valid cursor
            const res = await (0, supertest_1.default)(app).get('/api/venues?limit=1').expect(200);
            if (res.body.next_cursor) {
                const decoded = (0, pagination_1.decodeCursor)(res.body.next_cursor);
                expect(decoded).toHaveProperty('id');
                expect(decoded).toHaveProperty('sortValue');
                expect(typeof decoded.id).toBe('number');
            }
        });
    });
});
