'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSite, useUpdateSite, useDeleteSite, useGeocode, type GeoPoint, type GeoPolygon } from '@/hooks/useSites';

export default function EditSitePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

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
  const [location, setLocation] = useState<GeoPoint | undefined>(undefined);
  const [bbox, setBbox] = useState<GeoPolygon | undefined>(undefined);

  // UI state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: site, isLoading } = useSite(siteId);
  const updateSiteMutation = useUpdateSite();
  const deleteSiteMutation = useDeleteSite();
  const geocodeMutation = useGeocode();

  // Prefill form with existing site data
  useEffect(() => {
    if (site) {
      setName(site.name);
      setAddress(site.address || '');
      setCity(site.city || '');
      setState(site.state || '');
      setCountry(site.country || '');
      setPostalCode(site.postal_code || '');
      setLocation(site.location || undefined);
      setBbox(site.bbox || undefined);
    }
  }, [site]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !location) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: location.coordinates,
      zoom: 12,
    });

    // Add draggable marker
    const marker = new maplibregl.Marker({ draggable: true })
      .setLngLat(location.coordinates)
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
  }, [location]);

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

        // Parse place name
        const placeName = feature.place_name;
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

    if (!name.trim() || !site) {
      alert('Site name is required');
      return;
    }

    try {
      await updateSiteMutation.mutateAsync({
        siteId: site.id,
        updates: {
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          country: country.trim() || undefined,
          postal_code: postalCode.trim() || undefined,
          location,
          bbox,
        },
        versionToken: site.version_token,
      });

      router.push(`/sites/${site.id}`);
    } catch (error: any) {
      console.error('Failed to update site:', error);
      if (error.response?.status === 409) {
        alert('This site was modified by another user. Please refresh the page and try again.');
      } else {
        alert(error.response?.data?.error?.message || 'Failed to update site');
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!site) return;

    try {
      await deleteSiteMutation.mutateAsync({
        siteId: site.id,
        versionToken: site.version_token,
      });
      router.push('/sites');
    } catch (error: any) {
      console.error('Failed to delete site:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete site');
    }
  };

  if (isLoading || !site) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/sites/${site.id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Site
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Site</h1>
        <p className="text-gray-600 mt-1">
          Update site information and location
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
        {location && (
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
              ({location.coordinates[1].toFixed(6)}°, {location.coordinates[0].toFixed(6)}°)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Site
          </button>

          <div className="flex items-center gap-4">
            <Link
              href={`/sites/${site.id}`}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateSiteMutation.isPending || !name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateSiteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Site</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{site.name}"? This will also delete all associated layouts and zones. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSiteMutation.isPending}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSiteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteSiteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Site
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
