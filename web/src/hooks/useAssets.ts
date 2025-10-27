/**
 * React Query hooks for Assets API
 * Provides hooks for CRUD operations on layout assets (goals, benches, lights, etc.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetApi, Asset, AssetCreate, AssetUpdate, AssetType } from '@/lib/api';

/**
 * Fetch paginated list of assets
 */
export function useAssets(params?: {
  layoutId?: number;
  zoneId?: number;
  assetType?: AssetType;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await assetApi.list(
        params?.layoutId,
        params?.zoneId,
        params?.assetType,
        params?.limit || 100,
        params?.cursor
      );
      return response;
    },
    enabled: true,
  });
}

/**
 * Fetch single asset by ID
 */
export function useAsset(assetId: number | null) {
  return useQuery({
    queryKey: ['assets', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');
      return await assetApi.getById(assetId);
    },
    enabled: !!assetId,
  });
}

/**
 * Create new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (asset: AssetCreate) => {
      return await assetApi.create(asset);
    },
    onSuccess: (data) => {
      // Invalidate assets list to refetch
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      // Also invalidate layout-specific assets
      queryClient.invalidateQueries({ queryKey: ['assets', { layoutId: data.layout_id }] });
      // And zone-specific assets if applicable
      if (data.zone_id) {
        queryClient.invalidateQueries({ queryKey: ['assets', { zoneId: data.zone_id }] });
      }
    },
  });
}

/**
 * Update existing asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      assetId,
      updates,
      versionToken,
    }: {
      assetId: number;
      updates: AssetUpdate;
      versionToken: string;
    }) => {
      return await assetApi.update(assetId, updates, versionToken);
    },
    onMutate: async ({ assetId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['assets', assetId] });

      // Snapshot previous value
      const previousAsset = queryClient.getQueryData<Asset>(['assets', assetId]);

      // Optimistically update
      if (previousAsset) {
        queryClient.setQueryData(['assets', assetId], {
          ...previousAsset,
          ...updates,
        });
      }

      return { previousAsset };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousAsset) {
        queryClient.setQueryData(['assets', variables.assetId], context.previousAsset);
      }
    },
    onSuccess: (data) => {
      // Update cache with fresh data from server
      queryClient.setQueryData(['assets', data.id], data);
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', { layoutId: data.layout_id }] });
      if (data.zone_id) {
        queryClient.invalidateQueries({ queryKey: ['assets', { zoneId: data.zone_id }] });
      }
    },
  });
}

/**
 * Delete asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      assetId,
      versionToken,
    }: {
      assetId: number;
      versionToken: string;
    }) => {
      return await assetApi.delete(assetId, versionToken);
    },
    onMutate: async ({ assetId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['assets', assetId] });

      // Snapshot previous value for rollback
      const previousAsset = queryClient.getQueryData<Asset>(['assets', assetId]);

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: ['assets', assetId] });

      return { previousAsset };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousAsset) {
        queryClient.setQueryData(['assets', variables.assetId], context.previousAsset);
      }
    },
    onSuccess: () => {
      // Invalidate all list queries to refresh
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
