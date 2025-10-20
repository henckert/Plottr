/**
 * Rate Limiter Service
 * Redis-backed rate limiting with per-tier limits
 * Tracks requests by user and endpoint type
 */

import { getRateLimit, UserTier } from '../lib/tiers';
import { AppError } from '../errors';
import { setRateLimitHeaders } from '../lib/rateLimitHeaders';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry
}

/**
 * Singleton rate limiter service
 * Uses Redis to track request counts per user/endpoint
 * Falls back to in-memory tracking if Redis unavailable
 */
export class RateLimiterService {
  private redisClient: any;
  private initialized: boolean = false;
  private inMemoryStore: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(redisClient?: any) {
    this.redisClient = redisClient;
  }

  /**
   * Initialize Redis connection (if not using injected client)
   */
  async initialize() {
    if (this.initialized) return;

    // If no redis client provided, try to connect
    if (!this.redisClient && process.env.REDIS_HOST) {
      try {
        // Try to connect to Redis only if explicitly configured
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const redis = require('redis');
        this.redisClient = redis.createClient({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          db: parseInt(process.env.REDIS_DB || '1'), // Use DB 1 for rate limits
        });
        await this.redisClient.connect();
        console.log('Connected to Redis for rate limiting');
      } catch (error) {
        console.warn('Redis not available for rate limiting. Using in-memory fallback.');
        this.redisClient = null;
      }
    }

    this.initialized = true;
  }

  /**
   * Check if request is allowed based on tier rate limits
   * @param userId Unique user identifier (from JWT)
   * @param tier User's tier
   * @param endpointType Type of endpoint (authenticated, export, ai, upload)
   * @param cost Request cost (default 1, some operations cost more)
   * @returns Rate limit result with allowed flag and remaining quota
   *
   * @example
   * const result = await rateLimiter.checkLimit('user_123', 'free', 'authenticated');
   * if (!result.allowed) {
   *   return res.status(429).json({ retryAfter: result.retryAfter });
   * }
   */
  async checkLimit(
    userId: string,
    tier: UserTier,
    endpointType: string = 'authenticated',
    cost: number = 1
  ): Promise<RateLimitResult> {
    try {
      const limit = getRateLimit(tier, endpointType);

      // No limit for admin tier or if limit is infinity
      if (limit === Infinity) {
        return {
          allowed: true,
          remaining: Infinity,
          resetAt: new Date(Date.now() + 60000),
        };
      }

      const now = Date.now();
      const key = this.getKey(userId, endpointType);
      const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
      const resetAt = new Date(windowStart + 60000);

      if (this.redisClient) {
        return this.checkLimitRedis(key, limit, cost, resetAt);
      } else {
        return this.checkLimitMemory(key, limit, cost, resetAt);
      }
    } catch (error) {
      // On error, allow request (fail open)
      console.error('Rate limit check error:', error);
      return {
        allowed: true,
        remaining: -1,
        resetAt: new Date(),
      };
    }
  }

  /**
   * Redis-backed rate limit check
   * Uses Redis INCR with TTL for accurate distributed rate limiting
   */
  private async checkLimitRedis(
    key: string,
    limit: number,
    cost: number,
    resetAt: Date
  ): Promise<RateLimitResult> {
    // Increment counter (Redis returns new value)
    const count = await this.redisClient.incr(key);

    // Set TTL on first request in window
    if (count === cost) {
      await this.redisClient.expire(key, 60); // Expire after 60 seconds
    }

    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
      return { allowed: false, remaining, resetAt, retryAfter };
    }

    return { allowed: true, remaining, resetAt };
  }

  /**
   * In-memory fallback rate limit check
   * Uses simple Map-based tracking (not distributed)
   */
  private checkLimitMemory(
    key: string,
    limit: number,
    cost: number,
    resetAt: Date
  ): RateLimitResult {
    const now = Date.now();

    // Get or initialize counter for this key
    let entry = this.inMemoryStore.get(key);

    if (!entry || entry.resetAt <= now) {
      // New window or window has expired
      entry = { count: 0, resetAt: resetAt.getTime() };
    }

    // Increment counter
    entry.count += cost;

    // Update store
    this.inMemoryStore.set(key, entry);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up on each request
      for (const [storedKey, storedEntry] of this.inMemoryStore.entries()) {
        if (storedEntry.resetAt <= now) {
          this.inMemoryStore.delete(storedKey);
        }
      }
    }

    const remaining = Math.max(0, limit - entry.count);
    const allowed = entry.count <= limit;

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);
      return { allowed: false, remaining, resetAt, retryAfter };
    }

    return { allowed: true, remaining, resetAt };
  }

  /**
   * Get Redis key for rate limit tracking
   * Format: rl:{endpointType}:{userId}:{minute}
   */
  private getKey(userId: string, endpointType: string): string {
    const minute = Math.floor(Date.now() / 60000);
    return `rl:${endpointType}:${userId}:${minute}`;
  }

  /**
   * Reset rate limit for a user (useful for testing)
   */
  async reset(userId: string, endpointType: string = 'authenticated'): Promise<void> {
    if (!this.redisClient) {
      console.warn('Cannot reset rate limit without Redis');
      return;
    }

    const key = this.getKey(userId, endpointType);
    await this.redisClient.del(key);
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string, endpointType: string = 'authenticated'): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }

    const key = this.getKey(userId, endpointType);
    const count = await this.redisClient.get(key);
    return parseInt(count) || 0;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiterService | null = null;

/**
 * Get or create rate limiter singleton
 */
export function getRateLimiter(redisClient?: any): RateLimiterService {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiterService(redisClient);
  }
  return rateLimiterInstance;
}

/**
 * Middleware factory for rate limiting
 * Checks rate limit and returns 429 if exceeded
 *
 * Usage in routes:
 * ```
 * import { rateLimitMiddleware } from '../middleware/rateLimit';
 *
 * router.post('/api/layouts',
 *   authMiddleware,
 *   rateLimitMiddleware('authenticated'),
 *   createLayout
 * );
 *
 * router.post('/api/export',
 *   authMiddleware,
 *   rateLimitMiddleware('export'),
 *   exportLayout
 * );
 * ```
 */
export function rateLimitMiddleware(endpointType: string = 'authenticated', cost: number = 1) {
  return async (req: any, res: any, next: any) => {
    try {
      // Skip rate limiting if no auth user
      if (!req.user) {
        return next();
      }

      const rateLimiter = getRateLimiter();
      await rateLimiter.initialize();

      const result = await rateLimiter.checkLimit(
        req.user.clerkId,
        req.user.tier || 'free',
        endpointType,
        cost
      );

      // Add rate limit headers to response using utility
      setRateLimitHeaders(res, result, req.user.tier || 'free', endpointType);

      if (!result.allowed) {
        return next(
          new AppError(
            `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            429,
            'RATE_LIMIT_EXCEEDED'
          )
        );
      }

      next();
    } catch (error) {
      // On error, allow request to proceed
      next();
    }
  };
}
