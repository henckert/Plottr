'use client';

import { useUser } from '@clerk/nextjs';

export type UserTier = 'free' | 'paid_individual' | 'club_admin' | 'admin';

interface TierFeatures {
  canSearch: boolean;
  canExport: boolean;
  searchesPerMinute: number;
  resultLimit: number;
  canAccessPOI: boolean;
  canAccessBuildings: boolean;
  showRateLimitWarning: boolean;
}

const tierFeatures: Record<UserTier, TierFeatures> = {
  free: {
    canSearch: true,
    canExport: false,
    searchesPerMinute: 10,
    resultLimit: 20,
    canAccessPOI: false,
    canAccessBuildings: false,
    showRateLimitWarning: true,
  },
  paid_individual: {
    canSearch: true,
    canExport: true,
    searchesPerMinute: 50,
    resultLimit: 100,
    canAccessPOI: true,
    canAccessBuildings: false,
    showRateLimitWarning: false,
  },
  club_admin: {
    canSearch: true,
    canExport: true,
    searchesPerMinute: 100,
    resultLimit: 500,
    canAccessPOI: true,
    canAccessBuildings: true,
    showRateLimitWarning: false,
  },
  admin: {
    canSearch: true,
    canExport: true,
    searchesPerMinute: 10000, // Effectively unlimited
    resultLimit: 10000,
    canAccessPOI: true,
    canAccessBuildings: true,
    showRateLimitWarning: false,
  },
};

/**
 * Hook for tier-based feature access control
 */
export function useTierFeatures(): TierFeatures & { tier: UserTier } {
  const { user, isSignedIn } = useUser();

  // Default to free tier if not signed in
  let tier: UserTier = 'free';

  if (isSignedIn && user) {
    // Try to get tier from user metadata
    const userTier = (user.publicMetadata?.tier as string) || 'free';

    // Validate tier is in enum
    if (['free', 'paid_individual', 'club_admin', 'admin'].includes(userTier)) {
      tier = userTier as UserTier;
    }
  }

  const features = tierFeatures[tier];

  return {
    ...features,
    tier,
  };
}

/**
 * Check if a user can access a specific feature
 */
export function canAccessFeature(tier: UserTier, feature: keyof TierFeatures): boolean {
  const features = tierFeatures[tier];
  const value = features[feature];

  // For boolean features
  if (typeof value === 'boolean') {
    return value;
  }

  // For numeric features, consider non-zero as accessible
  return value > 0;
}

/**
 * Get rate limit for a tier
 */
export function getTierRateLimit(tier: UserTier): number {
  return tierFeatures[tier].searchesPerMinute;
}

/**
 * Check if approaching rate limit
 */
export function isApproachingRateLimit(remaining: number, limit: number): boolean {
  const percentage = (remaining / limit) * 100;
  return percentage <= 20; // Warn at 20% remaining
}
