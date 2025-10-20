"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tier_1 = require("../../../src/middleware/tier");
const errors_1 = require("../../../src/errors");
const tiers_1 = require("../../../src/lib/tiers");
describe('Tier Middleware - Usage Limits & Authorization', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            user: {
                clerkId: 'user_123',
                email: 'user@example.com',
                tier: 'free',
                token: 'jwt.token',
            },
            method: 'POST',
            headers: {},
        };
        mockRes = {
            setHeader: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    describe('tierMiddleware', () => {
        it('should allow admin tier to bypass all checks', async () => {
            mockReq.user.tier = 'admin';
            const middleware = await (0, tier_1.tierMiddleware)('layouts');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should attach tier limit info for POST requests', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'POST';
            const middleware = await (0, tier_1.tierMiddleware)('layouts');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockReq.tierLimit).toBe(3); // Free tier limit
            expect(mockReq.tierResource).toBe('layouts');
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should attach paid tier limit info', async () => {
            mockReq.user.tier = 'paid_individual';
            mockReq.method = 'POST';
            const middleware = await (0, tier_1.tierMiddleware)('layouts');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockReq.tierLimit).toBe(50); // Paid tier limit
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should block free tier from AI features', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'POST';
            const middleware = await (0, tier_1.tierMiddleware)('ai_features');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.status).toBe(403);
            expect(error.code).toBe('TIER_UPGRADE_REQUIRED');
        });
        it('should allow paid tier to access AI features', async () => {
            mockReq.user.tier = 'paid_individual';
            mockReq.method = 'POST';
            const middleware = await (0, tier_1.tierMiddleware)('ai_features');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
    describe('checkLayoutLimit middleware', () => {
        it('should allow request when user has not hit layout limit', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(2), // User has 2 layouts
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockReq.tierQuotaRemaining).toBe(1); // 3 - 2 = 1
        });
        it('should block request when free user hits 3 layout limit', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(3), // User has 3 layouts (at limit)
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.status).toBe(402); // Payment Required
            expect(error.code).toBe('LAYOUT_LIMIT_REACHED');
            expect(error.message).toContain('reached the maximum number of layouts');
        });
        it('should allow paid tier to create more layouts', async () => {
            mockReq.user.tier = 'paid_individual';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(49), // User has 49 layouts (at paid limit)
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockReq.tierQuotaRemaining).toBe(1); // 50 - 49 = 1
        });
        it('should skip limit check for admin tier', async () => {
            mockReq.user.tier = 'admin';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(1000),
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockLayoutsRepo.countByUser).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should skip limit check for non-POST requests', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'GET';
            const mockLayoutsRepo = {
                countByUser: jest.fn(),
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockLayoutsRepo.countByUser).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
    describe('requireTier middleware', () => {
        it('should allow user with sufficient tier', () => {
            mockReq.user.tier = 'paid_individual';
            const middleware = (0, tier_1.requireTier)('free');
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should block free tier from paid features', () => {
            mockReq.user.tier = 'free';
            const middleware = (0, tier_1.requireTier)('paid_individual');
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.status).toBe(403);
            expect(error.code).toBe('TIER_UPGRADE_REQUIRED');
        });
        it('should allow admin access to any tier features', () => {
            mockReq.user.tier = 'admin';
            const middleware = (0, tier_1.requireTier)('club_admin');
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should reject paid_individual for club_admin features', () => {
            mockReq.user.tier = 'paid_individual';
            const middleware = (0, tier_1.requireTier)('club_admin');
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.status).toBe(403);
        });
    });
    describe('addTierHeaders middleware', () => {
        it('should add tier headers to response', () => {
            mockReq.user.tier = 'free';
            (0, tier_1.addTierHeaders)(mockReq, mockRes, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-User-Tier', 'free');
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Tier-Limit', 3);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should add quota remaining header when available', () => {
            mockReq.user.tier = 'free';
            mockReq.tierQuotaRemaining = 2;
            (0, tier_1.addTierHeaders)(mockReq, mockRes, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Tier-Quota-Remaining', 2);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should handle different tiers correctly', () => {
            mockReq.user.tier = 'paid_individual';
            (0, tier_1.addTierHeaders)(mockReq, mockRes, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-User-Tier', 'paid_individual');
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Tier-Limit', 50);
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
    describe('Tier System Integration', () => {
        it('should enforce free tier 3-layout limit', async () => {
            mockReq.user.tier = 'free';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(3),
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.status).toBe(tiers_1.TIER_STATUS_CODES.LAYOUT_LIMIT_REACHED);
            expect(error.message).toContain(tiers_1.TIER_ERROR_MESSAGES.LAYOUT_LIMIT_REACHED);
        });
        it('should allow paid tier 50 layouts', async () => {
            mockReq.user.tier = 'paid_individual';
            mockReq.method = 'POST';
            const mockLayoutsRepo = {
                countByUser: jest.fn().mockResolvedValue(49),
            };
            const mockGetLayoutsRepo = jest.fn().mockReturnValue(mockLayoutsRepo);
            const mockGetUsersRepo = jest.fn();
            const middleware = (0, tier_1.checkLayoutLimit)(mockGetUsersRepo, mockGetLayoutsRepo);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
});
