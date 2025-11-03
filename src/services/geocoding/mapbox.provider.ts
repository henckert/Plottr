/**
 * Mapbox Geocoding API provider
 * https://docs.mapbox.com/api/search/geocoding/
 */

import { IGeocoder, GeocodeRequest, GeocodeResult } from './types';
import { AppError } from '../../errors';

interface MapboxConfig {
  accessToken: string;
  language?: string;
  countryBias?: string;
  proximity?: string;
}

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
    wikidata?: string;
    short_code?: string;
  };
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  bbox?: [number, number, number, number];
}

export class MapboxGeocoder implements IGeocoder {
  private config: MapboxConfig;
  private baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  constructor(config: MapboxConfig) {
    if (!config.accessToken) {
      throw new Error('Mapbox access token is required');
    }
    this.config = config;
  }

  async forwardGeocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
    const { q, country, limit = 5, proximity, language } = request;

    const params = new URLSearchParams({
      access_token: this.config.accessToken,
      limit: String(Math.min(limit, 10)),
      autocomplete: 'true',
    });

    // Add types for better results
    params.set('types', 'address,place,locality,neighborhood,postcode,poi');

    // Language preference
    const lang = language || this.config.language || 'en';
    params.set('language', lang);

    // Country bias
    const countryCode = country || this.config.countryBias;
    if (countryCode) {
      params.set('country', countryCode.toLowerCase());
    }

    // Proximity bias (favor results near this location)
    const proximityCoords = proximity || this.config.proximity;
    if (proximityCoords) {
      params.set('proximity', proximityCoords);
    }

    // URL-encode the query
    const encodedQuery = encodeURIComponent(q);
    const url = `${this.baseUrl}/${encodedQuery}.json?${params}`;

    try {
      const response = await this.fetchWithRetry(url, 2);

      if (!response.ok) {
        if (response.status === 429) {
          throw new AppError('Geocoding rate limit exceeded', 429, 'RATE_LIMIT');
        }
        throw new AppError(
          `Mapbox geocoding failed: ${response.statusText}`,
          response.status,
          'GEOCODE_ERROR'
        );
      }

      const data = await response.json();
      return this.transformResults(data.features || []);
    } catch (err: any) {
      console.error('[Mapbox Geocoding Error]', err.message);
      throw err;
    }
  }

  private async fetchWithRetry(url: string, maxRetries: number): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error (5xx) - retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('Geocoding request failed after retries');
  }

  private transformResults(features: MapboxFeature[]): GeocodeResult[] {
    return features.map((feature) => {
      // Extract address components from context
      const context = feature.context || [];
      const postcode = this.extractContextValue(context, 'postcode');
      const place = this.extractContextValue(context, 'place');
      const district = this.extractContextValue(context, 'district');
      const region = this.extractContextValue(context, 'region');
      const country = this.extractContextValue(context, 'country');
      const countryCode = this.extractContextShortCode(context, 'country');

      // Build address line1 from feature properties or text
      let line1 = '';
      if (feature.properties?.address) {
        line1 = `${feature.properties.address} ${feature.text}`;
      } else if (feature.place_type.includes('address')) {
        line1 = feature.place_name.split(',')[0];
      }

      return {
        id: feature.id,
        label: feature.place_name,
        name: feature.text,
        coordinates: feature.center,
        address: {
          line1: line1 || undefined,
          city: place || undefined,
          county: district || undefined,
          state: region || undefined,
          country: country || undefined,
          country_code: countryCode || undefined,
          postcode: postcode || undefined,
        },
        bbox: feature.bbox,
      };
    });
  }

  private extractContextValue(context: any[], type: string): string | undefined {
    const item = context.find((c) => c.id.startsWith(type));
    return item?.text;
  }

  private extractContextShortCode(context: any[], type: string): string | undefined {
    const item = context.find((c) => c.id.startsWith(type));
    return item?.short_code;
  }
}
