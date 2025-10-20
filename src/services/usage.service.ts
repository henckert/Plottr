/**
 * Usage Aggregation Service
 * Aggregates usage events into daily/monthly summaries for reporting
 * Manages period resets and quota calculations
 */

import { UsageRepo, UsageEvent, UsageAggregate, UsageLimit } from '../data/usage.repo';
import { UserTier, LAYOUT_LIMITS, RATE_LIMITS, getLayoutLimit, getRateLimit } from '../lib/tiers';
import { AppError } from '../errors';

export interface PeriodSummary {
  period_start: Date;
  period_type: 'daily' | 'monthly';
  layouts_created: number;
  layouts_deleted: number;
  exports: number;
  ai_calls: number;
  uploads: number;
  total_cost: number;
  layout_limit: number;
  layouts_remaining: number;
  period_reset_at: Date;
  tier: UserTier;
}

export interface QuotaStatus {
  tier: UserTier;
  current_period_start: Date;
  period_reset_date: Date;
  layouts_used: number;
  layouts_remaining: number;
  layout_limit: number;
  is_rate_limited: boolean;
  rate_limit_until?: Date;
  percentage_used: number;
}

/**
 * Manages usage aggregation and quota tracking
 */
export class UsageService {
  private repository: UsageRepo;

  constructor(repository: UsageRepo) {
    this.repository = repository;
  }

  /**
   * Get the current period start date for a given date and period type
   */
  private getPeriodStart(date: Date, periodType: 'daily' | 'monthly'): Date {
    const d = new Date(date);
    if (periodType === 'daily') {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  /**
   * Get the next period reset date
   */
  private getNextPeriodReset(date: Date, periodType: 'daily' | 'monthly'): Date {
    const next = new Date(date);
    if (periodType === 'daily') {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    } else {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
    }
    return next;
  }

  /**
   * Aggregate usage for a specific period
   */
  async aggregateUsagePeriod(
    userId: string,
    periodDate: Date,
    periodType: 'daily' | 'monthly'
  ): Promise<PeriodSummary> {
    try {
      const periodStart = this.getPeriodStart(periodDate, periodType);
      const periodEnd = this.getNextPeriodReset(periodStart, periodType);

      // Get events for this period
      const events = await this.repository.getEventsByDateRange(
        userId,
        periodStart,
        periodEnd
      );

      // Calculate metrics by resource type
      const metrics = {
        layouts_created: 0,
        layouts_deleted: 0,
        exports: 0,
        ai_calls: 0,
        uploads: 0,
        total_cost: 0,
      };

      for (const event of events) {
        metrics.total_cost += event.cost;

        switch (event.resource_type) {
          case 'layout':
            if (event.action === 'create') {
              metrics.layouts_created++;
            } else if (event.action === 'delete') {
              metrics.layouts_deleted++;
            }
            break;
          case 'export':
            metrics.exports++;
            break;
          case 'ai':
            metrics.ai_calls++;
            break;
          case 'upload':
            metrics.uploads++;
            break;
        }
      }

      // Get user's limit info to get tier and layout limit
      const limitRecord = await this.repository.getOrCreateLimit(userId);
      const tier = limitRecord.tier;
      const layoutLimit = limitRecord.layout_limit_override || getLayoutLimit(tier);
      const layoutsRemaining = Math.max(0, layoutLimit - metrics.layouts_created);

      // Upsert aggregate
      const aggregate = await this.repository.upsertAggregate({
        user_id: userId,
        period_start: periodStart,
        period_type: periodType,
        tier,
        layouts_created: metrics.layouts_created,
        layouts_deleted: metrics.layouts_deleted,
        exports: metrics.exports,
        ai_calls: metrics.ai_calls,
        uploads: metrics.uploads,
        total_cost: metrics.total_cost,
        layout_limit: layoutLimit,
        rate_limit_authenticated: getRateLimit(tier, 'authenticated'),
        rate_limit_export: getRateLimit(tier, 'export'),
        rate_limit_ai: getRateLimit(tier, 'ai'),
        layouts_remaining: layoutsRemaining,
        period_reset_at: periodEnd,
      });

      return {
        period_start: aggregate.period_start,
        period_type: aggregate.period_type,
        layouts_created: aggregate.layouts_created,
        layouts_deleted: aggregate.layouts_deleted,
        exports: aggregate.exports,
        ai_calls: aggregate.ai_calls,
        uploads: aggregate.uploads,
        total_cost: aggregate.total_cost,
        layout_limit: aggregate.layout_limit,
        layouts_remaining: aggregate.layouts_remaining || 0,
        period_reset_at: aggregate.period_reset_at || new Date(),
        tier: aggregate.tier,
      };
    } catch (error) {
      console.error('Error aggregating usage period:', error);
      throw new AppError(
        'Failed to aggregate usage data',
        500,
        'USAGE_AGGREGATION_ERROR'
      );
    }
  }

  /**
   * Get current period summary
   */
  async getCurrentPeriodSummary(userId: string): Promise<PeriodSummary | null> {
    try {
      const now = new Date();
      const periodStart = this.getPeriodStart(now, 'monthly');
      const aggregate = await this.repository.getAggregate(userId, periodStart, 'monthly');

      if (!aggregate) {
        // If no aggregate yet, create one by aggregating events
        return await this.aggregateUsagePeriod(userId, now, 'monthly');
      }

      return {
        period_start: aggregate.period_start,
        period_type: aggregate.period_type,
        layouts_created: aggregate.layouts_created,
        layouts_deleted: aggregate.layouts_deleted,
        exports: aggregate.exports,
        ai_calls: aggregate.ai_calls,
        uploads: aggregate.uploads,
        total_cost: aggregate.total_cost,
        layout_limit: aggregate.layout_limit,
        layouts_remaining: aggregate.layouts_remaining || 0,
        period_reset_at: aggregate.period_reset_at || new Date(),
        tier: aggregate.tier,
      };
    } catch (error) {
      console.error('Error getting current period summary:', error);
      return null;
    }
  }

  /**
   * Get usage history (multiple periods)
   */
  async getUsageHistory(
    userId: string,
    months: number = 6
  ): Promise<PeriodSummary[]> {
    try {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months);

      const aggregates = await this.repository.getAggregatesByDateRange(
        userId,
        startDate,
        endDate,
        'monthly'
      );

      return aggregates
        .sort((a: any, b: any) => b.period_start.getTime() - a.period_start.getTime())
        .map((agg: any) => ({
          period_start: agg.period_start,
          period_type: agg.period_type,
          layouts_created: agg.layouts_created,
          layouts_deleted: agg.layouts_deleted,
          exports: agg.exports,
          ai_calls: agg.ai_calls,
          uploads: agg.uploads,
          total_cost: agg.total_cost,
          layout_limit: agg.layout_limit,
          layouts_remaining: agg.layouts_remaining || 0,
          period_reset_at: agg.period_reset_at || new Date(),
          tier: agg.tier,
        }));
    } catch (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }
  }

  /**
   * Get current quota status for a user
   */
  async getQuotaStatus(userId: string): Promise<QuotaStatus> {
    try {
      const limitRecord = await this.repository.getOrCreateLimit(userId);
      const tier = limitRecord.tier;
      const layoutLimit = limitRecord.layout_limit_override || getLayoutLimit(tier);
      const layoutsRemaining = Math.max(0, layoutLimit - limitRecord.layouts_used);
      const percentageUsed =
        layoutLimit === Infinity
          ? 0
          : Math.round((limitRecord.layouts_used / layoutLimit) * 100);

      return {
        tier,
        current_period_start: limitRecord.current_period_start,
        period_reset_date: limitRecord.period_reset_date,
        layouts_used: limitRecord.layouts_used,
        layouts_remaining: layoutsRemaining,
        layout_limit: layoutLimit === Infinity ? -1 : layoutLimit,
        is_rate_limited: limitRecord.is_rate_limited,
        rate_limit_until: limitRecord.rate_limit_until,
        percentage_used: percentageUsed,
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      throw new AppError(
        'Failed to get quota status',
        500,
        'QUOTA_STATUS_ERROR'
      );
    }
  }

  /**
   * Check if user has exceeded layout quota
   */
  async isLayoutQuotaExceeded(userId: string): Promise<boolean> {
    try {
      const limitRecord = await this.repository.getOrCreateLimit(userId);
      const tier = limitRecord.tier;
      const layoutLimit = limitRecord.layout_limit_override || getLayoutLimit(tier);

      // Infinite limit means never exceeded
      if (layoutLimit === Infinity) {
        return false;
      }

      return limitRecord.layouts_used >= layoutLimit;
    } catch (error) {
      console.error('Error checking layout quota:', error);
      return false;
    }
  }

  /**
   * Reset user quota for a new period
   * Called periodically to reset quotas on period boundaries
   */
  async resetPeriodQuota(userId: string): Promise<void> {
    try {
      const now = new Date();
      const periodStart = this.getPeriodStart(now, 'monthly');
      const periodReset = this.getNextPeriodReset(periodStart, 'monthly');

      await this.repository.updateLimit(userId, {
        current_period_start: periodStart,
        period_reset_date: periodReset,
        layouts_used: 0,
        total_cost_used: 0,
        is_rate_limited: false,
        rate_limit_until: undefined,
      });
    } catch (error) {
      console.error('Error resetting period quota:', error);
      throw new AppError(
        'Failed to reset period quota',
        500,
        'QUOTA_RESET_ERROR'
      );
    }
  }

  /**
   * Set rate limit for a user
   */
  async setRateLimit(
    userId: string,
    rateLimitUntil: Date,
    isLimited: boolean = true
  ): Promise<void> {
    try {
      await this.repository.updateLimit(userId, {
        is_rate_limited: isLimited,
        rate_limit_until: isLimited ? rateLimitUntil : undefined,
      });
    } catch (error) {
      console.error('Error setting rate limit:', error);
      throw new AppError(
        'Failed to set rate limit',
        500,
        'RATE_LIMIT_ERROR'
      );
    }
  }

  /**
   * Update tier and recalculate quotas
   */
  async updateUserTier(userId: string, newTier: UserTier): Promise<void> {
    try {
      // Update the limit record with new tier
      await this.repository.updateLimit(userId, {
        tier: newTier,
        layout_limit_override: undefined, // Clear override when tier changes
      });

      // Note: Layouts limit resets when tier changes
      await this.resetPeriodQuota(userId);
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw new AppError(
        'Failed to update user tier',
        500,
        'TIER_UPDATE_ERROR'
      );
    }
  }

  /**
   * Override layout limit (admin feature)
   */
  async overrideLayoutLimit(userId: string, newLimit: number | undefined): Promise<void> {
    try {
      await this.repository.updateLimit(userId, {
        layout_limit_override: newLimit,
      });
    } catch (error) {
      console.error('Error overriding layout limit:', error);
      throw new AppError(
        'Failed to override layout limit',
        500,
        'LIMIT_OVERRIDE_ERROR'
      );
    }
  }

  /**
   * Cleanup old archived events
   * Should be called as a periodic background job
   */
  async cleanupArchivedEvents(beforeDate: Date): Promise<number> {
    try {
      return await this.repository.archiveOldEvents(beforeDate);
    } catch (error) {
      console.error('Error cleaning up archived events:', error);
      return 0;
    }
  }
}
