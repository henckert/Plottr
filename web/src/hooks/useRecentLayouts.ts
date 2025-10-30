/**
 * useRecentLayouts - React Query hook for fetching recent layouts
 * 
 * This hook fetches the last 10 layouts ordered by updated_at DESC
 * with optional intent-based filtering.
 */

import { useLayouts } from './useLayouts';

export interface UseRecentLayoutsOptions {
  intent?: 'sports' | 'events' | 'all';
  limit?: number;
}

export function useRecentLayouts(options?: UseRecentLayoutsOptions) {
  const { intent = 'all', limit = 10 } = options || {};
  
  // Fetch layouts ordered by updated_at DESC (most recent first)
  const query = useLayouts({ limit });

  // Client-side filtering by intent (until backend supports it)
  const filteredData = query.data
    ? {
        ...query.data,
        data: query.data.data.filter((layout) => {
          if (intent === 'all') return true;

          // Check layout metadata for intent field
          // @ts-ignore - metadata field will be added in migration
          const metadata = layout.metadata as { intent?: string } | null;
          const layoutIntent = metadata?.intent?.toLowerCase();

          if (intent === 'sports') {
            return layoutIntent === 'sports_tournament' || layoutIntent === 'sports_training';
          }
          if (intent === 'events') {
            return layoutIntent === 'market' || layoutIntent === 'festival' || layoutIntent === 'concert';
          }

          return true;
        }),
      }
    : undefined;

  return {
    ...query,
    data: filteredData,
  };
}
