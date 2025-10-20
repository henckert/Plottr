/**
 * React Query hooks for Zones API
 * Uses existing axios-based API client with type-safe schemas from OpenAPI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type PaginatedResponse } from '@/lib/api';
import type { components } from '@/types/api';

type Zone = components['schemas']['Zone'];
type ZoneCreate = components['schemas']['ZoneCreate'];
type ZoneUpdate = components['schemas']['ZoneUpdate'];

/**
 * Fetch paginated list of zones
 */
export function useZones(params?: {
  layoutId?: number;
  zoneType?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['zones', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Zone>>('/zones', {
        params: {
          layout_id: params?.layoutId,
          zone_type: params?.zoneType,
          cursor: params?.cursor,
          limit: params?.limit || 500, // Higher limit for zones
        },
      });
      return response.data;
    },
    enabled: true,
  });
}

/**
 * Fetch single zone by ID
 */
export function useZone(zoneId: number | null) {
  return useQuery({
    queryKey: ['zones', zoneId],
    queryFn: async () => {
      if (!zoneId) throw new Error('Zone ID is required');
      
      const response = await apiClient.get<{ data: Zone }>(`/zones/${zoneId}`);
      return response.data.data;
    },
    enabled: !!zoneId,
  });
}

/**
 * Create new zone
 */
export function useCreateZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (zone: ZoneCreate) => {
      const response = await apiClient.post<{ data: Zone }>('/zones', zone);
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate zones list to refetch
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      // Also invalidate layout-specific zones
      queryClient.invalidateQueries({ queryKey: ['zones', { layoutId: data.layout_id }] });
    },
  });
}

/**
 * Update existing zone
 */
export function useUpdateZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      zoneId,
      updates,
      versionToken,
    }: {
      zoneId: number;
      updates: ZoneUpdate;
      versionToken: string;
    }) => {
      const response = await apiClient.put<{ data: Zone }>(
        `/zones/${zoneId}`,
        updates,
        {
          headers: { 'If-Match': versionToken },
        }
      );
      return response.data.data;
    },
    onMutate: async ({ zoneId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['zones', zoneId] });

      // Snapshot previous value
      const previousZone = queryClient.getQueryData<Zone>(['zones', zoneId]);

      // Optimistically update
      if (previousZone) {
        queryClient.setQueryData(['zones', zoneId], {
          ...previousZone,
          ...updates,
        });
      }

      return { previousZone };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousZone) {
        queryClient.setQueryData(['zones', variables.zoneId], context.previousZone);
      }
    },
    onSuccess: (data, variables) => {
      // Update cache with new data from server
      queryClient.setQueryData(['zones', variables.zoneId], data);
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['zones', { layoutId: data.layout_id }] });
    },
  });
}

/**
 * Delete zone
 */
export function useDeleteZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      zoneId,
      versionToken,
    }: {
      zoneId: number;
      versionToken: string;
    }) => {
      await apiClient.delete(`/zones/${zoneId}`, {
        headers: { 'If-Match': versionToken },
      });
    },
    onSuccess: () => {
      // Invalidate zones list
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}
