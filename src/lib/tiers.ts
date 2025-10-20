/**
 * Tier System & Limits Configuration
 * Defines user tiers, usage limits, and rate limits for the Plottr system
 */

export type UserTier = 'free' | 'paid_individual' | 'club_admin' | 'admin';

/**
 * Tier hierarchy for authorization checks
 * Higher tiers inherit permissions from lower tiers
 */
export const TIER_HIERARCHY: Record<UserTier, number> = {
  free: 0,
  paid_individual: 1,
  club_admin: 2,
  admin: 3,
};

/**
 * Layout creation limits per tier
 */
export const LAYOUT_LIMITS: Record<UserTier, number> = {
  free: 3,
  paid_individual: 50,
  club_admin: 100,
  admin: Infinity,
};

/**
 * Rate limits per tier (requests per minute)
 * Different limits for different endpoint types
 */
export const RATE_LIMITS: Record<UserTier, Record<string, number>> = {
  free: {
    authenticated: 100,    // General API calls
    export: 10,            // Export/download operations
    ai: 5,                 // AI-powered features
    upload: 20,            // File uploads
  },
  paid_individual: {
    authenticated: 300,
    export: 50,
    ai: 50,
    upload: 100,
  },
  club_admin: {
    authenticated: 500,
    export: 100,
    ai: 100,
    upload: 200,
  },
  admin: {
    authenticated: Infinity,
    export: Infinity,
    ai: Infinity,
    upload: Infinity,
  },
};

/**
 * Error messages for tier enforcement
 */
export const TIER_ERROR_MESSAGES: Record<string, string> = {
  LAYOUT_LIMIT_REACHED: 'You have reached the maximum number of layouts for your tier. Upgrade to create more.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  UNAUTHORIZED_TIER: 'Your tier does not have access to this feature.',
  TIER_UPGRADE_REQUIRED: 'This feature requires a paid plan.',
};

/**
 * HTTP status codes for tier enforcement
 */
export const TIER_STATUS_CODES = {
  LAYOUT_LIMIT_REACHED: 402, // Payment Required
  RATE_LIMIT_EXCEEDED: 429,  // Too Many Requests
  UNAUTHORIZED_TIER: 403,     // Forbidden
} as const;

/**
 * Check if tier A is at least as privileged as tier B
 * @example
 * canAccess('paid_individual', 'free') // true
 * canAccess('free', 'paid_individual') // false
 */
export function canAccessTier(userTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Get layout limit for a tier
 */
export function getLayoutLimit(tier: UserTier): number {
  return LAYOUT_LIMITS[tier];
}

/**
 * Get rate limit for a tier and endpoint type
 * @example
 * getRateLimit('free', 'authenticated') // 100
 * getRateLimit('paid_individual', 'ai') // 50
 */
export function getRateLimit(tier: UserTier, type: string): number {
  return RATE_LIMITS[tier][type] ?? RATE_LIMITS[tier].authenticated;
}

/**
 * Check if user has hit layout limit
 * @param layoutCount Current number of layouts owned by user
 * @param tier User's tier
 * @returns true if user can create more layouts, false if at limit
 */
export function canCreateLayout(layoutCount: number, tier: UserTier): boolean {
  const limit = getLayoutLimit(tier);
  return layoutCount < limit;
}

/**
 * Get upgrade prompt message based on tier
 */
export function getUpgradeMessage(currentTier: UserTier): string {
  if (currentTier === 'free') {
    return 'Upgrade to Paid to create more layouts and unlock premium features.';
  }
  if (currentTier === 'paid_individual') {
    return 'Contact support to upgrade to Club Admin for higher limits.';
  }
  return '';
}

/**
 * Serialize tier data for logging/debugging
 */
export function serializeTierInfo(tier: UserTier, layoutCount: number, rateUsage?: Record<string, number>) {
  return {
    tier,
    hierarchy: TIER_HIERARCHY[tier],
    layoutLimit: getLayoutLimit(tier),
    layoutCount,
    layoutsRemaining: getLayoutLimit(tier) - layoutCount,
    rateLimits: RATE_LIMITS[tier],
    rateUsage,
  };
}
