'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCreateSite, useGeocode, type GeoPoint, type GeoPolygon } from '@/hooks/useSites';

export default function CreateSitePage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [location, setLocation] = useState<GeoPoint | undefined>({
    type: 'Point',
    coordinates: [-122.4194, 37.7749], // Default: San Francisco
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bbox, setBbox] = useState<GeoPolygon | undefined>(undefined); // TODO: Implement boundary drawing

  // UI state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const createSiteMutation = useCreateSite();
  const geocodeMutation = useGeocode();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Free demo tiles
      center: location?.coordinates || [-122.4194, 37.7749],
      zoom: 12,
    });

    // Add draggable marker
    const marker = new maplibregl.Marker({ draggable: true })
      .setLngLat(location?.coordinates || [-122.4194, 37.7749])
      .addTo(map);

    // Update location when marker is dragged
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setLocation({
        type: 'Point',
        coordinates: [lngLat.lng, lngLat.lat],
      });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
    };
  }, []);

  // Update marker position when location changes
  useEffect(() => {
    if (markerRef.current && location) {
      markerRef.current.setLngLat(location.coordinates);
    }
  }, [location]);

  // Geocode address
  const handleGeocodeAddress = async () => {
    if (!address.trim()) return;

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocodeMutation.mutateAsync(address);
      
      if (result.features && result.features.length > 0) {
        const feature = result.features[0];
        const newLocation: GeoPoint = {
          type: 'Point',
          coordinates: feature.center,
        };

        setLocation(newLocation);

        // Update map view
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: feature.center,
            zoom: 15,
            duration: 1000,
          });
        }

        // Parse place name to fill in city/state/country
        const placeName = feature.place_name;
        // Example: "123 Main Street, San Francisco, California 94102, United States"
        // Basic parsing (this could be improved with more sophisticated logic)
        const parts = placeName.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          setCity(parts[parts.length - 3] || '');
          setState(parts[parts.length - 2]?.split(' ')[0] || '');
          setCountry(parts[parts.length - 1] || '');
        }
      } else {
        setGeocodeError('No results found for this address');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      setGeocodeError('Failed to geocode address. Please try again or adjust the marker manually.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Site name is required');
      return;
    }

    try {
      const newSite = await createSiteMutation.mutateAsync({
        club_id: 1, // TODO: Get from auth context
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        location,
        bbox,
      });

      router.push(`/sites/${newSite.id}`);
    } catch (error: any) {
      console.error('Failed to create site:', error);
      alert(error.response?.data?.error?.message || 'Failed to create site');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sites
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Site</h1>
        <p className="text-gray-600 mt-1">
          Add a new sports facility or field location
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Site Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Golden Gate Park Fields"
            required
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={handleGeocodeAddress}
              placeholder="e.g., 123 Main Street, San Francisco, CA"
              maxLength={500}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={!address.trim() || isGeocoding}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Geocode
                </>
              )}
            </button>
          </div>
          {geocodeError && (
            <p className="text-red-600 text-sm mt-1">{geocodeError}</p>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Enter an address and click Geocode to auto-fill location details
          </p>
        </div>

        {/* City, State, Country */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
              State/Province
            </label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="California"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Postal Code */}
        <div className="max-w-xs">
          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            id="postal_code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="94102"
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Map */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div
            ref={mapContainer}
            className="w-full h-96 border border-gray-300 rounded-lg"
          />
          <p className="text-gray-500 text-sm mt-2">
            Drag the marker to adjust the exact location
            {location && (
              <span className="ml-2 text-gray-700">
                ({location.coordinates[1].toFixed(6)}°, {location.coordinates[0].toFixed(6)}°)
              </span>
            )}
          </p>
        </div>

        {/* TODO: Add boundary drawing in Phase 2 */}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/sites"
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createSiteMutation.isPending || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createSiteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Site'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
