/**
 * Unit Tests for Rate Limit Headers Utility
 * Tests header formatting, rate limit calculations, and error responses
 */

import { Response } from 'express';
import {
  setRateLimitHeaders,
  setTierHeaders,
  getRetryAfter,
  buildRateLimitError,
  shouldIncludeRateLimitHeaders,
  formatRateLimitInfo,
} from '../../../src/lib/rateLimitHeaders';
import { RateLimitResult } from '../../../src/services/rateLimiter.service';

describe('Rate Limit Headers Utility', () => {
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = {
      setHeader: jest.fn(),
      headers: {},
      set: function (key: string, value: any) {
        this.headers[key] = value;
      },
    };
  });

  describe('setRateLimitHeaders', () => {
    it('should set X-RateLimit-Limit header', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      };

      setRateLimitHeaders(mockResponse, result, 'free', 'authenticated');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });

    it('should set X-RateLimit-Remaining header', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 45,
        resetAt: new Date(Date.now() + 60000),
      };

      setRateLimitHeaders(mockResponse, result, 'paid_individual', 'authenticated');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '45');
    });

    it('should set X-RateLimit-Reset header with unix timestamp', () => {
      const resetTime = new Date(Date.now() + 30000);
      const result: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetAt: resetTime,
      };

      setRateLimitHeaders(mockResponse, result, 'free', 'authenticated');

      const resetTimestamp = Math.floor(resetTime.getTime() / 1000);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        resetTimestamp.toString()
      );
    });

    it('should handle unlimited tier (admin)', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 60000),
      };

      setRateLimitHeaders(mockResponse, result, 'admin', 'authenticated');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 'unlimited');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 'unlimited');
    });

    it('should set Retry-After header when rate limit exceeded', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 30000),
        retryAfter: 30,
      };

      setRateLimitHeaders(mockResponse, result, 'free', 'authenticated');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    });

    it('should not set Retry-After header when rate limit allowed', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetAt: new Date(Date.now() + 60000),
      };

      setRateLimitHeaders(mockResponse, result, 'free', 'authenticated');

      const calls = mockResponse.setHeader.mock.calls;
      const retryAfterCalls = calls.filter((call: any[]) => call[0] === 'Retry-After');
      expect(retryAfterCalls.length).toBe(0);
    });

    it('should use correct rate limit for different endpoint types', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 9,
        resetAt: new Date(Date.now() + 60000),
      };

      // Export endpoint has lower limit (10 vs 100)
      setRateLimitHeaders(mockResponse, result, 'free', 'export');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    });
  });

  describe('setTierHeaders', () => {
    it('should set X-Tier header', () => {
      setTierHeaders(mockResponse, 'free');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Tier', 'free');
    });

    it('should set X-Tier-Level header with numeric value', () => {
      setTierHeaders(mockResponse, 'paid_individual');

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Tier-Level', '1');
    });

    it('should set correct tier levels for all tiers', () => {
      const tiers = [
        { tier: 'free', level: '0' },
        { tier: 'paid_individual', level: '1' },
        { tier: 'club_admin', level: '2' },
        { tier: 'admin', level: '3' },
      ];

      for (const { tier, level } of tiers) {
        mockResponse.setHeader.mockClear();
        setTierHeaders(mockResponse, tier as any);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Tier-Level', level);
      }
    });

    it('should set X-Layout-Limit header', () => {
      setTierHeaders(mockResponse, 'free');

      // X-Layout-Limit is the max layouts per tier from LAYOUT_LIMITS
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Layout-Limit', expect.any(String));
      const calls = mockResponse.setHeader.mock.calls;
      const layoutLimitCall = calls.find((call: any[]) => call[0] === 'X-Layout-Limit');
      expect(layoutLimitCall).toBeDefined();
    });

    it('should set X-Quota-Remaining header when provided', () => {
      setTierHeaders(mockResponse, 'free', 2);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Quota-Remaining', '2');
    });

    it('should not set X-Quota-Remaining header when undefined', () => {
      setTierHeaders(mockResponse, 'free');

      const calls = mockResponse.setHeader.mock.calls;
      const quotaCalls = calls.filter((call: any[]) => call[0] === 'X-Quota-Remaining');
      expect(quotaCalls.length).toBe(0);
    });
  });

  describe('getRetryAfter', () => {
    it('should calculate correct retry-after seconds', () => {
      const now = Date.now();
      const resetAt = new Date(now + 45000); // 45 seconds from now

      const retryAfter = getRetryAfter(resetAt);

      // Should be between 44-46 seconds (allow 1 second variance for test execution)
      expect(retryAfter).toBeGreaterThanOrEqual(44);
      expect(retryAfter).toBeLessThanOrEqual(46);
    });

    it('should return 0 for past reset time', () => {
      const resetAt = new Date(Date.now() - 1000); // 1 second ago

      const retryAfter = getRetryAfter(resetAt);

      expect(retryAfter).toBe(0);
    });

    it('should round up to next second', () => {
      const now = Date.now();
      const resetAt = new Date(now + 1500); // 1.5 seconds from now

      const retryAfter = getRetryAfter(resetAt);

      // Should round up to 2 seconds
      expect(retryAfter).toBe(2);
    });
  });

  describe('buildRateLimitError', () => {
    it('should return error with correct status code', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfter: 60,
      };

      const error = buildRateLimitError(result, 'free', 'authenticated');

      expect(error.status).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include tier and endpoint type in message', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfter: 60,
      };

      const error = buildRateLimitError(result, 'paid_individual', 'export');

      expect(error.message).toContain('paid_individual');
      expect(error.message).toContain('export');
    });

    it('should include retry-after in message', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 30000),
        retryAfter: 30,
      };

      const error = buildRateLimitError(result, 'free', 'authenticated');

      expect(error.message).toContain('30');
    });

    it('should include resetAt timestamp', () => {
      const resetTime = new Date();
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: resetTime,
        retryAfter: 60,
      };

      const error = buildRateLimitError(result, 'free', 'authenticated');

      expect(error.resetAt).toBe(resetTime.toISOString());
    });
  });

  describe('shouldIncludeRateLimitHeaders', () => {
    it('should return true for authenticated user', () => {
      const req = { user: { clerkId: 'user_123' } };

      const should = shouldIncludeRateLimitHeaders(req);

      expect(should).toBe(true);
    });

    it('should return true for 401 status even without auth', () => {
      const req = {};

      const should = shouldIncludeRateLimitHeaders(req, 401);

      expect(should).toBe(true);
    });

    it('should return true for 403 status even without auth', () => {
      const req = {};

      const should = shouldIncludeRateLimitHeaders(req, 403);

      expect(should).toBe(true);
    });

    it('should return false for unauthenticated request with 200 status', () => {
      const req = {};

      const should = shouldIncludeRateLimitHeaders(req, 200);

      expect(should).toBe(false);
    });

    it('should return false for unauthenticated request with no status', () => {
      const req = {};

      const should = shouldIncludeRateLimitHeaders(req);

      expect(should).toBe(false);
    });
  });

  describe('formatRateLimitInfo', () => {
    it('should format rate limit information correctly', () => {
      const resetTime = new Date('2025-10-19T12:00:00Z');
      const result: RateLimitResult = {
        allowed: true,
        remaining: 75,
        resetAt: resetTime,
      };

      const info = formatRateLimitInfo('paid_individual', result, 'authenticated');

      expect(info.tier).toBe('paid_individual');
      expect(info.endpoint).toBe('authenticated');
      // paid_individual tier has 300 authenticated limit
      expect(info.limit).toBe(300);
      expect(info.remaining).toBe(75);
      expect(info.windowSeconds).toBe(60);
      expect(info.resetAt).toBe(resetTime.toISOString());
    });

    it('should show unlimited for admin tier', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(),
      };

      const info = formatRateLimitInfo('admin', result, 'authenticated');

      expect(info.limit).toBe('unlimited');
      expect(info.remaining).toBe('unlimited');
    });

    it('should include correct limits for different endpoint types', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 8,
        resetAt: new Date(),
      };

      // Export endpoint has lower limit
      const exportInfo = formatRateLimitInfo('free', result, 'export');
      expect(exportInfo.limit).toBe(10);

      // Authenticated endpoint has higher limit
      const authInfo = formatRateLimitInfo('free', result, 'authenticated');
      expect(authInfo.limit).toBe(100);
    });

    it('should handle zero remaining quota', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        retryAfter: 60,
      };

      const info = formatRateLimitInfo('free', result, 'authenticated');

      expect(info.remaining).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should set all headers correctly on response', () => {
      const resetTime = new Date(Date.now() + 60000);
      const result: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetAt: resetTime,
      };

      setRateLimitHeaders(mockResponse, result, 'free', 'authenticated');
      setTierHeaders(mockResponse, 'free', 2);

      // Verify all expected headers are set
      const calls = mockResponse.setHeader.mock.calls.map((call: any[]) => call[0]);
      expect(calls).toContain('X-RateLimit-Limit');
      expect(calls).toContain('X-RateLimit-Remaining');
      expect(calls).toContain('X-RateLimit-Reset');
      expect(calls).toContain('X-Tier');
      expect(calls).toContain('X-Tier-Level');
      expect(calls).toContain('X-Layout-Limit');
      expect(calls).toContain('X-Quota-Remaining');
    });

    it('should handle rate limited response correctly', () => {
      const resetTime = new Date(Date.now() + 45000);
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: resetTime,
        retryAfter: 45,
      };

      setRateLimitHeaders(mockResponse, result, 'paid_individual', 'export');
      setTierHeaders(mockResponse, 'paid_individual');

      // Verify rate limit exceeded headers
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '45');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Tier', 'paid_individual');
    });
  });
});
