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

const client = token ? mbx({ accessToken: token }) : null;

export const geocoder = client ? geocoding(client) : null;

export default {
  geocoder,
};
