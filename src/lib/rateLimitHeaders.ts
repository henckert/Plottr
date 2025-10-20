/**
 * Rate Limit Response Headers Utility
 * Constructs and sets HTTP response headers for rate limit information
 * Follows RateLimit header specification (RFC 6585 + drafts)
 *
 * Headers set:
 * - X-RateLimit-Limit: Maximum requests allowed in the current window
 * - X-RateLimit-Remaining: Number of requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * - Retry-After: Seconds to wait before retrying (on 429 responses)
 *
 * References:
 * - https://tools.ietf.org/html/draft-polli-ratelimit-headers
 * - https://developer.github.com/v3/#rate-limiting
 */

import { Response } from 'express';
import { UserTier, getRateLimit, getLayoutLimit } from './tiers';
import { RateLimitResult } from '../services/rateLimiter.service';

/**
 * Set rate limit response headers
 * @param res Express Response object
 * @param result Rate limit check result with remaining count and reset time
 * @param tier User's tier for determining limit
 * @param endpointType Type of endpoint (authenticated, export, ai, upload)
 */
export function setRateLimitHeaders(
  res: Response,
  result: RateLimitResult,
  tier: UserTier = 'free',
  endpointType: string = 'authenticated'
): void {
  const limit = getRateLimit(tier, endpointType);
  const resetTimestamp = Math.floor(result.resetAt.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  const secondsUntilReset = Math.max(0, resetTimestamp - now);

  // X-RateLimit-Limit: Total requests allowed in window
  res.setHeader('X-RateLimit-Limit', limit === Infinity ? 'unlimited' : limit.toString());

  // X-RateLimit-Remaining: Requests remaining in current window
  res.setHeader(
    'X-RateLimit-Remaining',
    result.remaining === Infinity ? 'unlimited' : result.remaining.toString()
  );

  // X-RateLimit-Reset: Unix timestamp when window resets
  res.setHeader('X-RateLimit-Reset', resetTimestamp.toString());

  // Retry-After: Only set if rate limit was exceeded
  if (!result.allowed && result.retryAfter) {
    res.setHeader('Retry-After', result.retryAfter.toString());
  }
}

/**
 * Set tier information headers
 * Communicates user's current tier and associated limits
 * Used by frontend for UI decisions (show upgrade prompts, etc.)
 *
 * @param res Express Response object
 * @param tier User's tier
 * @param quotaRemaining Optional: specific quota remaining for the resource
 */
export function setTierHeaders(
  res: Response,
  tier: UserTier = 'free',
  quotaRemaining?: number
): void {
  // X-Tier: User's current tier level
  res.setHeader('X-Tier', tier);

  // X-Tier-Level: Numeric tier level (0-3) for easier comparisons
  const tierLevels = {
    free: '0',
    paid_individual: '1',
    club_admin: '2',
    admin: '3',
  };
  res.setHeader('X-Tier-Level', tierLevels[tier]);

  // X-Layout-Limit: Layout creation limit for this tier (from LAYOUT_LIMITS)
  res.setHeader('X-Layout-Limit', getLayoutLimit(tier).toString());

  // X-Quota-Remaining: Specific quota for current operation
  if (quotaRemaining !== undefined) {
    res.setHeader('X-Quota-Remaining', quotaRemaining.toString());
  }
}

/**
 * Compute recommended wait time in seconds
 * Takes into account the window reset time
 *
 * @param resetAt Timestamp when rate limit window resets
 * @returns Recommended seconds to wait before retrying
 */
export function getRetryAfter(resetAt: Date): number {
  const now = Date.now();
  const resetTime = resetAt.getTime();
  const delayMs = Math.max(0, resetTime - now);
  return Math.ceil(delayMs / 1000);
}

/**
 * Build rate limit error response
 * Returns formatted error with rate limit details
 *
 * @param result Rate limit check result
 * @param tier User's tier
 * @param endpointType Type of endpoint
 * @returns Error object with rate limit information
 */
export function buildRateLimitError(
  result: RateLimitResult,
  tier: UserTier = 'free',
  endpointType: string = 'authenticated'
): {
  code: string;
  message: string;
  status: number;
  retryAfter: number;
  resetAt: string;
} {
  const retryAfter = result.retryAfter || getRetryAfter(result.resetAt);

  return {
    code: 'RATE_LIMIT_EXCEEDED',
    message: `Rate limit exceeded. You have exceeded the limit for ${endpointType} operations on your ${tier} tier. Please try again in ${retryAfter} seconds.`,
    status: 429,
    retryAfter,
    resetAt: result.resetAt.toISOString(),
  };
}

/**
 * Check if response should include rate limit information
 * Don't add headers for non-authenticated requests or errors
 *
 * @param req Express Request object
 * @param status HTTP status code
 * @returns true if headers should be added
 */
export function shouldIncludeRateLimitHeaders(req: any, status?: number): boolean {
  // Include headers if user is authenticated
  if (req.user?.clerkId) {
    return true;
  }

  // Include on 401/403 to show unauthenticated users what tier limits are
  if (status === 401 || status === 403) {
    return true;
  }

  return false;
}

/**
 * Format rate limit information for API response
 * Used in error responses and info endpoints
 *
 * @param tier User's tier
 * @param result Rate limit check result
 * @param endpointType Type of endpoint
 * @returns Formatted rate limit information object
 */
export function formatRateLimitInfo(
  tier: UserTier,
  result: RateLimitResult,
  endpointType: string = 'authenticated'
): {
  tier: UserTier;
  endpoint: string;
  limit: number | string;
  remaining: number | string;
  resetAt: string;
  windowSeconds: number;
} {
  const limit = getRateLimit(tier, endpointType);

  return {
    tier,
    endpoint: endpointType,
    limit: limit === Infinity ? 'unlimited' : limit,
    remaining: result.remaining === Infinity ? 'unlimited' : result.remaining,
    resetAt: result.resetAt.toISOString(),
    windowSeconds: 60, // Always 1-minute window
  };
}
