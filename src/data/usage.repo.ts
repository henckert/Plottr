/**
 * Usage Events Repository
 * Handles all database operations for usage tracking
 * 
 * Immutable event logging pattern:
 * - Events are write-once (no updates)
 * - Queries for reporting aggregate data
 * - Archives old events for cleanup
 */

import { getKnex } from './knex';
import { AppError } from '../errors';
import { UserTier } from '../lib/tiers';

export interface UsageEvent {
  id?: string;
  user_id: string;
  resource_type: string; // layouts, exports, ai_calls, uploads, etc.
  action: string; // created, deleted, exported, called, etc.
  cost: number; // Cost in units for this operation
  tier: UserTier;
  metadata?: Record<string, any>; // Additional context
  description?: string;
  created_at?: Date;
  archived_at?: Date | null;
}

export interface UsageAggregate {
  user_id: string;
  period_start: Date;
  period_type: 'daily' | 'monthly';
  tier: UserTier;
  layouts_created: number;
  layouts_deleted: number;
  exports: number;
  ai_calls: number;
  uploads: number;
  total_cost: number;
  layout_limit: number;
  rate_limit_authenticated: number;
  rate_limit_export: number;
  rate_limit_ai: number;
  layouts_remaining?: number;
  period_reset_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface UsageLimit {
  id?: string;
  user_id: string;
  tier: UserTier;
  current_period_start: Date;
  period_reset_date: Date;
  layouts_used: number;
  total_cost_used: number;
  layout_limit_override?: number;
  rate_limit_override?: number;
  is_rate_limited: boolean;
  rate_limit_until?: Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Singleton repository for usage operations
 */
export class UsageRepo {
  /**
   * Record a usage event
   * Immutable: events are never updated, only archived
   */
  async recordEvent(event: UsageEvent): Promise<UsageEvent> {
    try {
      const db = getKnex();
      const [insertedEvent] = await db('usage_events')
        .insert({
          user_id: event.user_id,
          resource_type: event.resource_type,
          action: event.action,
          cost: event.cost,
          tier: event.tier,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          description: event.description,
          created_at: event.created_at || new Date(),
        })
        .returning('*');

      return this.formatEvent(insertedEvent);
    } catch (error) {
      console.error('Error recording usage event:', error);
      throw new AppError(
        'Failed to record usage event',
        500,
        'USAGE_RECORD_ERROR'
      );
    }
  }

  /**
   * Get events for a user in a date range
   */
  async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    resourceType?: string
  ): Promise<UsageEvent[]> {
    try {
      const db = getKnex();
      let query = db('usage_events')
        .where('user_id', userId)
        .whereBetween('created_at', [startDate, endDate])
        .whereNull('archived_at')
        .orderBy('created_at', 'desc');

      if (resourceType) {
        query = query.where('resource_type', resourceType);
      }

      const events = await query;
      return events.map((e: any) => this.formatEvent(e));
    } catch (error) {
      console.error('Error fetching usage events:', error);
      throw new AppError(
        'Failed to fetch usage events',
        500,
        'USAGE_FETCH_ERROR'
      );
    }
  }

  /**
   * Count events by resource type in a date range
   */
  async countEventsByType(
    userId: string,
    resourceType: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const db = getKnex();
      const [result] = await db('usage_events')
        .count('*', { as: 'count' })
        .where('user_id', userId)
        .where('resource_type', resourceType)
        .whereBetween('created_at', [startDate, endDate])
        .whereNull('archived_at');

      return parseInt(result?.count as string) || 0;
    } catch (error) {
      console.error('Error counting usage events:', error);
      return 0;
    }
  }

  /**
   * Get or create usage aggregate for a period
   */
  async upsertAggregate(aggregate: UsageAggregate): Promise<UsageAggregate> {
    try {
      const db = getKnex();

      // Check if aggregate exists
      const existing = await db('usage_aggregates')
        .where({
          user_id: aggregate.user_id,
          period_start: aggregate.period_start,
          period_type: aggregate.period_type,
        })
        .first();

      if (existing) {
        // Update existing aggregate
        const [updated] = await db('usage_aggregates')
          .where({
            user_id: aggregate.user_id,
            period_start: aggregate.period_start,
            period_type: aggregate.period_type,
          })
          .update({
            ...aggregate,
            updated_at: new Date(),
          })
          .returning('*');

        return this.formatAggregate(updated);
      } else {
        // Insert new aggregate
        const [inserted] = await db('usage_aggregates')
          .insert(aggregate)
          .returning('*');

        return this.formatAggregate(inserted);
      }
    } catch (error) {
      console.error('Error upserting usage aggregate:', error);
      throw new AppError(
        'Failed to upsert usage aggregate',
        500,
        'USAGE_AGGREGATE_ERROR'
      );
    }
  }

  /**
   * Get aggregate for a specific period
   */
  async getAggregate(
    userId: string,
    periodStart: Date,
    periodType: 'daily' | 'monthly'
  ): Promise<UsageAggregate | null> {
    try {
      const db = getKnex();
      const aggregate = await db('usage_aggregates')
        .where({
          user_id: userId,
          period_start: periodStart,
          period_type: periodType,
        })
        .first();

      return aggregate ? this.formatAggregate(aggregate) : null;
    } catch (error) {
      console.error('Error fetching usage aggregate:', error);
      return null;
    }
  }

  /**
   * Get aggregates for a user in a date range
   */
  async getAggregatesByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    periodType: 'daily' | 'monthly' = 'monthly'
  ): Promise<UsageAggregate[]> {
    try {
      const db = getKnex();
      const aggregates = await db('usage_aggregates')
        .where('user_id', userId)
        .where('period_type', periodType)
        .whereBetween('period_start', [startDate, endDate])
        .orderBy('period_start', 'desc');

      return aggregates.map((a: any) => this.formatAggregate(a));
    } catch (error) {
      console.error('Error fetching usage aggregates:', error);
      return [];
    }
  }

  /**
   * Get or create usage limit for a user
   */
  async getOrCreateLimit(userId: string): Promise<UsageLimit> {
    try {
      const db = getKnex();

      // Check if limit record exists
      let limit = await db('usage_limits')
        .where('user_id', userId)
        .first();

      if (!limit) {
        // Create new limit record with current period
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(periodStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        [limit] = await db('usage_limits')
          .insert({
            user_id: userId,
            tier: 'free', // Default tier
            current_period_start: periodStart,
            period_reset_date: nextMonth,
            layouts_used: 0,
            total_cost_used: 0,
            is_rate_limited: false,
          })
          .returning('*');
      }

      return this.formatLimit(limit);
    } catch (error) {
      console.error('Error getting or creating usage limit:', error);
      throw new AppError(
        'Failed to get usage limit',
        500,
        'USAGE_LIMIT_ERROR'
      );
    }
  }

  /**
   * Update usage limit
   */
  async updateLimit(userId: string, updates: Partial<UsageLimit>): Promise<UsageLimit> {
    try {
      const db = getKnex();
      const [updated] = await db('usage_limits')
        .where('user_id', userId)
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .returning('*');

      return this.formatLimit(updated);
    } catch (error) {
      console.error('Error updating usage limit:', error);
      throw new AppError(
        'Failed to update usage limit',
        500,
        'USAGE_LIMIT_ERROR'
      );
    }
  }

  /**
   * Archive old events (for cleanup and performance)
   * Typically called as a background job
   */
  async archiveOldEvents(beforeDate: Date): Promise<number> {
    try {
      const db = getKnex();
      const count = await db('usage_events')
        .where('created_at', '<', beforeDate)
        .whereNull('archived_at')
        .update({ archived_at: new Date() });

      return count;
    } catch (error) {
      console.error('Error archiving old events:', error);
      return 0;
    }
  }

  /**
   * Format event from database (parse JSON)
   */
  private formatEvent(event: any): UsageEvent {
    return {
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
    };
  }

  /**
   * Format aggregate from database
   */
  private formatAggregate(aggregate: any): UsageAggregate {
    return aggregate;
  }

  /**
   * Format limit from database
   */
  private formatLimit(limit: any): UsageLimit {
    return limit;
  }
}

// Singleton instance
let usageRepoInstance: UsageRepo | null = null;

/**
 * Get or create usage repository singleton
 */
export function getUsageRepo(): UsageRepo {
  if (!usageRepoInstance) {
    usageRepoInstance = new UsageRepo();
  }
  return usageRepoInstance;
}
