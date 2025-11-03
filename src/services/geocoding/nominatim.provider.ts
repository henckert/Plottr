/**
 * Nominatim geocoding provider (OpenStreetMap)
 * Free, rate-limited to 1 req/sec
 */

import { IGeocoder, GeocodeRequest, GeocodeResult } from './types';
import { AppError } from '../../errors';

interface NominatimConfig {
  userAgent?: string;
  acceptLanguage?: string;
}

export class NominatimGeocoder implements IGeocoder {
  private rateLimitMap = new Map<string, number>();
  private config: NominatimConfig;

  constructor(config: NominatimConfig = {}) {
    this.config = {
      userAgent: config.userAgent || 'plotiq.app (support@plotiq.app)',
      acceptLanguage: config.acceptLanguage || 'en-IE,en-GB,en-US,en',
    };
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimitMap.get(ip) || 0;

    if (now - lastRequest < 1000) {
      return false; // Too fast
    }

    this.rateLimitMap.set(ip, now);

    // Cleanup old entries every 100 requests
    if (this.rateLimitMap.size > 100) {
      const cutoff = now - 10000;
      for (const [key, time] of this.rateLimitMap.entries()) {
        if (time < cutoff) this.rateLimitMap.delete(key);
      }
    }

    return true;
  }

  async forwardGeocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
    const { q, country, limit = 5 } = request;

    // Rate limiting for Nominatim
    if (!this.checkRateLimit('global')) {
      throw new AppError(
        'Rate limit exceeded. Please wait 1 second between requests.',
        429,
        'RATE_LIMIT'
      );
    }

    // Check if query is an Eircode - if so, try postal code search first
    const isEircode = /^[A-Z0-9]{3}\s?[A-Z0-9]{4}$/i.test(q);

    if (isEircode) {
      const eircode = q.replace(/\s+/g, '').toUpperCase();
      const eircodeParams = new URLSearchParams({
        postalcode: eircode,
        country: 'ie',
        format: 'jsonv2',
        limit: String(limit),
        addressdetails: '1',
        dedupe: '1',
      });

      const eircodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${eircodeParams}`,
        {
          headers: {
            'User-Agent': this.config.userAgent!,
            'Accept-Language': this.config.acceptLanguage!,
          },
        }
      );

      if (eircodeResponse.ok) {
        const eircodeData = await eircodeResponse.json();
        if (eircodeData && eircodeData.length > 0) {
          return this.transformResults(eircodeData);
        }
      }
    }

    // Standard text search with optional country bias
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      limit: String(limit),
      addressdetails: '1',
      dedupe: '1',
    });

    // Add country code bias if provided
    if (country) {
      params.set('countrycodes', country.toLowerCase());
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': this.config.userAgent!,
        'Accept-Language': this.config.acceptLanguage!,
      },
    });

    if (!response.ok) {
      const error = `Geocoding failed: ${response.statusText}`;
      console.error(`[Nominatim Error] Query: "${q}" | Status: ${response.status}`);
      throw new AppError(error, response.status, 'GEOCODE_ERROR');
    }

    const data = await response.json();
    return this.transformResults(data);
  }

  private transformResults(data: any[]): GeocodeResult[] {
    return data.map((result: any) => ({
      id: result.place_id?.toString() || result.osm_id?.toString() || 'unknown',
      label: result.display_name,
      name: result.name || result.address?.road || result.address?.neighbourhood || '',
      coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
      address: {
        line1: result.address?.house_number
          ? `${result.address.house_number} ${result.address.road || ''}`
          : result.address?.road || result.address?.neighbourhood || '',
        city: result.address?.city || result.address?.town || result.address?.village || '',
        county: result.address?.county || result.address?.state || '',
        state: result.address?.state || '',
        postcode: result.address?.postcode || '',
        country: result.address?.country || '',
        country_code: result.address?.country_code || '',
      },
      bbox: result.boundingbox
        ? [
            parseFloat(result.boundingbox[2]), // minLng
            parseFloat(result.boundingbox[0]), // minLat
            parseFloat(result.boundingbox[3]), // maxLng
            parseFloat(result.boundingbox[1]), // maxLat
          ]
        : undefined,
    }));
  }
}
