import axios, { AxiosError } from 'axios';
import { searchResponseSchema, reverseGeocodeSchema, type SearchQuery, type Location } from './validateSearch';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GeocodingError {
  message: string;
  code: string;
  status: number;
  remaining?: number;
  reset?: number;
}

export class GeocodingAPI {
  /**
   * Search for locations by query
   */
  static async search(query: SearchQuery): Promise<{
    results: Location[];
    cached: boolean;
    remaining: number;
    reset: number;
  }> {
    try {
      const response = await client.get('/api/geocoding/search', {
        params: {
          query: query.query,
          lat: query.lat,
          lon: query.lon,
          radius: query.radius,
        },
      });

      // Validate response
      const validated = searchResponseSchema.parse(response.data);

      return {
        results: validated.results,
        cached: validated.cached,
        remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(response.headers['x-ratelimit-reset'] || '0'),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<{
    address: string;
    lat: number;
    lon: number;
    type: string;
    cached: boolean;
    remaining: number;
    reset: number;
  }> {
    try {
      const response = await client.get('/api/geocoding/reverse', {
        params: { lat, lon },
      });

      // Validate response
      const validated = reverseGeocodeSchema.parse(response.data);

      return {
        ...validated,
        remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(response.headers['x-ratelimit-reset'] || '0'),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private static handleError(error: unknown): GeocodingError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;

      // Rate limit error
      if (axiosError.response?.status === 429) {
        return {
          message: 'Too many requests. Please wait before searching again.',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          remaining: parseInt(
            axiosError.response.headers['x-ratelimit-remaining'] || '0'
          ),
          reset: parseInt(axiosError.response.headers['x-ratelimit-reset'] || '0'),
        };
      }

      // Payment required (tier limit)
      if (axiosError.response?.status === 402) {
        return {
          message: 'Feature not available for your tier. Upgrade to unlock.',
          code: 'TIER_LIMIT',
          status: 402,
        };
      }

      // Not found
      if (axiosError.response?.status === 404) {
        return {
          message: 'No results found for your search.',
          code: 'NOT_FOUND',
          status: 404,
        };
      }

      // Server error
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return {
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR',
          status: axiosError.response.status,
        };
      }

      // Client error
      if (axiosError.response?.status && axiosError.response.status >= 400) {
        return {
          message: axiosError.response.data?.message || 'Invalid request.',
          code: 'INVALID_REQUEST',
          status: axiosError.response.status,
        };
      }

      // Network error
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    // Unknown error
    return {
      message: 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
      status: 0,
    };
  }
}

// Export convenience functions
export const searchLocations = (query: SearchQuery) => GeocodingAPI.search(query);
export const reverseGeocode = (lat: number, lon: number) =>
  GeocodingAPI.reverseGeocode(lat, lon);
