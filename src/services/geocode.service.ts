import mapbox from '../lib/mapbox';

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
