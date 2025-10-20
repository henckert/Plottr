/**
 * Geocoding Service
 * 
 * Provides location-based search using MapTiler API with OSM fallback.
 * Integrates with usage tracking and caching layers.
 */

import axios, { AxiosError } from 'axios';
import { GeoJSONFeature, GeocodingRequest, GeocodingResult } from '../lib/geocoding.types';
import GeocodingCacheService from './geocoding.cache';
import { UsageRepo } from '../data/usage.repo';
import { AppError } from '../errors';

/**
 * Nominatim (OSM) API response format
 */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    postcode?: string;
  };
}

/**
 * Geocoding Service - Main implementation
 */
export class GeocodingService {
  private maptilerKey: string;
  private cache: GeocodingCacheService;
  private usageRepo: UsageRepo;
  private requestTimeout = 10000; // 10 seconds
  private maxResults = 50;

  constructor(
    maptilerKey: string,
    usageRepo: UsageRepo,
    redisUrl?: string
  ) {
    this.maptilerKey = maptilerKey;
    this.usageRepo = usageRepo;
    this.cache = new GeocodingCacheService(redisUrl);
  }

  /**
   * Search for locations by query string
   */
  async search(
    req: GeocodingRequest,
    userId: string,
    tier: string = 'free'
  ): Promise<GeocodingResult> {
    const startTime = Date.now();

    // Validate request
    const trimmedQuery = req.query.trim();
    if (!trimmedQuery) {
      throw new AppError('Query string is required', 400, 'INVALID_REQUEST');
    }

    if (trimmedQuery.length > 256) {
      throw new AppError('Query string is too long', 400, 'INVALID_REQUEST');
    }

    // Check cache first
    const cacheEntry = await this.cache.get(trimmedQuery);
    if (cacheEntry) {
      await this.logUsage(userId, tier, {
        query: trimmedQuery,
        source: 'cache',
        resultCount: cacheEntry.results.length,
        cached: true,
      });

      return {
        features: cacheEntry.results,
        source: 'cache',
        cached: true,
        cacheExpiry: cacheEntry.expiresAt,
        executionTime: Date.now() - startTime,
      };
    }

    // Try MapTiler first, then fallback to OSM
    let result: GeocodingResult | null = null;
    let source: 'maptiler' | 'osm' = 'maptiler';

    try {
      result = await this.searchMapTiler(trimmedQuery, req, startTime);
      source = 'maptiler';
    } catch (error) {
      try {
        result = await this.searchNominatim(trimmedQuery, startTime);
        source = 'osm';
      } catch (fallbackError) {
        await this.logUsage(userId, tier, {
          query: trimmedQuery,
          source: 'error',
          resultCount: 0,
          status: 'failed',
          error: `MapTiler failed: ${(error as Error).message}, OSM failed: ${(fallbackError as Error).message}`,
        });
        throw new AppError('Geocoding service unavailable', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    // Cache results
    if (result && result.features.length > 0) {
      await this.cache.set(trimmedQuery, result.features, source);
    }

    // Log usage
    await this.logUsage(userId, tier, {
      query: trimmedQuery,
      source,
      resultCount: result.features.length,
      cached: false,
    });

    return {
      ...result,
      source,
      cached: false,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Search using MapTiler API
   */
  private async searchMapTiler(
    query: string,
    req: GeocodingRequest,
    startTime: number
  ): Promise<GeocodingResult> {
    const limit = Math.min(req.limit || 10, this.maxResults);
    const params = new URLSearchParams({
      key: this.maptilerKey,
      query,
      limit: limit.toString(),
    });

    if (req.language) {
      params.append('language', req.language);
    }

    if (req.proximity) {
      params.append('proximity', `${req.proximity[0]},${req.proximity[1]}`);
    }

    if (req.bbox) {
      params.append('bbox', req.bbox.join(','));
    }

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`;

    try {
      const response = await axios.get(url, { timeout: this.requestTimeout });

      const features: GeoJSONFeature[] = (response.data.features || []).map(
        (feature: any) => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            name: feature.properties?.name || feature.place_name,
            type: feature.properties?.type || 'place',
            country: feature.properties?.country,
            region: feature.properties?.region,
            city: feature.properties?.city,
            postcode: feature.properties?.postcode,
            place_name: feature.place_name,
            short_code: feature.properties?.short_code,
          },
        })
      );

      return {
        features,
        attribution: response.data.attribution,
        source: 'maptiler',
        cached: false,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new AppError(
        'MapTiler API error',
        500,
        'API_ERROR'
      );
    }
  }

  /**
   * Search using Nominatim (OSM) API - fallback
   */
  private async searchNominatim(
    query: string,
    startTime: number
  ): Promise<GeocodingResult> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: this.maxResults.toString(),
      addressdetails: '1',
    });

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    try {
      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': 'Plottr-Geocoding/1.0',
        },
      });

      if (!Array.isArray(response.data)) {
        return {
          features: [],
          source: 'osm',
          cached: false,
          executionTime: Date.now() - startTime,
        };
      }

      const features: GeoJSONFeature[] = response.data.map((result: NominatimResult) => {
        const address = result.address || {};
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
          },
          properties: {
            name: result.display_name.split(',')[0],
            type: 'place',
            country: address.country,
            region: address.state,
            city: address.city,
            postcode: address.postcode,
            place_name: result.display_name,
          },
        };
      });

      return {
        features,
        attribution: 'OpenStreetMap contributors',
        source: 'osm',
        cached: false,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new AppError(
        'Nominatim API error',
        500,
        'API_ERROR'
      );
    }
  }

  /**
   * Reverse geocoding - convert coordinates to address
   */
  async reverse(
    latitude: number,
    longitude: number,
    userId: string,
    tier: string = 'free'
  ): Promise<GeoJSONFeature | null> {
    const startTime = Date.now();

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_REQUEST');
    }

    try {
      // Try MapTiler reverse geocoding
      const params = new URLSearchParams({
        key: this.maptilerKey,
      });

      const url = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?${params.toString()}`;
      const response = await axios.get(url, { timeout: this.requestTimeout });

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        await this.logUsage(userId, tier, {
          query: `${latitude},${longitude}`,
          source: 'maptiler',
          resultCount: 1,
          action: 'geocoding_reverse',
        });

        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            name: feature.properties?.name || feature.place_name,
            type: feature.properties?.type || 'place',
            country: feature.properties?.country,
            region: feature.properties?.region,
            city: feature.properties?.city,
            postcode: feature.properties?.postcode,
            place_name: feature.place_name,
          },
        };
      }
    } catch (error) {
      // Fallback to Nominatim
    }

    try {
      const params = new URLSearchParams({
        format: 'json',
        lat: latitude.toString(),
        lon: longitude.toString(),
        addressdetails: '1',
      });

      const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': 'Plottr-Geocoding/1.0',
        },
      });

      const result = response.data as NominatimResult;
      await this.logUsage(userId, tier, {
        query: `${latitude},${longitude}`,
        source: 'osm',
        resultCount: 1,
        action: 'geocoding_reverse',
      });

      const address = result.address || {};
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        properties: {
          name: result.display_name.split(',')[0],
          type: 'place',
          country: address.country,
          region: address.state,
          city: address.city,
          postcode: address.postcode,
          place_name: result.display_name,
        },
      };
    } catch (error) {
      await this.logUsage(userId, tier, {
        query: `${latitude},${longitude}`,
        source: 'error',
        resultCount: 0,
        action: 'geocoding_reverse',
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Log usage event
   */
  private async logUsage(
    userId: string,
    tier: any, // Accept any tier for flexibility
    metadata: any
  ): Promise<void> {
    try {
      await this.usageRepo.recordEvent({
        user_id: userId,
        resource_type: 'geocoding',
        action: metadata.action || 'geocoding_search',
        tier: tier as any,
        cost: 0,
        metadata: {
          query: metadata.query,
          source: metadata.source,
          resultCount: metadata.resultCount,
          cached: metadata.cached,
          status: metadata.status,
          error: metadata.error,
        },
      });
    } catch (error) {
      console.error('Failed to log geocoding usage:', error);
      // Don't throw - logging failure shouldn't break the request
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return this.cache.getStats();
  }

  /**
   * Clear the cache (admin only)
   */
  async clearCache(): Promise<void> {
    return this.cache.clear();
  }

  /**
   * Get cache backend info
   */
  getCacheInfo(): {
    backend: string;
    ttl: number;
  } {
    return {
      backend: this.cache.getBackendType(),
      ttl: 24 * 3600, // 24 hours
    };
  }
}

export default GeocodingService;
