/**
 * Geocoding provider abstraction types
 */

export interface GeocodeResult {
  id: string;
  label: string; // Full display name
  name: string; // Short name
  coordinates: [number, number]; // [lng, lat]
  address?: {
    line1?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export interface GeocodeRequest {
  q: string;
  country?: string;
  limit?: number;
  proximity?: string; // "lng,lat"
  language?: string;
}

export interface IGeocoder {
  forwardGeocode(request: GeocodeRequest): Promise<GeocodeResult[]>;
}
