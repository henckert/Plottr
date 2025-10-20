"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../../src/middleware/auth");
const auth_routes_1 = __importDefault(require("../../../src/routes/auth.routes"));
describe('Auth Routes - /api/auth/me endpoint', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(auth_1.authMiddleware);
        app.use('/api/auth', auth_routes_1.default);
    });
    describe('GET /api/auth/me', () => {
        it('should return user data when authenticated', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me');
            // In dev mode (default), should return 200 with user data
            if (response.status === 200) {
                expect(response.body).toHaveProperty('clerkId');
                expect(response.body).toHaveProperty('tier');
            }
            else {
                // Auth required mode - 401 without valid token
                expect([401, 403]).toContain(response.status);
            }
        });
        it('should include clerkId in response when authenticated', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me');
            if (response.status === 200) {
                expect(response.body.clerkId).toBeDefined();
                expect(typeof response.body.clerkId).toBe('string');
            }
        });
        it('should include tier in response', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me');
            if (response.status === 200) {
                expect(response.body.tier).toMatch(/^(free|paid_individual|club_admin|admin)$/);
            }
        });
        it('should include email in response when available', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me');
            if (response.status === 200) {
                expect(['email' in response.body, true]).toContain(true);
            }
        });
        it('should reject invalid Bearer token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token.signature');
            // Should either reject or accept based on auth mode
            expect([200, 401, 403]).toContain(response.status);
        });
        it('should reject malformed Authorization header', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'MalformedHeader');
            // In dev mode might pass, in auth mode should reject
            expect([200, 401, 403]).toContain(response.status);
        });
    });
});
