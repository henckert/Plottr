/**
 * Geocoding provider factory
 * Selects and instantiates the appropriate geocoding provider based on configuration
 */

import { IGeocoder } from './types';
import { MapboxGeocoder } from './mapbox.provider';
import { NominatimGeocoder } from './nominatim.provider';
import { getConfig } from '../../config';

let cachedGeocoder: IGeocoder | null = null;

export function getGeocoder(): IGeocoder {
  if (cachedGeocoder) {
    return cachedGeocoder;
  }

  const config = getConfig();
  const { provider, mapboxToken, language, countryBias, proximity } = config.geocoder;

  // Use Mapbox if:
  // 1. Provider is set to 'mapbox' (default)
  // 2. A valid Mapbox token is available
  const useMapbox =
    provider === 'mapbox' && mapboxToken && mapboxToken !== 'your_mapbox_access_token_here';

  if (useMapbox) {
    console.log('[Geocoder] Using Mapbox Geocoding API');
    cachedGeocoder = new MapboxGeocoder({
      accessToken: mapboxToken,
      language,
      countryBias,
      proximity,
    });
  } else {
    console.log('[Geocoder] Using Nominatim (OpenStreetMap) API');
    cachedGeocoder = new NominatimGeocoder({
      userAgent: 'plotiq.app (support@plotiq.app)',
      acceptLanguage: 'en-IE,en-GB,en-US,en',
    });
  }

  return cachedGeocoder;
}

/**
 * Reset the cached geocoder instance (useful for testing)
 */
export function resetGeocoder(): void {
  cachedGeocoder = null;
}

/**
 * Get Nominatim geocoder directly (for fallback scenarios)
 */
export function getNominatimGeocoder(): IGeocoder {
  return new NominatimGeocoder({
    userAgent: 'plotiq.app (support@plotiq.app)',
    acceptLanguage: 'en-IE,en-GB,en-US,en',
  });
}
