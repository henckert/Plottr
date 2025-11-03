/**
 * Geocoding service with provider abstraction
 * Supports Mapbox (primary) and Nominatim (fallback)
 * Features: Eircode detection, caching, rate limiting
 */

import { getGeocoder, getNominatimGeocoder } from './geocoding/factory';
import { GeocodeResult } from './geocoding/types';
import { AppError } from '../errors';
import { getConfig } from '../config';
import mapbox from '../lib/mapbox';

// Simple LRU cache with TTL
interface CacheEntry {
  ts: number;
  data: GeocodeResult[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60000; // 60 seconds

// Token bucket for rate limiting (10 requests per minute globally)
let tokenBucket = 10;
let lastRefill = Date.now();

function refillTokenBucket() {
  const now = Date.now();
  const elapsed = now - lastRefill;
  const tokensToAdd = Math.floor(elapsed / 6000); // 1 token per 6 seconds (10/min)

  if (tokensToAdd > 0) {
    tokenBucket = Math.min(10, tokenBucket + tokensToAdd);
    lastRefill = now;
  }
}

function checkRateLimit(): boolean {
  refillTokenBucket();
  if (tokenBucket > 0) {
    tokenBucket--;
    return true;
  }
  return false;
}

// Rate limiting for Nominatim (1 req/sec per IP)
const rateLimitMap = new Map<string, number>();

function checkRateLimitNominatim(ip: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(ip) || 0;

  if (now - lastRequest < 1000) {
    return false; // Too fast
  }

  rateLimitMap.set(ip, now);

  // Cleanup old entries every 100 requests
  if (rateLimitMap.size > 100) {
    const cutoff = now - 10000;
    for (const [key, time] of rateLimitMap.entries()) {
      if (time < cutoff) rateLimitMap.delete(key);
    }
  }

  return true;
}

/**
 * Detect if query is an Eircode (Irish postal code)
 * Pattern: 3 alphanumeric + optional space + 4 alphanumeric
 */
function isEircode(query: string): boolean {
  const cleaned = query.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9]{3}[A-Z0-9]{4}$/.test(cleaned);
}

/**
 * Main geocoding search function
 * Delegates to configured provider with Eircode fallback logic
 */
export async function geocodeSearch(
  query: string,
  options: {
    country?: string;
    limit?: number;
    proximity?: string;
    language?: string;
  } = {}
): Promise<GeocodeResult[]> {
  const startTime = Date.now();

  // Clamp limit to [1, 10], default 5
  const limit = Math.max(1, Math.min(options.limit || 5, 10));
  const country = options.country || getConfig().geocoder.countryBias;
  const proximity = options.proximity;
  const language = options.language;

  // Check rate limit
  if (!checkRateLimit()) {
    throw new AppError(
      'Rate limit exceeded. Please try again in a moment.',
      429,
      'RATE_LIMIT'
    );
  }

  // Check cache
  const cacheKey = `${getConfig().geocoder.provider}|${query}|${country}|${limit}|${proximity}|${language}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`[Geocode] Cache hit for "${query}"`);
    return cached.data;
  }

  // Get configured geocoder
  const geocoder = getGeocoder();
  let results: GeocodeResult[] = [];
  let providerUsed = getConfig().geocoder.provider;

  try {
    // Special handling for Eircode with Mapbox
    const config = getConfig();
    const isEircodeQuery = isEircode(query);

    if (isEircodeQuery && config.geocoder.provider === 'mapbox') {
      // Try Mapbox first (it handles many postcodes)
      results = await geocoder.forwardGeocode({
        q: query,
        country: 'ie',
        limit,
        proximity,
        language,
      });

      // If Mapbox returns no results for Eircode, fallback to Nominatim
      if (results.length === 0) {
        console.log(`[Geocode] Eircode "${query}" - falling back to Nominatim`);
        const nominatim = getNominatimGeocoder();
        results = await nominatim.forwardGeocode({
          q: query,
          country: 'ie',
          limit,
        });
        providerUsed = 'nominatim-fallback';
      }
    } else {
      // Standard query
      results = await geocoder.forwardGeocode({
        q: query,
        country,
        limit,
        proximity,
        language,
      });
    }

    // Cache results
    cache.set(cacheKey, { ts: Date.now(), data: results });

    // Cleanup old cache entries
    if (cache.size > 100) {
      const cutoff = Date.now() - CACHE_TTL_MS;
      for (const [key, entry] of cache.entries()) {
        if (entry.ts < cutoff) cache.delete(key);
      }
    }

    // Metrics logging
    const duration = Date.now() - startTime;
    console.log(
      `[Geocode] provider=${providerUsed} q="${query}" country=${country} results=${results.length} ms=${duration}`
    );

    return results;
  } catch (err: any) {
    console.error('[Geocode Error]', err.message);
    throw err;
  }
}

/**
 * Legacy Nominatim search (for backwards compatibility)
 * @deprecated Use geocodeSearch instead
 */
export async function nominatimSearch(
  query: string,
  limit = 5,
  ip = 'unknown',
  countryCode?: string
): Promise<NominatimResult[]> {
  const results = await geocodeSearch(query, {
    country: countryCode,
    limit,
  });

  // Transform to legacy format
  return results.map((r) => ({
    lat: r.coordinates[1],
    lng: r.coordinates[0],
    displayName: r.label,
    address: {
      line1: r.address?.line1,
      city: r.address?.city,
      county: r.address?.county,
      postcode: r.address?.postcode,
      country: r.address?.country,
      country_code: r.address?.country_code,
    },
  }));
}

/**
 * Legacy Nominatim reverse geocoding
 * @deprecated Use provider-specific reverse geocoding if needed
 */
export async function nominatimReverse(
  lat: number,
  lon: number,
  ip = 'unknown'
): Promise<NominatimResult | null> {
  if (!checkRateLimitNominatim(ip)) {
    throw new AppError('Rate limit exceeded. Please wait 1 second between requests.', 429, 'RATE_LIMIT');
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: {
      'User-Agent': 'plotiq.app (support@plotiq.app)',
      'Accept-Language': 'en-IE,en-GB,en-US,en',
    },
  });

  if (!response.ok) {
    const error = `Reverse geocoding failed: ${response.statusText}`;
    console.error(`[Geocode Error] Coords: ${lat},${lon} | Status: ${response.status}`);
    throw new AppError(error, response.status, 'GEOCODE_ERROR');
  }

  const result = await response.json();

  if (result.error) {
    return null;
  }

  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    address: {
      line1: result.address?.house_number
        ? `${result.address.house_number} ${result.address.road || ''}`
        : result.address?.road || result.address?.neighbourhood || '',
      city: result.address?.city || result.address?.town || result.address?.village || '',
      county: result.address?.county || result.address?.state || '',
      postcode: result.address?.postcode || '',
      country: result.address?.country || '',
      country_code: result.address?.country_code || '',
    },
  };
}

/**
 * Legacy Mapbox geocode (keep for backwards compatibility)
 */
export async function forwardGeocode(query: string, limit = 5) {
  if (!mapbox.geocoder) {
    throw new Error('Mapbox token not configured');
  }

  const res = await mapbox.geocoder
    .forwardGeocode({
      query,
      limit,
    })
    .send();

  return res.body;
}

// Legacy types for backwards compatibility
export interface NominatimResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    line1?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}
