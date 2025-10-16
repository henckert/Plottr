import mbx from '@mapbox/mapbox-sdk';
import geocoding from '@mapbox/mapbox-sdk/services/geocoding';
import { getConfig } from '../config';

const cfg = getConfig();

const token = cfg.MAPBOX_TOKEN;

if (!token) {
  // Allow runtime to proceed; callers should handle missing token gracefully.
  // We avoid throwing at import time to keep tests that don't need Mapbox working.
  // eslint-disable-next-line no-console
  console.warn('MAPBOX_TOKEN not set; geocoding will be unavailable');
}

let client: any = null;
if (token) {
  try {
    client = mbx({ accessToken: token });
  } catch (err) {
    // If the provided token is malformed/invalid, log and continue with geocoding disabled.
    // This prevents CI/tests from crashing when a placeholder or bad token is present.
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize Mapbox client; geocoding disabled.', (err as any)?.message || err);
    client = null;
  }
}

export const geocoder = client ? geocoding(client) : null;

export default {
  geocoder,
};
