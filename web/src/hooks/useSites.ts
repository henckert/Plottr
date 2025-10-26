/**
 * React Query hooks for Sites API operations
 * Provides data fetching, caching, and mutations for site management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Types (matching backend schemas/sites.schema.ts)
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lon, lat], [lon, lat], ...]]
}

export interface Site {
  id: number;
  club_id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  location?: GeoPoint | null;
  bbox?: GeoPolygon | null;
  version_token: string;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  club_id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: GeoPoint;
  bbox?: GeoPolygon;
}

export interface SiteUpdate {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: GeoPoint;
  bbox?: GeoPolygon;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  has_more: boolean;
}

export interface UseSitesParams {
  clubId?: number;
  cursor?: string;
  limit?: number;
}

/**
 * Fetch paginated list of sites
 * @param params - Filter parameters { clubId, cursor, limit }
 * @returns Query result with sites data
 */
export function useSites(params: UseSitesParams = {}) {
  const { clubId, cursor, limit = 50 } = params;

  return useQuery({
    queryKey: ['sites', { clubId, cursor, limit }],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Site>>('/sites', {
        params: { club_id: clubId, cursor, limit },
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch a single site by ID
 * @param siteId - Site ID
 * @returns Query result with site data
 */
export function useSite(siteId: number | string | null) {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Site }>(`/sites/${siteId}`);
      return response.data.data;
    },
    enabled: !!siteId, // Only fetch if siteId exists
    staleTime: 30000,
  });
}

/**
 * Create a new site
 * @returns Mutation for creating sites
 */
export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SiteCreate) => {
      const response = await apiClient.post<{ data: Site }>('/sites', data);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

/**
 * Update an existing site
 * @returns Mutation for updating sites
 */
export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      siteId,
      updates,
      versionToken,
    }: {
      siteId: number | string;
      updates: SiteUpdate;
      versionToken: string;
    }) => {
      const response = await apiClient.put<{ data: Site }>(`/sites/${siteId}`, updates, {
        headers: { 'If-Match': versionToken },
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate sites list and individual site
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['sites', data.id] });
    },
  });
}

/**
 * Delete a site
 * @returns Mutation for deleting sites
 */
export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      siteId,
      versionToken,
    }: {
      siteId: number | string;
      versionToken: string;
    }) => {
      await apiClient.delete(`/sites/${siteId}`, {
        headers: { 'If-Match': versionToken },
      });
      return siteId;
    },
    onSuccess: () => {
      // Invalidate sites list
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

/**
 * Geocode address to coordinates
 * @returns Mutation for geocoding addresses
 */
export interface GeocodeFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
}

export interface GeocodeResponse {
  features: GeocodeFeature[];
}

export function useGeocode() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await apiClient.post<GeocodeResponse>('/geocoding/forward', {
        query,
        limit: 1,
      });
      return response.data;
    },
  });
}
