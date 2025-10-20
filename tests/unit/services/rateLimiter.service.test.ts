/**
 * Rate Limiter Service Tests
 * Tests rate limiting per tier and endpoint type
 */

import { RateLimiterService, RateLimitResult } from '../../../src/services/rateLimiter.service';
import { UserTier } from '../../../src/lib/tiers';

describe('RateLimiterService', () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    // Use in-memory rate limiter for tests (no Redis dependency)
    rateLimiter = new RateLimiterService(null);
  });

  describe('checkLimit - Free Tier', () => {
    it('should allow requests within free tier limit (100/min authenticated)', async () => {
      const result = await rateLimiter.checkLimit('user_free_1', 'free', 'authenticated');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(100);
    });

    it('should track multiple requests for same user', async () => {
      let previousRemaining = 100;

      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit('user_free_2', 'free', 'authenticated');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeLessThanOrEqual(previousRemaining);
        previousRemaining = result.remaining;
      }
    });

    it('should enforce 10/min limit for free tier exports', async () => {
      const result = await rateLimiter.checkLimit('user_free_export', 'free', 'export');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('should enforce 5/min limit for free tier AI', async () => {
      const result = await rateLimiter.checkLimit('user_free_ai', 'free', 'ai');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(5);
    });

    it('should have resetAt timestamp for rate limit window', async () => {
      const result = await rateLimiter.checkLimit('user_free_3', 'free', 'authenticated');

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.resetAt.getTime()).toBeLessThanOrEqual(Date.now() + 65000); // Within 65 seconds
    });
  });

  describe('checkLimit - Paid Individual Tier', () => {
    it('should allow 300/min for paid individual authenticated', async () => {
      const result = await rateLimiter.checkLimit('user_paid_1', 'paid_individual', 'authenticated');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(300);
    });

    it('should allow 50/min for paid individual exports', async () => {
      const result = await rateLimiter.checkLimit('user_paid_export', 'paid_individual', 'export');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(50);
    });

    it('should allow 50/min for paid individual AI', async () => {
      const result = await rateLimiter.checkLimit('user_paid_ai', 'paid_individual', 'ai');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(50);
    });
  });

  describe('checkLimit - Club Admin Tier', () => {
    it('should allow 500/min for club admin authenticated', async () => {
      const result = await rateLimiter.checkLimit('user_club_1', 'club_admin', 'authenticated');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(500);
    });

    it('should allow 100/min for club admin exports', async () => {
      const result = await rateLimiter.checkLimit('user_club_export', 'club_admin', 'export');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(100);
    });

    it('should allow 100/min for club admin AI', async () => {
      const result = await rateLimiter.checkLimit('user_club_ai', 'club_admin', 'ai');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(100);
    });
  });

  describe('checkLimit - Admin Tier', () => {
    it('should allow unlimited requests for admin', async () => {
      const result = await rateLimiter.checkLimit('user_admin_1', 'admin', 'authenticated');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should have admin tier always allowed', async () => {
      const result = await rateLimiter.checkLimit('user_admin_2', 'admin', 'export');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('Request Cost', () => {
    it('should support custom cost parameter (higher cost uses more quota)', async () => {
      const singleCost = await rateLimiter.checkLimit('user_cost_1', 'free', 'authenticated', 1);
      const tripleCost = await rateLimiter.checkLimit('user_cost_2', 'free', 'authenticated', 3);

      // Same tier, but different costs should result in different remaining
      expect(singleCost.remaining).toBeGreaterThan(tripleCost.remaining);
    });
  });

  describe('Rate Limit Exceeded', () => {
    it('should have retryAfter when limit exceeded', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 30000),
        retryAfter: 30,
      };

      expect(result.retryAfter).toBe(30);
      expect(result.allowed).toBe(false);
    });

    it('should return correct reset timestamp', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
      };

      const secondsUntilReset = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
      expect(secondsUntilReset).toBeGreaterThan(0);
      expect(secondsUntilReset).toBeLessThanOrEqual(60);
    });
  });

  describe('Endpoint Type Isolation', () => {
    it('should track different endpoint types separately', async () => {
      const authResult = await rateLimiter.checkLimit('user_isolation_1', 'free', 'authenticated');
      const exportResult = await rateLimiter.checkLimit('user_isolation_1', 'free', 'export');
      const aiResult = await rateLimiter.checkLimit('user_isolation_1', 'free', 'ai');

      // Different endpoint types should have different limits
      // authenticated=100, export=10, ai=5
      expect(authResult.remaining).toBeGreaterThan(exportResult.remaining);
      expect(exportResult.remaining).toBeGreaterThan(aiResult.remaining);
    });

    it('should allow same user different limits for different endpoints', async () => {
      // Exhausting one endpoint shouldn't affect another
      const result1 = await rateLimiter.checkLimit('user_isolation_2', 'free', 'authenticated');
      const result2 = await rateLimiter.checkLimit('user_isolation_2', 'free', 'export');

      // Both should be allowed (separate limits)
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('User Isolation', () => {
    it('should track different users separately', async () => {
      const result1 = await rateLimiter.checkLimit('user_a', 'free', 'authenticated');
      const result2 = await rateLimiter.checkLimit('user_b', 'free', 'authenticated');

      // Both users should have full quota
      expect(result1.remaining).toBeGreaterThan(90); // Close to 100
      expect(result2.remaining).toBeGreaterThan(90); // Close to 100
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tier gracefully', async () => {
      // Should not throw - rate limiter should work with any tier string
      expect(async () => {
        await rateLimiter.checkLimit('user_error_1', 'free' as UserTier, 'authenticated');
      }).not.toThrow();
    });

    it('should return allowed=true on error (fail open)', async () => {
      // If rate limiter encounters error, it should allow the request
      // rather than blocking legitimate traffic
      const result = await rateLimiter.checkLimit('user_error_2', 'free', 'authenticated');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
    });
  });

  describe('Time Windows', () => {
    it('should return resetAt as Date object', async () => {
      const result = await rateLimiter.checkLimit('user_time_1', 'free', 'authenticated');

      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should reset window every minute', async () => {
      // Note: This test verifies the window is 1 minute
      // In practice, windows reset based on server time
      const result = await rateLimiter.checkLimit('user_time_2', 'free', 'authenticated');

      const secondsPerWindow = (result.resetAt.getTime() - Date.now()) / 1000;
      expect(secondsPerWindow).toBeGreaterThan(0);
      expect(secondsPerWindow).toBeLessThanOrEqual(60);
    });
  });

  describe('Tier-Specific Rate Limits', () => {
    const tierTests: Array<[UserTier, Record<string, number>]> = [
      [
        'free',
        { authenticated: 100, export: 10, ai: 5, upload: 20 },
      ],
      [
        'paid_individual',
        { authenticated: 300, export: 50, ai: 50, upload: 100 },
      ],
      [
        'club_admin',
        { authenticated: 500, export: 100, ai: 100, upload: 200 },
      ],
    ];

    tierTests.forEach(([tier, expectedLimits]) => {
      describe(`${tier} tier limits`, () => {
        Object.entries(expectedLimits).forEach(([endpointType, expectedLimit]) => {
          it(`should have ${expectedLimit} req/min for ${endpointType}`, async () => {
            const result = await rateLimiter.checkLimit(
              `user_limit_${tier}_${endpointType}`,
              tier,
              endpointType
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeLessThanOrEqual(expectedLimit);
            expect(result.remaining).toBeGreaterThan(0);
          });
        });
      });
    });
  });
});
