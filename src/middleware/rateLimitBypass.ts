/**
 * Rate Limit Bypass for E2E Tests
 * Provides express-rate-limit middleware with test mode bypass
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Check if request should bypass rate limiting
 * Bypasses when:
 * 1. E2E=true environment variable is set
 * 2. Request is from localhost (127.0.0.1 or ::1)
 * 3. Request has X-Test-Bypass-RateLimit header set to "1"
 */
function shouldBypassRateLimit(req: Request): boolean {
  // Only allow bypass in E2E mode
  if (process.env.E2E !== 'true') {
    return false;
  }

  // Check if request is from localhost
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const isLocalhost = 
    clientIp === '127.0.0.1' || 
    clientIp === '::1' || 
    clientIp === '::ffff:127.0.0.1';

  if (!isLocalhost) {
    return false;
  }

  // Check for bypass header
  const bypassHeader = req.headers['x-test-bypass-ratelimit'];
  return bypassHeader === '1';
}

/**
 * Create rate limiter middleware with E2E bypass
 * @param windowMs Time window in milliseconds
 * @param max Maximum requests per window
 */
export function makeRateLimiter(windowMs: number = 60000, max: number = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip in test mode
      if (process.env.NODE_ENV === 'test') {
        return true;
      }

      // Skip for E2E tests with bypass header
      return shouldBypassRateLimit(req);
    },
    message: {
      error: {
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  });
}
