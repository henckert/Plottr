'use client';

import React from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { formatCoordinates } from '@/lib/mapUtils';
import type { Location } from '@/lib/validateSearch';

interface ResultCardProps {
  location: Location;
  onClick?: () => void;
  isSelected?: boolean;
  userTier?: 'free' | 'paid_individual' | 'club_admin' | 'admin';
}

export const ResultCard: React.FC<ResultCardProps> = ({
  location,
  onClick,
  isSelected = false,
  userTier = 'free',
}) => {
  // Check if user can access this result
  const canAccess = !location.tier_required || canAccessTier(userTier, location.tier_required);

  if (!canAccess) {
    return (
      <Card
        className={`cursor-not-allowed opacity-50 ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <CardBody className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-700 line-through">{location.address}</p>
              <p className="text-xs text-gray-500 mt-1">
                📦 Upgrade to {location.tier_required} to unlock
              </p>
            </div>
            <span className="text-lg ml-2">🔒</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const typeEmoji: Record<string, string> = {
    address: '🏠',
    poi: '📍',
    building: '🏢',
  };

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <CardBody className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">{typeEmoji[location.type] || '📍'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{location.address}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCoordinates(location.lat, location.lon, 4)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                {location.type}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

/**
 * Check if user tier can access a required tier
 */
function canAccessTier(userTier: string, requiredTier: string): boolean {
  const tierHierarchy: Record<string, number> = {
    free: 0,
    paid_individual: 1,
    club_admin: 2,
    admin: 3,
  };

  const userLevel = tierHierarchy[userTier] ?? 0;
  const requiredLevel = tierHierarchy[requiredTier] ?? 0;

  return userLevel >= requiredLevel;
}
