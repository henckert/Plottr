import mapbox from '../lib/mapbox';
import { AppError } from '../errors';

// Rate limiting for Nominatim (1 req/sec per IP)
const rateLimitMap = new Map<string, number>();

function checkRateLimit(ip: string): boolean {
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
 * Detect if query is an Eircode
 * Pattern: 3 alphanumeric + optional space + 4 alphanumeric
 */
function isEircode(query: string): boolean {
  const cleaned = query.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9]{3}[A-Z0-9]{4}$/.test(cleaned);
}

/**
 * Normalize Eircode format
 * Examples: "E91 VF83" -> "E91VF83", "e91vf83" -> "E91VF83"
 * Returns normalized Eircode if valid, otherwise returns original query
 */
function normalizeEircode(query: string): string {
  const cleaned = query.replace(/\s+/g, '').toUpperCase();
  // Eircode pattern: 3 alphanumeric + 4 alphanumeric
  if (/^[A-Z0-9]{3}[A-Z0-9]{4}$/.test(cleaned)) {
    return cleaned;
  }
  return query;
}

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

/**
 * Forward geocoding using Nominatim (free OSM geocoder)
 * Supports country bias and Eircode lookup
 */
export async function nominatimSearch(
  query: string,
  limit = 5,
  ip = 'unknown',
  countryCode?: string
): Promise<NominatimResult[]> {
  if (!checkRateLimit(ip)) {
    throw new AppError('Rate limit exceeded. Please wait 1 second between requests.', 429, 'RATE_LIMIT');
  }

  // Check if query is an Eircode - if so, try postal code search first
  if (isEircode(query)) {
    const eircode = normalizeEircode(query);
    const eircodeParams = new URLSearchParams({
      postalcode: eircode,
      country: 'ie',
      format: 'jsonv2',
      limit: String(limit),
      addressdetails: '1',
      dedupe: '1',
    });

    const eircodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?${eircodeParams}`, {
      headers: {
        'User-Agent': 'plotiq.app (support@plotiq.app)',
        'Accept-Language': 'en-IE,en-GB,en-US,en',
      },
    });

    if (eircodeResponse.ok) {
      const eircodeData = await eircodeResponse.json();
      if (eircodeData && eircodeData.length > 0) {
        return transformNominatimResults(eircodeData);
      }
    }
  }

  // Standard text search with optional country bias
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    dedupe: '1',
  });

  // Add country code bias if provided
  if (countryCode) {
    params.set('countrycodes', countryCode.toLowerCase());
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'User-Agent': 'plotiq.app (support@plotiq.app)',
      'Accept-Language': 'en-IE,en-GB,en-US,en',
    },
  });

  if (!response.ok) {
    const error = `Geocoding failed: ${response.statusText}`;
    console.error(`[Geocode Error] Query: "${query}" | Status: ${response.status}`);
    throw new AppError(error, response.status, 'GEOCODE_ERROR');
  }

  const data = await response.json();
  return transformNominatimResults(data);
}

/**
 * Transform Nominatim response to our format
 */
function transformNominatimResults(data: any[]): NominatimResult[] {
  return data.map((result: any) => ({
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
  }));
}

/**
 * Reverse geocoding using Nominatim (coordinates to address)
 */
export async function nominatimReverse(
  lat: number,
  lon: number,
  ip = 'unknown'
): Promise<NominatimResult | null> {
  if (!checkRateLimit(ip)) {
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
    return null; // No address found
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
    },
  };
}

// Legacy Mapbox geocode (keep for backwards compatibility)
export async function forwardGeocode(query: string, limit = 5) {
  if (!mapbox.geocoder) {
    throw new Error('Mapbox token not configured');
  }

  const res = await mapbox.geocoder.forwardGeocode({
    query,
    limit,
  }).send();

  return res.body;
}
