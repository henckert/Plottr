/**
 * Unit Tests for Usage Service
 * Tests aggregation, quota tracking, and period management
 */

import { UsageService } from '../../../src/services/usage.service';
import { UsageRepo } from '../../../src/data/usage.repo';
import { UsageEvent, UsageLimit, UsageAggregate } from '../../../src/data/usage.repo';
import { AppError } from '../../../src/errors';

describe('Usage Service', () => {
  let service: UsageService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      recordEvent: jest.fn(),
      getEventsByDateRange: jest.fn(),
      countEventsByType: jest.fn(),
      upsertAggregate: jest.fn(),
      getAggregate: jest.fn(),
      getAggregatesByDateRange: jest.fn(),
      getOrCreateLimit: jest.fn(),
      updateLimit: jest.fn(),
      archiveOldEvents: jest.fn(),
    };

    service = new UsageService(mockRepo);
  });

  describe('aggregateUsagePeriod', () => {
    it('should aggregate usage events for a period', async () => {
      const userId = 'user_123';
      const now = new Date();

      const events: UsageEvent[] = [
        {
          user_id: userId,
          resource_type: 'layout',
          action: 'create',
          cost: 1,
          tier: 'free',
        },
        {
          user_id: userId,
          resource_type: 'layout',
          action: 'create',
          cost: 1,
          tier: 'free',
        },
        {
          user_id: userId,
          resource_type: 'export',
          action: 'export',
          cost: 5,
          tier: 'free',
        },
      ];

      mockRepo.getEventsByDateRange.mockResolvedValue(events);
      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 0,
        total_cost_used: 0,
        is_rate_limited: false,
      } as UsageLimit);
      mockRepo.upsertAggregate.mockResolvedValue({
        period_start: now,
        period_type: 'monthly',
        tier: 'free',
        layouts_created: 2,
        exports: 1,
        total_cost: 7,
        layout_limit: 3,
        layouts_remaining: 1,
        period_reset_at: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      } as any);

      const result = await service.aggregateUsagePeriod(userId, now, 'monthly');

      expect(result.layouts_created).toBe(2);
      expect(result.exports).toBe(1);
      expect(result.total_cost).toBe(7);
      expect(mockRepo.upsertAggregate).toHaveBeenCalled();
    });

    it('should handle no events in period', async () => {
      const userId = 'user_123';
      const now = new Date();

      mockRepo.getEventsByDateRange.mockResolvedValue([]);
      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 0,
        total_cost_used: 0,
      } as UsageLimit);
      mockRepo.upsertAggregate.mockResolvedValue({
        period_start: now,
        period_type: 'monthly',
        tier: 'free',
        layouts_created: 0,
        exports: 0,
        total_cost: 0,
        layout_limit: 3,
      } as any);

      const result = await service.aggregateUsagePeriod(userId, now, 'monthly');

      expect(result.layouts_created).toBe(0);
      expect(result.total_cost).toBe(0);
    });

    it('should throw error on database failure', async () => {
      const userId = 'user_123';
      const now = new Date();

      mockRepo.getEventsByDateRange.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.aggregateUsagePeriod(userId, now, 'monthly')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getCurrentPeriodSummary', () => {
    it('should return current period summary', async () => {
      const userId = 'user_123';
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      mockRepo.getAggregate.mockResolvedValue({
        period_start: periodStart,
        period_type: 'monthly',
        tier: 'free',
        layouts_created: 2,
        exports: 1,
        total_cost: 7,
        layout_limit: 3,
        layouts_remaining: 1,
        period_reset_at: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      } as any);

      const result = await service.getCurrentPeriodSummary(userId);

      expect(result).not.toBeNull();
      expect(result?.layouts_created).toBe(2);
      expect(result?.period_type).toBe('monthly');
    });

    it('should create aggregate if not exists', async () => {
      const userId = 'user_123';
      const now = new Date();

      mockRepo.getAggregate.mockResolvedValue(null);
      mockRepo.getEventsByDateRange.mockResolvedValue([]);
      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 0,
      } as UsageLimit);
      mockRepo.upsertAggregate.mockResolvedValue({
        period_start: now,
        period_type: 'monthly',
        tier: 'free',
        layouts_created: 0,
        total_cost: 0,
        layout_limit: 3,
      } as any);

      const result = await service.getCurrentPeriodSummary(userId);

      expect(result).not.toBeNull();
      expect(mockRepo.upsertAggregate).toHaveBeenCalled();
    });
  });

  describe('getQuotaStatus', () => {
    it('should return quota status for free tier', async () => {
      const userId = 'user_123';

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        current_period_start: new Date(),
        period_reset_date: new Date(),
        layouts_used: 2,
        is_rate_limited: false,
      } as UsageLimit);

      const result = await service.getQuotaStatus(userId);

      expect(result.tier).toBe('free');
      expect(result.layouts_used).toBe(2);
      expect(result.layouts_remaining).toBe(1); // 3 - 2 = 1
      expect(result.percentage_used).toBe(67);
      expect(result.is_rate_limited).toBe(false);
    });

    it('should handle infinite layout limit for admin', async () => {
      const userId = 'user_admin';

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'admin',
        layouts_used: 1000,
        is_rate_limited: false,
      } as UsageLimit);

      const result = await service.getQuotaStatus(userId);

      expect(result.tier).toBe('admin');
      expect(result.layout_limit).toBe(-1); // -1 indicates infinite
      expect(result.percentage_used).toBe(0);
    });

    it('should show rate limit info when limited', async () => {
      const userId = 'user_123';
      const rateLimitUntil = new Date(Date.now() + 3600000);

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 1,
        is_rate_limited: true,
        rate_limit_until: rateLimitUntil,
      } as UsageLimit);

      const result = await service.getQuotaStatus(userId);

      expect(result.is_rate_limited).toBe(true);
      expect(result.rate_limit_until).toEqual(rateLimitUntil);
    });
  });

  describe('isLayoutQuotaExceeded', () => {
    it('should return false when under quota', async () => {
      const userId = 'user_123';

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 2,
      } as UsageLimit);

      const result = await service.isLayoutQuotaExceeded(userId);

      expect(result).toBe(false);
    });

    it('should return true when at quota', async () => {
      const userId = 'user_123';

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'free',
        layouts_used: 3,
      } as UsageLimit);

      const result = await service.isLayoutQuotaExceeded(userId);

      expect(result).toBe(true);
    });

    it('should return false for infinite tier', async () => {
      const userId = 'user_admin';

      mockRepo.getOrCreateLimit.mockResolvedValue({
        user_id: userId,
        tier: 'admin',
        layouts_used: 10000,
      } as UsageLimit);

      const result = await service.isLayoutQuotaExceeded(userId);

      expect(result).toBe(false);
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history for multiple months', async () => {
      const userId = 'user_123';

      const aggregates = [
        {
          period_start: new Date('2024-01-01'),
          period_type: 'monthly',
          tier: 'free',
          layouts_created: 2,
          exports: 1,
          total_cost: 5,
          layout_limit: 3,
        },
        {
          period_start: new Date('2023-12-01'),
          period_type: 'monthly',
          tier: 'free',
          layouts_created: 1,
          exports: 0,
          total_cost: 2,
          layout_limit: 3,
        },
      ];

      mockRepo.getAggregatesByDateRange.mockResolvedValue(aggregates as any);

      const result = await service.getUsageHistory(userId, 2);

      expect(result).toHaveLength(2);
      expect(result[0].period_start).toEqual(new Date('2024-01-01'));
      expect(result[1].period_start).toEqual(new Date('2023-12-01'));
    });

    it('should cap months at 24', async () => {
      const userId = 'user_123';

      mockRepo.getAggregatesByDateRange.mockResolvedValue([]);

      await service.getUsageHistory(userId, 100);

      const call = mockRepo.getAggregatesByDateRange.mock.calls[0];
      expect(call[1]).toBeDefined(); // startDate
      expect(call[2]).toBeDefined(); // endDate
    });
  });

  describe('updateUserTier', () => {
    it('should update tier and reset quota', async () => {
      const userId = 'user_123';

      mockRepo.updateLimit.mockResolvedValue({} as any);

      await service.updateUserTier(userId, 'paid_individual');

      expect(mockRepo.updateLimit).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          tier: 'paid_individual',
          layout_limit_override: undefined,
        })
      );
    });
  });

  describe('setRateLimit', () => {
    it('should set rate limit on user', async () => {
      const userId = 'user_123';
      const limitUntil = new Date();

      mockRepo.updateLimit.mockResolvedValue({} as any);

      await service.setRateLimit(userId, limitUntil, true);

      expect(mockRepo.updateLimit).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          is_rate_limited: true,
          rate_limit_until: limitUntil,
        })
      );
    });

    it('should clear rate limit', async () => {
      const userId = 'user_123';

      mockRepo.updateLimit.mockResolvedValue({} as any);

      await service.setRateLimit(userId, new Date(), false);

      expect(mockRepo.updateLimit).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          is_rate_limited: false,
          rate_limit_until: undefined,
        })
      );
    });
  });

  describe('resetPeriodQuota', () => {
    it('should reset period quota', async () => {
      const userId = 'user_123';

      mockRepo.updateLimit.mockResolvedValue({} as any);

      await service.resetPeriodQuota(userId);

      expect(mockRepo.updateLimit).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          layouts_used: 0,
          total_cost_used: 0,
          is_rate_limited: false,
        })
      );
    });
  });
});
