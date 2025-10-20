/**
 * Tier-Based Authorization Middleware
 * Enforces usage limits based on user tier (free, paid_individual, club_admin, admin)
 * Checks layout creation limits and tier requirements
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from '../errors';
import { UserTier, LAYOUT_LIMITS, TIER_STATUS_CODES, TIER_ERROR_MESSAGES } from '../lib/tiers';
// NOTE: Deprecated - LayoutsRepo interface changed, this middleware needs refactoring
// import { getLayoutsRepo } from '../data/layouts.repo';
import { setTierHeaders, setRateLimitHeaders } from '../lib/rateLimitHeaders';

/**
 * Check if user tier allows layout creation
 * Free tier limited to 3 layouts, paid tiers have higher limits
 *
 * Usage in routes:
 * ```
 * router.post('/api/layouts', authMiddleware, tierMiddleware('layouts'), createLayout);
 * ```
 */
export async function tierMiddleware(resource: 'layouts' | 'templates' | 'ai_features' = 'layouts') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip tier check for admins (unlimited access)
      if (req.user?.tier === 'admin') {
        return next();
      }

      // Enforce layout creation limits
      if (resource === 'layouts' && req.method === 'POST') {
        const userTier = req.user?.tier || 'free';
        const limit = LAYOUT_LIMITS[userTier as UserTier];

        // For layout creation, attach the limit to request for later use
        (req as any).tierLimit = limit;
        (req as any).tierResource = resource;
      }

      // Enforce premium features (AI, exports, etc.)
      if (resource === 'ai_features' && req.user?.tier === 'free') {
        return next(
          new AppError(
            TIER_ERROR_MESSAGES.TIER_UPGRADE_REQUIRED,
            403,
            'TIER_UPGRADE_REQUIRED'
          )
        );
      }

      next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Middleware to check layout limit before creation
 * Should be used after tierMiddleware and before controller
 *
 * Requires:
 * - req.user (from authMiddleware)
 * - layoutCount parameter passed to middleware
 *
 * Usage in routes:
 * ```
 * router.post('/api/layouts',
 *   authMiddleware,
 *   checkLayoutLimit(getUsersRepo(), getLayoutsRepo()),
 *   createLayout
 * );
 * ```
 */
export function checkLayoutLimit(getUsersRepo: any, getLayoutsRepo: any) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.method !== 'POST') {
        return next();
      }

      const userTier = req.user?.tier || 'free';
      if (userTier === 'admin') {
        return next(); // Admins have unlimited
      }

      const limit = LAYOUT_LIMITS[userTier as UserTier];

      // Get layout count for current user
      const layoutsRepo = getLayoutsRepo();
      let layoutCount = 0;

      try {
        layoutCount = await layoutsRepo.countByUser(req.user!.clerkId);
      } catch (err: any) {
        // Handle missing table in test environment
        if (process.env.NODE_ENV === 'test' && err?.code === '42P01') {
          // Table doesn't exist in test: treat as 0 layouts
          layoutCount = 0;
          console.warn('[tier.ts] Table layouts missing in test, assuming 0 layouts');
        } else {
          throw err;
        }
      }

      if (layoutCount >= limit) {
        return next(
          new AppError(
            TIER_ERROR_MESSAGES.LAYOUT_LIMIT_REACHED,
            TIER_STATUS_CODES.LAYOUT_LIMIT_REACHED,
            'LAYOUT_LIMIT_REACHED'
          )
        );
      }

      // Attach remaining quota to request for response headers
      (req as any).tierQuotaRemaining = limit - layoutCount;

      next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Middleware to add tier information to response headers
 * Helps frontend track usage limits
 *
 * Adds headers:
 * - X-Tier: User's tier (free, paid_individual, club_admin, admin)
 * - X-Tier-Level: Numeric tier level (0-3)
 * - X-Layout-Limit: Layout creation limit for this tier
 * - X-Quota-Remaining: Remaining quota for current operation
 *
 * Usage in routes:
 * ```
 * router.post('/api/layouts',
 *   authMiddleware,
 *   tierMiddleware('layouts'),
 *   checkLayoutLimit(...),
 *   createLayout
 * );
 * // addTierHeaders runs automatically as part of response processing
 * ```
 */
export function addTierHeaders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const tier = req.user?.tier || 'free';

    // Set tier information headers using utility
    setTierHeaders(res, tier as UserTier, (req as any).tierQuotaRemaining);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require user to be on a specific tier or higher
 * @example
 * router.post('/api/ai-generate',
 *   authMiddleware,
 *   requireTier('paid_individual'),
 *   generateAILayout
 * );
 */
export function requireTier(minimumTier: UserTier) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userTier = req.user?.tier || 'free';

      // Create hierarchy for comparison
      const tierOrder: UserTier[] = ['free', 'paid_individual', 'club_admin', 'admin'];
      const userIndex = tierOrder.indexOf(userTier as UserTier);
      const requiredIndex = tierOrder.indexOf(minimumTier);

      if (userIndex < requiredIndex) {
        return next(
          new AppError(
            TIER_ERROR_MESSAGES.TIER_UPGRADE_REQUIRED,
            TIER_STATUS_CODES.UNAUTHORIZED_TIER,
            'TIER_UPGRADE_REQUIRED'
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
