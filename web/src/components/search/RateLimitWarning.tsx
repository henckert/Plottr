'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';

interface RateLimitWarningProps {
  remaining: number;
  limit: number;
  reset: number;
  show?: boolean;
}

export const RateLimitWarning: React.FC<RateLimitWarningProps> = ({
  remaining,
  limit,
  reset,
  show = true,
}) => {
  if (!show || remaining > Math.ceil(limit * 0.2)) {
    return null;
  }

  const percentage = Math.round((remaining / limit) * 100);
  const resetTime = new Date(reset * 1000).toLocaleTimeString();

  if (remaining === 0) {
    return (
      <Alert type="error" title="Rate Limit Exceeded">
        You've reached your search limit. Your quota resets at {resetTime}.
      </Alert>
    );
  }

  return (
    <Alert type="warning" title="Approaching Rate Limit">
      You have {remaining} searches left this minute ({percentage}%). Resets at{' '}
      {resetTime}.
    </Alert>
  );
};
