/**
 * React Query hooks for Layouts API
 * Uses existing axios-based API client with type-safe schemas from OpenAPI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type PaginatedResponse } from '@/lib/api';
import type { components } from '@/types/api';

type Layout = components['schemas']['Layout'];
type LayoutCreate = components['schemas']['LayoutCreate'];
type LayoutUpdate = components['schemas']['LayoutUpdate'];

/**
 * Fetch paginated list of layouts
 */
export function useLayouts(params?: {
  siteId?: number;
  clubId?: number;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['layouts', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Layout>>('/layouts', {
        params: {
          site_id: params?.siteId,
          club_id: params?.clubId,
          cursor: params?.cursor,
          limit: params?.limit || 50,
        },
      });
      return response.data;
    },
    enabled: true,
  });
}

/**
 * Fetch single layout by ID
 */
export function useLayout(layoutId: number | null, clubId?: number) {
  return useQuery({
    queryKey: ['layouts', layoutId],
    queryFn: async () => {
      if (!layoutId) throw new Error('Layout ID is required');
      
      const response = await apiClient.get<{ data: Layout }>(`/layouts/${layoutId}`, {
        params: { club_id: clubId },
      });
      return response.data.data;
    },
    enabled: !!layoutId,
  });
}

/**
 * Create new layout
 */
export function useCreateLayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (layout: LayoutCreate) => {
      const response = await apiClient.post<{ data: Layout }>('/layouts', layout);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate layouts list to refetch
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}

/**
 * Update existing layout
 */
export function useUpdateLayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      layoutId,
      updates,
      versionToken,
    }: {
      layoutId: number;
      updates: LayoutUpdate;
      versionToken: string;
    }) => {
      const response = await apiClient.put<{ data: Layout }>(
        `/layouts/${layoutId}`,
        updates,
        {
          headers: { 'If-Match': versionToken },
        }
      );
      return response.data.data;
    },
    onMutate: async ({ layoutId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['layouts', layoutId] });

      // Snapshot previous value
      const previousLayout = queryClient.getQueryData<Layout>(['layouts', layoutId]);

      // Optimistically update
      if (previousLayout) {
        queryClient.setQueryData(['layouts', layoutId], {
          ...previousLayout,
          ...updates,
        });
      }

      return { previousLayout };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousLayout) {
        queryClient.setQueryData(['layouts', variables.layoutId], context.previousLayout);
      }
    },
    onSuccess: (data, variables) => {
      // Update cache with new data from server
      queryClient.setQueryData(['layouts', variables.layoutId], data);
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}

/**
 * Delete layout
 */
export function useDeleteLayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      layoutId,
      versionToken,
    }: {
      layoutId: number;
      versionToken: string;
    }) => {
      await apiClient.delete(`/layouts/${layoutId}`, {
        headers: { 'If-Match': versionToken },
      });
    },
    onSuccess: () => {
      // Invalidate layouts list
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}
