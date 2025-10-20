/**
 * Usage Analytics Routes
 * Endpoints for accessing usage history and quota information
 *
 * Protected Routes (require authentication):
 * - GET /api/usage/current - Current period usage and quota
 * - GET /api/usage/history - Monthly usage history (past 6 months default)
 * - GET /api/usage/status - Quota status and rate limit info
 */

import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { addTierHeaders } from '../middleware/tier';
import { UsageRepo } from '../data/usage.repo';
import { UsageService } from '../services/usage.service';
import { AppError } from '../errors';

const router = Router();

// Initialize services
const usageRepo = new UsageRepo();
const usageService = new UsageService(usageRepo);

/**
 * GET /api/usage/current
 * Get current period usage and quota status
 *
 * Response:
 * {
 *   tier: 'free|paid_individual|club_admin|admin',
 *   current_period_start: ISO date string,
 *   period_reset_date: ISO date string,
 *   layouts_used: number,
 *   layouts_remaining: number,
 *   layout_limit: number | -1 (for infinite),
 *   percentage_used: 0-100,
 *   is_rate_limited: boolean,
 *   rate_limit_until?: ISO date string
 * }
 */
router.get(
  '/current',
  addTierHeaders,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.clerkId;
      if (!userId) {
        throw new AppError('User ID not found', 401, 'INVALID_REQUEST');
      }

      const quotaStatus = await usageService.getQuotaStatus(userId);

      res.json({
        tier: quotaStatus.tier,
        current_period_start: quotaStatus.current_period_start.toISOString(),
        period_reset_date: quotaStatus.period_reset_date.toISOString(),
        layouts_used: quotaStatus.layouts_used,
        layouts_remaining: quotaStatus.layouts_remaining,
        layout_limit: quotaStatus.layout_limit,
        percentage_used: quotaStatus.percentage_used,
        is_rate_limited: quotaStatus.is_rate_limited,
        ...(quotaStatus.rate_limit_until && {
          rate_limit_until: quotaStatus.rate_limit_until.toISOString(),
        }),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/usage/history
 * Get historical usage data (default: past 6 months)
 *
 * Query Parameters:
 * - months: number of months to retrieve (default: 6)
 *
 * Response:
 * [
 *   {
 *     period_start: ISO date string,
 *     period_type: 'monthly',
 *     layouts_created: number,
 *     layouts_deleted: number,
 *     exports: number,
 *     ai_calls: number,
 *     uploads: number,
 *     total_cost: number,
 *     layout_limit: number,
 *     layouts_remaining: number,
 *     period_reset_at: ISO date string,
 *     tier: tier name
 *   },
 *   ...
 * ]
 */
router.get(
  '/history',
  addTierHeaders,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.clerkId;
      if (!userId) {
        throw new AppError('User ID not found', 401, 'INVALID_REQUEST');
      }

      const months = Math.min(
        parseInt(req.query.months as string) || 6,
        24 // Cap at 2 years
      );

      const history = await usageService.getUsageHistory(userId, months);

      res.json({
        user_id: userId,
        months: months,
        periods: history.map((period) => ({
          period_start: period.period_start.toISOString(),
          period_type: period.period_type,
          layouts_created: period.layouts_created,
          layouts_deleted: period.layouts_deleted,
          exports: period.exports,
          ai_calls: period.ai_calls,
          uploads: period.uploads,
          total_cost: period.total_cost,
          layout_limit: period.layout_limit,
          layouts_remaining: period.layouts_remaining,
          period_reset_at: period.period_reset_at.toISOString(),
          tier: period.tier,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/usage/status
 * Detailed quota and rate limit status
 *
 * Response:
 * {
 *   quota: {
 *     layouts_limit: number | -1,
 *     layouts_used: number,
 *     layouts_remaining: number,
 *     percentage_used: 0-100,
 *     period_reset_date: ISO date
 *   },
 *   rate_limit: {
 *     is_limited: boolean,
 *     limited_until?: ISO date,
 *     tier_limits: {
 *       authenticated: number,
 *       export: number,
 *       ai: number
 *     }
 *   },
 *   tier_info: {
 *     tier: tier name,
 *     hierarchy_level: 0-3
 *   }
 * }
 */
router.get(
  '/status',
  addTierHeaders,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.clerkId;
      if (!userId) {
        throw new AppError('User ID not found', 401, 'INVALID_REQUEST');
      }

      const quotaStatus = await usageService.getQuotaStatus(userId);

      res.json({
        quota: {
          layouts_limit: quotaStatus.layout_limit,
          layouts_used: quotaStatus.layouts_used,
          layouts_remaining: quotaStatus.layouts_remaining,
          percentage_used: quotaStatus.percentage_used,
          period_reset_date: quotaStatus.period_reset_date.toISOString(),
        },
        rate_limit: {
          is_limited: quotaStatus.is_rate_limited,
          ...(quotaStatus.rate_limit_until && {
            limited_until: quotaStatus.rate_limit_until.toISOString(),
          }),
        },
        tier_info: {
          tier: quotaStatus.tier,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
